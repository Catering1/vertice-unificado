import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cexPrice } from "@/lib/cexPrice";
import { money } from "@/lib/dashboardMetrics";
import type { Product, Purchase } from "@/types";

export default function CexPortugalPrices({ products, purchases }: { products: Product[]; purchases: Purchase[] }) {
  const priced = products.map(product => ({ product, price: cexPrice(product) })).filter(entry => entry.price.sellPrice != null || entry.price.cashPrice != null);
  const firstPurchase = new Map<string, string>();
  for (const purchase of purchases) if (!firstPurchase.has(purchase.productId)) firstPurchase.set(purchase.productId, purchase.id);

  return <section id="precos-cex" className="scroll-mt-6 rounded-xl border bg-card p-5" aria-labelledby="cex-heading">
    <h2 id="cex-heading" className="text-lg font-semibold">Comparação de preços · CeX Portugal</h2>
    <p className="mt-1 text-sm text-muted-foreground">Os preços aparecem no detalhe de cada produto em Compras. Consulta a versão correspondente e regista ali o valor da CeX.</p>
    {priced.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2">Produto</th><th className="pb-2 text-right">Venda CeX</th><th className="pb-2 text-right">Compra CeX</th><th className="pb-2 text-right">O teu preço</th><th className="pb-2 text-right">Consultado</th></tr></thead><tbody>{priced.map(({ product, price }) => <tr key={product.id} className="border-b last:border-0"><td className="py-2 pr-3">{firstPurchase.has(product.id) ? <Link className="underline-offset-2 hover:underline" to={`/admin/compras?registo=${encodeURIComponent(firstPurchase.get(product.id)!)}`}>{product.name}</Link> : product.name}</td><td className="py-2 text-right">{price.sellPrice == null ? "—" : money(price.sellPrice)}</td><td className="py-2 text-right">{price.cashPrice == null ? "—" : money(price.cashPrice)}</td><td className="py-2 text-right">{money(product.retailPrice)}</td><td className="py-2 text-right text-muted-foreground">{price.checkedAt ? new Date(price.checkedAt).toLocaleDateString("pt-PT") : "—"}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-muted-foreground">Ainda não há preços CeX registados. Abre um produto em Compras para adicionar o primeiro.</p>}
    <Button asChild variant="outline" size="sm" className="mt-4"><Link to="/admin/compras">Abrir produtos em Compras</Link></Button>
    <p className="mt-3 text-xs text-muted-foreground">Valores registados manualmente. Confirma sempre o preço atual na CeX antes de tomar decisões.</p>
  </section>;
}
