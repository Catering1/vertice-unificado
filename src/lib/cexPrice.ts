import type { Product } from "@/types";

export type CexPrice = {
  boxId: string;
  sellPrice: number | null;
  cashPrice: number | null;
  checkedAt: string | null;
};

function nonNegativePrice(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function cexPrice(product: Product): CexPrice {
  const data = product.sourceData;
  return {
    boxId: typeof data?.cexPtBoxId === "string" ? data.cexPtBoxId : "",
    sellPrice: nonNegativePrice(data?.cexPtSellPrice),
    cashPrice: nonNegativePrice(data?.cexPtCashPrice),
    checkedAt: typeof data?.cexPtCheckedAt === "string" ? data.cexPtCheckedAt : null,
  };
}

export function cexSearchUrl(query: string): string {
  return `https://pt.webuy.com/search/?stext=${encodeURIComponent(query)}`;
}
