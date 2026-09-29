import type { Purchase } from "@/types";

/** Only received/verified purchases (plus legacy untracked records) are sellable stock. */
export function isPurchaseStockEligible(purchase: Purchase): boolean {
  return !purchase.orderStatus || purchase.orderStatus === "not_tracked" || purchase.orderStatus === "received_verified";
}

