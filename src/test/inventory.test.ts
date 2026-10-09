import { describe, expect, it } from "vitest";
import { activeUnitsByPurchase, isPurchaseStockEligible, purchaseCommercialStatus, purchaseReceiptStatus } from "@/lib/inventory";
import { computeDashboard } from "@/lib/dashboardMetrics";
import type { Product, Purchase, Sale, VintedOrderStatus } from "@/types";

const purchase = (orderStatus: VintedOrderStatus): Purchase => ({
  id: orderStatus,
  productId: "product",
  quantity: 1,
  price: 100,
  date: "2026-09-29",
  orderStatus,
});

describe("sellable stock eligibility", () => {
  it.each(["not_tracked", "received_verified"] as VintedOrderStatus[])("counts %s as available", status => {
    expect(isPurchaseStockEligible(purchase(status))).toBe(true);
  });

  it.each(["ordered", "shipped", "electronic_verification", "delivered", "return_in_progress", "refund_partial", "refunded", "cancelled"] as VintedOrderStatus[])("excludes %s from available stock", status => {
    expect(isPurchaseStockEligible(purchase(status))).toBe(false);
  });
});

describe("purchase identity and active stock value", () => {
  const products: Product[] = ["first", "second"].map(id => ({
    id, name: "Mesmo nome", category: "Outros", purchasePrice: 999,
    supplier: "", retailPrice: 0, condition: "Verificado", warrantyMonths: 0,
    description: "", specifications: "", photoUrls: [],
  }));
  const purchases: Purchase[] = [
    { ...purchase("not_tracked"), id: "a", productId: "first", price: 80 },
    { ...purchase("not_tracked"), id: "b", productId: "second", price: 120 },
  ];
  const sales: Sale[] = [{ id: "sale", productId: "first", purchaseId: "a", quantity: 1, salePrice: 150, profit: 70, date: "2026-09-30" }];

  it("keeps an identically named later purchase active after the first is sold", () => {
    expect(activeUnitsByPurchase(purchases, sales)).toEqual(new Map([["a", 0], ["b", 1]]));
    const dashboard = computeDashboard(purchases, sales, products);
    expect(dashboard.stockValue).toBe(120);
    expect(dashboard.stockUnits).toBe(1);
    expect(dashboard.pendingStockValue).toBe(0);
    expect(dashboard.pendingStockUnits).toBe(0);
    expect(dashboard.receivedStockValue).toBe(120);
    expect(dashboard.receivedStockUnits).toBe(1);
    expect(dashboard.totalPurchases).toBe(200);
  });

  it("shows a shipped new unit as incoming after an older unit of the same model was sold", () => {
    const incoming = { ...purchases[1], orderStatus: "shipped" as const, price: 681.8 };
    const dashboard = computeDashboard([purchases[0], incoming], sales, products);
    expect(purchaseCommercialStatus(incoming, sales)).toBe("active");
    expect(isPurchaseStockEligible(incoming)).toBe(false);
    expect(dashboard.pendingStockUnits).toBe(1);
    expect(dashboard.pendingStockValue).toBe(681.8);
    expect(dashboard.receivedStockUnits).toBe(0);
  });

  it("consumes only the specifically selected purchase when product rows repeat", () => {
    const legacy = purchases.map(p => ({ ...p, productId: "first" }));
    expect(activeUnitsByPurchase(legacy, sales)).toEqual(new Map([["a", 0], ["b", 1]]));
    expect(computeDashboard(legacy, sales, products).stockValue).toBe(120);
  });

  it("counts an unsold order as incoming while keeping it ineligible for sale", () => {
    const pending = [{ ...purchases[0], orderStatus: "ordered" as const }];
    expect(activeUnitsByPurchase(pending, [])).toEqual(new Map([["a", 1]]));
    expect(isPurchaseStockEligible(pending[0])).toBe(false);
    const dashboard = computeDashboard(pending, [], products);
    expect(dashboard.stockValue).toBe(80);
    expect(dashboard.pendingStockValue).toBe(80);
    expect(dashboard.pendingStockUnits).toBe(1);
    expect(dashboard.receivedStockValue).toBe(0);
  });

  it("separates received active stock from stock still pending receipt", () => {
    const received = [{ ...purchases[0], orderStatus: "received_verified" as const }];
    const dashboard = computeDashboard(received, [], products);
    expect(dashboard.stockUnits).toBe(1);
    expect(dashboard.stockValue).toBe(80);
    expect(dashboard.pendingStockUnits).toBe(0);
    expect(dashboard.pendingStockValue).toBe(0);
    expect(dashboard.receivedStockUnits).toBe(1);
    expect(dashboard.receivedStockValue).toBe(80);
  });

  it.each(["return_in_progress", "refund_partial", "refunded", "cancelled"] as VintedOrderStatus[])("excludes %s from every stock calculation", orderStatus => {
    const excluded = [{ ...purchases[0], orderStatus }];
    const dashboard = computeDashboard(excluded, [], products);
    expect(activeUnitsByPurchase(excluded, [])).toEqual(new Map([["a", 0]]));
    expect(dashboard.stockUnits).toBe(0);
    expect(dashboard.stockValue).toBe(0);
    expect(dashboard.pendingStockUnits).toBe(0);
    expect(dashboard.receivedStockUnits).toBe(0);
    expect(purchaseReceiptStatus(excluded[0])).toBe("excluded");
  });

  it("keeps refunded purchases in financial metrics until refund receipt is confirmed", () => {
    const waitingForRefund = [{ ...purchase("refunded"), id: "refund-pending", productId: "first" }];
    const confirmedRefund = [{ ...waitingForRefund[0], refundReceivedAt: "2026-10-09T10:00:00.000Z" }];
    const refundSale: Sale[] = [{ id: "refund-sale", productId: "first", purchaseId: "refund-pending", quantity: 1, salePrice: 150, date: "2026-10-01", profit: 50 }];
    const awaiting = computeDashboard(waitingForRefund, refundSale, products);
    const confirmed = computeDashboard(confirmedRefund, refundSale, products);

    expect(awaiting.totalPurchases).toBe(100);
    expect(awaiting.totalSales).toBe(150);
    expect(awaiting.totalProfit).toBe(50);
    expect(awaiting.productCount).toBe(1);
    expect(awaiting.stockValue).toBe(0);
    expect(confirmed.totalPurchases).toBe(0);
    expect(confirmed.totalSales).toBe(0);
    expect(confirmed.totalProfit).toBe(0);
    expect(confirmed.productCount).toBe(0);
  });

  it("shows a return as a return rather than a sale", () => {
    const returning = { ...purchases[0], orderStatus: "return_in_progress" as const };
    expect(purchaseCommercialStatus(returning, [])).toBe("returning");
  });
});
