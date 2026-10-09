import { money, displayDate as formatDate } from "@/lib/dashboardMetrics";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useStore } from "@/lib/store";
import { usePersistedState } from "@/hooks/usePersistedState";
import { Purchase, Sale } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Pencil, ArrowUpDown, ArrowUp, ArrowDown, CalendarIcon, Grid2X2, List, Package } from "lucide-react";
import { toast } from "sonner";
import { activeUnitsByPurchase, isPurchaseStockEligible, purchaseCommercialStatus } from "@/lib/inventory";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import CategoryFilter from "@/components/CategoryFilter";
import { getCatalogPresentation } from "@/lib/catalog";

type SortField = "product" | "salePrice" | "profit" | "margin" | "date";
type SortDir = "asc" | "desc";
type SalesView = "sales" | "active";
type ViewMode = "table" | "gallery";

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
  const { sales, purchases, products, categories, addSale, updateSale, deleteSale, getProduct, updatePurchase } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRecord = searchParams.get("registo");
  const targetProductId = searchParams.get("produto");
  const targetPurchaseId = searchParams.get("compra");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [productId, setProductId] = useState("");
  const [purchaseId, setPurchaseId] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [purchasePriceOverride, setPurchasePriceOverride] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [salesView, setSalesView] = useState<SalesView>("sales");
  const [viewMode, setViewMode] = usePersistedState<ViewMode>("sales-viewMode", "table");

  const [searchDate, setSearchDate] = usePersistedState("sales-searchDate", "");
  const [catFilter, setCatFilter] = usePersistedState("sales-catFilter", "all");

  const [sortField, setSortField] = usePersistedState<SortField | null>("sales-sortField", null);
  const [sortDir, setSortDir] = usePersistedState<SortDir>("sales-sortDir", "asc");

  const detail = searchParams.get("detalhe");
  const detailCategory = searchParams.get("categoria");
  useEffect(() => {
    if (detail !== "sales") return;
    setSalesView("sales");
    setPage(1);
    setSearch("");
    setSearchDate("");
    setCatFilter(detailCategory && categories.includes(detailCategory) ? detailCategory : "all");
  }, [detail, detailCategory, categories, setCatFilter, setSearchDate]);

  // Each sellable entry is one purchase record; sales consume only that record's units.
  const activeUnitCounts = useMemo(() => activeUnitsByPurchase(purchases, sales), [purchases, sales]);
  const availablePurchases = useMemo(() => purchases.filter(purchase => {
    const product = getProduct(purchase.productId);
    return product && product.inventoryUse !== "personal"
      && (isPurchaseStockEligible(purchase) || editingSale?.purchaseId === purchase.id)
      && ((activeUnitCounts.get(purchase.id) ?? 0) > 0 || editingSale?.purchaseId === purchase.id);
  }), [purchases, getProduct, activeUnitCounts, editingSale]);
  const purchaseNumbers = useMemo(() => {
    const sorted = [...purchases].sort((a, b) => {
      const aName = getProduct(a.productId)?.name ?? "";
      const bName = getProduct(b.productId)?.name ?? "";
      return aName.localeCompare(bName, "pt-PT") || a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
    });
    const counts = new Map<string, number>();
    const numbers = new Map<string, number>();
    sorted.forEach(purchase => {
      const key = (getProduct(purchase.productId)?.name ?? "Produto").toLocaleLowerCase("pt-PT");
      const number = (counts.get(key) ?? 0) + 1;
      counts.set(key, number);
      numbers.set(purchase.id, number);
    });
    return numbers;
  }, [purchases, getProduct]);
  const selectedPurchase = purchases.find(purchase => purchase.id === purchaseId);
  const activePurchases = useMemo(() => purchases.filter(purchase => {
    const product = getProduct(purchase.productId);
    if (!product || product.inventoryUse === "personal") return false;
    if (!isPurchaseStockEligible(purchase)) return false;
    if (purchaseCommercialStatus(purchase, sales) !== "active") return false;
    if (search && !product.name.toLocaleLowerCase("pt-PT").includes(search.toLocaleLowerCase("pt-PT"))) return false;
    if (searchDate && !purchase.date.includes(searchDate)) return false;
    return catFilter === "all" || product.category === catFilter;
  }), [purchases, sales, search, searchDate, catFilter, getProduct]);

  // Preview margin/profit
  const preview = useMemo(() => {
    if (!productId || !salePrice) return null;
    const sp = Number(salePrice);
    if (isNaN(sp) || sp <= 0) return null;
    const cost = purchasePriceOverride ? Number(purchasePriceOverride) : selectedPurchase?.price;
    if (cost == null) return null;
    if (isNaN(cost)) return null;
    const profit = sp - cost;
    const margin = sp > 0 ? (profit / sp) * 100 : 0;
    return { cost, profit, margin };
  }, [purchaseId, salePrice, purchasePriceOverride, selectedPurchase]);

  const openNew = () => {
    setEditingSale(null);
    setProductId(""); setPurchaseId(""); setSalePrice(""); setPurchasePriceOverride(""); setDate(new Date().toISOString().slice(0, 10));
    setDialogOpen(true);
  };
  const openNewForPurchase = useCallback((purchase: Purchase) => {
    setEditingSale(null);
    setProductId(purchase.productId);
    setPurchaseId(purchase.id);
    setSalePrice("");
    setPurchasePriceOverride(purchase.price == null ? "" : String(purchase.price));
    setDate(new Date().toISOString().slice(0, 10));
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    if (!targetProductId) return;
    const purchase = purchases.find(p => p.productId === targetProductId && (!targetPurchaseId || p.id === targetPurchaseId));
    if (!purchase || purchaseCommercialStatus(purchase, sales) !== "active") return;
    setSalesView("active");
    openNewForPurchase(purchase);
    setSearchParams({}, { replace: true });
  }, [targetProductId, targetPurchaseId, purchases, sales, setSearchParams, openNewForPurchase]);

  const openEdit = (s: Sale) => {
    setEditingSale(s);
    setProductId(s.productId);
    setPurchaseId(s.purchaseId ?? "");
    setSalePrice(String(s.salePrice));
    setPurchasePriceOverride(s.profit == null ? "" : String(s.salePrice - s.profit / s.quantity));
    setDate(s.date);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!productId || !salePrice || (!date && !editingSale)) { toast.error("Preencha todos os campos"); return; }

    const parsedSalePrice = Number(salePrice);
    if (isNaN(parsedSalePrice) || parsedSalePrice < 0) { toast.error("Preço de venda inválido"); return; }

    const overrideRaw = purchasePriceOverride.trim();
    const overridePrice = overrideRaw === "" ? null : Number(overrideRaw);
    if (overridePrice !== null && (isNaN(overridePrice) || overridePrice < 0)) { toast.error("Preço de compra inválido"); return; }

    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase || purchase.productId !== productId) { toast.error("Selecione a compra específica deste artigo"); return; }
    const effectivePurchasePrice = overridePrice ?? purchase.price;

    try {
      if (overridePrice != null && purchase.price !== overridePrice) await updatePurchase({ ...purchase, price: overridePrice });
      if (editingSale) {
        await updateSale({ id: editingSale.id, productId, purchaseId, quantity: editingSale.quantity, salePrice: parsedSalePrice, date, purchasePrice: effectivePurchasePrice ?? undefined });
        toast.success("Venda atualizada");
      } else {
        const sale = await addSale({ productId, purchaseId, quantity: 1, salePrice: parsedSalePrice, date, purchasePrice: effectivePurchasePrice ?? undefined });
        toast.success(`Venda registada — Lucro: ${money(sale.profit)}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar a venda.");
      return;
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
      if (selectedRecord && s.id !== selectedRecord) return false;
      if (selectedRecord) return true;
      if (search && !prod?.name.toLocaleLowerCase("pt-PT").includes(search.toLocaleLowerCase("pt-PT"))) return false;
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
          case "profit": cmp = (a.profit ?? 0) - (b.profit ?? 0); break;
          case "margin": {
            const mA = a.salePrice > 0 ? (a.profit ?? 0) / a.salePrice : 0;
            const mB = b.salePrice > 0 ? (b.profit ?? 0) / b.salePrice : 0;
            cmp = mA - mB;
            break;
          }
          case "date": cmp = a.date.localeCompare(b.date); break;
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [sales, selectedRecord, search, catFilter, searchDate, sortField, sortDir, getProduct]);

  const visible = filtered.slice(0, page * 10);
  const visibleActive = activePurchases.slice(0, page * 10);
  const totalVisible = salesView === "active" ? visibleActive.length : visible.length;
  const totalRecords = salesView === "active" ? activePurchases.length : filtered.length;
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || totalVisible >= totalRecords) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) setPage(current => current + 1);
    }, { rootMargin: "160px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [totalVisible, totalRecords]);
  const fmt = money;
  const displayDate = searchDate ? `${MONTHS[parseInt(searchDate.slice(5, 7)) - 1]} ${searchDate.slice(0, 4)}` : "";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1">
          <div className="shrink-0"><CategoryFilter categories={categories} value={catFilter} onChange={value => { setCatFilter(value); setPage(1); }} /></div>
          <Select value={salesView} onValueChange={value => { setSalesView(value as SalesView); setPage(1); }}>
            <SelectTrigger className="w-[220px] shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Vendas registadas</SelectItem>
              <SelectItem value="active">Produtos ativos para vender</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full grid-cols-[minmax(0,160px)_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[180px_minmax(0,320px)]">
          <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full min-w-0 justify-start overflow-hidden text-ellipsis whitespace-nowrap", !searchDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4 shrink-0" /><span className="truncate">{searchDate ? displayDate : <><span className="sm:hidden">Mês</span><span className="hidden sm:inline">Filtrar por mês</span></>}</span></Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><MonthYearPicker value={searchDate} onChange={value => { setSearchDate(value); setPage(1); }} /></PopoverContent></Popover>
          <Input className="min-w-0" aria-label="Pesquisar produto" placeholder="Pesquisar produto…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        </div>

        <div className="hidden sm:block sm:flex-1" />

        <Button className="w-full sm:w-auto" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova Venda</Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>{editingSale ? "Editar Venda" : "Registar Venda"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label>Artigo / compra *</Label>
                <Select value={purchaseId} onValueChange={(v) => {
                  setPurchaseId(v);
                  const purchase = purchases.find(p => p.id === v);
                  if (purchase) {
                    setProductId(purchase.productId);
                    setPurchasePriceOverride(purchase.price == null ? "" : String(purchase.price));
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o artigo e a compra" /></SelectTrigger>
                  <SelectContent>
                    {availablePurchases.map(purchase => {
                      const product = getProduct(purchase.productId);
                      return <SelectItem key={purchase.id} value={purchase.id}>{product?.name} · Unidade {purchaseNumbers.get(purchase.id)} · {product?.category} · Compra: {purchase.date || "sem data"} · Custo: {purchase.price == null ? "por confirmar" : fmt(purchase.price)}</SelectItem>;
                    })}
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

      <div className="flex flex-wrap items-center gap-3">
        {selectedRecord && <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"><span>Venda selecionada a partir do dashboard</span><Button size="sm" variant="outline" onClick={() => setSearchParams({})}>Ver todas</Button></div>}
        <p className="text-sm text-muted-foreground">A mostrar {totalVisible} de {totalRecords} {salesView === "active" ? "produtos ativos" : "registos"}</p>
        {salesView === "sales" && <div className="ml-auto flex items-center rounded-md border bg-background p-0.5" aria-label="Modo de visualização">
          <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5" onClick={() => setViewMode("table")} aria-pressed={viewMode === "table"}><List className="h-4 w-4" /><span className="hidden sm:inline">Lista</span></Button>
          <Button variant={viewMode === "gallery" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5" onClick={() => setViewMode("gallery")} aria-pressed={viewMode === "gallery"}><Grid2X2 className="h-4 w-4" /><span className="hidden sm:inline">Galeria</span></Button>
        </div>}
      </div>
      {salesView === "active" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleActive.map(purchase => {
            const product = getProduct(purchase.productId);
            return <Card key={purchase.id}><CardContent className="space-y-3 p-4"><div><h2 className="font-semibold">{product?.name}</h2><p className="text-sm text-muted-foreground">{product?.category} · Compra: {formatDate(purchase.date)}</p></div><div className="border-t pt-3"><p className="text-xs text-muted-foreground">Custo de compra</p><p className="font-semibold">{fmt(purchase.price)}</p></div><Button className="w-full" onClick={() => openNewForPurchase(purchase)}>Registar venda</Button></CardContent></Card>;
          })}
          {activePurchases.length === 0 && <p className="col-span-full py-8 text-center text-muted-foreground">Não existem produtos ativos com estes filtros</p>}
        </div>
      ) : <>
      {viewMode === "gallery" ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map(sale => {
          const product = getProduct(sale.productId);
          const photoUrl = product?.photoUrls?.[0] || getCatalogPresentation(product?.name ?? "").photos[0];
          const margin = sale.profit == null || sale.salePrice <= 0 ? null : sale.profit / sale.salePrice * 100;
          return <Card key={sale.id} className="overflow-hidden">
            <div className="aspect-[16/10] bg-secondary">{photoUrl ? <img src={photoUrl} alt={product?.name ?? "Produto"} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground"><Package className="h-9 w-9" /><span className="text-sm">Sem fotografia</span></div>}</div>
            <CardContent className="space-y-3 p-4"><div><h2 className="font-semibold">{product?.name ?? "Produto removido"}</h2><p className="text-sm text-muted-foreground">{product?.category} · {formatDate(sale.date)}</p></div>
              <div className="grid grid-cols-3 gap-2 border-t pt-3 text-sm"><div><p className="text-xs text-muted-foreground">Venda</p><p className="font-semibold">{fmt(sale.salePrice)}</p></div><div><p className="text-xs text-muted-foreground">Lucro</p><p className="font-semibold">{fmt(sale.profit)}</p></div><div><p className="text-xs text-muted-foreground">Margem</p><p className="font-semibold">{margin == null ? "Por confirmar" : `${margin.toFixed(1)}%`}</p></div></div>
              <div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label={`Editar venda de ${product?.name ?? "produto"}`} onClick={() => openEdit(sale)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label={`Remover venda de ${product?.name ?? "produto"}`} onClick={async () => { await deleteSale(sale.id); toast.success("Venda removida"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            </CardContent>
          </Card>;
        })}
        {filtered.length === 0 && <p className="col-span-full py-8 text-center text-muted-foreground">Nenhuma venda encontrada</p>}
      </div> : <>
      {/* Mobile: card list; Desktop: table */}
      <div className="block space-y-3 lg:hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</p>
        ) : visible.map(s => {
          const margin = s.salePrice > 0 ? (s.profit / s.salePrice) * 100 : 0;
          return (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{getProduct(s.productId)?.name ?? "—"}</span>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => { await deleteSale(s.id); toast.success("Venda removida"); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Preço Venda</p>
                    <p className="font-semibold">{fmt(s.salePrice)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Lucro</p>
                    <p className="font-semibold text-success">{fmt(s.profit)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Margem</p>
                    <p className={cn("font-semibold", margin >= 0 ? "text-success" : "text-destructive")}>{s.profit == null ? "Por confirmar" : `${margin.toFixed(1)}%`}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(s.date)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="hidden lg:block">
        <CardContent className="p-0 overflow-x-auto">
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
              ) : visible.map(s => {
                const margin = s.salePrice > 0 ? (s.profit / s.salePrice) * 100 : 0;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{getProduct(s.productId)?.name ?? "—"}<p className="text-xs font-normal text-muted-foreground">{getProduct(s.productId)?.category}{getProduct(s.productId)?.sourceData?.row ? ` · Excel, linha ${getProduct(s.productId)?.sourceData?.row}` : ""}</p></TableCell>
                    <TableCell>{fmt(s.salePrice)}</TableCell>
                    <TableCell className="text-success font-semibold">{fmt(s.profit)}</TableCell>
                    <TableCell className={cn("font-semibold", margin >= 0 ? "text-success" : "text-destructive")}>{s.profit == null ? "Por confirmar" : `${margin.toFixed(1)}%`}</TableCell>
                    <TableCell>{formatDate(s.date)}</TableCell>
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
      </>}
      </>}
      {totalVisible < totalRecords && <div ref={loadMoreRef} className="py-4 text-center text-sm text-muted-foreground" role="status">A carregar mais {salesView === "active" ? "produtos" : "vendas"}…</div>}
    </div>
  );
}
