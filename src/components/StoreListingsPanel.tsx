import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Listing = { id: string; product_id: string | null; title: string; published: boolean; retail_price: number };

export function StoreListingsPanel() {
  const { user } = useAuth();
  const { products } = useStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("Excelente");
  const [warranty, setWarranty] = useState("12");

  async function load() {
    const { data } = await supabase.from("store_listings").select("id, product_id, title, published, retail_price").order("created_at", { ascending: false });
    setListings((data ?? []) as Listing[]);
  }
  useEffect(() => { load(); }, []);

  const selected = products.find((product) => product.id === productId);
  async function publish() {
    if (!user || !selected || !price || Number(price) < 0) return;
    const { error } = await supabase.from("store_listings").insert({
      user_id: user.id, product_id: selected.id, title: selected.name, category: selected.category,
      condition, warranty_months: Number(warranty) || 0, retail_price: Number(price), published: true,
    });
    if (error) { toast.error("Não foi possível publicar o artigo"); return; }
    setProductId(""); setPrice(""); await load(); toast.success("Artigo publicado na loja");
  }
  async function toggle(listing: Listing) {
    const { error } = await supabase.from("store_listings").update({ published: !listing.published }).eq("id", listing.id);
    if (error) { toast.error("Não foi possível atualizar o artigo"); return; }
    await load();
  }

  return <Card>
    <CardHeader><CardTitle className="text-base">Loja pública</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Publica artigos aqui para os mostrar automaticamente na página inicial. Custos e lucros permanecem privados.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={productId} onChange={(event) => setProductId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Seleciona um produto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
        <Input inputMode="decimal" placeholder="Preço de venda (€)" value={price} onChange={(event) => setPrice(event.target.value)} />
        <Input placeholder="Estado (ex.: Excelente)" value={condition} onChange={(event) => setCondition(event.target.value)} />
        <Input inputMode="numeric" placeholder="Garantia (meses)" value={warranty} onChange={(event) => setWarranty(event.target.value)} />
      </div>
      <Button onClick={publish} disabled={!productId || !price}><Plus className="mr-2 h-4 w-4" />Publicar artigo</Button>
      {listings.length > 0 && <div className="divide-y rounded-md border">{listings.map((listing) => <div key={listing.id} className="flex items-center justify-between gap-3 p-3 text-sm"><div><p className="font-medium">{listing.title}</p><p className="text-muted-foreground">{Number(listing.retail_price).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })} · {listing.published ? "Visível" : "Oculto"}</p></div><Button variant="ghost" size="sm" onClick={() => toggle(listing)}>{listing.published ? <><EyeOff className="mr-2 h-4 w-4" />Ocultar</> : <><Eye className="mr-2 h-4 w-4" />Publicar</>}</Button></div>)}</div>}
    </CardContent>
  </Card>;
}
