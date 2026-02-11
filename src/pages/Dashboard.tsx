import { useStore } from "@/lib/store";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, TrendingUp, Package } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = [
  "hsl(220,70%,50%)", "hsl(152,60%,42%)", "hsl(38,92%,50%)",
  "hsl(340,65%,50%)", "hsl(270,60%,55%)",
];

export default function Dashboard() {
  const { purchases, sales, products, getProduct } = useStore();

  const totalPurchases = useMemo(() => purchases.reduce((s, p) => s + p.price * p.quantity, 0), [purchases]);
  const totalSales = useMemo(() => sales.reduce((s, v) => s + v.salePrice * v.quantity, 0), [sales]);
  const totalProfit = useMemo(() => sales.reduce((s, v) => s + v.profit, 0), [sales]);

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach(s => {
      const name = getProduct(s.productId)?.name ?? "Desconhecido";
      map.set(name, (map.get(name) ?? 0) + s.quantity);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));
  }, [sales, getProduct]);

  const profitOverTime = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach(s => {
      const month = s.date.slice(0, 7);
      map.set(month, (map.get(month) ?? 0) + s.profit);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, profit]) => ({ month, profit }));
  }, [sales]);

  const fmt = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

  const kpis = [
    { label: "Total Compras", value: fmt(totalPurchases), icon: ShoppingCart, color: "text-chart-1" },
    { label: "Total Vendas", value: fmt(totalSales), icon: DollarSign, color: "text-chart-2" },
    { label: "Lucro Total", value: fmt(totalProfit), icon: TrendingUp, color: totalProfit >= 0 ? "text-success" : "text-destructive" },
    { label: "Produtos", value: products.length, icon: Package, color: "text-chart-3" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-5 w-5 ${color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profit over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução do Lucro</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {profitOverTime.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Adicione vendas para ver o gráfico
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Line type="monotone" dataKey="profit" stroke="hsl(152,60%,42%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {topProducts.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Adicione vendas para ver o gráfico
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="qty" name="Quantidade" radius={[4, 4, 0, 0]}>
                    {topProducts.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown pie */}
      {sales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={(() => {
                    const map = new Map<string, number>();
                    sales.forEach(s => {
                      const cat = getProduct(s.productId)?.category ?? "Outros";
                      map.set(cat, (map.get(cat) ?? 0) + s.salePrice * s.quantity);
                    });
                    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
                  })()}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name }) => name}
                >
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
