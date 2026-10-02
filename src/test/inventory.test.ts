import { describe, expect, it } from "vitest";
import { activeUnitsByPurchase, isPurchaseStockEligible } from "@/lib/inventory";
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
  const sales: Sale[] = [{ id: "sale", productId: "first", quantity: 1, salePrice: 150, profit: 70, date: "2026-09-30" }];

  it("keeps an identically named later purchase active after the first is sold", () => {
    expect(activeUnitsByPurchase(purchases, sales)).toEqual(new Map([["a", 0], ["b", 1]]));
    const dashboard = computeDashboard(purchases, sales, products);
    expect(dashboard.stockValue).toBe(120);
    expect(dashboard.totalPurchases).toBe(200);
  });

  it("marks every legacy purchase of a product as sold when that product has a sale", () => {
    const legacy = purchases.map(p => ({ ...p, productId: "first" }));
    expect(activeUnitsByPurchase(legacy, sales)).toEqual(new Map([["a", 0], ["b", 0]]));
    expect(computeDashboard(legacy, sales, products).stockValue).toBe(0);
  });

  it("keeps a product active when it has no sale, independently of delivery status", () => {
    const pending = [{ ...purchases[0], orderStatus: "ordered" as const }];
    expect(activeUnitsByPurchase(pending, [])).toEqual(new Map([["a", 1]]));
    expect(computeDashboard(pending, [], products).stockValue).toBe(80);
  });
});
