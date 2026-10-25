import { describe, expect, it } from "vitest";
import { stockAgingAlerts } from "@/lib/stockAging";
import type { Product, Purchase, Sale } from "@/types";

const product = (id: string, extra: Partial<Product> = {}): Product => ({
  id, name: `Produto ${id}`, category: "Eletrónica", purchasePrice: null, supplier: "", retailPrice: 0,
  condition: "Usado", warrantyMonths: 0, description: "", specifications: "", photoUrls: [], ...extra,
});
const purchase = (id: string, extra: Partial<Purchase> = {}): Purchase => ({
  id, productId: id, quantity: 1, price: 100, date: "2026-01-01", orderStatus: "delivered", ...extra,
});
const today = "2026-10-25";
const daysAgo = (n: number) => new Date(Date.UTC(2026, 9, 25 - n)).toISOString().slice(0, 10);

describe("stockAgingAlerts", () => {
  it("flags warning at 35 days and critical at 75, but not before", () => {
    const list = [["a", 34], ["b", 35], ["c", 74], ["d", 75]] as const;
    const alerts = stockAgingAlerts(
      list.map(([id, n]) => purchase(id, { deliveryDate: daysAgo(n) })), [], list.map(([id]) => product(id)), today);
    expect(alerts.map(a => [a.purchaseId, a.level])).toEqual([["d", "critical"], ["c", "warning"], ["b", "warning"]]);
  });

  it("counts from the delivery date and falls back to the purchase date as an estimate", () => {
    const [exact, estimated] = stockAgingAlerts(
      [purchase("a", { date: daysAgo(10), deliveryDate: daysAgo(40) }), purchase("b", { date: daysAgo(50) })],
      [], [product("a"), product("b")], today);
    expect(exact).toMatchObject({ purchaseId: "b", days: 50, estimated: true });
    expect(estimated).toMatchObject({ purchaseId: "a", days: 40, estimated: false });
  });

  it("ignores sold, personal, unreceived and book units", () => {
    const old = daysAgo(100);
    const purchases = [
      purchase("sold", { date: old }), purchase("personal", { date: old }), purchase("shipped", { date: old, orderStatus: "shipped" }),
      purchase("refunded", { date: old, orderStatus: "refunded" }), purchase("book", { date: old }),
    ];
    const products = [product("sold"), product("personal", { inventoryUse: "personal" }), product("shipped"), product("refunded"), product("book", { category: "Livros" })];
    const sales: Sale[] = [{ id: "s", productId: "sold", purchaseId: "sold", quantity: 1, salePrice: 1, date: today, profit: 1 }];
    expect(stockAgingAlerts(purchases, sales, products, today)).toEqual([]);
  });

  it("reports the remaining units and their share of the cost", () => {
    const sales: Sale[] = [{ id: "s", productId: "a", purchaseId: "a", quantity: 1, salePrice: 1, date: today, profit: 1 }];
    const [alert] = stockAgingAlerts([purchase("a", { quantity: 2, price: 200, deliveryDate: daysAgo(40) })], sales, [product("a")], today);
    expect(alert).toMatchObject({ units: 1, cost: 100 });
  });
});
