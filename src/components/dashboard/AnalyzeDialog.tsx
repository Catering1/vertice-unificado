import { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface DashboardData {
  category: string;
  totalPurchases: string;
  totalSales: string;
  totalProfit: string;
  avgMargin: string;
  
  roiRealized: string;
  stockTurnover: string;
  stockValue: string;
  avgVelocity: string;
  avgProfitPerSale: string;
  productCount: number;
  topProducts: string;
}

interface AnalyzeDialogProps {
  dashboardData: DashboardData;
}

export default function AnalyzeDialog({ dashboardData }: AnalyzeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [followUps, setFollowUps] = useState<{ question: string; answer: string }[]>([]);
  const improvementsHeading = insights.match(/(?:^|\n)##\s*Melhorias e correções[^\n]*\n?/i);
  const diagnosis = improvementsHeading?.index == null ? insights : insights.slice(0, improvementsHeading.index);
  const improvements = improvementsHeading?.index == null ? "" : insights.slice(improvementsHeading.index + improvementsHeading[0].length).trim();

  const requestAnalysis = async (followUpQuestion?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Inicia sessão para analisar o dashboard.");
    const history = followUpQuestion ? [
      { role: "model", text: insights },
      ...followUps.slice(-5).flatMap(turn => [{ role: "user", text: turn.question }, { role: "model", text: turn.answer }]),
    ] : [];
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-dashboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ dashboardData, question: followUpQuestion, history }),
    });
    if (!resp.ok) {
      const result = await resp.json().catch(() => ({}));
      throw new Error(result.error || `Erro ${resp.status}`);
    }
    if (resp.headers.get("content-type")?.includes("application/json")) {
      const result = await resp.json();
      if (!result.text) throw new Error("Resposta vazia");
      return result.text as string;
    }
    if (!resp.body) throw new Error("Resposta vazia");
    const stream = await resp.text();
    const answer = stream.split("\n").filter(line => line.startsWith("data: ")).map(line => {
      try { return JSON.parse(line.slice(6)).choices?.[0]?.delta?.content ?? ""; } catch { return ""; }
    }).join("");
    if (!answer) throw new Error("Resposta vazia");
    return answer;
  };

  const analyze = async () => {
    setLoading(true);
    setInsights("");
    setErrorMessage("");
    setFollowUps([]);
    setQuestion("");

    try {
      setInsights(await requestAnalysis());
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Erro ao analisar o dashboard. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  const ask = async (event: React.FormEvent) => {
    event.preventDefault();
    const asked = question.trim();
    if (!asked || !insights || asking) return;
    setQuestion("");
    setAsking(true);
    setErrorMessage("");
    try {
      const answer = await requestAnalysis(asked);
      setFollowUps(current => [...current, { question: asked, answer }]);
    } catch (error) {
      setQuestion(asked);
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível responder. Tenta novamente.");
      toast.error("Erro ao perguntar à IA");
    } finally {
      setAsking(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !insights) {
      analyze();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="min-h-10 gap-2 px-4">
          <Sparkles className="h-4 w-4" />
          Analisar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Análise de {dashboardData.category}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {loading && !insights && (
            <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              A analisar os dados...
            </div>
          )}
          {insights && (
            <div className="space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{diagnosis}</ReactMarkdown></div>
              {improvements && <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30" aria-label="Melhorias e correções"><h3 className="mb-2 font-semibold text-emerald-950 dark:text-emerald-100">Melhorias e correções</h3><div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{improvements}</ReactMarkdown></div></section>}
            </div>
          )}
          {followUps.map((turn, index) => <div key={index} className="mt-5 space-y-2 border-t pt-4"><p className="font-medium">{turn.question}</p><div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{turn.answer}</ReactMarkdown></div></div>)}
          {asking && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />A responder…</p>}
          {errorMessage && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{errorMessage}</div>}
        </ScrollArea>
        {insights && <form onSubmit={ask} className="flex gap-2 border-t pt-3"><Input aria-label="Perguntar à IA" placeholder={`Pergunta sobre ${dashboardData.category.toLocaleLowerCase("pt-PT")}…`} value={question} onChange={event => setQuestion(event.target.value)} maxLength={1000} disabled={asking} /><Button type="submit" size="icon" aria-label="Enviar pergunta" disabled={!question.trim() || asking}><Send className="h-4 w-4" /></Button></form>}
        {!loading && (insights || errorMessage) && (
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={analyze} className="gap-2">
              <Sparkles className="h-3 w-3" />
              Reanalisar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
