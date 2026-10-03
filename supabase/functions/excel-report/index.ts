type JsonRecord = Record<string, unknown>;

const DATASETS = new Set(["purchases", "sales", "stock", "returns", "expenses", "summary", "all"]);
const RETURN_STATUSES = new Set(["return_in_progress", "refund_partial", "refunded", "cancelled"]);
const RECEIVED_STATUSES = new Set(["delivered", "received_verified"]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function secureEquals(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function serviceRoleKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) return JSON.parse(keys).default as string | undefined;
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

async function fetchRows(table: string, select: string, userId: string, key: string, url: string) {
  const endpoint = new URL(`${url}/rest/v1/${table}`);
  endpoint.searchParams.set("select", select);
  endpoint.searchParams.set("user_id", `eq.${userId}`);
  endpoint.searchParams.set("order", "id.asc");
  endpoint.searchParams.set("limit", "10000");
  const response = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`Could not read ${table}: ${response.status}`);
  return await response.json() as JsonRecord[];
}

function number(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function purchaseState(purchase: JsonRecord, salesByProduct: Set<string>) {
  const status = String(purchase.order_status ?? "not_tracked");
  if (RETURN_STATUSES.has(status)) return "Fora do stock";
  if (salesByProduct.has(String(purchase.product_id))) return "Vendido";
  return "Ativo";
}

function receiptState(purchase: JsonRecord) {
  const status = String(purchase.order_status ?? "not_tracked");
  if (RETURN_STATUSES.has(status)) return "Fora do stock";
  return RECEIVED_STATUSES.has(status) ? "Recebido" : "Por receber";
}

Deno.serve(async (request) => {
  if (request.method !== "GET") return json({ error: "Método não permitido." }, 405);

  const apiKey = request.headers.get("x-excel-api-key") ?? "";
  const expectedApiKey = Deno.env.get("EXCEL_REPORT_API_KEY") ?? "";
  if (!expectedApiKey || !secureEquals(apiKey, expectedApiKey)) return json({ error: "Não autorizado." }, 401);

  const userId = Deno.env.get("EXCEL_REPORT_USER_ID");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const key = serviceRoleKey();
  if (!userId || !supabaseUrl || !key) return json({ error: "Relatório não configurado." }, 503);

  const dataset = new URL(request.url).searchParams.get("dataset") ?? "all";
  if (!DATASETS.has(dataset)) return json({ error: "Conjunto de dados inválido." }, 400);

  try {
    const [products, purchases, sales, expenses] = await Promise.all([
      fetchRows("products", "id,name,category,purchase_price,retail_price,condition,inventory_use", userId, key, supabaseUrl),
      fetchRows("purchases", "id,product_id,quantity,price,date,delivery_date,order_status", userId, key, supabaseUrl),
      fetchRows("sales", "id,product_id,quantity,sale_price,profit,date", userId, key, supabaseUrl),
      fetchRows("expenses", "id,category,description,amount,date", userId, key, supabaseUrl),
    ]);
    const productById = new Map(products.map(product => [String(product.id), product]));
    const salesByProduct = new Set(sales.map(sale => String(sale.product_id)));
    const purchaseRows = purchases.map(purchase => {
      const product = productById.get(String(purchase.product_id));
      return {
        id_compra: purchase.id,
        produto: product?.name ?? "Produto eliminado",
        categoria: product?.category ?? "Sem categoria",
        quantidade: number(purchase.quantity),
        preco_compra_unitario: number(purchase.price),
        valor_compra: number(purchase.price) * number(purchase.quantity),
        data_compra: purchase.date ?? null,
        data_rececao: purchase.delivery_date ?? null,
        estado_stock: purchaseState(purchase, salesByProduct),
        estado_rececao: receiptState(purchase),
        estado_encomenda: purchase.order_status ?? "not_tracked",
      };
    });
    const salesRows = sales.map(sale => {
      const product = productById.get(String(sale.product_id));
      return {
        id_venda: sale.id,
        produto: product?.name ?? "Produto eliminado",
        categoria: product?.category ?? "Sem categoria",
        quantidade: number(sale.quantity),
        preco_venda_unitario: number(sale.sale_price),
        valor_venda: number(sale.sale_price) * number(sale.quantity),
        lucro: sale.profit == null ? null : number(sale.profit),
        data_venda: sale.date ?? null,
      };
    });
    const expensesRows = expenses.map(expense => ({
      id_despesa: expense.id,
      categoria: expense.category ?? "Sem categoria",
      descricao: expense.description ?? "",
      valor: number(expense.amount),
      data: expense.date ?? null,
    }));
    const stockRows = purchaseRows.filter(row => row.estado_stock === "Ativo");
    const returnRows = purchaseRows.filter(row => row.estado_stock === "Fora do stock");
    const pendingRows = stockRows.filter(row => row.estado_rececao === "Por receber");
    const receivedRows = stockRows.filter(row => row.estado_rececao === "Recebido");
    const sum = (rows: typeof purchaseRows) => rows.reduce((total, row) => total + row.valor_compra, 0);
    const units = (rows: typeof purchaseRows) => rows.reduce((total, row) => total + row.quantidade, 0);
    const summaryRows = [{
      atualizado_em: new Date().toISOString(),
      unidades_stock_total: units(stockRows),
      valor_compras_stock_total: sum(stockRows),
      unidades_por_receber: units(pendingRows),
      valor_compras_por_receber: sum(pendingRows),
      unidades_recebidas: units(receivedRows),
      valor_compras_recebidas: sum(receivedRows),
      unidades_devolucao_excluidas: units(returnRows),
      valor_devolucao_excluido: sum(returnRows),
      vendas_total: salesRows.reduce((total, sale) => total + sale.valor_venda, 0),
      lucro_registado: salesRows.reduce((total, sale) => total + (sale.lucro ?? 0), 0),
      despesas_total: expensesRows.reduce((total, expense) => total + expense.valor, 0),
    }];

    const all = { purchases: purchaseRows, sales: salesRows, stock: stockRows, returns: returnRows, expenses: expensesRows, summary: summaryRows };
    return json({ dataset, refreshed_at: new Date().toISOString(), rows: dataset === "all" ? all : all[dataset as keyof typeof all] });
  } catch (error) {
    console.error("excel-report error:", error);
    return json({ error: "Não foi possível gerar o relatório." }, 500);
  }
});
