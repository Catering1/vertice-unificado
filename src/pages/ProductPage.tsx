import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import zFlip8 from "@/assets/products/z-flip-8.png";
import zFold8Ultra from "@/assets/products/z-fold-8-ultra.png";
import zFold7 from "@/assets/products/z-fold-7.png";
import s25Ultra2 from "@/assets/products/s25-ultra-2.png";
import s25Ultra from "@/assets/products/s25-ultra.png";
import logitechBrio from "@/assets/products/logitech-brio.png";
import surfaceLaptopGo3 from "@/assets/products/surface-laptop-go-3.png";
import surfaceLaptopStudio from "@/assets/products/surface-laptop-studio.png";

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

const imageFallbacks: Record<string, string> = {
  "z flip 8": zFlip8, "z fold 8 ultra": zFold8Ultra, "z fold 7": zFold7,
  "s25 ultra 2": s25Ultra2, "s25 ultra": s25Ultra, "logitech brio": logitechBrio,
  "surface laptop go 3": surfaceLaptopGo3, "surface laptop studio": surfaceLaptopStudio,
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

  const photos = product.photo_urls?.filter(Boolean) ?? [];
  const fallback = product.image_url || imageFallbacks[product.title.trim().toLowerCase()];
  if (photos.length === 0 && fallback) photos.push(fallback);
  const specs = (product.specifications ?? "").split(/\n|·/).map((item) => item.trim()).filter(Boolean);

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border"><div className="mx-auto flex h-16 max-w-7xl items-center px-5 sm:px-8"><Link to="/" className="text-xl font-extrabold tracking-tight">Vértice<span className="text-muted-foreground">.</span></Link></div></header>
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-14">
      <Link to="/#stock" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size={17} /> Voltar ao catálogo</Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-4 sm:grid-cols-2">{photos.map((photo, index) => <div key={`${photo}-${index}`} className={index === 0 ? "sm:col-span-2" : ""}><img src={photo} alt={`${product.title} — fotografia ${index + 1}`} className="aspect-[4/3] h-full w-full rounded-xl bg-secondary object-cover" /></div>)}</div>
        <div className="lg:pt-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{product.category}</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">{product.title}</h1><p className="mt-4 text-lg text-muted-foreground">Estado: {product.condition}</p><p className="mt-6 text-3xl font-extrabold">{Number(product.retail_price) > 0 ? euro(Number(product.retail_price)) : "Sob consulta"}</p><Link to="/#contacto" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90">Tenho interesse neste produto</Link><div className="mt-9 space-y-4 border-t border-border pt-7"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0" size={21} /><div><h2 className="font-bold">Equipamento verificado</h2><p className="mt-1 text-sm text-muted-foreground">Inspecionado antes de ser colocado à venda.</p></div></div>{product.warranty_months > 0 && <div className="flex gap-3"><Check className="mt-0.5 shrink-0" size={21} /><div><h2 className="font-bold">Garantia de {product.warranty_months} meses</h2><p className="mt-1 text-sm text-muted-foreground">Cobertura indicada de forma clara.</p></div></div>}</div></div>
      </div>
      <div className="mt-16 grid gap-10 border-t border-border pt-10 lg:grid-cols-2"><section><h2 className="text-2xl font-extrabold">Descrição</h2><p className="mt-4 whitespace-pre-line leading-7 text-muted-foreground">{product.description || "Informação detalhada disponível mediante contacto."}</p></section><section><h2 className="text-2xl font-extrabold">Especificações</h2>{specs.length > 0 ? <ul className="mt-4 space-y-3 text-muted-foreground">{specs.map((spec) => <li key={spec} className="border-b border-border pb-3">{spec}</li>)}</ul> : <p className="mt-4 text-muted-foreground">Especificações detalhadas disponíveis mediante contacto.</p>}</section></div>
    </section>
  </main>;
}
