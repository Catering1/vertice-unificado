import { FormEvent, useEffect, useState } from "react";
import { Check, Menu, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getCatalogPresentation } from "@/lib/catalog";

type Listing = {
  id: string;
  title: string;
  category: string;
  condition: string;
  warranty_months: number;
  retail_price: number;
  image_url: string | null;
  description: string | null;
  stock_quantity: number;
};

const fallbackListings: Listing[] = [];

const heroImages = ["z flip 8", "surface laptop go 3", "s25 ultra", "z fold 7"].map((title) => getCatalogPresentation(title).photos[0]);
const surfaceLaptopGo3 = getCatalogPresentation("surface laptop go 3").photos[0];
const zFold8Ultra = getCatalogPresentation("z fold 8 ultra").photos[0];
const s25Ultra = getCatalogPresentation("s25 ultra").photos[0];

function euros(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export default function Storefront() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [listings, setListings] = useState<Listing[]>(fallbackListings);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("Quero comprar um equipamento");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    async function loadListings() {
      const { data, error } = await supabase.rpc("get_public_store_products");
      if (!error && data) setListings(data as Listing[]);
      setLoading(false);
    }
    loadListings();
  }, []);

  function openContact(value: string) {
    setSubject(value);
    setSent(false);
    document.querySelector("#contacto")?.scrollIntoView({ behavior: "smooth" });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#inicio" className="text-xl font-extrabold tracking-tight">Vértice<span className="text-muted-foreground">.</span></a>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex" aria-label="Navegação principal">
            <a className="hover:text-foreground" href="#stock">Stock</a><a className="hover:text-foreground" href="#testes">Testes</a><a className="hover:text-foreground" href="#vender">Vender</a><a className="hover:text-foreground" href="#trocas">Trocas</a><a className="hover:text-foreground" href="#sobre">Sobre</a>
          </nav>
          <div className="flex items-center gap-2"><Button className="hidden sm:inline-flex" onClick={() => openContact("Quero falar convosco")}>Contactar</Button><Button variant="outline" className="size-10 p-0 md:hidden" aria-label="Menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}</Button></div>
        </div>
        {menuOpen && <nav className="grid border-t border-border px-5 py-3 text-sm font-semibold md:hidden">{[["Stock", "#stock"], ["Testes", "#testes"], ["Vender", "#vender"], ["Trocas", "#trocas"], ["Sobre", "#sobre"], ["Contacto", "#contacto"]].map(([label, href]) => <a key={href} className="py-3" href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>}
      </header>

      <main>
        <section id="inicio" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col justify-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Tecnologia seminova verificada</p><h1 className="mt-5 max-w-[12ch] text-5xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl">Escolhida à mão. Pronta para uma nova vida.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Smartphones, portáteis, tablets e wearables testados com rigor, descritos com transparência e disponíveis por contacto direto.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href="#stock" className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90">Ver stock disponível</a><Button variant="outline" onClick={() => openContact("Quero vender um equipamento")}>Vender equipamento</Button></div></div>
          <div className="grid min-h-[330px] grid-cols-2 gap-3 rounded-2xl bg-secondary p-3 sm:min-h-[470px]">{heroImages.map((image, index) => <div key={image} className={`overflow-hidden rounded-xl bg-card shadow-sm ${index === 1 ? "mt-12" : ""} ${index === 3 ? "mb-12" : ""}`}><img src={image} alt="Equipamento real disponível na Vértice" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" /></div>)}</div>
        </section>

        <section id="stock" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-16 sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Catálogo</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Stock disponível</h2><p className="mt-3 text-muted-foreground">Equipamentos selecionados, sincronizados automaticamente com o stock do negócio.</p>{loading ? <p className="mt-10 text-muted-foreground">A carregar stock...</p> : listings.length === 0 ? <div className="mt-10 rounded-xl border border-dashed border-border p-8 text-muted-foreground">Neste momento não existem artigos disponíveis.</div> : <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{listings.map((product) => { const presentation = getCatalogPresentation(product.title); const image = product.image_url || presentation.photos[0]; const description = product.description || presentation.description; const price = Number(product.retail_price) > 0 ? Number(product.retail_price) : presentation.price; const condition = product.condition && product.condition !== "Verificado" ? product.condition : presentation.condition; const isIllustrative = !product.image_url && presentation.illustrative; return <article key={product.id} className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"><Link to={`/produto/${product.id}`} className="relative block aspect-[4/3] bg-secondary">{image ? <img src={image} alt={isIllustrative ? `Imagem ilustrativa de ${product.title}` : product.title} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-semibold text-muted-foreground">Fotografia em preparação</div>}{isIllustrative ? <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow-sm">Imagem ilustrativa</span> : null}</Link><div className="p-5"><p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">{product.category}</p><h3 className="mt-2 text-lg font-semibold"><Link to={`/produto/${product.id}`} className="hover:underline">{product.title}</Link></h3><p className="mt-1 text-sm text-muted-foreground">Estado: {condition} · {product.stock_quantity} disponível{product.stock_quantity === 1 ? "" : "is"}</p><p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{description}</p><div className="mt-5 flex items-center justify-between gap-3"><span className="text-xl font-bold">{price > 0 ? euros(price) : "Sob consulta"}</span><Link to={`/produto/${product.id}`}><Button variant="outline">Ver produto</Button></Link></div></div></article>; })}</div>}</section>

        <section className="border-y border-border bg-card"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Porque comprar connosco</p><div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{[["42 pontos", "Verificação completa em cada dispositivo."], ["Garantia", "Cobertura indicada com clareza em cada artigo."], ["Transparência", "Estado real descrito sem letras pequenas."], ["Autenticidade", "Equipamento e componentes inspecionados."]].map(([title, text], index) => <div key={title}><div className="flex size-10 items-center justify-center rounded-lg bg-secondary font-bold">0{index + 1}</div><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>)}</div></div></section>
        <section id="testes" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">O nosso processo</p><h2 className="mt-2 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">Como testamos cada equipamento</h2><div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{[[ShieldCheck, "Inspeção física", "Ecrã, estrutura, portas e botões verificados em detalhe."], [RefreshCw, "Bateria e carga", "Saúde, ciclos e estabilidade de carregamento analisados."], [Sparkles, "Funções essenciais", "Câmaras, áudio, ligações e desempenho testados."], [Check, "Classificação clara", "O estado observado é refletido na descrição do artigo."]].map(([Icon, title, text], index) => { const StepIcon = Icon as typeof Check; return <div key={title as string} className="border-t border-border pt-5"><StepIcon size={22} /><h3 className="mt-8 text-lg font-bold">{title as string}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text as string}</p><span className="mt-4 block text-sm font-bold text-muted-foreground">0{index + 1}</span></div>; })}</div></section>
        <section id="vender" className="scroll-mt-20 border-y border-border bg-secondary"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2"><div className="relative min-h-64 overflow-hidden rounded-xl bg-primary"><img src={surfaceLaptopGo3} alt="Portátil preparado para uma nova vida" className="absolute inset-0 h-full w-full object-cover opacity-85" /><div className="absolute inset-0 bg-[linear-gradient(110deg,hsl(var(--primary)/0.72),transparent)]" /><div className="relative flex min-h-64 items-end p-6"><p className="max-w-[20ch] text-lg font-bold leading-6 text-primary-foreground">Dá uma segunda vida à tecnologia que já não usas.</p></div></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Vende-nos o teu equipamento</p><h2 className="mt-3 max-w-[18ch] text-3xl font-extrabold tracking-tight sm:text-4xl">Transforma tecnologia parada em valor.</h2><p className="mt-5 leading-7 text-muted-foreground">Diz-nos o modelo, o estado e o que está incluído. Analisamos a informação e entramos em contacto com uma proposta clara.</p><Button className="mt-7" onClick={() => openContact("Quero vender um equipamento")}>Pedir uma avaliação</Button></div></div></section>
        <section id="trocas" className="mx-auto grid max-w-7xl scroll-mt-20 gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Trocas</p><h2 className="mt-3 max-w-[18ch] text-3xl font-extrabold tracking-tight sm:text-4xl">Troca o que tens pelo que procuras.</h2><p className="mt-5 leading-7 text-muted-foreground">Conta-nos o que queres entregar e qual o equipamento que te interessa. Avaliamos ambos e apresentamos uma solução transparente.</p><Button variant="outline" className="mt-7" onClick={() => openContact("Quero propor uma troca")}>Propor uma troca</Button></div><div className="grid min-h-64 grid-cols-2 gap-3 overflow-hidden rounded-xl bg-secondary p-3"><img src={zFold8Ultra} alt="Smartphone dobrável disponível para troca" className="h-full w-full rounded-lg object-cover" /><img src={s25Ultra} alt="Smartphone verificado disponível para troca" className="mt-8 h-[calc(100%-2rem)] w-full rounded-lg object-cover" /></div></section>
        <section id="sobre" className="scroll-mt-20 bg-primary text-primary-foreground"><div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/55">Sobre a Vértice</p><h2 className="mt-3 max-w-[16ch] text-3xl font-extrabold tracking-tight sm:text-4xl">Curadoria, não acumulação.</h2><p className="mt-5 leading-7 text-primary-foreground/70">Acreditamos que boa tecnologia merece uma segunda vida. Selecionamos cada peça com atenção e mostramos o seu estado de forma simples, para que cada decisão seja informada.</p></div><div id="contacto" className="scroll-mt-20"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/55">Contacto</p><h2 className="mt-3 text-2xl font-extrabold">Fala connosco</h2><form className="mt-6 space-y-4" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2"><input required name="name" placeholder="Nome" className="min-h-12 rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 px-4 placeholder:text-primary-foreground/45" /><input required type="email" name="email" placeholder="Email" className="min-h-12 rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 px-4 placeholder:text-primary-foreground/45" /></div><select value={subject} onChange={(event) => setSubject(event.target.value)} className="min-h-12 w-full rounded-lg border border-primary-foreground/15 bg-primary px-4"><option>Quero comprar um equipamento</option><option>Quero vender um equipamento</option><option>Quero propor uma troca</option><option>Quero falar convosco</option>{subject.startsWith("Interesse em comprar:") && <option>{subject}</option>}</select><textarea required name="message" rows={4} placeholder="Conta-nos o que procuras" className="w-full rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 px-4 py-3 placeholder:text-primary-foreground/45" /><Button type="submit" variant="secondary">Enviar pedido</Button>{sent && <p role="status" className="text-sm text-primary-foreground/75">Pedido preparado. Falta ligar este formulário ao teu email, WhatsApp ou sistema de contactos.</p>}</form></div></div></section>
      </main>
      <footer className="bg-primary px-5 py-10 text-primary-foreground sm:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row"><div><p className="text-lg font-extrabold">Vértice.</p><p className="mt-2 text-sm text-primary-foreground/55">Compra, venda e troca de tecnologia seminova com informação clara.</p></div><p className="text-sm text-primary-foreground/45">© {new Date().getFullYear()} Vértice.</p></div></footer>
    </div>
  );
}
