import type { Purchase, Sale } from "@/types";

export type PurchaseReceiptStatus = "pending" | "received";

export function purchaseReceiptStatus(purchase: Pick<Purchase, "orderStatus">): PurchaseReceiptStatus {
  return purchase.orderStatus === "delivered" || purchase.orderStatus === "received_verified" ? "received" : "pending";
}

/** Only received/verified purchases (plus legacy untracked records) are sellable stock. */
export function isPurchaseStockEligible(purchase: Purchase): boolean {
  return !purchase.orderStatus || purchase.orderStatus === "not_tracked" || purchase.orderStatus === "received_verified";
}

/** A purchase is commercially active only while its product has no sale. */
export function activeUnitsByPurchase(purchases: Purchase[], sales: Sale[]): Map<string, number> {
  const soldProductIds = new Set(sales.map(sale => sale.productId));
  return new Map(purchases.map(purchase => [
    purchase.id,
    soldProductIds.has(purchase.productId) ? 0 : purchase.quantity,
  ]));
}
