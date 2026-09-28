import type { Product, Purchase, Sale, Expense } from "@/types";

const EUR = '#,##0.00 "€"';
const PCT = "0.0%";

import { computeDashboard } from "@/lib/dashboardMetrics";

export async function exportDashboardXlsx(
  purchases: Purchase[],
  sales: Sale[],
  products: Product[],
  getProduct: (id: string) => Product | undefined,
  expenses: Expense[] = [],
) {
  const { default: ExcelJS } = await import("exceljs");
  const d = computeDashboard(purchases, sales, products, expenses);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Vendig Machine Store";
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
    [d.missingCosts ? "Lucro apurado (parcial)" : "Lucro das vendas", d.totalProfit, EUR],
    ["Despesas operacionais", d.totalExpenses, EUR],
    ["Resultado após despesas", d.netProfit, EUR],
    ["Vendas sem custo", d.missingCosts],
    ["Vendas sem data", d.undatedSales],
    ["Leitura / uso pessoal", d.personalValue, EUR],
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
    { header: "Categoria", key: "categoria", width: 18 },
    { header: "Utilização", key: "uso", width: 18 },
    { header: "Quantidade", key: "quantidade", width: 12 },
    { header: "Preço", key: "price", width: 14 },
    { header: "Data da compra", key: "date", width: 16 },
    { header: "Data de entrega", key: "deliveryDate", width: 16 },
  ];
  wsC.getRow(1).font = { bold: true };
  purchases
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(p => {
      const row = wsC.addRow({
        produto: getProduct(p.productId)?.name ?? "",
        categoria: getProduct(p.productId)?.category, uso:getProduct(p.productId)?.inventoryUse === "personal" ? "Leitura" : "Negócio", quantidade:p.quantity,
        price: p.price,
        date: p.date,
        deliveryDate: p.deliveryDate ?? "",
      });
      row.getCell("price").numFmt = EUR;
    });

  // ===== Vendas sheet =====
  const wsV = wb.addWorksheet("Vendas");
  wsV.columns = [
    { header: "Produto", key: "produto", width: 28 },
    { header: "Categoria", key: "categoria", width: 18 },
    { header: "Quantidade", key: "quantidade", width: 12 },
    { header: "Preço Venda", key: "price", width: 14 },
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
        categoria:getProduct(s.productId)?.category,quantidade:s.quantity,
        price: s.salePrice,
        profit: s.profit,
        date: s.date,
      });
      row.getCell("price").numFmt = EUR;
      row.getCell("profit").numFmt = EUR;
    });

  const expenseSheet=wb.addWorksheet("Despesas");
  expenseSheet.addRow(["Categoria","Descrição","Valor","Data"]);
  expenseSheet.columns=[{width:18},{width:36},{width:16},{width:16}];
  expenseSheet.getRow(1).font={bold:true};
  expenses.forEach(e=>{const row=expenseSheet.addRow([e.category,e.description,e.amount,e.date]);row.getCell(3).numFmt=EUR;});
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
