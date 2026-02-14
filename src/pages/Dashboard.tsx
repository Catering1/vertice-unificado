import { useStore } from "@/lib/store";
import { useMemo } from "react";
import { DollarSign, ShoppingCart, TrendingUp, Package, Warehouse, ArrowUpRight, ArrowDownRight } from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import ProfitOverTimeChart from "@/components/dashboard/ProfitOverTimeChart";
import TopProductsChart from "@/components/dashboard/TopProductsChart";
import ProfitByProductChart from "@/components/dashboard/ProfitByProductChart";
import SalesByCategoryChart from "@/components/dashboard/SalesByCategoryChart";

export default function Dashboard() {
  const { purchases, sales, products, getProduct } = useStore();

  const totalPurchases = useMemo(() => purchases.reduce((s, p) => s + p.price * p.quantity, 0), [purchases]);
  const totalSales = useMemo(() => sales.reduce((s, v) => s + v.salePrice * v.quantity, 0), [sales]);
  const totalProfit = useMemo(() => sales.reduce((s, v) => s + v.profit, 0), [sales]);

  const stockValue = useMemo(() => {
    const purchasedQty = new Map<string, number>();
    const soldQty = new Map<string, number>();
    purchases.forEach(p => purchasedQty.set(p.productId, (purchasedQty.get(p.productId) ?? 0) + p.quantity));
    sales.forEach(s => soldQty.set(s.productId, (soldQty.get(s.productId) ?? 0) + s.quantity));
    let total = 0;
    purchasedQty.forEach((qty, productId) => {
      const sold = soldQty.get(productId) ?? 0;
      const inStock = Math.max(0, qty - sold);
      const product = getProduct(productId);
      total += inStock * (product?.purchasePrice ?? 0);
    });
    return total;
  }, [purchases, sales, getProduct]);

  

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
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([month, profit]) => ({ month, profit }));
  }, [sales]);

  const salesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach(s => {
      const cat = getProduct(s.productId)?.category ?? "Outros";
      map.set(cat, (map.get(cat) ?? 0) + s.salePrice * s.quantity);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [sales, getProduct]);

  const fmt = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

  const kpis = [
    { label: "Total Compras", value: fmt(totalPurchases), icon: ShoppingCart, iconBg: "bg-chart-1/15", iconColor: "text-chart-1" },
    { label: "Total Vendas", value: fmt(totalSales), icon: DollarSign, iconBg: "bg-chart-2/15", iconColor: "text-chart-2" },
    { label: "Lucro Total", value: fmt(totalProfit), icon: TrendingUp, iconBg: "bg-success/15", iconColor: "text-success", valueClassName: "text-emerald-500" },
    { label: "Valor em Stock", value: fmt(stockValue), icon: Warehouse, iconBg: "bg-chart-3/15", iconColor: "text-chart-3" },
    { label: "Produtos", value: String(products.length), icon: Package, iconBg: "bg-chart-4/15", iconColor: "text-chart-4" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPIs */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
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
        {salesByCategory.length > 0 && <SalesByCategoryChart data={salesByCategory} fmt={fmt} />}
      </div>
    </div>
  );
}
