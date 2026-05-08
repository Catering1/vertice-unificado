import { useStore } from "@/lib/store";
import { useMemo } from "react";
import { DollarSign, ShoppingCart, TrendingUp, Package, Warehouse, Percent, Clock, Calculator, RefreshCw } from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import ProfitOverTimeChart from "@/components/dashboard/ProfitOverTimeChart";
import TopProductsChart from "@/components/dashboard/TopProductsChart";
import ProfitByProductChart from "@/components/dashboard/ProfitByProductChart";
import PurchasesVsSalesChart from "@/components/dashboard/PurchasesVsSalesChart";
import AnalyzeDialog from "@/components/dashboard/AnalyzeDialog";

export default function Dashboard() {
  const { purchases, sales, products, getProduct } = useStore();

  const totalPurchases = useMemo(() => purchases.reduce((s, p) => s + p.price * p.quantity, 0), [purchases]);
  const totalSales = useMemo(() => sales.reduce((s, v) => s + v.salePrice * v.quantity, 0), [sales]);
  const totalProfit = useMemo(() => sales.reduce((s, v) => s + v.profit, 0), [sales]);

  const { stockValue, productsInStock } = useMemo(() => {
    const purchasedQty = new Map<string, number>();
    const soldQty = new Map<string, number>();
    purchases.forEach(p => purchasedQty.set(p.productId, (purchasedQty.get(p.productId) ?? 0) + p.quantity));
    sales.forEach(s => soldQty.set(s.productId, (soldQty.get(s.productId) ?? 0) + s.quantity));
    let total = 0;
    let inStockCount = 0;
    purchasedQty.forEach((qty, productId) => {
      const sold = soldQty.get(productId) ?? 0;
      const inStock = Math.max(0, qty - sold);
      if (inStock > 0) inStockCount++;
      const product = getProduct(productId);
      total += inStock * (product?.purchasePrice ?? 0);
    });
    return { stockValue: total, productsInStock: inStockCount };
  }, [purchases, sales, getProduct]);

  const avgProfitPerSale = useMemo(() => sales.length > 0 ? totalProfit / sales.length : 0, [totalProfit, sales]);
  const avgMargin = useMemo(() => totalSales > 0 ? (totalProfit / totalSales) * 100 : 0, [totalProfit, totalSales]);
  

  const roiRealized = useMemo(() => {
    const soldProductIds = new Set(sales.map(s => s.productId));
    const costOfSold = purchases
      .filter(p => soldProductIds.has(p.productId))
      .reduce((sum, p) => sum + p.price * p.quantity, 0);
    return costOfSold > 0 ? (totalProfit / costOfSold) * 100 : 0;
  }, [sales, purchases, totalProfit]);

  const avgVelocity = useMemo(() => {
    if (sales.length === 0) return 0;
    let totalDays = 0;
    let count = 0;
    sales.forEach(s => {
      const productPurchases = purchases
        .filter(p => p.productId === s.productId)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (productPurchases.length > 0) {
        const purchaseDate = new Date(productPurchases[0].date);
        const saleDate = new Date(s.date);
        const diff = (saleDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) { totalDays += diff; count++; }
      }
    });
    return count > 0 ? totalDays / count : 0;
  }, [sales, purchases]);

  // Stock Turnover = COGS / Stock Value
  const { stockTurnover, cogs } = useMemo(() => {
    const soldProductIds = new Set(sales.map(s => s.productId));
    const cogsVal = purchases
      .filter(p => soldProductIds.has(p.productId))
      .reduce((sum, p) => sum + p.price * p.quantity, 0);
    const turnover = stockValue > 0 ? cogsVal / stockValue : 0;
    return { stockTurnover: turnover, cogs: cogsVal };
  }, [sales, purchases, stockValue]);

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach(s => {
      const name = getProduct(s.productId)?.name ?? "Desconhecido";
      map.set(name, (map.get(name) ?? 0) + s.quantity);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));
  }, [sales, getProduct]);

  const profitByProduct = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach(s => {
      const name = getProduct(s.productId)?.name ?? "Desconhecido";
      map.set(name, (map.get(name) ?? 0) + s.profit);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, profit]) => ({ name, profit }));
  }, [sales, getProduct]);

  const profitOverTime = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach(s => {
      const month = s.date.slice(0, 7);
      map.set(month, (map.get(month) ?? 0) + s.profit);
    });
    // Include all months from purchases too, so months without profit still show
    const allMonths = new Set<string>(map.keys());
    purchases.forEach(p => allMonths.add(p.date.slice(0, 7)));
    if (allMonths.size === 0) return [];
    const sorted = Array.from(allMonths).sort();
    // Fill gaps between first and last month
    const [startY, startM] = sorted[0].split("-").map(Number);
    const [endY, endM] = sorted[sorted.length - 1].split("-").map(Number);
    const result: { month: string; profit: number }[] = [];
    let y = startY, m = startM;
    while (y < endY || (y === endY && m <= endM)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      result.push({ month: key, profit: map.get(key) ?? 0 });
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return result;
  }, [sales, purchases]);

  const purchasesVsSales = useMemo(() => {
    const map = new Map<string, { compras: number; vendas: number }>();
    purchases.forEach(p => {
      const month = p.date.slice(0, 7);
      const entry = map.get(month) ?? { compras: 0, vendas: 0 };
      entry.compras += p.price * p.quantity;
      map.set(month, entry);
    });
    sales.forEach(s => {
      const month = s.date.slice(0, 7);
      const entry = map.get(month) ?? { compras: 0, vendas: 0 };
      entry.vendas += s.salePrice * s.quantity;
      map.set(month, entry);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([month, v]) => ({ month, ...v }));
  }, [purchases, sales]);

  const fmt = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

  const kpis = [
    { label: "Total Compras", value: fmt(totalPurchases), icon: ShoppingCart, iconBg: "bg-chart-1/15", iconColor: "text-chart-1" },
    { label: "Total Vendas", value: fmt(totalSales), icon: DollarSign, iconBg: "bg-chart-2/15", iconColor: "text-chart-2" },
    { label: "Lucro Total", value: fmt(totalProfit), icon: TrendingUp, iconBg: "bg-success/15", iconColor: "text-success", valueClassName: "text-success" },
    { label: "Valor em Stock", value: fmt(stockValue), icon: Warehouse, iconBg: "bg-chart-3/15", iconColor: "text-chart-3" },
    { label: "Produtos", value: String(products.length), icon: Package, iconBg: "bg-chart-4/15", iconColor: "text-chart-4" },
    { label: "Margem Média", value: `${avgMargin.toFixed(1)}%`, icon: Percent, iconBg: "bg-chart-2/15", iconColor: "text-chart-2" },
    { label: "Produtos em Stock", value: String(productsInStock), icon: Package, iconBg: "bg-chart-1/15", iconColor: "text-chart-1" },
    { label: "ROI Realizado", value: `${roiRealized.toFixed(1)}%`, icon: TrendingUp, iconBg: "bg-success/15", iconColor: "text-success", valueClassName: "text-success" },
    { label: "Lucro Médio/Venda", value: fmt(avgProfitPerSale), icon: Calculator, iconBg: "bg-chart-4/15", iconColor: "text-chart-4" },
    { label: "Tempo Médio Venda", value: `${avgVelocity.toFixed(0)} dias`, icon: Clock, iconBg: "bg-chart-5/15", iconColor: "text-chart-5" },
    { label: "Stock Turnover", value: stockTurnover.toFixed(2), icon: RefreshCw, iconBg: "bg-chart-3/15", iconColor: "text-chart-3" },
  ];

  const analyzeData = {
    totalPurchases: totalPurchases.toFixed(2),
    totalSales: totalSales.toFixed(2),
    totalProfit: totalProfit.toFixed(2),
    avgMargin: avgMargin.toFixed(1),
    roiRealized: roiRealized.toFixed(1),
    stockTurnover: stockTurnover.toFixed(2),
    stockValue: stockValue.toFixed(2),
    avgVelocity: avgVelocity.toFixed(0),
    avgProfitPerSale: avgProfitPerSale.toFixed(2),
    productCount: products.length,
    topProducts: topProducts.map(p => `${p.name} (${p.qty})`).join(", "),
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Analyze button */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Dashboard</h1>
        <AnalyzeDialog dashboardData={analyzeData} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfitOverTimeChart data={profitOverTime} fmt={fmt} />
        <TopProductsChart data={topProducts} />
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfitByProductChart data={profitByProduct} fmt={fmt} />
        <PurchasesVsSalesChart data={purchasesVsSales} fmt={fmt} />
      </div>
    </div>
  );
}
