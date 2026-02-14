import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";

const COLORS = [
  "hsl(220,70%,50%)", "hsl(152,60%,42%)", "hsl(38,92%,50%)",
  "hsl(340,65%,50%)", "hsl(270,60%,55%)",
];

interface Props {
  data: { name: string; value: number }[];
  fmt: (v: number) => string;
}

export default function SalesByCategoryChart({ data, fmt }: Props) {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Vendas por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="h-80 px-2 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name }) => name}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip
              formatter={(v: number) => fmt(v)}
              contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(220 13% 91%)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
