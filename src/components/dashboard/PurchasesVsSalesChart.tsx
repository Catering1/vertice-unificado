import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface Props {
  data: { month: string; compras: number; vendas: number }[];
  fmt: (v: number) => string;
}

export default function PurchasesVsSalesChart({ data, fmt }: Props) {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Volume Compras vs Vendas</CardTitle>
      </CardHeader>
      <CardContent className="h-80 px-2 pb-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Sem dados disponíveis
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91% / 0.5)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }} />
              <Tooltip
                formatter={(v: number, name: string) => [fmt(v), name === "compras" ? "Compras" : "Vendas"]}
                contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(220 13% 91%)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              />
              <Legend formatter={(value) => value === "compras" ? "Compras" : "Vendas"} />
              <Bar dataKey="compras" fill="hsl(220 70% 50%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="vendas" fill="hsl(152 60% 42%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
