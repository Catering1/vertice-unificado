import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export default function Purchases() {
  const { purchases, products, categories, addPurchase, deletePurchase, getProduct } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [searchDate, setSearchDate] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("");

  const suppliers = useMemo(() => [...new Set(products.map(p => p.supplier).filter(Boolean))], [products]);

  const save = () => {
    if (!productId || !quantity || !price || !date) { toast.error("Preencha todos os campos"); return; }
    addPurchase({ productId, quantity: Number(quantity), price: Number(price), date });
    toast.success("Compra registrada");
    setDialogOpen(false);
    setProductId(""); setQuantity(""); setPrice("");
  };

  const filtered = purchases.filter(p => {
    const prod = getProduct(p.productId);
    if (catFilter !== "all" && prod?.category !== catFilter) return false;
    if (supplierFilter && prod?.supplier !== supplierFilter) return false;
    if (searchDate && !p.date.includes(searchDate)) return false;
    return true;
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <Input type="month" value={searchDate} onChange={e => setSearchDate(e.target.value)} className="w-[180px]" />
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova Compra</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Compra</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label>Produto *</Label>
                <Select value={productId} onValueChange={(v) => { setProductId(v); const p = products.find(x => x.id === v); if (p) setPrice(String(p.purchasePrice)); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantidade *</Label><Input type="number" min={1} value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                <div><Label>Preço Unitário *</Label><Input type="number" min={0} step={0.01} value={price} onChange={e => setPrice(e.target.value)} /></div>
              </div>
              <div><Label>Data *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <Button onClick={save}>Registrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Preço Unit.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma compra encontrada</TableCell></TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{getProduct(p.productId)?.name ?? "—"}</TableCell>
                  <TableCell>{p.quantity}</TableCell>
                  <TableCell>{fmt(p.price)}</TableCell>
                  <TableCell>{fmt(p.price * p.quantity)}</TableCell>
                  <TableCell>{new Date(p.date).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { deletePurchase(p.id); toast.success("Compra removida"); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
