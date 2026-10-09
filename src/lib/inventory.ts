import type { Purchase, Sale } from "@/types";

export type PurchaseReceiptStatus = "pending" | "received" | "excluded";

const EXCLUDED_STOCK_STATUSES = new Set([
  "return_in_progress",
  "refund_partial",
  "refunded",
  "cancelled",
]);

export function isPurchaseExcludedFromStock(purchase: Pick<Purchase, "orderStatus" | "refundReceivedAt">): boolean {
  return Boolean(purchase.refundReceivedAt) || (purchase.orderStatus != null && EXCLUDED_STOCK_STATUSES.has(purchase.orderStatus));
}

/** A return or refund remains a cost until the money has actually been received. */
export function isPurchaseExcludedFromDashboard(purchase: Pick<Purchase, "orderStatus" | "refundReceivedAt">): boolean {
  return Boolean(purchase.refundReceivedAt);
}

export function purchaseReceiptStatus(purchase: Pick<Purchase, "orderStatus">): PurchaseReceiptStatus {
  if (isPurchaseExcludedFromStock(purchase)) return "excluded";
  // received_verified is the internal value for a confirmed physical receipt.
  return !purchase.orderStatus || purchase.orderStatus === "not_tracked" || purchase.orderStatus === "received_verified" ? "received" : "pending";
}

/** Only confirmed receipts and legacy inventory may be sold. */
export function isPurchaseStockEligible(purchase: Purchase): boolean {
  if (isPurchaseExcludedFromStock(purchase)) return false;
  return !purchase.orderStatus || purchase.orderStatus === "not_tracked" || purchase.orderStatus === "received_verified";
}

/** Count unsold units in both received stock and incoming stock; sale eligibility is checked separately. */
export function activeUnitsByPurchase(purchases: Purchase[], sales: Sale[]): Map<string, number> {
  const soldByPurchase = new Map<string, number>();
  sales.forEach(sale => {
    if (sale.purchaseId) soldByPurchase.set(sale.purchaseId, (soldByPurchase.get(sale.purchaseId) ?? 0) + sale.quantity);
  });
  return new Map(purchases.map(purchase => [
    purchase.id,
    isPurchaseExcludedFromStock(purchase) ? 0 : Math.max(0, purchase.quantity - (soldByPurchase.get(purchase.id) ?? 0)),
  ]));
}

export type PurchaseCommercialStatus = "active" | "sold" | "returning" | "excluded";

export function purchaseCommercialStatus(purchase: Purchase, sales: Sale[]): PurchaseCommercialStatus {
  if (purchase.orderStatus === "return_in_progress") return "returning";
  if (isPurchaseExcludedFromStock(purchase)) return "excluded";
  return (activeUnitsByPurchase([purchase], sales).get(purchase.id) ?? 0) === 0 ? "sold" : "active";
}
