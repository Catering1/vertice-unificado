import { useState, useMemo, useRef } from "react";
import { useStore } from "@/lib/store";
import { usePersistedState } from "@/hooks/usePersistedState";
import { Purchase } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Upload, Pencil, ArrowUpDown, ArrowUp, ArrowDown, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


type SortField = "product" | "price" | "date";
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

export default function Purchases() {
  const { purchases, sales, products, categories, addPurchase, updatePurchase, deletePurchase, getProduct, addProduct, updateProduct } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("Outros");
  const [productSupplier, setProductSupplier] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [searchDate, setSearchDate] = usePersistedState("purchases-searchDate", "");
  const [catFilter, setCatFilter] = usePersistedState("purchases-catFilter", "all");
  const [stockFilter, setStockFilter] = usePersistedState("purchases-stockFilter", "all");

  const [sortField, setSortField] = usePersistedState<SortField | null>("purchases-sortField", null);
  const [sortDir, setSortDir] = usePersistedState<SortDir>("purchases-sortDir", "asc");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openNew = () => {
    setEditingPurchase(null);
    setProductName(""); setProductCategory("Outros"); setProductSupplier("");
    setPrice(""); setDate(new Date().toISOString().slice(0, 10));
    setDialogOpen(true);
  };

  const openEdit = (p: Purchase) => {
    const prod = getProduct(p.productId);
    setEditingPurchase(p);
    setProductName(prod?.name ?? "");
    setProductCategory(prod?.category ?? "Outros");
    setProductSupplier(prod?.supplier ?? "");
    setPrice(String(p.price));
    setDate(p.date);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!productName.trim() || !price || !date) {
      toast.error("Preencha todos os campos");
      return;
    }
    const priceParsed = Number(price);

    let existingProd = products.find(p => p.name.toLowerCase() === productName.trim().toLowerCase());
    let productId: string;
    if (existingProd) {
      productId = existingProd.id;
      // Sync product purchasePrice if it changed
      if (existingProd.purchasePrice !== priceParsed) {
        await updateProduct({ ...existingProd, purchasePrice: priceParsed });
      }
    } else {
      productId = await addProduct({ name: productName.trim(), category: productCategory, purchasePrice: priceParsed, supplier: productSupplier });
    }

    if (editingPurchase) {
      await updatePurchase({ id: editingPurchase.id, productId, quantity: 1, price: priceParsed, date });
      toast.success("Compra atualizada");
    } else {
      await addPurchase({ productId, quantity: 1, price: priceParsed, date });
      toast.success("Compra registada");
    }
    setDialogOpen(false);
    setEditingPurchase(null);
  };

  const productStock = useMemo(() => {
    const purchased = new Map<string, number>();
    const sold = new Map<string, number>();
    purchases.forEach(p => purchased.set(p.productId, (purchased.get(p.productId) ?? 0) + p.quantity));
    sales.forEach(s => sold.set(s.productId, (sold.get(s.productId) ?? 0) + s.quantity));
    const stock = new Map<string, number>();
    purchased.forEach((qty, id) => stock.set(id, Math.max(0, qty - (sold.get(id) ?? 0))));
    return stock;
  }, [purchases, sales]);

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
    let result = purchases.filter(p => {
      const prod = getProduct(p.productId);
      if (catFilter !== "all" && prod?.category !== catFilter) return false;
      if (searchDate && !p.date.includes(searchDate)) return false;
      if (stockFilter === "active" && (productStock.get(p.productId) ?? 0) <= 0) return false;
      if (stockFilter === "sold" && (productStock.get(p.productId) ?? 0) > 0) return false;
      return true;
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "product": cmp = (getProduct(a.productId)?.name ?? "").localeCompare(getProduct(b.productId)?.name ?? ""); break;
          case "price": cmp = a.price - b.price; break;
          case "date": cmp = a.date.localeCompare(b.date); break;
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [purchases, catFilter, searchDate, stockFilter, productStock, sortField, sortDir, getProduct]);

  const fmt = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map(line => {
      const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ""));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
      return obj;
    });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const rows = parseCSV(text);
        let count = 0;
        let skipped = 0;
        for (const row of rows) {
          const name = String(row["Produto"] || row["Nome"] || row["produto"] || row["nome"] || "").trim();
          const qty = Number(row["Quantidade"] || row["quantidade"] || row["Qtd"] || row["qtd"] || 1);
          const priceVal = Number(row["Preço"] || row["preco"] || row["Preço Unitário"] || row["precio"] || 0);
          const dateVal = String(row["Data"] || row["data"] || new Date().toISOString().slice(0, 10));
          const category = String(row["Categoria"] || row["categoria"] || "Outros").slice(0, 100);
          const supplier = String(row["Fornecedor"] || row["fornecedor"] || "").slice(0, 200);

          if (!name || name.length > 200) { skipped++; continue; }
          if (isNaN(qty) || qty < 1 || qty > 100000 || !Number.isInteger(qty)) { skipped++; continue; }
          if (isNaN(priceVal) || priceVal < 0 || priceVal > 1000000) { skipped++; continue; }
          if (!/^\d{4}-\d{2}-\d{2}/.test(dateVal)) { skipped++; continue; }

          let prod = products.find(p => p.name.toLowerCase() === name.toLowerCase());
          let prodId: string;
          if (prod) {
            prodId = prod.id;
          } else {
            prodId = await addProduct({ name: name.slice(0, 200), category, purchasePrice: priceVal, supplier });
          }
          await addPurchase({ productId: prodId, quantity: qty, price: priceVal, date: dateVal });
          count++;
        }
        toast.success(`${count} registos importados${skipped > 0 ? ` (${skipped} ignorados por dados inválidos)` : ""}`);
      } catch {
        toast.error("Erro ao ler o ficheiro");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

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

          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[180px]">
              <span className="truncate">{stockFilter === "all" ? "Estado: Todos" : stockFilter === "active" ? "Estado: Ativos" : "Estado: Vendidos"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="sold">Vendidos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-full sm:flex-none sm:w-[200px]">
              <span className="truncate">{catFilter === "all" ? "Categoria: Todas" : `Categoria: ${catFilter}`}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden sm:block sm:flex-1" />

        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleImportExcel} />
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />Importar CSV
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova Compra</Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingPurchase ? "Editar Compra" : "Registar Compra"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label>Nome do Produto *</Label>
                <Input placeholder="Ex: iPhone 15, Camiseta..." value={productName} onChange={e => setProductName(e.target.value)} list="product-suggestions" />
                <datalist id="product-suggestions">
                  {products.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select value={productCategory} onValueChange={setProductCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Preço Unitário *</Label><Input type="number" min={0} step={0.01} value={price} onChange={e => setPrice(e.target.value)} /></div>
              </div>
              <div><Label>Data *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <Button onClick={save}>{editingPurchase ? "Guardar" : "Registar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile: card list; Desktop: table */}
      <div className="block sm:hidden space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma compra encontrada</p>
        ) : filtered.map(p => (
          <Card key={p.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{getProduct(p.productId)?.name ?? "—"}</span>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => { await deletePurchase(p.id); toast.success("Compra removida"); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground">Preço Unit.</p>
                  <p className="font-semibold">{fmt(p.price)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                  <p className="font-semibold">{fmt(p.price * p.quantity)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString("pt-PT")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden sm:block">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("product")}>
                  <div className="flex items-center">Produto <SortIcon field="product" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("price")}>
                  <div className="flex items-center">Preço Unit. <SortIcon field="price" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("total")}>
                  <div className="flex items-center">Total <SortIcon field="total" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("date")}>
                  <div className="flex items-center">Data <SortIcon field="date" /></div>
                </TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma compra encontrada</TableCell></TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{getProduct(p.productId)?.name ?? "—"}</TableCell>
                  <TableCell>{fmt(p.price)}</TableCell>
                  <TableCell>{fmt(p.price * p.quantity)}</TableCell>
                  <TableCell>{new Date(p.date).toLocaleDateString("pt-PT")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={async () => { await deletePurchase(p.id); toast.success("Compra removida"); }}>
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
