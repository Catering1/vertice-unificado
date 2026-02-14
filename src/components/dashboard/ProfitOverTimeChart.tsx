import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface Props {
  data: { month: string; profit: number }[];
  fmt: (v: number) => string;
}

export default function ProfitOverTimeChart({ data, fmt }: Props) {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Evolução do Lucro</CardTitle>
      </CardHeader>
      <CardContent className="h-80 px-2 pb-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Adicione vendas para ver o gráfico
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91% / 0.5)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }} />
              <Tooltip
                formatter={(v: number) => [fmt(v), "Lucro"]}
                contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(220 13% 91%)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              />
              <Line type="monotone" dataKey="profit" stroke="hsl(152 60% 42%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(152 60% 42%)" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
