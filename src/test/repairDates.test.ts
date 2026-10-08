import { describe, expect, it } from "vitest";
import { planDateRepairs } from "@/lib/repairDates";
import type { Purchase, Sale } from "@/types";

describe("planDateRepairs", () => {
  it("fills missing dates and moves sales before purchases to the purchase date", () => {
    const purchases = [
      { id: "p1", productId: "a", date: "", deliveryDate: null },
      { id: "p2", productId: "b", date: "2024-05-10" },
      { id: "p3", productId: "c", date: "" },
    ] as Purchase[];
    const sales = [
      { id: "s1", productId: "a", date: "2023-02-01" },
      { id: "s2", productId: "b", date: "2024-05-01" },
      { id: "s3", productId: "b", date: "" },
    ] as Sale[];
    expect(planDateRepairs(purchases, sales, "2026-10-08")).toEqual({
      purchaseUpdates: [{ id: "p1", date: "2023-02-01" }, { id: "p3", date: "2026-10-08" }],
      saleUpdates: [{ id: "s2", date: "2024-05-10" }, { id: "s3", date: "2024-05-10" }],
    });
  });
});
