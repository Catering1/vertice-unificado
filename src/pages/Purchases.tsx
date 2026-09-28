import { money, displayDate as formatDate } from "@/lib/dashboardMetrics";
import { useState, useMemo, useRef } from "react";
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
import { Plus, Trash2, Upload, Pencil, ArrowUpDown, ArrowUp, ArrowDown, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


type SortField = "product" | "price" | "date";
type SortDir = "asc" | "desc";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const ORDER_STATUSES: { value: VintedOrderStatus; label: string }[] = [
  { value: "not_tracked", label: "Não acompanhado" },
  { value: "ordered", label: "Pedido realizado / a preparar" },
  { value: "shipped", label: "Enviado" },
  { value: "electronic_verification", label: "Em verificação eletrónica" },
  { value: "delivered", label: "Entregue — por inspecionar" },
  { value: "received_verified", label: "Recebido e inspecionado" },
  { value: "return_in_progress", label: "Devolução em curso" },
  { value: "refund_partial", label: "Reembolso parcial" },
  { value: "refunded", label: "Reembolsado" },
  { value: "cancelled", label: "Cancelado" },
];
const orderStatusLabel = (status?: VintedOrderStatus) => ORDER_STATUSES.find(x => x.value === status)?.label ?? "Não acompanhado";

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
  const [orderStatus, setOrderStatus] = useState<VintedOrderStatus>("not_tracked");
  const [orderReference, setOrderReference] = useState("");
  const [orderStatusNote, setOrderStatusNote] = useState("");

  const [searchDate, setSearchDate] = usePersistedState("purchases-searchDate", "");
  const [catFilter, setCatFilter] = usePersistedState("purchases-catFilter", "all");
  const [stockFilter, setStockFilter] = usePersistedState("purchases-stockFilter", "all");

  const [sortField, setSortField] = usePersistedState<SortField | null>("purchases-sortField", null);
  const [sortDir, setSortDir] = usePersistedState<SortDir>("purchases-sortDir", "asc");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openNew = () => {
    setEditingPurchase(null);
    setInventoryUse("business");
    setProductName(""); setProductCategory("Outros"); setProductSupplier(""); setRetailPrice(""); setCondition("Verificado"); setWarrantyMonths("0"); setDescription(""); setSpecifications("");
    setPrice(""); setDate(new Date().toISOString().slice(0, 10)); setDeliveryDate("");
    setOrderStatus("not_tracked"); setOrderReference(""); setOrderStatusNote("");
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
    setOrderStatus(p.orderStatus ?? "not_tracked");
    setOrderReference(p.orderReference ?? "");
    setOrderStatusNote(p.orderStatusNote ?? "");
    setDialogOpen(true);
  };

  const save = async () => {
    if (!productName.trim() || ((!price || !date) && !editingPurchase)) {
      toast.error("Preencha todos os campos");
      return;
    }
    const priceParsed = price === "" ? null : Number(price);
    if (priceParsed != null && (!Number.isFinite(priceParsed) || priceParsed < 0)) { toast.error("Preço inválido"); return; }
    const retailPriceParsed = retailPrice ? Number(retailPrice) : 0;
    const warrantyMonthsParsed = Number(warrantyMonths || 0);
    if (Number.isNaN(retailPriceParsed) || Number.isNaN(warrantyMonthsParsed) || warrantyMonthsParsed < 0) {
      toast.error("Verifique o preço de venda e a garantia");
      return;
    }

    const existingProd = editingPurchase ? getProduct(editingPurchase.productId) : products.find(p => !p.sourceRef && p.category === productCategory && p.name.toLowerCase() === productName.trim().toLowerCase());
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
      if (search && !prod?.name.toLocaleLowerCase("pt-PT").includes(search.toLocaleLowerCase("pt-PT"))) return false;
      if (issueFilter === "undated" && p.date) return false;
      if (issueFilter === "cost" && p.price != null) return false;
      if (catFilter !== "all" && prod?.category !== catFilter) return false;
      if (searchDate && !p.date.includes(searchDate)) return false;
      if (stockFilter === "reading" && prod?.inventoryUse !== "personal") return false;
      if ((stockFilter === "active" || stockFilter === "sold") && prod?.inventoryUse === "personal") return false;
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
  }, [purchases, search, issueFilter, catFilter, searchDate, stockFilter, productStock, sortField, sortDir, getProduct]);

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

          const prod = products.find(p => p.name.toLowerCase() === name.toLowerCase());
          let prodId: string;
          if (prod) {
            prodId = prod.id;
          } else {
            prodId = await addProduct({ name: name.slice(0, 200), category, purchasePrice: priceVal, supplier, retailPrice: 0, condition: "Verificado", warrantyMonths: 0, description: "", specifications: "", photoUrls: [] });
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
              <span className="truncate">{stockFilter === "all" ? "Estado: Todos" : stockFilter === "active" ? "Estado: Ativos" : stockFilter === "reading" ? "Estado: Leitura" : "Estado: Vendidos"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="sold">Vendidos</SelectItem>
              <SelectItem value="reading">Leitura / uso pessoal</SelectItem>
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
                <div><Label>Preço *</Label><Input type="number" min={0} step={0.01} value={price} onChange={e => setPrice(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preço de venda</Label><Input type="number" min={0} step={0.01} placeholder="Ex: 449" value={retailPrice} onChange={e => setRetailPrice(e.target.value)} /></div>
                <div><Label>Garantia (meses)</Label><Input type="number" min={0} max={120} value={warrantyMonths} onChange={e => setWarrantyMonths(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Condição do artigo</Label><Input placeholder="Ex: Como novo" value={condition} onChange={e => setCondition(e.target.value)} /></div>
                <div><Label>Fornecedor</Label><Input placeholder="Opcional" value={productSupplier} onChange={e => setProductSupplier(e.target.value)} /></div>
              </div>
              <div><Label>Descrição para a página do produto</Label><textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={5000} rows={4} placeholder="Estado estético, funcionamento, acessórios incluídos e qualquer defeito a declarar." className="mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              <div><Label>Especificações</Label><textarea value={specifications} onChange={e => setSpecifications(e.target.value)} maxLength={3000} rows={3} placeholder="Ex: 256 GB · 12 GB RAM · bateria 92% · caixa e carregador incluídos" className="mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              <p className="text-xs leading-5 text-muted-foreground">As fotos são adicionadas na ficha do produto depois de receberes e testares o equipamento.</p>
              <div><Label>Utilização</Label><Select value={inventoryUse} onValueChange={v=>setInventoryUse(v as "business" | "personal")}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="business">Disponível para negócio</SelectItem><SelectItem value="personal">Leitura / uso pessoal</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data da compra</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                <div><Label>Data de entrega da encomenda</Label><Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></div>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">Indica a data prevista ou a data em que a encomenda foi entregue.</p>
              <div className="space-y-3 rounded-md border border-border p-3">
                <div>
                  <Label>Estado da compra e entrega</Label>
                  <p className="mb-2 mt-1 text-xs text-muted-foreground">Acompanha a encomenda. É informação privada; não aparece no anúncio público.</p>
                  <Select value={orderStatus} onValueChange={v => setOrderStatus(v as VintedOrderStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Referência da encomenda (opcional)</Label><Input maxLength={200} value={orderReference} onChange={e => setOrderReference(e.target.value)} placeholder="Referência Vinted" /></div>
                <div><Label>Nota privada do estado</Label><textarea value={orderStatusNote} onChange={e => setOrderStatusNote(e.target.value)} maxLength={1000} rows={2} placeholder="Ex.: atualização recebida hoje; reembolso parcial de 20 €" className="mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
                <p className="text-xs leading-5 text-muted-foreground">A condição do artigo e o estado da compra são apresentados juntos nesta área; a encomenda, referência e nota são privados e nunca aparecem na loja pública.</p>
              </div>
              <Button onClick={save}>{editingPurchase ? "Guardar" : "Registar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input className="sm:max-w-xs" aria-label="Pesquisar produto" placeholder="Pesquisar produto…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        <Select value={issueFilter} onValueChange={v=>{setIssueFilter(v);setPage(1);}}><SelectTrigger className="w-full sm:w-56" aria-label="Dados a confirmar"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os registos</SelectItem><SelectItem value="undated">Sem data</SelectItem><SelectItem value="cost">Custo por confirmar</SelectItem></SelectContent></Select>
        <p className="text-sm text-muted-foreground">{filtered.length} registos</p>
      </div>
      <div className="flex items-center justify-end gap-3 text-sm"><Button variant="outline" size="sm" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Anterior</Button><span>Página {currentPage} de {pages}</span><Button variant="outline" size="sm" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>Seguinte</Button></div>
      {/* Mobile: card list; Desktop: table */}
      <div className="block sm:hidden space-y-3">
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
              {p.deliveryDate && <p className="text-xs text-muted-foreground">Entrega: {formatDate(p.deliveryDate)}</p>}
              {(p.orderStatus && p.orderStatus !== "not_tracked") && <p className="text-xs text-muted-foreground">Encomenda: {orderStatusLabel(p.orderStatus)}{p.orderStatusNote ? ` · ${p.orderStatusNote}` : ""}</p>}
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
                  <TableCell className="font-medium">{getProduct(p.productId)?.name ?? "—"}<p className="text-xs font-normal text-muted-foreground">{getProduct(p.productId)?.category} · {getProduct(p.productId)?.inventoryUse === "personal" ? "Leitura" : (productStock.get(p.productId) ?? 0) > 0 ? "Ativo" : "Vendido"}{getProduct(p.productId)?.sourceData?.row ? ` · Excel, linha ${getProduct(p.productId)?.sourceData?.row}` : ""}</p>{p.orderStatus && p.orderStatus !== "not_tracked" && <p className="text-xs font-normal text-muted-foreground">Encomenda: {orderStatusLabel(p.orderStatus)}{p.orderStatusNote ? ` · ${p.orderStatusNote}` : ""}</p>}{p.deliveryDate && <p className="text-xs font-normal text-muted-foreground">Entrega: {formatDate(p.deliveryDate)}</p>}</TableCell>
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
    </div>
  );
}
