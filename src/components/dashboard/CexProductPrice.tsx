import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cexPrice, cexSearchUrl } from "@/lib/cexPrice";
import { money } from "@/lib/dashboardMetrics";
import { useStore } from "@/lib/store";
import { undoToast } from "@/lib/undoToast";
import type { Product } from "@/types";

function parsePrice(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

export default function CexProductPrice({ product }: { product: Product }) {
  const { updateProduct } = useStore();
  const current = cexPrice(product);
  const [boxId, setBoxId] = useState(current.boxId);
  const [sellPrice, setSellPrice] = useState(current.sellPrice == null ? "" : String(current.sellPrice));
  const [cashPrice, setCashPrice] = useState(current.cashPrice == null ? "" : String(current.cashPrice));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const value = cexPrice(product);
    setBoxId(value.boxId);
    setSellPrice(value.sellPrice == null ? "" : String(value.sellPrice));
    setCashPrice(value.cashPrice == null ? "" : String(value.cashPrice));
    setError("");
  }, [product]);

  async function save() {
    const sell = parsePrice(sellPrice);
    const cash = parsePrice(cashPrice);
    if (Number.isNaN(sell) || Number.isNaN(cash)) {
      setError("Indica preços válidos, iguais ou superiores a zero.");
      return;
    }
    setSaving(true);
    setError("");
    const sourceData = { ...product.sourceData };
    if (boxId.trim()) sourceData.cexPtBoxId = boxId.trim();
    else delete sourceData.cexPtBoxId;
    if (sell != null) sourceData.cexPtSellPrice = sell;
    else delete sourceData.cexPtSellPrice;
    if (cash != null) sourceData.cexPtCashPrice = cash;
    else delete sourceData.cexPtCashPrice;
    if (sell != null || cash != null) sourceData.cexPtCheckedAt = new Date().toISOString();
    else delete sourceData.cexPtCheckedAt;
    const previous = { ...product.sourceData };
    try {
      await updateProduct({ ...product, sourceData });
      undoToast("Preço CeX atualizado", () => updateProduct({ ...product, sourceData: previous }));
    } catch {
      setError("Não foi possível guardar o preço CeX.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="space-y-3 rounded-md border p-3" aria-label="Preço CeX Portugal">
    <div>
      <h3 className="text-sm font-semibold">Preço CeX Portugal</h3>
      <p className="text-xs text-muted-foreground">Compara a mesma versão, capacidade e estado antes de registar o preço.</p>
    </div>
    <p className="rounded-md bg-muted px-3 py-2 text-sm">{current.sellPrice == null ? "Ainda sem preço de venda CeX registado" : `Venda CeX: ${money(current.sellPrice)}`}{current.cashPrice != null ? ` · Compra em dinheiro: ${money(current.cashPrice)}` : ""}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label htmlFor="cex-sell-price">Preço de venda CeX (€)</Label><Input id="cex-sell-price" type="number" min="0" step="0.01" inputMode="decimal" value={sellPrice} onChange={event => setSellPrice(event.target.value)} /></div>
      <div><Label htmlFor="cex-cash-price">Compra em dinheiro CeX (€)</Label><Input id="cex-cash-price" type="number" min="0" step="0.01" inputMode="decimal" value={cashPrice} onChange={event => setCashPrice(event.target.value)} /></div>
    </div>
    <div><Label htmlFor="cex-box-id">Referência CeX (opcional)</Label><Input id="cex-box-id" value={boxId} onChange={event => setBoxId(event.target.value)} placeholder="Código do artigo CeX" maxLength={80} /></div>
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>{saving ? "A guardar…" : "Guardar preço CeX"}</Button>
      <Button asChild type="button" size="sm" variant="outline"><a href={cexSearchUrl(boxId.trim() || product.name)} target="_blank" rel="noreferrer">Consultar CeXDB</a></Button>
    </div>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    {current.checkedAt && <p className="text-xs text-muted-foreground">Registado em {new Date(current.checkedAt).toLocaleString("pt-PT")}. Confirma o valor atual na fonte.</p>}
    <p className="text-xs text-muted-foreground">Registo manual. A consulta automática à CeX está indisponível.</p>
  </section>;
}
