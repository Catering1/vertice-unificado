import { z } from "zod";
import type { Workbook, CellValue } from "exceljs";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

const amount = z.number().finite().min(0).max(1000000);
const recordSchema = z.object({
  row: z.number().int().min(27), name: z.string().trim().min(1).max(200),
  status: z.enum(["Vendido", "Ativo", "Leitura"]),
  cost: amount.nullable(), purchaseDate: z.string().nullable(),
  salePrice: amount.nullable(), saleDate: z.string().nullable(),
  originalName: z.string(), originalPurchaseDate: z.string(), originalSaleDate: z.string(), originalProfit: z.number().nullable(),
});
export type BookRecord = z.infer<typeof recordSchema>;
export interface BookImportData { records: BookRecord[]; expenses: {row: number; description: string; amount: number}[] }

function value(v: CellValue): unknown {
  if (v && typeof v === "object" && "result" in v) return v.result;
  if (v && typeof v === "object" && "richText" in v) return v.richText.map(t => t.text).join("");
  return v;
}
const original = (v: unknown) => v instanceof Date ? v.toISOString().slice(0,10) : v == null ? "" : String(v);
function date(v: unknown): string | null {
  if (!(v instanceof Date) || !Number.isFinite(v.getTime()) || v.getUTCFullYear() < 2000 || v.getUTCFullYear() > 2100) return null;
  return v.toISOString().slice(0,10);
}
function numeric(v: unknown): number | null { return typeof v === "number" && Number.isFinite(v) ? v : null; }

function assembleBooks(cell: (row: number, column: number) => unknown, lastRow: number): BookImportData {
  if (cell(26,5) !== "ITENS" || cell(26,10) !== "Valor Venda") throw new Error("A folha Livros não tem o formato esperado.");
  const records: BookRecord[] = [];
  const names = new Map<string,string>();
  for (let row=27; row<=lastRow; row++) {
    const at = (column: number) => cell(row,column);
    if (at(5) == null || at(5) === "") continue;
    const name = String(at(5)).trim().replace(/\s+/g," ");
    const key = name.toLocaleLowerCase("pt-PT");
    if (!names.has(key)) names.set(key,name);
    const input={row, name:names.get(key), status:at(6), cost:numeric(at(8)), purchaseDate:date(at(7)), salePrice:numeric(at(10)), saleDate:date(at(9)),originalName:String(at(5)),originalPurchaseDate:original(at(7)),originalSaleDate:original(at(9)),originalProfit:numeric(at(11))};
    const parsed=recordSchema.safeParse(input);
    if (!parsed.success) throw new Error(`Linha ${row}: estado ou valor inválido (${String(input.status)}).`);
    const record=parsed.data;
    if (record.status === "Vendido" && record.salePrice == null) throw new Error(`Linha ${row}: venda sem valor.`);
    if (record.status !== "Vendido" && record.salePrice != null) throw new Error(`Linha ${row}: valor de venda num livro não vendido.`);
    records.push(record);
  }
  if (!records.length) throw new Error("A folha Livros não tem registos.");
  const expenses: BookImportData["expenses"] = [];
  for (let row=13;row<=19;row++) {
    const description = cell(row,7), cost=cell(row,10);
    if (description != null) expenses.push({row,description:z.string().min(1).parse(description),amount:amount.parse(cost)});
  }
  return {records,expenses};
}

export function extractBooks(workbook: Workbook): BookImportData {
  const sheet = workbook.getWorksheet("Livros");
  if (!sheet) throw new Error("A folha Livros não existe.");
  return assembleBooks((row,column)=>value(sheet.getCell(row,column).value),sheet.rowCount);
}

// ExcelJS coerces some status strings in this older workbook to Invalid Date.
// Read the original XLSX cell values and shared strings before interpreting dates.
export async function extractBooksFromXlsx(bytes: ArrayBuffer | Uint8Array): Promise<BookImportData> {
  const zip=await JSZip.loadAsync(bytes);
  const xml=async(path:string)=>{
    const file=zip.file(path);
    if (!file) throw new Error(`Ficheiro Excel incompleto: ${path}`);
    const doc=new DOMParser().parseFromString(await file.async("string"),"application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("XML inválido no ficheiro Excel.");
    return doc;
  };
  const workbook=await xml("xl/workbook.xml"), rels=await xml("xl/_rels/workbook.xml.rels");
  const sheet=[...workbook.getElementsByTagName("sheet")].find(el=>el.getAttribute("name")==="Livros");
  if (!sheet) throw new Error("A folha Livros não existe.");
  const id=sheet.getAttribute("r:id");
  const rel=[...rels.getElementsByTagName("Relationship")].find(el=>el.getAttribute("Id")===id);
  if (!rel) throw new Error("Não foi possível localizar a folha Livros.");
  const target=rel.getAttribute("Target") ?? "";
  const sheetPath=target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\.\//,"")}`;
  const shared: string[]=[];
  if (zip.file("xl/sharedStrings.xml")) {
    const strings=await xml("xl/sharedStrings.xml");
    for (const item of [...strings.getElementsByTagName("si")]) shared.push([...item.getElementsByTagName("t")].map(t=>t.textContent??"").join(""));
  }
  const rows=new Map<number,Map<string,unknown>>();
  const document=await xml(sheetPath);
  for (const row of [...document.getElementsByTagName("row")]) {
    const rowNumber=Number(row.getAttribute("r"));
    const cells=new Map<string,unknown>();
    for (const c of [...row.getElementsByTagName("c")]) {
      const address=c.getAttribute("r") ?? "",column=address.replace(/\d/g,"");
      const raw=c.getElementsByTagName("v")[0]?.textContent;
      const type=c.getAttribute("t");
      if (type==="s") cells.set(column,shared[Number(raw)] ?? "");
      else if (type==="inlineStr") cells.set(column,[...c.getElementsByTagName("t")].map(t=>t.textContent??"").join(""));
      else if (type==="str") cells.set(column,raw ?? "");
      else if (raw != null && raw!=="") {
        const number=Number(raw);
        if (Number.isFinite(number)) cells.set(column,(column==="G" || column==="I") && rowNumber>=27 ? new Date(Date.UTC(1899,11,30)+number*86400000) : number);
      }
    }
    rows.set(rowNumber,cells);
  }
  const letter=(column:number)=>String.fromCharCode(64+column);
  return assembleBooks((row,column)=>rows.get(row)?.get(letter(column)),Math.max(...rows.keys()));
}

export async function readBooks(file: File) {
  return extractBooksFromXlsx(await file.arrayBuffer());
}

export async function importBooks(data: BookImportData, progress: (text: string) => void) {
  const {data:auth,error:authError} = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Inicie sessão para importar.");
  const userId=auth.user.id, prefix="excel-livros-v1:", ref=(row:number) => `${prefix}${row}`;
  const {error:catError}=await supabase.from("categories").upsert({user_id:userId,name:"Livros"},{onConflict:"user_id,name",ignoreDuplicates:true});
  if (catError) throw catError;
  progress("A importar os livros…");
  const {error:prodError}=await supabase.from("products").upsert(data.records.map(r => ({
    user_id:userId,source_ref:ref(r.row),name:r.name,category:"Livros",purchase_price:r.cost,
    inventory_use:r.status === "Leitura" ? "personal" as const : "business" as const,store_visible:false,
    condition:"Por confirmar",source_data:{sheet:"Livros",row:r.row,original_status:r.status,original_name:r.originalName,original_purchase_date:r.originalPurchaseDate,original_sale_date:r.originalSaleDate,original_profit:r.originalProfit},
  })),{onConflict:"user_id,source_ref",ignoreDuplicates:true});
  if (prodError) throw prodError;
  const {data:products,error:readError}=await supabase.from("products").select("id,source_ref,purchase_price,name").eq("user_id",userId).like("source_ref",`${prefix}%`).limit(10000);
  if (readError) throw readError;
  const ids=new Map(products.map(p => [p.source_ref,p.id]));
  if (data.records.some(r => !ids.has(ref(r.row)))) throw new Error("Importação incompleta. Pode repetir o mesmo ficheiro sem duplicar registos.");
  const changed=data.records.some(r => {const p=products.find(p => p.source_ref===ref(r.row));return p.name!==r.name || p.purchase_price!==r.cost;});
  if (changed) throw new Error("Existem linhas já importadas com valores diferentes. Reveja-as antes de voltar a importar.");
  progress("A importar compras e vendas…");
  const {error:purchaseError}=await supabase.from("purchases").upsert(data.records.map(r => ({user_id:userId,product_id:ids.get(ref(r.row))!,source_ref:ref(r.row),quantity:1,price:r.cost,date:r.purchaseDate})),{onConflict:"user_id,source_ref",ignoreDuplicates:true});
  if (purchaseError) throw purchaseError;
  const sold=data.records.filter(r => r.status === "Vendido");
  const {error:saleError}=await supabase.from("sales").upsert(sold.map(r => ({user_id:userId,product_id:ids.get(ref(r.row))!,source_ref:ref(r.row),quantity:1,sale_price:r.salePrice!,profit:r.cost==null ? null : r.salePrice!-r.cost,date:r.saleDate})),{onConflict:"user_id,source_ref",ignoreDuplicates:true});
  if (saleError) throw saleError;
  const {error:expenseError}=await supabase.from("expenses").upsert(data.expenses.map(r => ({user_id:userId,category:"Livros",description:r.description,amount:r.amount,date:null,source_ref:ref(r.row)})),{onConflict:"user_id,source_ref",ignoreDuplicates:true});
  if (expenseError) throw expenseError;
  progress("A verificar os totais…");
  const [purchases,sales,expenses]=await Promise.all([
    supabase.from("purchases").select("source_ref,price,date").eq("user_id",userId).like("source_ref",`${prefix}%`).limit(10000),
    supabase.from("sales").select("source_ref,sale_price,date,profit").eq("user_id",userId).like("source_ref",`${prefix}%`).limit(10000),
    supabase.from("expenses").select("source_ref,amount").eq("user_id",userId).like("source_ref",`${prefix}%`).limit(10000),
  ]);
  for (const result of [purchases,sales,expenses]) if(result.error) throw result.error;
  const equal=(a:number|null,b:number|null) => a==null || b==null ? a===b : Math.abs(a-b)<0.000001;
  const ok=data.records.every(r => purchases.data.some(p => p.source_ref===ref(r.row)&&equal(p.price,r.cost)&&p.date===r.purchaseDate))
    && sold.every(r => sales.data.some(s => s.source_ref===ref(r.row)&&equal(s.sale_price,r.salePrice)&&s.date===r.saleDate&&equal(s.profit,r.cost==null ? null : r.salePrice!-r.cost)))
    && data.expenses.every(r => expenses.data.some(e => e.source_ref===ref(r.row)&&equal(e.amount,r.amount)));
  if (!ok) throw new Error("Os dados guardados diferem do ficheiro. Não foi confirmada a importação; consulte os registos existentes.");
  return {books:data.records.length,sales:sold.length,expenses:data.expenses.length};
}
