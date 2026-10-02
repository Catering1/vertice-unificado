import { describe, expect, it } from "vitest";
import { isPurchaseStockEligible, remainingByPurchase } from "@/lib/inventory";
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
    expect(remainingByPurchase(purchases, sales)).toEqual(new Map([["a", 0], ["b", 1]]));
    const dashboard = computeDashboard(purchases, sales, products);
    expect(dashboard.stockValue).toBe(120);
    expect(dashboard.totalPurchases).toBe(200);
  });

  it("values legacy shared-product purchases at their own purchase prices", () => {
    const legacy = purchases.map(p => ({ ...p, productId: "first" }));
    expect(remainingByPurchase(legacy, sales)).toEqual(new Map([["a", 0], ["b", 1]]));
    expect(computeDashboard(legacy, sales, products).stockValue).toBe(120);
  });

  it("uses received stock before pending orders for legacy shared products", () => {
    const legacy = [
      { ...purchases[0], productId: "first", orderStatus: "ordered" as const },
      { ...purchases[1], productId: "first", orderStatus: "received_verified" as const },
    ];
    expect(remainingByPurchase(legacy, sales)).toEqual(new Map([["b", 0], ["a", 1]]));
    expect(computeDashboard(legacy, sales, products).stockValue).toBe(0);
  });
});
