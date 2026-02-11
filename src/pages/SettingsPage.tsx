import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Download, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const { categories, addCategory, updateCategory, deleteCategory, products, purchases, sales, getProduct } = useStore();
  const [newCat, setNewCat] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const addCat = async () => {
    if (!newCat.trim()) return;
    await addCategory(newCat.trim());
    setNewCat("");
    toast.success("Categoria adicionada");
  };

  const startEdit = (cat: string) => {
    setEditingCat(cat);
    setEditValue(cat);
  };

  const saveEdit = async () => {
    if (!editingCat || !editValue.trim()) return;
    if (editValue.trim() !== editingCat) {
      await updateCategory(editingCat, editValue.trim());
      toast.success("Categoria renomeada");
    }
    setEditingCat(null);
  };

  const exportProducts = () => {
    downloadCSV("produtos.csv",
      ["Nome", "Categoria", "Preço Compra", "Fornecedor"],
      products.map(p => [p.name, p.category, String(p.purchasePrice), p.supplier])
    );
    toast.success("Produtos exportados");
  };

  const exportPurchases = () => {
    downloadCSV("compras.csv",
      ["Produto", "Quantidade", "Preço", "Total", "Data"],
      purchases.map(p => {
        const prod = getProduct(p.productId);
        return [prod?.name ?? "", String(p.quantity), String(p.price), String(p.price * p.quantity), p.date];
      })
    );
    toast.success("Compras exportadas");
  };

  const exportSales = () => {
    downloadCSV("vendas.csv",
      ["Produto", "Quantidade", "Preço Venda", "Total", "Lucro", "Data"],
      sales.map(s => {
        const prod = getProduct(s.productId);
        return [prod?.name ?? "", String(s.quantity), String(s.salePrice), String(s.salePrice * s.quantity), String(s.profit), s.date];
      })
    );
    toast.success("Vendas exportadas");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Categories */}
      <Card>
        <CardHeader><CardTitle className="text-base">Categorias</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Nova categoria..." value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCat()} />
            <Button onClick={addCat}><Plus className="h-4 w-4" /></Button>
          </div>
          <Table>
            <TableBody>
              {categories.map(c => (
                <TableRow key={c}>
                  <TableCell>
                    {editingCat === c ? (
                      <Input
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingCat(null); }}
                        autoFocus
                        className="h-8"
                      />
                    ) : (
                      c
                    )}
                  </TableCell>
                  <TableCell className="w-24 text-right">
                    {editingCat === c ? (
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={saveEdit}>
                          <Check className="h-4 w-4 text-success" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingCat(null)}>
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(c)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={async () => { await deleteCategory(c); toast.success("Categoria removida"); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader><CardTitle className="text-base">Exportar Dados (CSV)</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportProducts}><Download className="mr-2 h-4 w-4" />Produtos</Button>
          <Button variant="outline" onClick={exportPurchases}><Download className="mr-2 h-4 w-4" />Compras</Button>
          <Button variant="outline" onClick={exportSales}><Download className="mr-2 h-4 w-4" />Vendas</Button>
        </CardContent>
      </Card>
    </div>
  );
}
