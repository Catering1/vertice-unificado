import { FormEvent, useEffect, useState } from "react";
import { Check, Menu, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { getCatalogPresentation } from "@/lib/catalog";
import { usePublicProducts } from "@/hooks/usePublicProducts";
import { contactEmailUrl } from "@/lib/contact";

const contactEmail = import.meta.env.VITE_CONTACT_EMAIL ?? "";
const emailContactAvailable = Boolean(contactEmailUrl(contactEmail, { name: "", email: "", subject: "", message: "" }));

const heroImages = ["z flip 8", "surface laptop go 3", "s25 ultra", "z fold 7"].map((title) => getCatalogPresentation(title).photos[0]);
const surfaceLaptopGo3 = getCatalogPresentation("surface laptop go 3").photos[0];
const zFold8Ultra = getCatalogPresentation("z fold 8 ultra").photos[0];
const s25Ultra = getCatalogPresentation("s25 ultra").photos[0];

export default function Storefront() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: listings = [], isPending: loading, isError, refetch } = usePublicProducts();
  const [searchParams] = useSearchParams();
  const { hash } = useLocation();
  const interestedProduct = listings.find(product => product.id === searchParams.get("produto"));
  const [selectedSubject, setSubject] = useState("");
  const subject = selectedSubject || (interestedProduct ? `Interesse em comprar: ${interestedProduct.title}` : "Quero comprar um equipamento");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
  }, [hash, loading]);

  function openContact(value: string) {
    setSubject(value);
    setSent(false);
    document.querySelector("#contacto")?.scrollIntoView({ behavior: "smooth" });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const url = contactEmailUrl(contactEmail, { name: String(fields.get("name") ?? ""), email: String(fields.get("email") ?? ""), subject, message: String(fields.get("message") ?? "") });
    if (!url) return;
    window.location.href = url;
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#stock" className="text-xl font-extrabold tracking-tight">Vendig Machine Store<span className="text-muted-foreground">.</span></a>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex" aria-label="Navegação principal">
            <a className="hover:text-foreground" href="#stock">Stock</a><a className="hover:text-foreground" href="#testes">Testes</a><a className="hover:text-foreground" href="#vender">Vender</a><a className="hover:text-foreground" href="#trocas">Trocas</a><a className="hover:text-foreground" href="#sobre">Sobre</a>
          </nav>
          <div className="flex items-center gap-2"><Button className="hidden sm:inline-flex" onClick={() => openContact("Quero falar convosco")}>Contactar</Button><Button variant="outline" className="size-10 p-0 md:hidden" aria-label="Menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}</Button></div>
        </div>
        {menuOpen && <nav className="grid border-t border-border px-5 py-3 text-sm font-semibold md:hidden">{[["Stock", "#stock"], ["Testes", "#testes"], ["Vender", "#vender"], ["Trocas", "#trocas"], ["Sobre", "#sobre"], ["Contacto", "#contacto"]].map(([label, href]) => <a key={href} className="py-3" href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>}
      </header>

      <main>
        <section id="stock" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-12 sm:px-8 lg:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Catálogo</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Stock e próximas chegadas</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">Equipamentos disponíveis e encomendas a caminho, sincronizados automaticamente com o negócio.</p>
          {loading ? <p className="mt-10 text-muted-foreground">A carregar stock...</p> : isError ? <div className="mt-10 rounded-xl border p-8"><p role="alert">Não foi possível carregar o catálogo.</p><Button className="mt-4" onClick={() => void refetch()}>Tentar novamente</Button></div> : listings.length === 0 ? <div className="mt-10 rounded-xl border border-dashed border-border p-8 text-muted-foreground">Neste momento não existem artigos disponíveis.</div> : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((product) => {
                const image = product.image_url;
                const comingSoon = product.availability_status === "coming_soon";
                return (
                  <Link key={product.id} to={`/produto/${product.id}`} className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
                    <div className="relative aspect-[4/3] bg-secondary">
                      {image ? <img src={image} alt={product.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center text-sm font-semibold text-muted-foreground">Fotografia em preparação</div>}
                      <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${comingSoon ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{comingSoon ? "Por receber" : "Recebido"}</span>
                    </div>
                    <h3 className="p-5 text-lg font-semibold group-hover:underline">{product.title}</h3>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section id="inicio" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col justify-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Tecnologia seminova verificada</p><h2 className="mt-5 max-w-[12ch] text-5xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl">Escolhida à mão. Pronta para uma nova vida.</h2><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Smartphones, portáteis, tablets e wearables testados com rigor, descritos com transparência e disponíveis por contacto direto.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href="#stock" className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90">Ver stock disponível</a><Button variant="outline" onClick={() => openContact("Quero vender um equipamento")}>Vender equipamento</Button></div></div>
          <div className="grid min-h-[330px] grid-cols-2 gap-3 rounded-2xl bg-secondary p-3 sm:min-h-[470px]">{heroImages.map((image, index) => <div key={image} className={`overflow-hidden rounded-xl bg-card shadow-sm ${index === 1 ? "mt-12" : ""} ${index === 3 ? "mb-12" : ""}`}><img src={image} alt="Imagem de apresentação de equipamento" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" /></div>)}</div>
        </section>

        <section className="border-y border-border bg-card"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Porque comprar connosco</p><div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{[["42 pontos", "Verificação completa em cada dispositivo."], ["Garantia", "Cobertura indicada com clareza em cada artigo."], ["Transparência", "Estado real descrito sem letras pequenas."], ["Autenticidade", "Equipamento e componentes inspecionados."]].map(([title, text], index) => <div key={title}><div className="flex size-10 items-center justify-center rounded-lg bg-secondary font-bold">0{index + 1}</div><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>)}</div></div></section>
        <section id="testes" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">O nosso processo</p><h2 className="mt-2 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">Como testamos cada equipamento</h2><div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{[[ShieldCheck, "Inspeção física", "Ecrã, estrutura, portas e botões verificados em detalhe."], [RefreshCw, "Bateria e carga", "Saúde, ciclos e estabilidade de carregamento analisados."], [Sparkles, "Funções essenciais", "Câmaras, áudio, ligações e desempenho testados."], [Check, "Classificação clara", "O estado observado é refletido na descrição do artigo."]].map(([Icon, title, text], index) => { const StepIcon = Icon as typeof Check; return <div key={title as string} className="border-t border-border pt-5"><StepIcon size={22} /><h3 className="mt-8 text-lg font-bold">{title as string}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text as string}</p><span className="mt-4 block text-sm font-bold text-muted-foreground">0{index + 1}</span></div>; })}</div></section>
        <section id="vender" className="scroll-mt-20 border-y border-border bg-secondary"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2"><div className="relative min-h-64 overflow-hidden rounded-xl bg-primary"><img src={surfaceLaptopGo3} alt="Portátil preparado para uma nova vida" className="absolute inset-0 h-full w-full object-cover opacity-85" /><div className="absolute inset-0 bg-[linear-gradient(110deg,hsl(var(--primary)/0.72),transparent)]" /><div className="relative flex min-h-64 items-end p-6"><p className="max-w-[20ch] text-lg font-bold leading-6 text-primary-foreground">Dá uma segunda vida à tecnologia que já não usas.</p></div></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Vende-nos o teu equipamento</p><h2 className="mt-3 max-w-[18ch] text-3xl font-extrabold tracking-tight sm:text-4xl">Transforma tecnologia parada em valor.</h2><p className="mt-5 leading-7 text-muted-foreground">Diz-nos o modelo, o estado e o que está incluído. Analisamos a informação e entramos em contacto com uma proposta clara.</p><Button className="mt-7" onClick={() => openContact("Quero vender um equipamento")}>Pedir uma avaliação</Button></div></div></section>
        <section id="trocas" className="mx-auto grid max-w-7xl scroll-mt-20 gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Trocas</p><h2 className="mt-3 max-w-[18ch] text-3xl font-extrabold tracking-tight sm:text-4xl">Troca o que tens pelo que procuras.</h2><p className="mt-5 leading-7 text-muted-foreground">Conta-nos o que queres entregar e qual o equipamento que te interessa. Avaliamos ambos e apresentamos uma solução transparente.</p><Button variant="outline" className="mt-7" onClick={() => openContact("Quero propor uma troca")}>Propor uma troca</Button></div><div className="grid min-h-64 grid-cols-2 gap-3 overflow-hidden rounded-xl bg-secondary p-3"><img src={zFold8Ultra} alt="Smartphone dobrável disponível para troca" className="h-full w-full rounded-lg object-cover" /><img src={s25Ultra} alt="Smartphone verificado disponível para troca" className="mt-8 h-[calc(100%-2rem)] w-full rounded-lg object-cover" /></div></section>
        <section id="sobre" className="scroll-mt-20 bg-primary text-primary-foreground"><div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/55">Sobre a Vendig Machine Store</p><h2 className="mt-3 max-w-[16ch] text-3xl font-extrabold tracking-tight sm:text-4xl">Curadoria, não acumulação.</h2><p className="mt-5 leading-7 text-primary-foreground/70">Acreditamos que boa tecnologia merece uma segunda vida. Selecionamos cada peça com atenção e mostramos o seu estado de forma simples, para que cada decisão seja informada.</p></div><div id="contacto" className="scroll-mt-20"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/55">Contacto</p><h2 className="mt-3 text-2xl font-extrabold">Fala connosco</h2><form className="mt-6 space-y-4" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2"><input required name="name" aria-label="Nome" placeholder="Nome" className="min-h-12 rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 px-4 placeholder:text-primary-foreground/45" /><input required type="email" name="email" aria-label="Email" placeholder="Email" className="min-h-12 rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 px-4 placeholder:text-primary-foreground/45" /></div><select aria-label="Assunto" value={subject} onChange={(event) => setSubject(event.target.value)} className="min-h-12 w-full rounded-lg border border-primary-foreground/15 bg-primary px-4"><option>Quero comprar um equipamento</option><option>Quero vender um equipamento</option><option>Quero propor uma troca</option><option>Quero falar convosco</option>{subject.startsWith("Interesse em comprar:") && <option>{subject}</option>}</select><textarea required name="message" aria-label="Mensagem" rows={4} placeholder="Conta-nos o que procuras" className="w-full rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 px-4 py-3 placeholder:text-primary-foreground/45" /><Button type="submit" variant="secondary" disabled={!emailContactAvailable}>Abrir pedido por email</Button>{!emailContactAvailable && <p className="text-sm text-primary-foreground/75">Podes falar connosco pelo <a className="underline" href="https://www.olx.pt/ads/user/1oBuh/" target="_blank" rel="noopener noreferrer">chat dos nossos anúncios OLX</a>.</p>}{sent && <p role="status" className="text-sm text-primary-foreground/75">O pedido foi preparado no teu programa de email. Confirma o envio nessa aplicação.</p>}</form></div></div></section>
      </main>
      <footer className="bg-primary px-5 py-10 text-primary-foreground sm:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row"><div><p className="text-lg font-extrabold">Vendig Machine Store.</p><p className="mt-2 text-sm text-primary-foreground/55">Loja e gestão do negócio num só lugar.</p></div><p className="text-sm text-primary-foreground/45">© {new Date().getFullYear()} Vendig Machine Store.</p></div></footer>
    </div>
  );
}
