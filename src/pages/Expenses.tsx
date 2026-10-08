import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { money, displayDate } from "@/lib/dashboardMetrics";
import type { Expense } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default function Expenses() {
  const { expenses, categories, addExpense, updateExpense, deleteExpense, loading, error } = useStore();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const filtered = useMemo(() => expenses.filter(expense =>
    `${expense.description} ${expense.category}`.toLocaleLowerCase("pt-PT").includes(search.toLocaleLowerCase("pt-PT"))
  ).sort((a, b) => b.date.localeCompare(a.date)), [expenses, search]);
  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);

  const openNew = () => {
    setEditing(null);
    setDescription("");
    setCategory(categories[0] || "");
    setAmount("");
    setDate(today());
    setDialogOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setDescription(expense.description);
    setCategory(expense.category);
    setAmount(String(expense.amount));
    setDate(expense.date);
    setDialogOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!description.trim() || !category || !Number.isFinite(value) || value <= 0 || (!date && !editing)) {
      toast.error("Preenche a descrição, categoria, valor e data.");
      return;
    }
    setSaving(true);
    try {
      const fields = { description: description.trim(), category, amount: value, date };
      if (editing) {
        await updateExpense({ ...fields, id: editing.id });
      } else {
        await addExpense(fields);
      }
      setDialogOpen(false);
      toast.success(editing ? "Despesa atualizada" : "Despesa registada");
    } catch {
      toast.error(editing ? "Não foi possível atualizar a despesa." : "Não foi possível registar a despesa.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteExpense(deleting.id);
      setDeleting(null);
      toast.success("Despesa eliminada");
    } catch {
      toast.error("Não foi possível eliminar a despesa.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p role="status" className="py-12 text-center text-muted-foreground">A carregar despesas…</p>;
  if (error) return <p role="alert" className="rounded-xl border p-6 text-destructive">{error}</p>;

  return <div className="space-y-5 animate-fade-in">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Despesas operacionais</h1><p className="mt-1 text-sm text-muted-foreground">{filtered.length} registos · Total {money(total)}</p></div>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto">
        <Input className="w-full sm:w-64" aria-label="Pesquisar despesas" placeholder="Pesquisar descrição ou categoria…" value={search} onChange={event => setSearch(event.target.value)} />
        <Button className="w-full gap-2 sm:w-auto" onClick={openNew}><Plus className="h-4 w-4" />Nova despesa</Button>
      </div>
    </div>
    <Card><CardContent className="overflow-x-auto p-0">
      <Table><TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Data</TableHead><TableHead className="w-24 text-right">Ações</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.length ? filtered.map(expense => <TableRow key={expense.id}><TableCell className="font-medium">{expense.description}</TableCell><TableCell>{expense.category}</TableCell><TableCell className="text-right font-semibold">{money(expense.amount)}</TableCell><TableCell>{displayDate(expense.date)}</TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label={`Editar despesa: ${expense.description}`} onClick={() => openEdit(expense)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label={`Eliminar despesa: ${expense.description}`} onClick={() => setDeleting(expense)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{search ? "Nenhuma despesa encontrada" : "Ainda não existem despesas registadas"}</TableCell></TableRow>}</TableBody>
      </Table>
    </CardContent></Card>

    <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) setDialogOpen(open); }}>
      <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editing ? "Editar despesa" : "Registar despesa"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4 pt-2">
          <div className="space-y-1.5"><Label htmlFor="expense-description">Descrição</Label><Input id="expense-description" value={description} onChange={event => setDescription(event.target.value)} maxLength={500} required autoFocus /></div>
          <div className="space-y-1.5"><Label htmlFor="expense-category">Categoria</Label><select id="expense-category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={category} onChange={event => setCategory(event.target.value)} required><option value="">Seleciona uma categoria</option>{categories.map(name => <option key={name} value={name}>{name}</option>)}</select></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="expense-amount">Valor (€)</Label><Input id="expense-amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required /></div><div className="space-y-1.5"><Label htmlFor="expense-date">Data{editing ? " (opcional)" : ""}</Label><Input id="expense-date" type="date" value={date} onChange={event => setDate(event.target.value)} required={!editing} /></div></div>
          <Button type="submit" className="w-full" disabled={saving || categories.length === 0}>{saving ? "A guardar…" : editing ? "Guardar alterações" : "Guardar despesa"}</Button>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={Boolean(deleting)} onOpenChange={open => { if (!open && !saving) setDeleting(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar despesa?</AlertDialogTitle><AlertDialogDescription>O registo “{deleting?.description}” será eliminado e deixará de contar nos totais do dashboard.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={saving} onClick={event => { event.preventDefault(); void remove(); }}>{saving ? "A eliminar…" : "Eliminar despesa"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
