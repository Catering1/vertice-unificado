import type { Product, Purchase, Sale } from "@/types";
import { activeUnitsByPurchase, purchaseReceiptStatus } from "@/lib/inventory";

/** Thresholds derived from the 2026 sales history: most electronics sell within ~5 weeks, the rest take 75+ days. */
export const STOCK_AGING_WARNING_DAYS = 35;
export const STOCK_AGING_CRITICAL_DAYS = 75;

const EXCLUDED_CATEGORIES = new Set(["Livros"]);

export type StockAgingLevel = "warning" | "critical";

export interface StockAgingAlert {
  purchaseId: string;
  productId: string;
  name: string;
  days: number;
  level: StockAgingLevel;
  units: number;
  cost: number | null;
  /** True when no delivery/collection date exists and the purchase date was used instead. */
  estimated: boolean;
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = to.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** Received, unsold business stock held for at least the warning threshold, oldest first. `today` is YYYY-MM-DD. */
export function stockAgingAlerts(purchases: Purchase[], sales: Sale[], products: Product[], today: string): StockAgingAlert[] {
  const productsById = new Map(products.map(product => [product.id, product]));
  const units = activeUnitsByPurchase(purchases, sales);
  return purchases.flatMap(purchase => {
    const product = productsById.get(purchase.productId);
    const remaining = units.get(purchase.id) ?? 0;
    if (!product || remaining === 0 || product.inventoryUse === "personal" || EXCLUDED_CATEGORIES.has(product.category)) return [];
    if (purchaseReceiptStatus(purchase) !== "received") return [];
    const received = purchase.deliveryDate || purchase.collectionDate;
    const start = received || purchase.date;
    if (!start) return [];
    const days = daysBetween(start, today);
    if (days < STOCK_AGING_WARNING_DAYS) return [];
    return [{
      purchaseId: purchase.id,
      productId: product.id,
      name: product.name,
      days,
      level: days >= STOCK_AGING_CRITICAL_DAYS ? "critical" as const : "warning" as const,
      units: remaining,
      cost: purchase.price != null ? purchase.price * remaining / purchase.quantity : null,
      estimated: !received,
    }];
  }).sort((a, b) => b.days - a.days);
}
