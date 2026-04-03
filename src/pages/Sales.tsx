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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Pencil, ArrowUpDown, ArrowUp, ArrowDown, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SortField = "product" | "salePrice" | "profit" | "margin" | "date";
type SortDir = "asc" | "desc";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function MonthYearPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(value ? parseInt(value.slice(0, 4)) : now.getFullYear());
  const selectedMonth = value ? parseInt(value.slice(5, 7)) - 1 : -1;
  const selectedYear = value ? parseInt(value.slice(0, 4)) : -1;

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear(y => y - 1)}>
          <ArrowDown className="h-3.5 w-3.5 rotate-90" />
        </Button>
        <span className="text-sm font-medium">{viewYear}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear(y => y + 1)}>
          <ArrowUp className="h-3.5 w-3.5 rotate-90" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {MONTHS.map((m, i) => (
          <Button
            key={m}
            variant={selectedYear === viewYear && selectedMonth === i ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => onChange(`${viewYear}-${String(i + 1).padStart(2, "0")}`)}
          >
            {m}
          </Button>
        ))}
      </div>
      {value && (
        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => onChange("")}>
          Limpar
        </Button>
      )}
    </div>
  );
}

export default function Sales() {
  const { sales, purchases, products, categories, addSale, updateSale, deleteSale, getProduct, updateProduct } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [productId, setProductId] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [purchasePriceOverride, setPurchasePriceOverride] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [searchDate, setSearchDate] = usePersistedState("sales-searchDate", "");
  const [catFilter, setCatFilter] = usePersistedState("sales-catFilter", "all");

  const [sortField, setSortField] = usePersistedState<SortField | null>("sales-sortField", null);
  const [sortDir, setSortDir] = usePersistedState<SortDir>("sales-sortDir", "asc");

  // Products that have stock
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

  // Preview margin/profit
  const preview = useMemo(() => {
    if (!productId || !salePrice) return null;
    const sp = Number(salePrice);
    if (isNaN(sp) || sp <= 0) return null;
    const cost = purchasePriceOverride ? Number(purchasePriceOverride) : (getProduct(productId)?.purchasePrice ?? 0);
    if (isNaN(cost)) return null;
    const profit = sp - cost;
    const margin = sp > 0 ? (profit / sp) * 100 : 0;
    return { cost, profit, margin };
  }, [productId, salePrice, purchasePriceOverride, getProduct]);

  const openNew = () => {
    setEditingSale(null);
    setProductId(""); setSalePrice(""); setPurchasePriceOverride(""); setDate(new Date().toISOString().slice(0, 10));
    setDialogOpen(true);
  };

  const openEdit = (s: Sale) => {
    setEditingSale(s);
    setProductId(s.productId);
    setSalePrice(String(s.salePrice));
    const prod = getProduct(s.productId);
    setPurchasePriceOverride(prod ? String(prod.purchasePrice) : "");
    setDate(s.date);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!productId || !salePrice || !date) { toast.error("Preencha todos os campos"); return; }

    const parsedSalePrice = Number(salePrice);
    if (isNaN(parsedSalePrice) || parsedSalePrice < 0) { toast.error("Preço de venda inválido"); return; }

    const overrideRaw = purchasePriceOverride.trim();
    const overridePrice = overrideRaw === "" ? null : Number(overrideRaw);
    if (overridePrice !== null && (isNaN(overridePrice) || overridePrice < 0)) { toast.error("Preço de compra inválido"); return; }

    const product = getProduct(productId);
    const effectivePurchasePrice = overridePrice ?? (product?.purchasePrice ?? 0);

    // Sync product purchasePrice if overridden
    if (overridePrice != null && product && product.purchasePrice !== overridePrice) {
      await updateProduct({ ...product, purchasePrice: overridePrice });
    }

    if (editingSale) {
      await updateSale({ id: editingSale.id, productId, quantity: 1, salePrice: parsedSalePrice, date, purchasePrice: effectivePurchasePrice });
      toast.success("Venda atualizada");
    } else {
      const sale = await addSale({ productId, quantity: 1, salePrice: parsedSalePrice, date, purchasePrice: effectivePurchasePrice });
      toast.success(`Venda registada — Lucro: ${sale.profit.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}`);
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
          case "margin": {
            const mA = a.salePrice > 0 ? a.profit / a.salePrice : 0;
            const mB = b.salePrice > 0 ? b.profit / b.salePrice : 0;
            cmp = mA - mB;
            break;
          }
          case "date": cmp = a.date.localeCompare(b.date); break;
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [sales, catFilter, searchDate, sortField, sortDir, getProduct]);

  const fmt = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
  const displayDate = searchDate ? `${MONTHS[parseInt(searchDate.slice(5, 7)) - 1]} ${searchDate.slice(0, 4)}` : "";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("flex-1 sm:flex-none sm:w-[180px] justify-start text-left font-normal", !searchDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {searchDate ? displayDate : "Filtrar por mês"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
              <MonthYearPicker value={searchDate} onChange={setSearchDate} />
            </PopoverContent>
          </Popover>

          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[200px]">
              <span className="truncate">{catFilter === "all" ? "Categoria: Todas" : `Categoria: ${catFilter}`}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden sm:block sm:flex-1" />

        <Button className="w-full sm:w-auto" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova Venda</Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingSale ? "Editar Venda" : "Registar Venda"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label>Produto *</Label>
                <Select value={productId} onValueChange={(v) => {
                  setProductId(v);
                  const prod = getProduct(v);
                  if (prod) setPurchasePriceOverride(String(prod.purchasePrice));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(editingSale ? products : availableProducts).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Preço de Compra *</Label>
                <Input type="number" min={0} step={0.01} value={purchasePriceOverride} onChange={e => setPurchasePriceOverride(e.target.value)} />
              </div>
              <div>
                <Label>Preço de Venda *</Label>
                <Input type="number" min={0} step={0.01} value={salePrice} onChange={e => setSalePrice(e.target.value)} />
              </div>

              {preview && (
                <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Pré-visualização</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Custo</p>
                      <p className="text-sm font-semibold">{fmt(preview.cost)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Lucro</p>
                      <p className={cn("text-sm font-semibold", preview.profit >= 0 ? "text-success" : "text-destructive")}>{fmt(preview.profit)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Margem</p>
                      <p className={cn("text-sm font-semibold", preview.margin >= 0 ? "text-success" : "text-destructive")}>{preview.margin.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )}

              <div><Label>Data *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <Button onClick={save}>{editingSale ? "Guardar" : "Registar"}</Button>
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
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("margin")}>
                  <div className="flex items-center">Margem <SortIcon field="margin" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("date")}>
                  <div className="flex items-center">Data <SortIcon field="date" /></div>
                </TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</TableCell></TableRow>
              ) : filtered.map(s => {
                const margin = s.salePrice > 0 ? (s.profit / s.salePrice) * 100 : 0;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{getProduct(s.productId)?.name ?? "—"}</TableCell>
                    <TableCell>{fmt(s.salePrice)}</TableCell>
                    <TableCell className="text-success font-semibold">{fmt(s.profit)}</TableCell>
                    <TableCell className={cn("font-semibold", margin >= 0 ? "text-success" : "text-destructive")}>{margin.toFixed(1)}%</TableCell>
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
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
