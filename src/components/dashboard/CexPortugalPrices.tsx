import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/dashboardMetrics";
import type { Product } from "@/types";
import { useStore } from "@/lib/store";
import { undoToast } from "@/lib/undoToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CexItem = { id: string; name: string; sellPrice: number; cashPrice: number | null; exchangePrice: number | null };
type Result = { items: CexItem[]; checkedAt: string };

async function searchCex(query: string, byId = false): Promise<Result> {
  const { data, error } = await supabase.functions.invoke<Result>("cex-portugal", { body: byId ? { boxId: query } : { query } });
  if (error || !data || !Array.isArray(data.items)) throw error ?? new Error("Resposta inválida");
  return data;
}

function cexId(product: Product): string | null {
  const id = product.sourceData?.cexPtBoxId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export default function CexPortugalPrices({ products }: { products: Product[] }) {
  const { updateProduct } = useStore();
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CexItem[]>([]);
  const [prices, setPrices] = useState<Record<string, { item: CexItem; checkedAt: string }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  const mapped = useMemo(() => products.filter(product => cexId(product)), [products]);
  const selected = products.find(product => product.id === selectedId);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      for (const product of mapped) {
        try {
          const result = await searchCex(cexId(product)!, true);
          const item = result.items.find(candidate => candidate.id === cexId(product));
          if (!cancelled && item) setPrices(previous => ({ ...previous, [product.id]: { item, checkedAt: result.checkedAt } }));
        } catch { /* A linha continua visível como indisponível. */ }
      }
      if (!cancelled) setChecked(true);
    }
    void refresh();
    return () => { cancelled = true; };
  }, [mapped]);

  async function find() {
    if (query.trim().length < 2) return;
    setBusy(true); setError(""); setResults([]);
    try { setResults((await searchCex(query)).items); }
    catch { setError("A pesquisa na CeX Portugal falhou. Tenta novamente."); }
    finally { setBusy(false); }
  }

  async function save(item: CexItem | null) {
    if (!selected) return;
    setBusy(true); setError("");
    const sourceData = { ...selected.sourceData };
    if (item) sourceData.cexPtBoxId = item.id;
    else delete sourceData.cexPtBoxId;
    const previousSourceData = { ...selected.sourceData };
    try {
      await updateProduct({ ...selected, sourceData: sourceData as Record<string, unknown> });
      undoToast(item ? "Produto associado à CeX" : "Associação à CeX removida", () => updateProduct({ ...selected, sourceData: previousSourceData }));
      setResults([]);
    } catch {
      setError("Não foi possível guardar a associação à CeX.");
    }
    setBusy(false);
  }

  return <section id="precos-cex" className="scroll-mt-6 rounded-xl border bg-card p-5" aria-labelledby="cex-heading">
    <h2 id="cex-heading" className="text-lg font-semibold">Comparação de preços · CeX Portugal</h2>
    <p className="mt-1 text-sm text-muted-foreground">Preços de venda e de compra em dinheiro da CeX para os artigos que associares. Confirma o modelo, capacidade e estado antes de associar.</p>
    {mapped.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2">O teu produto</th><th className="pb-2">Artigo CeX</th><th className="pb-2 text-right">Venda CeX</th><th className="pb-2 text-right">Compra CeX</th><th className="pb-2 text-right">O teu preço</th></tr></thead><tbody>{mapped.map(product => { const current = prices[product.id]; return <tr key={product.id} className="border-b last:border-0"><td className="py-2 pr-3">{product.name}</td><td className="py-2 pr-3" title={current ? `Consultado em ${new Date(current.checkedAt).toLocaleString("pt-PT")}` : undefined}>{current?.item.name ?? (checked ? "Indisponível" : "A consultar…")}</td><td className="py-2 text-right">{current ? money(current.item.sellPrice) : "—"}</td><td className="py-2 text-right">{current?.item.cashPrice != null ? money(current.item.cashPrice) : "—"}</td><td className="py-2 text-right">{money(product.retailPrice)}</td></tr>; })}</tbody></table></div>}
    <div className="mt-5 flex flex-wrap gap-2"><select className="h-10 min-w-48 rounded-md border bg-background px-3 text-sm" aria-label="Escolher produto" value={selectedId} onChange={event => { const id = event.target.value; setSelectedId(id); setQuery(products.find(product => product.id === id)?.name ?? ""); setResults([]); }}><option value="">Escolhe um produto</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select><Input className="max-w-sm" aria-label="Pesquisar na CeX" placeholder="Pesquisar na CeX Portugal" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void find(); }} /><Button onClick={() => void find()} disabled={busy || !selectedId || query.trim().length < 2}>Pesquisar</Button>{selected && cexId(selected) && <Button variant="outline" disabled={busy} onClick={() => void save(null)}>Remover associação</Button>}</div>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    {results.length > 0 && <div className="mt-3 max-h-72 overflow-y-auto rounded-md border">{results.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b p-3 text-sm last:border-0"><span>{item.name} <span className="text-muted-foreground">({item.id})</span></span><span className="flex items-center gap-3"><span>Venda {money(item.sellPrice)}</span><Button size="sm" disabled={busy} onClick={() => void save(item)}>Associar</Button></span></div>)}</div>}
    <p className="mt-3 text-xs text-muted-foreground">Fonte: <a className="underline" href="https://pt.webuy.com" target="_blank" rel="noreferrer">CeX Portugal</a>. Valores indicativos, sujeitos a alteração; a compra em dinheiro depende da avaliação da CeX.</p>
  </section>;
}
