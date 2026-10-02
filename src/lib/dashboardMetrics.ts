import type { Expense, Product, Purchase, Sale } from "@/types";
import { isPurchaseStockEligible, remainingByPurchase } from "@/lib/inventory";

export const money = (v: number | null) => v == null ? "Por confirmar" : v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
export const displayDate = (date: string) => date ? new Date(`${date}T12:00:00`).toLocaleDateString("pt-PT") : "Sem data";
export function categoryData(products: Product[], purchases: Purchase[], sales: Sale[], expenses: Expense[], category = "all") {
  const selected = products.filter(p => category === "all" || p.category === category);
  const ids = new Set(selected.map(p => p.id));
  return { products: selected, purchases: purchases.filter(p => ids.has(p.productId)), sales: sales.filter(s => ids.has(s.productId)), expenses: expenses.filter(e => category === "all" || e.category === category) };
}

export function computeDashboard(purchases: Purchase[], sales: Sale[], products: Product[], expenses: Expense[] = []) {
  const byId = new Map(products.map(p => [p.id, p]));
  const totalPurchases = purchases.reduce((sum, p) => sum + (p.price ?? 0) * p.quantity, 0);
  const totalSales = sales.reduce((sum, s) => sum + s.salePrice * s.quantity, 0);
  const knownSales = sales.filter(s => s.profit != null);
  const totalProfit = knownSales.reduce((sum, s) => sum + s.profit!, 0);
  const knownRevenue = knownSales.reduce((sum, s) => sum + s.salePrice * s.quantity, 0);
  const cogs = knownRevenue - totalProfit;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = remainingByPurchase(purchases, sales);
  let stockValue = 0, productsInStock = 0, stockUnits = 0, personalValue = 0, personalUnits = 0;
  const activeProductIds = new Set<string>();
  purchases.filter(isPurchaseStockEligible).forEach(purchase => {
    const qty = remaining.get(purchase.id) ?? 0;
    const product = byId.get(purchase.productId);
    const value = qty * (purchase.price ?? 0);
    if (product?.inventoryUse === "personal") { personalUnits += qty; personalValue += value; }
    else { stockUnits += qty; stockValue += value; if (qty) activeProductIds.add(purchase.productId); }
  });
  productsInStock = activeProductIds.size;
  const purchaseDates = new Map<string, string>();
  purchases.filter(p => p.date).forEach(p => {
    if (!purchaseDates.has(p.productId) || p.date < purchaseDates.get(p.productId)!) purchaseDates.set(p.productId, p.date);
  });
  let days = 0, datedSales = 0, inconsistentDates = 0;
  sales.forEach(s => {
    const date = purchaseDates.get(s.productId);
    if (!date || !s.date) return;
    const diff = (Date.parse(s.date) - Date.parse(date)) / 86400000;
    if (diff < 0) inconsistentDates++;
    else if (Number.isFinite(diff)) { days += diff; datedSales++; }
  });
  const topMap = new Map<string, number>(), profitMap = new Map<string, number>();
  const months = new Map<string, { compras: number; vendas: number; profit: number }>();
  const monthEntry = (date: string) => {
    const key = date.slice(0, 7);
    if (!months.has(key)) months.set(key, { compras: 0, vendas: 0, profit: 0 });
    return months.get(key)!;
  };
  purchases.forEach(p => { if (p.date) monthEntry(p.date).compras += (p.price ?? 0) * p.quantity; });
  sales.forEach(s => {
    const name = byId.get(s.productId)?.name ?? "Desconhecido";
    topMap.set(name, (topMap.get(name) ?? 0) + s.quantity);
    if (s.profit != null) profitMap.set(name, (profitMap.get(name) ?? 0) + s.profit);
    if (s.date) { const entry = monthEntry(s.date); entry.vendas += s.salePrice * s.quantity; entry.profit += s.profit ?? 0; }
  });
  const sorted = [...months.keys()].sort();
  const profitOverTime: {month: string; profit: number}[] = [];
  if (sorted.length) {
    let [year, month] = sorted[0].split("-").map(Number);
    const last = sorted[sorted.length - 1];
    while (`${year}-${String(month).padStart(2, "0")}` <= last) {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      profitOverTime.push({month: key, profit: months.get(key)?.profit ?? 0});
      if (++month > 12) { month = 1; year++; }
    }
  }
  return {
    totalPurchases, totalSales, totalProfit, totalExpenses, netProfit: totalProfit - totalExpenses,
    stockValue, productsInStock, stockUnits, personalValue, personalUnits, cogs,
    productCount: products.length, unitsSold: sales.reduce((n, s) => n + s.quantity, 0),
    avgProfitPerSale: knownSales.length ? totalProfit / knownSales.length : 0,
    avgMargin: knownRevenue > 0 ? totalProfit / knownRevenue : 0,
    roiRealized: cogs > 0 ? totalProfit / cogs : 0,
    stockTurnover: stockValue > 0 ? cogs / stockValue : 0,
    avgVelocity: datedSales ? days / datedSales : 0,
    missingCosts: sales.length - knownSales.length,
    missingPurchaseCosts: purchases.filter(p => p.price == null).length,
    missingCostRevenue: sales.filter(s => s.profit == null).reduce((n,s) => n + s.salePrice*s.quantity, 0),
    undatedSales: sales.filter(s => !s.date).length,
    undatedRevenue: sales.filter(s => !s.date).reduce((n,s) => n+s.salePrice*s.quantity,0),
    undatedPurchases: purchases.filter(p => !p.date).length,
    inconsistentDates,
    topProducts: [...topMap.entries()].sort((a,b) => b[1]-a[1]).slice(0,5),
    profitByProduct: [...profitMap.entries()].sort((a,b) => b[1]-a[1]).slice(0,8),
    profitOverTime,
    purchasesVsSales: sorted.map(month => ({month, compras: months.get(month)!.compras, vendas: months.get(month)!.vendas})),
  };
}
