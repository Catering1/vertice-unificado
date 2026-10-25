import { describe, expect, it } from "vitest";
import { salesByMonthPart, salesLog } from "@/lib/salesPatterns";
import type { Product, Sale } from "@/types";

const sale = (id: string, date: string, extra: Partial<Sale> = {}): Sale => ({
  id, productId: "p", purchaseId: "a", quantity: 1, salePrice: 100, profit: 40, date, ...extra,
});

describe("salesByMonthPart", () => {
  it("buckets by day of month and normalises by observed days", () => {
    // Observed period: 2026-01-05 to 2026-02-04.
    const sales = [sale("1", "2026-01-05"), sale("2", "2026-01-10", { quantity: 2 }), sale("3", "2026-01-15"), sale("4", "2026-01-31")];
    const [inicio, meio, fim] = salesByMonthPart(sales, "2026-02-04");
    expect([inicio.units, meio.units, fim.units]).toEqual([3, 1, 1]);
    expect(inicio.revenue).toBe(300);
    expect(inicio.observedDays).toBe(6 + 4); // Jan 5-10 and Feb 1-4
    expect(meio.observedDays).toBe(10);
    expect(fim.observedDays).toBe(11);
    expect(inicio.unitsPerDay).toBe(0.3);
  });

  it("ignores undated sales and returns zeros without data", () => {
    expect(salesByMonthPart([sale("1", "")], "2026-02-04").every(p => p.units === 0 && p.observedDays === 0)).toBe(true);
  });
});

describe("salesLog", () => {
  it("lists newest sales first with product, category and profit", () => {
    const products = [{ id: "p", name: "S26", category: "Eletrónica" }] as Product[];
    const log = salesLog([sale("1", "2026-01-01"), sale("2", "2026-03-01", { profit: null })], products);
    expect(log.split("\n")).toEqual([
      "2026-03-01 | S26 | Eletrónica | 1 un | 100 EUR | lucro por confirmar",
      "2026-01-01 | S26 | Eletrónica | 1 un | 100 EUR | lucro 40",
    ]);
  });
});
