import type { Purchase, Sale } from "@/types";

export function planDateRepairs(purchases: Purchase[], sales: Sale[], today: string) {
  const firstSale = new Map<string, string>();
  for (const sale of sales) if (sale.date && (!firstSale.has(sale.purchaseId) || sale.date < firstSale.get(sale.purchaseId)!)) firstSale.set(sale.purchaseId, sale.date);
  const purchaseUpdates = purchases.filter(p => !p.date).map(p => ({
    id: p.id,
    date: firstSale.get(p.id) ?? p.deliveryDate ?? today,
  }));
  const purchaseDates = new Map<string, string>();
  for (const p of purchases) {
    const date = p.date || purchaseUpdates.find(update => update.id === p.id)?.date;
    if (date) purchaseDates.set(p.id, date);
  }
  const saleUpdates = sales.flatMap(s => {
    const purchaseDate = purchaseDates.get(s.purchaseId);
    const date = !s.date ? (purchaseDate ?? today) : purchaseDate && s.date < purchaseDate ? purchaseDate : null;
    return date ? [{ id: s.id, date }] : [];
  });
  return { purchaseUpdates, saleUpdates };
}
