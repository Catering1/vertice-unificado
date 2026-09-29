import { describe, expect, it } from "vitest";
import { isPurchaseStockEligible } from "@/lib/inventory";
import type { Purchase, VintedOrderStatus } from "@/types";

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

