import { useState } from "react";
import { BookOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readBooks, importBooks, type BookImportData } from "@/lib/bookImport";
import { money } from "@/lib/dashboardMetrics";

export default function BookImport() {
  const [data,setData]=useState<BookImportData|null>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  const [done,setDone]=useState(false);
  const sold=data?.records.filter(r => r.status==="Vendido") ?? [];
  return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-5 w-5"/>Importar histórico de livros</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Importa a folha “Livros” para a categoria Livros, incluindo vendas, stock, leitura e despesas. Repetir o mesmo ficheiro não duplica registos.</p>
      <label className="block space-y-2 text-sm font-medium">Ficheiro Excel de livros
        <input type="file" accept=".xlsx" disabled={busy} className="block w-full rounded-lg border p-3 text-sm" onChange={async e => {
          const file=e.target.files?.[0]; if(!file) return;
          setBusy(true);setData(null);setError("");setDone(false);setMessage("A ler a folha Livros…");
          try {setData(await readBooks(file));setMessage("");} catch(e) {setError(e instanceof Error ? e.message : "Não foi possível ler o ficheiro.");} finally {setBusy(false);}
        }}/>
      </label>
      {data && <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
        <p><strong>{data.records.length} livros</strong> · {sold.length} vendidos · {data.records.filter(r=>r.status==="Ativo").length} ativos · {data.records.filter(r=>r.status==="Leitura").length} em leitura</p>
        <p>Vendas: {money(sold.reduce((s,r)=>s+r.salePrice!,0))} · despesas: {money(data.expenses.reduce((s,r)=>s+r.amount,0))}</p>
        <p>{sold.filter(r=>r.cost==null).length} vendas sem custo e {sold.filter(r=>!r.saleDate).length} vendas sem data válida ficam sinalizadas para revisão.</p>
      </div>}
      {error && <p role="alert" className="text-sm text-destructive">{error} Se a ligação falhou, pode repetir o mesmo ficheiro para concluir os registos em falta.</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
      {data && !done && <Button disabled={busy} onClick={async()=>{
        setBusy(true);setError("");
        try {const result=await importBooks(data,setMessage);setDone(true);setMessage(`Importação verificada: ${result.books} livros, ${result.sales} vendas e ${result.expenses} despesas.`);} catch(e) {setError(e instanceof Error ? e.message : (e as {message?:string})?.message ?? "A importação não foi concluída.");setMessage("");} finally {setBusy(false);}
      }}><Upload className="mr-2 h-4 w-4"/>{busy ? "A importar…" : "Importar todos para Livros"}</Button>}
      {done && <Button onClick={()=>window.location.reload()}>Atualizar dashboard</Button>}
    </CardContent>
  </Card>;
}
