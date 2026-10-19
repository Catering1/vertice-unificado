from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any

from playwright.async_api import BrowserContext, Page


@dataclass
class ProbeResult:
    service: str
    account: str
    authenticated: bool
    url: str
    evidence: list[str] = field(default_factory=list)
    counts: dict[str, int] = field(default_factory=dict)
    items: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None
    checked_at: str = field(default_factory=lambda: datetime.now().astimezone().isoformat())

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


async def _page(context: BrowserContext) -> Page:
    pages = context.pages
    return pages[0] if pages else await context.new_page()


async def probe_dashboard(context: BrowserContext, url: str) -> ProbeResult:
    page = await _page(context)
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        # A aplicação é uma SPA: domcontentloaded pode ocorrer antes da sessão
        # Supabase e dos controlos privados aparecerem no DOM.
        try:
            await page.wait_for_function(
                """() => {
                  const body = document.body?.innerText || '';
                  return (body.includes('Compras') && body.includes('Nova Compra') && body.includes('Administrador'))
                    || /iniciar sessão|sign in|login/i.test(body);
                }""",
                timeout=15_000,
            )
        except Exception:
            pass
        body = await page.locator("body").inner_text()
        authenticated = "Compras" in body and "Nova Compra" in body and "Administrador" in body
        evidence = ["lista privada de compras e controlo Nova Compra visíveis"] if authenticated else [
            "conteúdo privado do dashboard não confirmado"
        ]
        items: list[dict[str, Any]] = []
        if authenticated:
            # A consulta corre dentro da origem autenticada. O token nunca sai
            # do browser nem é escrito em logs/relatórios.
            items = await page.evaluate(
                """async () => {
                  const entry = Object.entries(localStorage).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
                  if (!entry) return [];
                  let auth;
                  try { auth = JSON.parse(entry[1]); } catch { return []; }
                  const token = auth?.access_token || auth?.currentSession?.access_token;
                  const userId = auth?.user?.id || auth?.currentSession?.user?.id;
                  if (!token || !userId) return [];
                  const base = 'https://pxpxipewhwwsiogoyjov.supabase.co/rest/v1';
                  const apikey = 'sb_publishable_WZ2g-MCbn97bNpm6GHR45g_pSpVxiJx';
                  const headers = { apikey, Authorization: `Bearer ${token}` };
                  const get = async (table, select) => {
                    const r = await fetch(`${base}/${table}?user_id=eq.${encodeURIComponent(userId)}&select=${encodeURIComponent(select)}`, { headers });
                    if (!r.ok) throw new Error(`${table}:${r.status}`);
                    return r.json();
                  };
                  const [products, purchases, sales] = await Promise.all([
                    get('products', 'id,name,category,retail_price,condition,photo_urls,inventory_use,source_data'),
                    get('purchases', 'id,product_id,quantity,order_status,refund_received_at'),
                    get('sales', 'id,product_id,purchase_id,quantity')
                  ]);
                  const sold = new Map();
                  for (const s of sales) sold.set(s.purchase_id, (sold.get(s.purchase_id) || 0) + Number(s.quantity || 0));
                  const excluded = new Set(['return_in_progress','refund_partial','refunded','cancelled']);
                  return products.filter(p => p.inventory_use !== 'personal').map(product => {
                    const pp = purchases.filter(p => p.product_id === product.id);
                    const units = pp.reduce((sum, p) => sum + (p.refund_received_at || excluded.has(p.order_status) ? 0 : Math.max(0, Number(p.quantity || 0) - (sold.get(p.id) || 0))), 0);
                    return {
                      id: product.id, name: product.name, category: product.category,
                      retail_price: Number(product.retail_price || 0), condition: product.condition,
                      photo_urls: product.photo_urls || [], source_data: product.source_data || {},
                      commercial_status: units > 0 ? 'active' : 'sold', active_units: units
                    };
                  });
                }"""
            )
            if not items:
                evidence.append("sessão visível, mas exportação privada não devolveu dados")
        return ProbeResult("dashboard", "admin", authenticated, page.url, evidence, items=items)
    except Exception as exc:
        return ProbeResult("dashboard", "admin", False, page.url, error=str(exc))


async def probe_olx(context: BrowserContext, url: str, account: str) -> ProbeResult:
    page = await _page(context)
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        try:
            await page.wait_for_function(
                """() => {
                  const body = document.body?.innerText || '';
                  return (body.includes('Os teus anúncios') && body.includes('Dados pessoais'))
                    || /iniciar sessão|registar/i.test(body);
                }""",
                timeout=15_000,
            )
        except Exception:
            pass
        body = await page.locator("body").inner_text()
        authenticated = "Os teus anúncios" in body and "Dados pessoais" in body
        counts: dict[str, int] = {}
        items: list[dict[str, Any]] = []
        active_inventory_verified = False
        if authenticated:
            import re

            for label in ("Ativos", "Pendentes", "Por pagar", "Terminados", "Para edição"):
                buttons = page.get_by_role("button", name=re.compile(rf"^{re.escape(label)}(?:\s|$)", re.I))
                if await buttons.count():
                    await buttons.first.click()
                    await page.wait_for_timeout(350)
                view = await page.locator("body").inner_text()
                match = re.search(r"A mostrar(?:\s+\d+\s*-\s*\d+\s+de)?\s+(\d+)\s+anúncios?", view, re.I)
                tab_match = re.search(rf"{re.escape(label)}\s*\((\d+)\)", view, re.I)
                recognized_count = match or tab_match
                counts[label] = int(recognized_count.group(1)) if recognized_count else 0
                identifiers = dict.fromkeys(re.findall(r"ID:\s*(\d+)", view))
                if label == "Ativos" and recognized_count:
                    active_inventory_verified = counts[label] == 0 or len(identifiers) >= counts[label]
                for identifier in identifiers:
                    items.append({"id": identifier, "status": label.lower(), "account": account})
        evidence = []
        if authenticated:
            evidence.append("área privada Os teus anúncios visível")
            if active_inventory_verified:
                evidence.append("inventário Ativos do OLX confirmado")
            else:
                evidence.append("anúncios ativos não foram extraídos com segurança")
        else:
            evidence.append("área privada OLX não confirmada")
        return ProbeResult("olx", account, authenticated, page.url, evidence, counts, items)
    except Exception as exc:
        return ProbeResult("olx", account, False, page.url, error=str(exc))
