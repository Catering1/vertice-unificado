import { useStore } from "@/lib/store";
import { useMemo } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { categoryData, computeDashboard, money } from "@/lib/dashboardMetrics";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { DollarSign, ShoppingCart, TrendingUp, Package, Warehouse, Percent, Clock, Calculator, RefreshCw } from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import ProfitOverTimeChart from "@/components/dashboard/ProfitOverTimeChart";
import TopProductsChart from "@/components/dashboard/TopProductsChart";
import ProfitByProductChart from "@/components/dashboard/ProfitByProductChart";
import PurchasesVsSalesChart from "@/components/dashboard/PurchasesVsSalesChart";
import AnalyzeDialog from "@/components/dashboard/AnalyzeDialog";

export default function Dashboard() {
  const store = useStore();
  const [category, setCategory] = usePersistedState("dashboard-category", "all");
  const categories = useMemo(() => [...new Set([...store.categories, ...store.products.map(p => p.category), ...store.expenses.map(e => e.category)])].sort((a,b) => a.localeCompare(b, "pt")), [store.categories,store.products,store.expenses]);
  const activeCategory = categories.includes(category) ? category : "all";
  const data = useMemo(() => categoryData(store.products,store.purchases,store.sales,store.expenses,activeCategory), [store.products,store.purchases,store.sales,store.expenses,activeCategory]);
  const d = useMemo(() => computeDashboard(data.purchases,data.sales,data.products,data.expenses), [data]);
  const summaries = useMemo(() => categories.map(name => {
    const c = categoryData(store.products,store.purchases,store.sales,store.expenses,name);
    return {name,...computeDashboard(c.purchases,c.sales,c.products,c.expenses)};
  }).filter(c => c.productCount || c.totalExpenses), [categories,store.products,store.purchases,store.sales,store.expenses]);
  const fmt = money;
  const partial = d.missingCosts > 0;
  const kpis = [
    {label: "Total de vendas", value: fmt(d.totalSales), icon: DollarSign},
    {label: partial ? "Lucro apurado (parcial)" : "Lucro das vendas", value: fmt(d.totalProfit), icon: TrendingUp},
    {label: "Compras registadas", value: fmt(d.totalPurchases), icon: ShoppingCart},
    {label: "Stock disponível", value: fmt(d.stockValue), icon: Warehouse},
    {label: "Unidades vendidas", value: String(d.unitsSold), icon: Package},
    {label: "Despesas operacionais", value: fmt(d.totalExpenses), icon: Calculator},
    {label: partial ? "Resultado após despesas (parcial)" : "Resultado após despesas", value: fmt(d.netProfit), icon: TrendingUp},
    {label: "Unidades em stock", value: String(d.stockUnits), icon: Package},
    {label: partial ? "Margem das vendas com custo" : "Margem das vendas", value: `${(d.avgMargin*100).toFixed(1)}%`, icon: Percent},
    {label: "ROI das vendas com custo", value: `${(d.roiRealized*100).toFixed(1)}%`, icon: RefreshCw},
    {label: "Tempo médio até à venda", value: `${d.avgVelocity.toFixed(0)} dias`, icon: Clock},
  ].map(k => ({...k,iconBg:"bg-primary/10",iconColor:"text-primary"}));
  const topProducts = d.topProducts.map(([name,qty]) => ({name,qty}));
  const profitByProduct = d.profitByProduct.map(([name,profit]) => ({name,profit}));
  const {profitOverTime,purchasesVsSales} = d;
  const analyzeData = {
    category: activeCategory === "all" ? "Todas as categorias" : activeCategory,
    totalPurchases:d.totalPurchases.toFixed(2), totalSales:d.totalSales.toFixed(2),totalProfit:d.totalProfit.toFixed(2),
    avgMargin:(d.avgMargin*100).toFixed(1),roiRealized:(d.roiRealized*100).toFixed(1),stockTurnover:d.stockTurnover.toFixed(2),
    stockValue:d.stockValue.toFixed(2),avgVelocity:d.avgVelocity.toFixed(0),avgProfitPerSale:d.avgProfitPerSale.toFixed(2),
    productCount:d.productCount,topProducts:topProducts.map(p => `${p.name} (${p.qty})`).join(", "),
    dataQuality: `${d.missingCosts} vendas sem custo; ${d.undatedSales} vendas sem data. Lucro parcial quando há custos em falta.`,
  };
  if (store.loading) return <p role="status" className="py-12 text-center text-muted-foreground">A carregar o dashboard…</p>;
  if (store.error) return <p role="alert" className="rounded-xl border p-6 text-destructive">{store.error}</p>;
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Visão do negócio</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{activeCategory === "all" ? "Todas as categorias" : activeCategory}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Receitas, resultados e inventário · todo o histórico</p>
        </div>
        <AnalyzeDialog dashboardData={analyzeData} />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
        {["all",...categories].map(c => <Button key={c} aria-pressed={activeCategory===c} variant={activeCategory===c ? "default" : "outline"} onClick={() => setCategory(c)}>{c === "all" ? "Todas as categorias" : c}</Button>)}
      </div>
      {(partial || d.undatedSales > 0 || d.undatedPurchases > 0 || d.inconsistentDates > 0) && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="note">
        <p className="font-semibold">Dados a confirmar</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {partial && <li>{d.missingCosts} vendas ({fmt(d.missingCostRevenue)}) sem custo de compra. As receitas estão incluídas; o lucro, a margem e o ROI usam apenas vendas com custo conhecido.</li>}
          {(d.undatedSales > 0 || d.undatedPurchases > 0) && <li>{d.undatedSales} vendas ({fmt(d.undatedRevenue)}) e {d.undatedPurchases} compras sem data válida: incluídas nos totais, excluídas dos gráficos mensais.</li>}
          {d.inconsistentDates > 0 && <li>{d.inconsistentDates} vendas anteriores à compra: datas originais preservadas e excluídas do tempo médio de venda.</li>}
        </ul>
      </div>}
      {d.personalUnits > 0 && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-5 py-4 text-sm">
        <span><strong>{d.personalUnits} livros em leitura</strong> · custo {fmt(d.personalValue)} · fora do stock disponível</span>
        <Link className="font-medium underline underline-offset-4" to="/admin/compras">Consultar compras</Link>
      </div>}
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {activeCategory === "all" && summaries.length > 0 && <section className="overflow-hidden rounded-xl border bg-card">
        <h2 className="px-5 pt-5 text-base font-semibold">Comparar categorias</h2>
        <div className="overflow-x-auto p-5"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="pb-3">Categoria</th><th className="pb-3 text-right">Vendas</th><th className="pb-3 text-right">Lucro apurado</th><th className="pb-3 text-right">Stock</th></tr></thead>
        <tbody>{summaries.map(c => <tr key={c.name} className="border-b last:border-0"><td className="py-3"><button className="font-medium underline-offset-4 hover:underline" onClick={() => setCategory(c.name)}>{c.name}</button></td><td className="text-right">{fmt(c.totalSales)}</td><td className="text-right">{fmt(c.totalProfit)}{c.missingCosts > 0 ? " *" : ""}</td><td className="text-right">{fmt(c.stockValue)}</td></tr>)}</tbody></table></div>
        {summaries.some(c => c.missingCosts) && <p className="px-5 pb-4 text-xs text-muted-foreground">* Parcial: existem custos de compra por confirmar.</p>}
      </section>}
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
