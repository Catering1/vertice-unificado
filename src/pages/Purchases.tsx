import { useState, useMemo, useRef } from "react";
import { useStore } from "@/lib/store";
import { Purchase } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Upload, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type SortField = "product" | "price" | "total" | "date";
type SortDir = "asc" | "desc";

export default function Purchases() {
  const { purchases, sales, products, categories, addPurchase, updatePurchase, deletePurchase, getProduct, addProduct } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("Outros");
  const [productSupplier, setProductSupplier] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [searchDate, setSearchDate] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
    } else {
      productId = await addProduct({ name: productName.trim(), category: productCategory, purchasePrice: priceParsed, supplier: productSupplier });
    }

    if (editingPurchase) {
      await updatePurchase({ id: editingPurchase.id, productId, quantity: 1, price: priceParsed, date });
      toast.success("Compra atualizada");
    } else {
      await addPurchase({ productId, quantity: 1, price: priceParsed, date });
      toast.success("Compra registrada");
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
          case "total": cmp = (a.price * a.quantity) - (b.price * b.quantity); break;
          case "date": cmp = a.date.localeCompare(b.date); break;
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [purchases, catFilter, searchDate, stockFilter, productStock, sortField, sortDir, getProduct]);

  const fmt = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
        let count = 0;
        for (const row of rows) {
          const name = String(row["Produto"] || row["Nome"] || row["produto"] || row["nome"] || "").trim();
          const qty = Number(row["Quantidade"] || row["quantidade"] || row["Qtd"] || row["qtd"] || 1);
          const priceVal = Number(row["Preço"] || row["preco"] || row["Preço Unitário"] || row["precio"] || 0);
          const dateVal = String(row["Data"] || row["data"] || new Date().toISOString().slice(0, 10));
          const category = String(row["Categoria"] || row["categoria"] || "Outros");
          const supplier = String(row["Fornecedor"] || row["fornecedor"] || "");

          if (!name) continue;

          let prod = products.find(p => p.name.toLowerCase() === name.toLowerCase());
          let prodId: string;
          if (prod) {
            prodId = prod.id;
          } else {
            prodId = await addProduct({ name, category, purchasePrice: priceVal, supplier });
          }
          await addPurchase({ productId: prodId, quantity: qty, price: priceVal, date: dateVal });
          count++;
        }
        toast.success(`${count} registos importados`);
      } catch {
        toast.error("Erro ao ler o ficheiro");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter order: Data, Estado, Categoria */}
        <Input type="month" value={searchDate} onChange={e => setSearchDate(e.target.value)} className="w-[180px]" />
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-[180px]">
            <span className="truncate">{stockFilter === "all" ? "Estado: Todos" : stockFilter === "active" ? "Estado: Ativos" : "Estado: Vendidos"}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="sold">Vendidos</SelectItem>
          </SelectContent>
        </Select>
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

        <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />Importar Excel
        </Button>

        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova Compra</Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingPurchase ? "Editar Compra" : "Registrar Compra"}</DialogTitle></DialogHeader>
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
              <Button onClick={save}>{editingPurchase ? "Guardar" : "Registrar"}</Button>
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
