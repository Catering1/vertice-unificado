import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { money, displayDate } from "@/lib/dashboardMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Expenses() {
  const { expenses, loading, error } = useStore();
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => expenses.filter(expense =>
    `${expense.description} ${expense.category}`.toLocaleLowerCase("pt-PT").includes(search.toLocaleLowerCase("pt-PT"))
  ).sort((a, b) => b.date.localeCompare(a.date)), [expenses, search]);
  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);

  if (loading) return <p role="status" className="py-12 text-center text-muted-foreground">A carregar despesas…</p>;
  if (error) return <p role="alert" className="rounded-xl border p-6 text-destructive">{error}</p>;

  return <div className="space-y-5 animate-fade-in">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Despesas operacionais</h1><p className="mt-1 text-sm text-muted-foreground">{filtered.length} registos · Total {money(total)}</p></div>
      <Input className="w-full sm:w-72" aria-label="Pesquisar despesas" placeholder="Pesquisar descrição ou categoria…" value={search} onChange={event => setSearch(event.target.value)} />
    </div>
    <Card><CardContent className="overflow-x-auto p-0">
      <Table><TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.length ? filtered.map(expense => <TableRow key={expense.id}><TableCell className="font-medium">{expense.description}</TableCell><TableCell>{expense.category}</TableCell><TableCell className="text-right font-semibold">{money(expense.amount)}</TableCell><TableCell>{displayDate(expense.date)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">{search ? "Nenhuma despesa encontrada" : "Ainda não existem despesas registadas"}</TableCell></TableRow>}</TableBody>
      </Table>
    </CardContent></Card>
  </div>;
}
