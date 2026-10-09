import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { categoryData, computeDashboard, money } from "@/lib/dashboardMetrics";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { DollarSign, ShoppingCart, TrendingUp, Package, Warehouse, Percent, Clock, Calculator, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { planDateRepairs } from "@/lib/repairDates";
import { toast } from "sonner";
import KpiCard from "@/components/dashboard/KpiCard";
import ProfitOverTimeChart from "@/components/dashboard/ProfitOverTimeChart";
import TopProductsChart from "@/components/dashboard/TopProductsChart";
import ProfitByProductChart from "@/components/dashboard/ProfitByProductChart";
import PurchasesVsSalesChart from "@/components/dashboard/PurchasesVsSalesChart";
import AnalyzeDialog from "@/components/dashboard/AnalyzeDialog";

function pickupDeadline(deliveryDate: string) {
  const [year, month, day] = deliveryDate.split("-").map(Number);
  const deadline = new Date(Date.UTC(year, month - 1, day));
  deadline.setUTCDate(deadline.getUTCDate() + 7);
  return deadline;
}

function utcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export default function Dashboard() {
  const store = useStore();
  const [repairing, setRepairing] = useState(false);
  const [category, setCategory] = usePersistedState("dashboard-category", "all");
  const categories = useMemo(() => {
    const activeProductIds = new Set([
      ...store.purchases.map(purchase => purchase.productId),
      ...store.sales.map(sale => sale.productId),
    ]);
    return [...new Set(store.products.filter(product => activeProductIds.has(product.id)).map(product => product.category))]
      .sort((a,b) => a.localeCompare(b, "pt"));
  }, [store.products,store.purchases,store.sales]);
  const activeCategory = categories.includes(category) ? category : "all";
  const data = useMemo(() => categoryData(store.products,store.purchases,store.sales,store.expenses,activeCategory), [store.products,store.purchases,store.sales,store.expenses,activeCategory]);
  const d = useMemo(() => computeDashboard(data.purchases,data.sales,data.products,data.expenses), [data]);
  const summaries = useMemo(() => categories.map(name => {
    const c = categoryData(store.products,store.purchases,store.sales,store.expenses,name);
    return {name,...computeDashboard(c.purchases,c.sales,c.products,c.expenses)};
  }).filter(c => c.productCount || c.totalExpenses), [categories,store.products,store.purchases,store.sales,store.expenses]);
  const fmt = money;
  const partial = d.missingCosts > 0;
  const detailQuery = (detail: string, path: string) => `${path}?detalhe=${detail}${activeCategory === "all" ? "" : `&categoria=${encodeURIComponent(activeCategory)}`}`;
  const dateRepairs = useMemo(() => planDateRepairs(store.purchases, store.sales, new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())), [store.purchases, store.sales]);
  const repairDates = async () => {
    if (repairing) return;
    setRepairing(true);
    try {
      for (const update of dateRepairs.purchaseUpdates) {
        const { data, error } = await supabase.from("purchases").update({ date: update.date }).eq("id", update.id).select("id,date").single();
        if (error || data?.date !== update.date) throw error ?? new Error("Compra não atualizada");
      }
      for (const update of dateRepairs.saleUpdates) {
        const { data, error } = await supabase.from("sales").update({ date: update.date }).eq("id", update.id).select("id,date").single();
        if (error || data?.date !== update.date) throw error ?? new Error("Venda não atualizada");
      }
      toast.success(`${dateRepairs.purchaseUpdates.length} compras e ${dateRepairs.saleUpdates.length} vendas corrigidas`);
      window.location.reload();
    } catch {
      toast.error("Não foi possível concluir a correção. Tente novamente; as datas já corrigidas não serão alteradas.");
      setRepairing(false);
    }
  };
  const pickupAlerts = useMemo(() => {
    const productsById = new Map(data.products.map(product => [product.id, product]));
    const today = utcToday();
    return data.purchases.flatMap(purchase => {
      if (!purchase.deliveryDate || purchase.orderStatus !== "delivered") return [];
      const deadline = pickupDeadline(purchase.deliveryDate);
      const daysRemaining = Math.round((deadline.getTime() - today.getTime()) / 86_400_000);
      if (daysRemaining > 2) return [];
      return [{
        id: purchase.id,
        name: productsById.get(purchase.productId)?.name ?? "Produto removido",
        deadline: deadline.toISOString().slice(0, 10),
        daysRemaining,
      }];
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [data]);
  const kpis = [
    {label: "Total das compras", shortLabel: "Total compras", value: fmt(d.totalPurchases), href: detailQuery("purchases", "/admin/compras"), icon: ShoppingCart, iconBg:"bg-orange-200", iconColor:"text-orange-800", valueClassName:"text-orange-800", accentClassName:"border-orange-200"},
    {label: "Unidades compradas", shortLabel: "Unid. compradas", value: String(data.purchases.reduce((total, purchase) => total + purchase.quantity, 0)), href: detailQuery("purchases", "/admin/compras"), icon: Package, iconBg:"bg-orange-200", iconColor:"text-orange-800", valueClassName:"text-orange-800", accentClassName:"border-orange-200"},
    {label: "Total de vendas", shortLabel: "Total vendas", value: fmt(d.totalSales), href: detailQuery("sales", "/admin/vendas"), icon: DollarSign, iconBg:"bg-blue-100", iconColor:"text-blue-700", valueClassName:"text-blue-700", accentClassName:"border-blue-100"},
    {label: "Unidades vendidas", shortLabel: "Unid. vendidas", value: String(d.unitsSold), href: detailQuery("sales", "/admin/vendas"), icon: Package, iconBg:"bg-blue-100", iconColor:"text-blue-700", valueClassName:"text-blue-700", accentClassName:"border-blue-100"},
    {label: "Unidades para vender (stock + por receber)", shortLabel: "Unid. para vender", value: String(d.stockUnits), href: detailQuery("stock", "/admin/compras"), icon: Package, iconBg:"bg-indigo-100", iconColor:"text-indigo-700", valueClassName:"text-indigo-700", accentClassName:"border-indigo-100"},
    {label: "Valor das compras em stock", shortLabel: "Compras em stock", value: fmt(d.stockValue), href: detailQuery("stock", "/admin/compras"), icon: Warehouse, iconBg:"bg-indigo-100", iconColor:"text-indigo-700", valueClassName:"text-indigo-700", accentClassName:"border-indigo-100"},
    {label: partial ? "Lucro apurado (parcial)" : "Lucro das vendas", shortLabel: partial ? "Lucro parcial" : "Lucro vendas", value: fmt(d.totalProfit), href: detailQuery("sales", "/admin/vendas"), icon: TrendingUp, iconBg:"bg-emerald-100", iconColor:"text-emerald-700", valueClassName:"text-emerald-700", accentClassName:"border-emerald-100"},
    {label: "Valor exposição = lucro das vendas - compras em stock", shortLabel: "Exposição", value: fmt(d.exposureValue), href: detailQuery("sales", "/admin/vendas"), icon: TrendingUp, iconBg:d.exposureValue >= 0 ? "bg-violet-100" : "bg-red-100", iconColor:d.exposureValue >= 0 ? "text-violet-700" : "text-red-700", valueClassName:d.exposureValue >= 0 ? "text-violet-700" : "text-red-700", accentClassName:d.exposureValue >= 0 ? "border-violet-100" : "border-red-100"},
    {label: "Valor do stock recebido", shortLabel: "Stock recebido", value: fmt(d.receivedStockValue), href: detailQuery("received", "/admin/compras"), icon: Warehouse, iconBg:"bg-cyan-100", iconColor:"text-cyan-700", valueClassName:"text-cyan-700", accentClassName:"border-cyan-100"},
    {label: "Unidades em stock (recebido)", shortLabel: "Unid. em stock", value: String(d.receivedStockUnits), href: detailQuery("received", "/admin/compras"), icon: Package, iconBg:"bg-cyan-100", iconColor:"text-cyan-700", valueClassName:"text-cyan-700", accentClassName:"border-cyan-100"},
    {label: "Unidades por receber", shortLabel: "Unid. por receber", value: String(d.pendingStockUnits), href: detailQuery("pending", "/admin/compras"), icon: Package, iconBg:"bg-amber-100", iconColor:"text-amber-700", valueClassName:"text-amber-700", accentClassName:"border-amber-100"},
    {label: "Valor das unidades por receber", shortLabel: "Stock por receber", value: fmt(d.pendingStockValue), href: detailQuery("pending", "/admin/compras"), icon: ShoppingCart, iconBg:"bg-amber-100", iconColor:"text-amber-700", valueClassName:"text-amber-700", accentClassName:"border-amber-100"},
    {label: "Despesas operacionais", shortLabel: "Despesas", value: fmt(d.totalExpenses), href: detailQuery("expenses", "/admin/despesas"), icon: Calculator, iconBg:"bg-rose-100", iconColor:"text-rose-700", valueClassName:"text-rose-700", accentClassName:"border-rose-100"},
    {label: partial ? "Resultado após despesas (parcial)" : "Resultado após despesas", shortLabel: partial ? "Resultado parcial" : "Após despesas", value: fmt(d.netProfit), href: detailQuery("sales", "/admin/vendas"), icon: TrendingUp, iconBg:d.netProfit >= 0 ? "bg-green-100" : "bg-red-100", iconColor:d.netProfit >= 0 ? "text-green-700" : "text-red-700", valueClassName:d.netProfit >= 0 ? "text-green-700" : "text-red-700", accentClassName:d.netProfit >= 0 ? "border-green-100" : "border-red-100"},
    {label: partial ? "Margem das vendas com custo" : "Margem das vendas", shortLabel: partial ? "Margem c/ custo" : "Margem vendas", value: `${(d.avgMargin*100).toFixed(1)}%`, href: detailQuery("sales", "/admin/vendas"), icon: Percent, iconBg:"bg-teal-100", iconColor:"text-teal-700", valueClassName:"text-teal-700", accentClassName:"border-teal-100"},
    {label: "ROI das vendas com custo", shortLabel: "ROI vendas", value: `${(d.roiRealized*100).toFixed(1)}%`, href: detailQuery("sales", "/admin/vendas"), icon: RefreshCw, iconBg:"bg-sky-100", iconColor:"text-sky-700", valueClassName:"text-sky-700", accentClassName:"border-sky-100"},
    {label: "Tempo médio até à venda", shortLabel: "Tempo médio", value: `${d.avgVelocity.toFixed(0)} dias`, href: detailQuery("sales", "/admin/vendas"), icon: Clock, iconBg:"bg-orange-100", iconColor:"text-orange-700", valueClassName:"text-orange-700", accentClassName:"border-orange-100"},
  ];
  const topProducts = d.topProducts.map(([name,qty]) => ({name,qty}));
  const profitByProduct = d.profitByProduct.map(([name,profit]) => ({name,profit}));
  const {profitOverTime,purchasesVsSales} = d;
  const pricedPurchases = data.purchases.filter(purchase => purchase.price != null);
  const pricedUnits = pricedPurchases.reduce((total, purchase) => total + purchase.quantity, 0);
  const soldUnitsWithKnownCost = data.sales.filter(sale => sale.profit != null).reduce((total, sale) => total + sale.quantity, 0);
  const productNameById = new Map(data.products.map(product => [product.id, product.name]));
  const topProductCosts = topProducts.map(({name, qty}) => {
    const purchasesForName = pricedPurchases.filter(purchase => productNameById.get(purchase.productId) === name);
    const units = purchasesForName.reduce((total, purchase) => total + purchase.quantity, 0);
    const averageCost = units ? (purchasesForName.reduce((total, purchase) => total + purchase.price! * purchase.quantity, 0) / units).toFixed(2) : "desconhecido";
    return `${name}: ${qty} unidades vendidas; custo médio de compra por unidade: ${averageCost} EUR`;
  });
  const analyzeData = {
    category: activeCategory === "all" ? "Todas as categorias" : activeCategory,
    totalPurchases:d.totalPurchases.toFixed(2), totalSales:d.totalSales.toFixed(2),totalProfit:d.totalProfit.toFixed(2),
    avgMargin:(d.avgMargin*100).toFixed(1),roiRealized:(d.roiRealized*100).toFixed(1),
    stockValue:d.stockValue.toFixed(2),exposureValue:d.exposureValue.toFixed(2),avgVelocity:d.avgVelocity.toFixed(0),avgProfitPerSale:d.avgProfitPerSale.toFixed(2),
    operationalExpenses:d.totalExpenses.toFixed(2),netProfit:d.netProfit.toFixed(2),
    productCount:d.productCount,topProducts:topProductCosts.join("; "),
    unitsPurchased:data.purchases.reduce((total, purchase) => total + purchase.quantity, 0),
    unitsSold:d.unitsSold,stockUnits:d.stockUnits,receivedStockUnits:d.receivedStockUnits,pendingStockUnits:d.pendingStockUnits,
    avgPurchaseUnitCost:pricedUnits ? (pricedPurchases.reduce((total, purchase) => total + purchase.price! * purchase.quantity, 0) / pricedUnits).toFixed(2) : null,
    purchasesWithoutCost:d.missingPurchaseCosts,
    avgSoldUnitCost:soldUnitsWithKnownCost ? (d.cogs / soldUnitsWithKnownCost).toFixed(2) : null,
    dataQuality: `${d.missingCosts} vendas sem custo; ${d.undatedSales} vendas sem data; ${d.unlinkedSales} vendas sem compra associada. Lucro parcial quando há custos em falta.`,
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
        <AnalyzeDialog key={activeCategory} dashboardData={analyzeData} />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filtrar por categoria">
        {["all",...categories].map(c => <Button key={c} size="sm" className="min-h-10 shrink-0 rounded-full px-4 text-sm font-medium" aria-pressed={activeCategory===c} variant={activeCategory===c ? "default" : "outline"} onClick={() => setCategory(c)}>{c === "all" ? "Todas as categorias" : c}</Button>)}
      </div>
      {(dateRepairs.purchaseUpdates.length > 0 || dateRepairs.saleUpdates.length > 0) && <section className="rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="repair-dates-heading">
        <h2 id="repair-dates-heading" className="font-semibold">Corrigir datas do histórico</h2>
        <p className="mt-1 text-sm text-muted-foreground">{dateRepairs.purchaseUpdates.length} compras sem data e {dateRepairs.saleUpdates.length} vendas sem data ou anteriores à compra. Para compras sem data, usa a primeira venda conhecida, a data de entrega ou a data de hoje. Para vendas, usa a data da compra quando falta a data ou quando a venda é anterior.</p>
        <Button className="mt-3" onClick={repairDates} disabled={repairing}>{repairing ? "A corrigir…" : "Corrigir datas agora"}</Button>
      </section>}
      {pickupAlerts.length > 0 && <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 sm:p-5" aria-labelledby="pickup-alerts-heading">
        <div className="mb-3 flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" /><div><h2 id="pickup-alerts-heading" className="font-semibold">Encomendas para levantar</h2><p className="text-sm text-amber-900">{pickupAlerts.length} {pickupAlerts.length === 1 ? "encomenda aproxima-se" : "encomendas aproximam-se"} da data limite.</p></div></div>
        <div className="divide-y divide-amber-200">
          {pickupAlerts.map(alert => <Link key={alert.id} to={`/admin/compras?registo=${encodeURIComponent(alert.id)}`} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm hover:underline"><span className="min-w-0"><strong className="block truncate">{alert.name}</strong><span className="text-xs text-amber-900">Levantar até {new Intl.DateTimeFormat("pt-PT").format(new Date(`${alert.deadline}T00:00:00`))}</span></span><span className="shrink-0 rounded-full bg-amber-200 px-2.5 py-1 text-xs font-semibold">{alert.daysRemaining < 0 ? `${Math.abs(alert.daysRemaining)} d em atraso` : alert.daysRemaining === 0 ? "Termina hoje" : `${alert.daysRemaining} d restantes`}</span></Link>)}
        </div>
      </section>}
      {/* KPIs */}
      <div className="space-y-6">
        <section aria-labelledby="activity-heading" className="space-y-3"><h2 id="activity-heading" className="text-sm font-semibold text-foreground">Compras e vendas</h2><div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{kpis.slice(0, 5).map(kpi => <KpiCard key={kpi.label} {...kpi} />)}</div></section>
        <section aria-labelledby="stock-heading" className="space-y-3"><h2 id="stock-heading" className="text-sm font-semibold text-foreground">Resultado e inventário</h2><div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">{kpis.slice(5, 11).map(kpi => <KpiCard key={kpi.label} {...kpi} />)}</div></section>
        <section aria-labelledby="indicators-heading" className="space-y-3"><h2 id="indicators-heading" className="text-sm font-semibold text-foreground">Outros indicadores</h2><div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{kpis.slice(11).map(kpi => <KpiCard key={kpi.label} {...kpi} />)}</div></section>
      </div>

      {activeCategory === "all" && summaries.length > 0 && <section className="overflow-hidden rounded-xl border bg-card">
        <h2 className="px-5 pt-5 text-base font-semibold">Comparar categorias</h2>
        <div className="overflow-x-auto p-5"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="pb-3">Categoria</th><th className="pb-3 text-right">Vendas</th><th className="pb-3 text-right">Lucro apurado</th><th className="pb-3 text-right">Stock</th><th className="pb-3 text-right">Exposição</th></tr></thead>
        <tbody>{summaries.map(c => <tr key={c.name} className="border-b last:border-0"><td className="py-3"><button className="font-semibold text-primary underline-offset-4 hover:underline" onClick={() => setCategory(c.name)}>{c.name}</button></td><td className="text-right font-semibold text-blue-700">{fmt(c.totalSales)}</td><td className="text-right font-semibold text-emerald-700">{fmt(c.totalProfit)}{c.missingCosts > 0 ? " *" : ""}</td><td className="text-right font-semibold text-indigo-700">{fmt(c.stockValue)}</td><td className="text-right font-semibold text-violet-700">{fmt(c.exposureValue)}</td></tr>)}</tbody></table></div>
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
