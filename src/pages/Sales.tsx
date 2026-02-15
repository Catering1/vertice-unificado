import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { usePersistedState } from "@/hooks/usePersistedState";
import { Sale } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

type SortField = "product" | "salePrice" | "profit" | "date";
type SortDir = "asc" | "desc";

export default function Sales() {
  const { sales, purchases, products, categories, addSale, updateSale, deleteSale, getProduct } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [productId, setProductId] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [searchDate, setSearchDate] = usePersistedState("sales-searchDate", "");
  const [catFilter, setCatFilter] = usePersistedState("sales-catFilter", "all");

  const [sortField, setSortField] = usePersistedState<SortField | null>("sales-sortField", null);
  const [sortDir, setSortDir] = usePersistedState<SortDir>("sales-sortDir", "asc");

  // Products that have stock (purchased but not yet sold)
  const availableProducts = useMemo(() => {
    const purchased = new Map<string, number>();
    const sold = new Map<string, number>();
    purchases.forEach(p => purchased.set(p.productId, (purchased.get(p.productId) ?? 0) + p.quantity));
    sales.forEach(s => sold.set(s.productId, (sold.get(s.productId) ?? 0) + s.quantity));
    return products.filter(p => {
      const stock = (purchased.get(p.id) ?? 0) - (sold.get(p.id) ?? 0);
      return stock > 0;
    });
  }, [products, purchases, sales]);

  const openNew = () => {
    setEditingSale(null);
    setProductId(""); setSalePrice(""); setDate(new Date().toISOString().slice(0, 10));
    setDialogOpen(true);
  };

  const openEdit = (s: Sale) => {
    setEditingSale(s);
    setProductId(s.productId);
    setSalePrice(String(s.salePrice));
    setDate(s.date);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!productId || !salePrice || !date) { toast.error("Preencha todos os campos"); return; }
    if (editingSale) {
      await updateSale({ id: editingSale.id, productId, quantity: 1, salePrice: Number(salePrice), date });
      toast.success("Venda atualizada");
    } else {
      const sale = await addSale({ productId, quantity: 1, salePrice: Number(salePrice), date });
      toast.success(`Venda registrada — Lucro: ${sale.profit.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}`);
    }
    setDialogOpen(false);
    setEditingSale(null);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />;
  };

  const filtered = useMemo(() => {
    let result = sales.filter(s => {
      const prod = getProduct(s.productId);
      if (catFilter !== "all" && prod?.category !== catFilter) return false;
      if (searchDate && !s.date.includes(searchDate)) return false;
      return true;
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "product": cmp = (getProduct(a.productId)?.name ?? "").localeCompare(getProduct(b.productId)?.name ?? ""); break;
          case "salePrice": cmp = a.salePrice - b.salePrice; break;
          case "profit": cmp = a.profit - b.profit; break;
          case "date": cmp = a.date.localeCompare(b.date); break;
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [sales, catFilter, searchDate, sortField, sortDir, getProduct]);

  const fmt = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <Input type="month" value={searchDate} onChange={e => setSearchDate(e.target.value)} className="w-[160px] text-sm" />
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[200px]">
            <span className="truncate">{catFilter === "all" ? "Categoria: Todas" : `Categoria: ${catFilter}`}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova Venda</Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingSale ? "Editar Venda" : "Registrar Venda"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label>Produto *</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(editingSale ? products : availableProducts).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Preço de Venda *</Label>
                <Input type="number" min={0} step={0.01} value={salePrice} onChange={e => setSalePrice(e.target.value)} />
              </div>
              <div><Label>Data *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <Button onClick={save}>{editingSale ? "Guardar" : "Registrar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("product")}>
                  <div className="flex items-center">Produto <SortIcon field="product" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("salePrice")}>
                  <div className="flex items-center">Preço Venda <SortIcon field="salePrice" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("profit")}>
                  <div className="flex items-center">Lucro <SortIcon field="profit" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("date")}>
                  <div className="flex items-center">Data <SortIcon field="date" /></div>
                </TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</TableCell></TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{getProduct(s.productId)?.name ?? "—"}</TableCell>
                  <TableCell>{fmt(s.salePrice)}</TableCell>
                  <TableCell className="text-emerald-500 font-semibold">{fmt(s.profit)}</TableCell>
                  <TableCell>{new Date(s.date).toLocaleDateString("pt-PT")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={async () => { await deleteSale(s.id); toast.success("Venda removida"); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
