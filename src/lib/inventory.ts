import type { Purchase, Sale } from "@/types";

/** Only received/verified purchases (plus legacy untracked records) are sellable stock. */
export function isPurchaseStockEligible(purchase: Purchase): boolean {
  return !purchase.orderStatus || purchase.orderStatus === "not_tracked" || purchase.orderStatus === "received_verified";
}

/** Allocate legacy sales to sellable purchases first, then in purchase-date order.
 * Newly entered purchases have their own product ID, so their status is exact. */
export function remainingByPurchase(purchases: Purchase[], sales: Sale[]): Map<string, number> {
  const soldByProduct = new Map<string, number>();
  for (const sale of sales) soldByProduct.set(sale.productId, (soldByProduct.get(sale.productId) ?? 0) + sale.quantity);
  const remaining = new Map<string, number>();
  for (const purchase of [...purchases].sort((a, b) =>
    Number(isPurchaseStockEligible(b)) - Number(isPurchaseStockEligible(a)) || a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    const sold = soldByProduct.get(purchase.productId) ?? 0;
    const used = Math.min(purchase.quantity, sold);
    remaining.set(purchase.id, purchase.quantity - used);
    soldByProduct.set(purchase.productId, sold - used);
  }
  return remaining;
}
