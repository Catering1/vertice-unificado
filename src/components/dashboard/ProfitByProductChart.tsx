import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface Props {
  data: { name: string; profit: number }[];
  fmt: (v: number) => string;
}

export default function ProfitByProductChart({ data, fmt }: Props) {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Lucro por Produto</CardTitle>
      </CardHeader>
      <CardContent className="h-80 px-2 pb-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Adicione vendas para ver o gráfico
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91% / 0.5)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }} tickFormatter={(v: number) => fmt(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }} width={120} />
              <Tooltip
                formatter={(v: number) => [fmt(v), "Lucro"]}
                contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(220 13% 91%)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              />
              <Bar dataKey="profit" name="Lucro" radius={[0, 6, 6, 0]} fill="hsl(152,60%,42%)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
