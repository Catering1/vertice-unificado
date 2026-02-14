import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

const COLORS = [
  "hsl(220,70%,50%)", "hsl(152,60%,42%)", "hsl(38,92%,50%)",
  "hsl(340,65%,50%)", "hsl(270,60%,55%)",
];

interface Props {
  data: { name: string; qty: number }[];
}

export default function TopProductsChart({ data }: Props) {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Produtos Mais Vendidos</CardTitle>
      </CardHeader>
      <CardContent className="h-80 px-2 pb-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Adicione vendas para ver o gráfico
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91% / 0.5)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }} />
              <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(220 13% 91%)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              <Bar dataKey="qty" name="Quantidade" radius={[6, 6, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
