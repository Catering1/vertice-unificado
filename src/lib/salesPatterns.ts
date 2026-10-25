import type { Product, Sale } from "@/types";

export type MonthPart = "inicio" | "meio" | "fim";

export interface MonthPartStats {
  part: MonthPart;
  label: string;
  /** Days of this part of the month that fall between the first sale and today. */
  observedDays: number;
  units: number;
  revenue: number;
  profit: number;
  unitsPerDay: number;
}

const PARTS: { part: MonthPart; label: string; from: number; to: number }[] = [
  { part: "inicio", label: "dias 1 a 10", from: 1, to: 10 },
  { part: "meio", label: "dias 11 a 20", from: 11, to: 20 },
  { part: "fim", label: "dias 21 ao fim do mês", from: 21, to: 31 },
];

const partOf = (day: number) => PARTS.find(p => day >= p.from && day <= p.to)!;

/**
 * Sales per part of the month. Parts have different lengths and the first/current months are incomplete,
 * so each part is also expressed per observed day (first dated sale to `today`, both YYYY-MM-DD).
 */
export function salesByMonthPart(sales: Sale[], today: string): MonthPartStats[] {
  const dated = sales.filter(sale => sale.date);
  const stats = PARTS.map(p => ({ part: p.part, label: p.label, observedDays: 0, units: 0, revenue: 0, profit: 0, unitsPerDay: 0 }));
  if (!dated.length) return stats;
  dated.forEach(sale => {
    const stat = stats.find(s => s.part === partOf(Number(sale.date.slice(8, 10))).part)!;
    stat.units += sale.quantity;
    stat.revenue += sale.salePrice * sale.quantity;
    stat.profit += sale.profit ?? 0;
  });
  const first = dated.map(sale => sale.date.slice(0, 10)).sort()[0];
  for (let t = Date.parse(first); t <= Date.parse(today); t += 86_400_000) {
    stats.find(s => s.part === partOf(new Date(t).getUTCDate()).part)!.observedDays++;
  }
  stats.forEach(s => {
    s.revenue = +s.revenue.toFixed(2);
    s.profit = +s.profit.toFixed(2);
    s.unitsPerDay = s.observedDays ? +(s.units / s.observedDays).toFixed(3) : 0;
  });
  return stats;
}

/** One line per sale, newest first, for the AI analysis. */
export function salesLog(sales: Sale[], products: Product[], limit = 600): string {
  const byId = new Map(products.map(product => [product.id, product]));
  return [...sales].filter(sale => sale.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit).map(sale => {
    const product = byId.get(sale.productId);
    return `${sale.date.slice(0, 10)} | ${product?.name ?? "Desconhecido"} | ${product?.category ?? ""} | ${sale.quantity} un | ${sale.salePrice} EUR | lucro ${sale.profit ?? "por confirmar"}`;
  }).join("\n");
}
