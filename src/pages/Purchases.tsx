import { money, displayDate as formatDate } from "@/lib/dashboardMetrics";
import { useState, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { activeUnitsByPurchase, purchaseReceiptStatus, PurchaseReceiptStatus } from "@/lib/inventory";
import { useStore } from "@/lib/store";
import { usePersistedState } from "@/hooks/usePersistedState";
import { Purchase, VintedOrderStatus } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Upload, Pencil, ArrowUpDown, ArrowUp, ArrowDown, CalendarIcon, Grid2X2, List, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCatalogPresentation } from "@/lib/catalog";


type SortField = "product" | "price" | "date";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "gallery";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const ORDER_RECEIPT_STATUSES: { value: PurchaseReceiptStatus; label: string }[] = [
  { value: "pending", label: "Por receber" },
  { value: "received", label: "Recebido" },
];
const orderStatusLabel = (status?: VintedOrderStatus) => purchaseReceiptStatus({ orderStatus: status }) === "received" ? "Recebido" : "Por receber";

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
  const { purchases, sales, categories, addPurchase, updatePurchase, deletePurchase, getProduct, addProduct, updateProduct } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRecord = searchParams.get("registo");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [issueFilter, setIssueFilter] = useState("all");
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("Outros");
  const [productSupplier, setProductSupplier] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [inventoryUse, setInventoryUse] = useState<"business" | "personal">("business");
  const [condition, setCondition] = useState("Verificado");
  const [warrantyMonths, setWarrantyMonths] = useState("0");
  const [description, setDescription] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [orderStatusNote, setOrderStatusNote] = useState("");

  const [searchDate, setSearchDate] = usePersistedState("purchases-searchDate", "");
  const [catFilter, setCatFilter] = usePersistedState("purchases-catFilter", "all");
  const [stockFilter, setStockFilter] = usePersistedState("purchases-stockFilter", "all");
  const [orderStatusFilter, setOrderStatusFilter] = usePersistedState<PurchaseReceiptStatus | "all">("purchases-orderStatusFilter", "all");

  const [sortField, setSortField] = usePersistedState<SortField | null>("purchases-sortField", null);
  const [sortDir, setSortDir] = usePersistedState<SortDir>("purchases-sortDir", "asc");
  const [viewMode, setViewMode] = usePersistedState<ViewMode>("purchases-viewMode", "table");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openNew = () => {
    setEditingPurchase(null);
    setInventoryUse("business");
    setProductName(""); setProductCategory("Outros"); setProductSupplier(""); setRetailPrice(""); setCondition("Verificado"); setWarrantyMonths("0"); setDescription(""); setSpecifications("");
    setPrice(""); setDate(new Date().toISOString().slice(0, 10)); setDeliveryDate("");
    setOrderReference(""); setOrderStatusNote("");
    setDialogOpen(true);
  };

  const openEdit = (p: Purchase) => {
    const prod = getProduct(p.productId);
    setEditingPurchase(p);
    setProductName(prod?.name ?? "");
    setProductCategory(prod?.category ?? "Outros");
    setProductSupplier(prod?.supplier ?? "");
    setRetailPrice(String(prod?.retailPrice ?? ""));
    setCondition(prod?.condition ?? "Verificado");
    setWarrantyMonths(String(prod?.warrantyMonths ?? 0));
    setDescription(prod?.description ?? "");
    setSpecifications(prod?.specifications ?? "");
    setInventoryUse(prod?.inventoryUse ?? "business");
    setPrice(p.price == null ? "" : String(p.price));
    setDate(p.date);
    setDeliveryDate(p.deliveryDate ?? "");
    setOrderReference(p.orderReference ?? "");
    setOrderStatusNote(p.orderStatusNote ?? "");
    setDialogOpen(true);
  };

  const save = async () => {
    if (saving) return;
    if (!productName.trim() || !price || !date) {
      toast.error("Preencha todos os campos");
      return;
    }
    const priceParsed = price === "" ? null : Number(price);
    if (priceParsed != null && (!Number.isFinite(priceParsed) || priceParsed < 0)) { toast.error("Preço inválido"); return; }
    const retailPriceParsed = retailPrice ? Number(retailPrice) : 0;
    const warrantyMonthsParsed = Number(warrantyMonths || 0);
    const orderStatus: VintedOrderStatus = deliveryDate ? "received_verified" : editingPurchase?.orderStatus === "not_tracked" ? "not_tracked" : "ordered";
    if (Number.isNaN(retailPriceParsed) || Number.isNaN(warrantyMonthsParsed) || warrantyMonthsParsed < 0) {
      toast.error("Verifique o preço de venda e a garantia");
      return;
    }

    setSaving(true);
    try {
      const existingProd = editingPurchase ? getProduct(editingPurchase.productId) : undefined;
      let productId: string;
      if (existingProd) {
        productId = existingProd.id;
        await updateProduct({...existingProd,name:productName.trim(),category:productCategory,supplier:productSupplier,purchasePrice:priceParsed,retailPrice:retailPriceParsed,condition,warrantyMonths:warrantyMonthsParsed,description,specifications,inventoryUse});
      } else {
        productId = await addProduct({name:productName.trim(),category:productCategory,purchasePrice:priceParsed,supplier:productSupplier,retailPrice:retailPriceParsed,condition,warrantyMonths:warrantyMonthsParsed,description,specifications,photoUrls:[],inventoryUse,storeVisible:productCategory !== "Livros" && inventoryUse !== "personal"});
      }
      if (editingPurchase) {
        await updatePurchase({ ...editingPurchase, productId, quantity: editingPurchase.quantity, price: priceParsed, date, deliveryDate: deliveryDate || null, orderStatus, orderReference, orderStatusNote });
        toast.success("Compra atualizada");
      } else {
        await addPurchase({ productId, quantity: 1, price: priceParsed, date, deliveryDate: deliveryDate || null, orderStatus, orderReference, orderStatusNote });
        toast.success("Compra registada");
      }
      setDialogOpen(false);
      setEditingPurchase(null);
    } catch {
      toast.error("Não foi possível guardar a compra. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const productStock = useMemo(() => {
    return activeUnitsByPurchase(purchases, sales);
  }, [purchases, sales]);
  const commercialStatus = (purchaseId: string) => (productStock.get(purchaseId) ?? 0) > 0 ? "Ativo" : "Vendido";

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
      if (selectedRecord && p.id !== selectedRecord) return false;
      if (selectedRecord) return true;
      if (search && !prod?.name.toLocaleLowerCase("pt-PT").includes(search.toLocaleLowerCase("pt-PT"))) return false;
      if (issueFilter === "undated" && p.date) return false;
      if (issueFilter === "cost" && p.price != null) return false;
      if (catFilter !== "all" && prod?.category !== catFilter) return false;
      if (searchDate && !p.date.includes(searchDate)) return false;
      if ((stockFilter === "active" || stockFilter === "reading") && (productStock.get(p.id) ?? 0) <= 0) return false;
      if (stockFilter === "sold" && (productStock.get(p.id) ?? 0) > 0) return false;
      if (orderStatusFilter !== "all" && purchaseReceiptStatus(p) !== orderStatusFilter) return false;
      return true;
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "product": cmp = (getProduct(a.productId)?.name ?? "").localeCompare(getProduct(b.productId)?.name ?? ""); break;
          case "price": cmp = (a.price ?? 0) - (b.price ?? 0); break;
          case "date": cmp = a.date.localeCompare(b.date); break;
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [purchases, selectedRecord, search, issueFilter, catFilter, searchDate, stockFilter, orderStatusFilter, productStock, sortField, sortDir, getProduct]);

  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage-1)*50,currentPage*50);
  const fmt = money;

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

          const prodId = await addProduct({ name: name.slice(0, 200), category, purchasePrice: priceVal, supplier, retailPrice: 0, condition: "Verificado", warrantyMonths: 0, description: "", specifications: "", photoUrls: [] });
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

          <Select value={stockFilter === "reading" ? "active" : stockFilter} onValueChange={v => { setStockFilter(v); setPage(1); }}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[180px]">
              <span className="truncate">{stockFilter === "all" ? "Estado: Todos" : stockFilter === "sold" ? "Estado: Vendidos" : "Estado: Ativos"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="sold">Vendidos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={orderStatusFilter === "all" || orderStatusFilter === "pending" || orderStatusFilter === "received" ? orderStatusFilter : "all"} onValueChange={v => { setOrderStatusFilter(v as PurchaseReceiptStatus | "all"); setPage(1); }}>
            <SelectTrigger className="w-full sm:flex-none sm:w-[240px]">
              <span className="truncate">{orderStatusFilter === "all" ? "Estado da encomenda: Todos" : orderStatusFilter === "received" ? "Encomenda: Recebido" : "Encomenda: Por receber"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados da encomenda</SelectItem>
              {ORDER_RECEIPT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>{editingPurchase ? "Editar Compra" : "Registar Compra"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label>Nome do Produto *</Label>
                <Input placeholder="Ex: iPhone 15, Camiseta..." value={productName} onChange={e => setProductName(e.target.value)} />
                {!editingPurchase && <p className="mt-1 text-xs text-muted-foreground">Cada compra recebe um registo próprio, mesmo quando o nome já existe.</p>}
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={productCategory} onValueChange={setProductCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Preço de Compra *</Label><Input type="number" min={0} step={0.01} inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Data de Compra *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                <div><Label>Data de Receção</Label><Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></div>
              </div>
              <div><Label>Descrição para anúncio</Label><textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={5000} rows={4} placeholder="Estado, características, acessórios e defeitos a declarar." className="mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              <Button className="min-h-11" onClick={save} disabled={saving}>{saving ? "A guardar…" : editingPurchase ? "Guardar compra" : "Registar compra"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {selectedRecord && <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"><span>Compra selecionada a partir do dashboard</span><Button size="sm" variant="outline" onClick={() => setSearchParams({})}>Ver todas</Button></div>}
        <Input className="sm:max-w-xs" aria-label="Pesquisar produto" placeholder="Pesquisar produto…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        <Select value={issueFilter} onValueChange={v=>{setIssueFilter(v);setPage(1);}}><SelectTrigger className="w-full sm:w-56" aria-label="Dados a confirmar"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os registos</SelectItem><SelectItem value="undated">Sem data</SelectItem><SelectItem value="cost">Custo por confirmar</SelectItem></SelectContent></Select>
        <p className="text-sm text-muted-foreground">{filtered.length} registos</p>
        <div className="ml-auto flex items-center rounded-md border bg-background p-0.5" aria-label="Modo de visualização">
          <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5" onClick={() => setViewMode("table")} aria-pressed={viewMode === "table"}>
            <List className="h-4 w-4" /> <span className="hidden sm:inline">Lista</span>
          </Button>
          <Button variant={viewMode === "gallery" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5" onClick={() => setViewMode("gallery")} aria-pressed={viewMode === "gallery"}>
            <Grid2X2 className="h-4 w-4" /> <span className="hidden sm:inline">Galeria</span>
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 text-sm"><Button variant="outline" size="sm" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Anterior</Button><span>Página {currentPage} de {pages}</span><Button variant="outline" size="sm" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>Seguinte</Button></div>
      {viewMode === "gallery" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map(p => {
            const product = getProduct(p.productId);
            const photoUrl = product?.photoUrls?.[0] || getCatalogPresentation(product?.name ?? "").photos[0];
            const stockQuantity = productStock.get(p.id) ?? 0;
            const stockState = stockQuantity > 0 ? "Ativo" : "Vendido";
            return (
              <Card key={p.id} className="group overflow-hidden">
                <div className="relative aspect-[16/10] bg-secondary">
                  {photoUrl ? <img src={photoUrl} alt={product?.name ?? "Produto"} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground"><Package className="h-9 w-9" /><span className="text-sm">Sem fotografia</span></div>}
                  <span className="absolute left-3 top-3 rounded-full bg-background/95 px-2.5 py-1 text-xs font-medium shadow-sm">{stockState}</span>
                </div>
                <CardContent className="space-y-3 p-4">
                  <div className="flex gap-3">
                  <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{product?.name ?? "Produto removido"}</h2><p className="mt-0.5 text-sm text-muted-foreground">{product?.category ?? "Sem categoria"} · Ref. {p.id.slice(0, 8)}</p></div>
                    <div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)} aria-label={`Editar ${product?.name ?? "compra"}`}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => { await deletePurchase(p.id); toast.success("Compra removida"); }} aria-label={`Remover ${product?.name ?? "compra"}`}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>
                  <div className="flex items-end justify-between border-t pt-3"><div><p className="text-xs text-muted-foreground">Custo de compra</p><p className="font-semibold">{fmt(p.price)}</p></div><div className="text-right text-xs text-muted-foreground"><p>Compra: {formatDate(p.date)}</p>{p.deliveryDate && <p>Entrega: {formatDate(p.deliveryDate)}</p>}</div></div>
                  <p className="border-t pt-3 text-xs text-muted-foreground">Encomenda: {orderStatusLabel(p.orderStatus)}</p>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="col-span-full py-8 text-center text-muted-foreground">Nenhuma compra encontrada</p>}
        </div>
      ) : <>
      {/* Mobile: card list; Desktop: table */}
      <div className="block space-y-3 lg:hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma compra encontrada</p>
        ) : visible.map(p => (
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
              <div className="text-sm">
                <p className="text-[10px] text-muted-foreground">Preço</p>
                <p className="font-semibold">{fmt(p.price)}</p>
              </div>
              <p className="text-xs text-muted-foreground">Compra: {formatDate(p.date)}</p>
              <p className="text-xs text-muted-foreground">Estado: {commercialStatus(p.id)} · Ref. {p.id.slice(0, 8)}</p>
              {p.deliveryDate && <p className="text-xs text-muted-foreground">Entrega: {formatDate(p.deliveryDate)}</p>}
              <p className="text-xs text-muted-foreground">Encomenda: {orderStatusLabel(p.orderStatus)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden lg:block">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("product")}>
                  <div className="flex items-center">Produto <SortIcon field="product" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("price")}>
                  <div className="flex items-center">Preço <SortIcon field="price" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("date")}>
                  <div className="flex items-center">Data da compra <SortIcon field="date" /></div>
                </TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma compra encontrada</TableCell></TableRow>
              ) : visible.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{getProduct(p.productId)?.name ?? "—"}<p className="text-xs font-normal text-muted-foreground">{getProduct(p.productId)?.category} · {commercialStatus(p.id)}{getProduct(p.productId)?.sourceData?.row ? ` · Excel, linha ${getProduct(p.productId)?.sourceData?.row}` : ""}</p><p className="text-xs font-normal text-muted-foreground">Estado da encomenda: {orderStatusLabel(p.orderStatus)}</p>{p.deliveryDate && <p className="text-xs font-normal text-muted-foreground">Entrega: {formatDate(p.deliveryDate)}</p>}</TableCell>
                  <TableCell>{fmt(p.price)}</TableCell>
                  <TableCell>{formatDate(p.date)}</TableCell>
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
      </>}
    </div>
  );
}
