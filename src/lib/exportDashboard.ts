import ExcelJS from "exceljs";
import type { Product, Purchase, Sale } from "@/types";

const EUR = '#,##0.00 "€"';
const PCT = "0.0%";

function computeDashboard(purchases: Purchase[], sales: Sale[], products: Product[], getProduct: (id: string) => Product | undefined) {
  const totalPurchases = purchases.reduce((s, p) => s + p.price * p.quantity, 0);
  const totalSales = sales.reduce((s, v) => s + v.salePrice * v.quantity, 0);
  const totalProfit = sales.reduce((s, v) => s + v.profit, 0);

  const purchasedQty = new Map<string, number>();
  const soldQty = new Map<string, number>();
  purchases.forEach(p => purchasedQty.set(p.productId, (purchasedQty.get(p.productId) ?? 0) + p.quantity));
  sales.forEach(s => soldQty.set(s.productId, (soldQty.get(s.productId) ?? 0) + s.quantity));
  let stockValue = 0;
  let productsInStock = 0;
  purchasedQty.forEach((qty, productId) => {
    const inStock = Math.max(0, qty - (soldQty.get(productId) ?? 0));
    if (inStock > 0) productsInStock++;
    stockValue += inStock * (getProduct(productId)?.purchasePrice ?? 0);
  });

  const avgProfitPerSale = sales.length > 0 ? totalProfit / sales.length : 0;
  const avgMargin = totalSales > 0 ? totalProfit / totalSales : 0;

  const soldProductIds = new Set(sales.map(s => s.productId));
  const cogs = purchases.filter(p => soldProductIds.has(p.productId)).reduce((sum, p) => sum + p.price * p.quantity, 0);
  const roiRealized = cogs > 0 ? totalProfit / cogs : 0;
  const stockTurnover = stockValue > 0 ? cogs / stockValue : 0;

  let totalDays = 0, count = 0;
  sales.forEach(s => {
    const pp = purchases.filter(p => p.productId === s.productId).sort((a, b) => a.date.localeCompare(b.date));
    if (pp.length > 0) {
      const diff = (new Date(s.date).getTime() - new Date(pp[0].date).getTime()) / (1000 * 60 * 60 * 24);
      if (diff >= 0) { totalDays += diff; count++; }
    }
  });
  const avgVelocity = count > 0 ? totalDays / count : 0;

  const topMap = new Map<string, number>();
  sales.forEach(s => {
    const name = getProduct(s.productId)?.name ?? "Desconhecido";
    topMap.set(name, (topMap.get(name) ?? 0) + s.quantity);
  });
  const topProducts = [...topMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const profitMap = new Map<string, number>();
  sales.forEach(s => {
    const name = getProduct(s.productId)?.name ?? "Desconhecido";
    profitMap.set(name, (profitMap.get(name) ?? 0) + s.profit);
  });
  const profitByProduct = [...profitMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const monthProfit = new Map<string, number>();
  sales.forEach(s => {
    const m = s.date.slice(0, 7);
    monthProfit.set(m, (monthProfit.get(m) ?? 0) + s.profit);
  });
  const allMonths = new Set<string>(monthProfit.keys());
  purchases.forEach(p => allMonths.add(p.date.slice(0, 7)));
  const profitOverTime: { month: string; profit: number }[] = [];
  if (allMonths.size > 0) {
    const sorted = [...allMonths].sort();
    const [sy, sm] = sorted[0].split("-").map(Number);
    const [ey, em] = sorted[sorted.length - 1].split("-").map(Number);
    let y = sy, mo = sm;
    while (y < ey || (y === ey && mo <= em)) {
      const k = `${y}-${String(mo).padStart(2, "0")}`;
      profitOverTime.push({ month: k, profit: monthProfit.get(k) ?? 0 });
      mo++; if (mo > 12) { mo = 1; y++; }
    }
  }

  const pvsMap = new Map<string, { compras: number; vendas: number }>();
  purchases.forEach(p => {
    const m = p.date.slice(0, 7);
    const e = pvsMap.get(m) ?? { compras: 0, vendas: 0 };
    e.compras += p.price * p.quantity;
    pvsMap.set(m, e);
  });
  sales.forEach(s => {
    const m = s.date.slice(0, 7);
    const e = pvsMap.get(m) ?? { compras: 0, vendas: 0 };
    e.vendas += s.salePrice * s.quantity;
    pvsMap.set(m, e);
  });
  const purchasesVsSales = [...pvsMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, v]) => ({ month, ...v }));

  return {
    totalPurchases, totalSales, totalProfit, stockValue, productsInStock,
    avgProfitPerSale, avgMargin, roiRealized, stockTurnover, avgVelocity,
    productCount: products.length, topProducts, profitByProduct, profitOverTime, purchasesVsSales,
  };
}

export async function exportDashboardXlsx(
  purchases: Purchase[],
  sales: Sale[],
  products: Product[],
  getProduct: (id: string) => Product | undefined,
) {
  const d = computeDashboard(purchases, sales, products, getProduct);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Vending Machine";
  wb.created = new Date();

  // ===== Dashboard sheet =====
  const ws = wb.addWorksheet("Dashboard");
  ws.columns = [{ width: 32 }, { width: 18 }, { width: 4 }, { width: 32 }, { width: 18 }];

  const title = ws.addRow(["Dashboard"]);
  title.font = { bold: true, size: 16 };
  ws.addRow([]);

  const kpiHeader = ws.addRow(["KPI", "Valor"]);
  kpiHeader.font = { bold: true };
  kpiHeader.eachCell(c => c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEEEEE" } });

  const kpis: [string, number | string, string?][] = [
    ["Total Compras", d.totalPurchases, EUR],
    ["Total Vendas", d.totalSales, EUR],
    ["Lucro Total", d.totalProfit, EUR],
    ["Valor em Stock", d.stockValue, EUR],
    ["Produtos", d.productCount],
    ["Margem Média", d.avgMargin, PCT],
    ["Produtos em Stock", d.productsInStock],
    ["ROI Realizado", d.roiRealized, PCT],
    ["Lucro Médio/Venda", d.avgProfitPerSale, EUR],
    ["Tempo Médio Venda (dias)", Math.round(d.avgVelocity)],
    ["Stock Turnover", Number(d.stockTurnover.toFixed(2))],
  ];
  kpis.forEach(([label, value, fmt]) => {
    const r = ws.addRow([label, value]);
    if (fmt) r.getCell(2).numFmt = fmt;
  });

  ws.addRow([]);
  const h1 = ws.addRow(["Evolução do Lucro (por mês)"]);
  h1.font = { bold: true, size: 12 };
  const lh = ws.addRow(["Mês", "Lucro"]);
  lh.font = { bold: true };
  d.profitOverTime.forEach(p => {
    const r = ws.addRow([p.month, p.profit]);
    r.getCell(2).numFmt = EUR;
  });

  ws.addRow([]);
  const h2 = ws.addRow(["Top 5 Produtos (quantidade vendida)"]);
  h2.font = { bold: true, size: 12 };
  const th = ws.addRow(["Produto", "Quantidade"]);
  th.font = { bold: true };
  d.topProducts.forEach(([name, qty]) => ws.addRow([name, qty]));

  ws.addRow([]);
  const h3 = ws.addRow(["Lucro por Produto"]);
  h3.font = { bold: true, size: 12 };
  const ph = ws.addRow(["Produto", "Lucro"]);
  ph.font = { bold: true };
  d.profitByProduct.forEach(([name, profit]) => {
    const r = ws.addRow([name, profit]);
    r.getCell(2).numFmt = EUR;
  });

  ws.addRow([]);
  const h4 = ws.addRow(["Compras vs Vendas (por mês)"]);
  h4.font = { bold: true, size: 12 };
  const ch = ws.addRow(["Mês", "Compras", "Vendas"]);
  ch.font = { bold: true };
  d.purchasesVsSales.forEach(v => {
    const r = ws.addRow([v.month, v.compras, v.vendas]);
    r.getCell(2).numFmt = EUR;
    r.getCell(3).numFmt = EUR;
  });

  // ===== Compras sheet =====
  const wsC = wb.addWorksheet("Compras");
  wsC.columns = [
    { header: "Produto", key: "produto", width: 28 },
    { header: "Preço", key: "price", width: 14 },
    { header: "Data", key: "date", width: 14 },
  ];
  wsC.getRow(1).font = { bold: true };
  purchases
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(p => {
      const row = wsC.addRow({
        produto: getProduct(p.productId)?.name ?? "",
        price: p.price,
        date: p.date,
      });
      row.getCell("price").numFmt = EUR;
    });

  // ===== Vendas sheet =====
  const wsV = wb.addWorksheet("Vendas");
  wsV.columns = [
    { header: "Produto", key: "produto", width: 28 },
    { header: "Quantidade", key: "qty", width: 12 },
    { header: "Preço Venda", key: "price", width: 14 },
    { header: "Total", key: "total", width: 14 },
    { header: "Lucro", key: "profit", width: 14 },
    { header: "Data", key: "date", width: 14 },
  ];
  wsV.getRow(1).font = { bold: true };
  sales
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(s => {
      const row = wsV.addRow({
        produto: getProduct(s.productId)?.name ?? "",
        qty: s.quantity,
        price: s.salePrice,
        total: s.salePrice * s.quantity,
        profit: s.profit,
        date: s.date,
      });
      row.getCell("price").numFmt = EUR;
      row.getCell("total").numFmt = EUR;
      row.getCell("profit").numFmt = EUR;
    });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
