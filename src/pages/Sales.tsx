import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Sales() {
  const { sales, products, addSale, deleteSale, getProduct } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [searchDate, setSearchDate] = useState("");
  const [productFilter, setProductFilter] = useState("all");

  const save = () => {
    if (!productId || !quantity || !salePrice || !date) { toast.error("Preencha todos os campos"); return; }
    const sale = addSale({ productId, quantity: Number(quantity), salePrice: Number(salePrice), date });
    toast.success(`Venda registrada — Lucro: ${sale.profit.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}`);
    setDialogOpen(false);
    setProductId(""); setQuantity(""); setSalePrice("");
  };

  const filtered = sales.filter(s => {
    if (productFilter !== "all" && s.productId !== productFilter) return false;
    if (searchDate && !s.date.includes(searchDate)) return false;
    return true;
  });

  const fmt = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <Input type="month" value={searchDate} onChange={e => setSearchDate(e.target.value)} className="w-[180px]" />
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Produto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova Venda</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Venda</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label>Produto *</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantidade *</Label><Input type="number" min={1} value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                <div><Label>Preço de Venda *</Label><Input type="number" min={0} step={0.01} value={salePrice} onChange={e => setSalePrice(e.target.value)} /></div>
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
                <TableHead>Qtd</TableHead>
                <TableHead>Preço Venda</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Lucro</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</TableCell></TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{getProduct(s.productId)?.name ?? "—"}</TableCell>
                  <TableCell>{s.quantity}</TableCell>
                  <TableCell>{fmt(s.salePrice)}</TableCell>
                  <TableCell>{fmt(s.salePrice * s.quantity)}</TableCell>
                  <TableCell className={s.profit >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>{fmt(s.profit)}</TableCell>
                  <TableCell>{new Date(s.date).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { deleteSale(s.id); toast.success("Venda removida"); }}>
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
