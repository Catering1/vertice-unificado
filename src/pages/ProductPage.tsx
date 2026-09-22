import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getCatalogPresentation } from "@/lib/catalog";

type PublicProduct = {
  id: string;
  title: string;
  category: string;
  condition: string;
  warranty_months: number;
  retail_price: number;
  image_url: string | null;
  description: string | null;
  specifications?: string | null;
  photo_urls?: string[] | null;
};

const euro = (value: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      const { data } = await supabase.rpc("get_public_store_products");
      setProduct(((data ?? []) as PublicProduct[]).find((item) => item.id === id) ?? null);
      setLoading(false);
    }
    loadProduct();
  }, [id]);

  if (loading) return <main className="mx-auto min-h-screen max-w-7xl px-5 py-20 text-muted-foreground sm:px-8">A carregar produto...</main>;
  if (!product) return <main className="mx-auto min-h-screen max-w-7xl px-5 py-20 sm:px-8"><p className="text-muted-foreground">Este produto já não está disponível.</p><Link to="/" className="mt-5 inline-flex items-center gap-2 font-semibold hover:underline"><ArrowLeft size={18} /> Voltar ao catálogo</Link></main>;

  const presentation = getCatalogPresentation(product.title);
  const databasePhotos = product.photo_urls?.filter(Boolean) ?? [];
  const photos = databasePhotos.length > 0 ? databasePhotos : product.image_url ? [product.image_url] : presentation.photos;
  const databaseSpecs = (product.specifications ?? "").split(/\n|·/).map((item) => item.trim()).filter(Boolean);
  const specs = databaseSpecs.length > 0 ? databaseSpecs : presentation.specifications;
  const description = product.description || presentation.description;
  const price = Number(product.retail_price) > 0 ? Number(product.retail_price) : presentation.price;
  const condition = product.condition && product.condition !== "Verificado" ? product.condition : presentation.condition;
  const isIllustrative = databasePhotos.length === 0 && !product.image_url && presentation.illustrative;

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border"><div className="mx-auto flex h-16 max-w-7xl items-center px-5 sm:px-8"><Link to="/" className="text-xl font-extrabold tracking-tight">Vértice<span className="text-muted-foreground">.</span></Link></div></header>
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-14">
      <Link to="/#stock" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size={17} /> Voltar ao catálogo</Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div><div className="grid gap-4 sm:grid-cols-2">{photos.map((photo, index) => <div key={`${photo}-${index}`} className={index === 0 ? "sm:col-span-2" : ""}><img src={photo} alt={isIllustrative ? `Imagem ilustrativa de ${product.title}` : `${product.title} — fotografia ${index + 1}`} className="aspect-[4/3] h-full w-full rounded-xl bg-secondary object-cover" /></div>)}</div>{isIllustrative ? <p className="mt-3 text-sm font-medium text-muted-foreground">Imagem ilustrativa. As fotografias reais serão acrescentadas após a verificação do artigo.</p> : null}</div>
        <div className="lg:pt-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{product.category}</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">{product.title}</h1><p className="mt-4 text-lg text-muted-foreground">Estado: {condition}</p><p className="mt-6 text-3xl font-extrabold">{price > 0 ? euro(price) : "Sob consulta"}</p><Link to="/#contacto" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90">Tenho interesse neste produto</Link><div className="mt-9 space-y-4 border-t border-border pt-7"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0" size={21} /><div><h2 className="font-bold">Equipamento verificado</h2><p className="mt-1 text-sm text-muted-foreground">Inspecionado antes de ser colocado à venda.</p></div></div>{product.warranty_months > 0 && <div className="flex gap-3"><Check className="mt-0.5 shrink-0" size={21} /><div><h2 className="font-bold">Garantia de {product.warranty_months} meses</h2><p className="mt-1 text-sm text-muted-foreground">Cobertura indicada de forma clara.</p></div></div>}</div></div>
      </div>
      <div className="mt-16 grid gap-10 border-t border-border pt-10 lg:grid-cols-2"><section><h2 className="text-2xl font-extrabold">Descrição</h2><p className="mt-4 whitespace-pre-line leading-7 text-muted-foreground">{description}</p></section><section><h2 className="text-2xl font-extrabold">Especificações</h2>{specs.length > 0 ? <ul className="mt-4 space-y-3 text-muted-foreground">{specs.map((spec) => <li key={spec} className="border-b border-border pb-3">{spec}</li>)}</ul> : <p className="mt-4 text-muted-foreground">Especificações detalhadas disponíveis mediante contacto.</p>}</section></div>
    </section>
  </main>;
}
