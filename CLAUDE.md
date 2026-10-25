# Vértice (vertice-unificado)

Loja pública + dashboard de gestão de compras/vendas de eletrónica usada. Repositório canónico: `Catering1/vertice-unificado`.

**Antes de mexer em regras de negócio, estados de compra, preços ou anúncios OLX, ler `MEMORY.md`** (regras duradouras) e `docs/estado-operacional.md` (factos pontuais datados, a confirmar no dashboard). Não duplicar o conteúdo deles aqui.

## Comandos
- `npm ci` · `npm run dev` · `npm run lint` · `npm test` · `npm run build` (inclui `typecheck`)
- A CI (`.github/workflows/check.yml`) corre lint, testes e build: correr os três antes de fazer push.

## Estrutura
- `src/pages` (Storefront, ProductPage = público; Dashboard, Purchases, Sales, Expenses, Settings = admin em `/admin`)
- `src/lib` lógica pura (inventário, métricas, catálogo, CeX); `src/components/dashboard`; `src/integrations/supabase` cliente
- `supabase/migrations` e `supabase/functions` (`analyze-dashboard`, `cex-portugal`, `check-allowed-email`, `excel-report`)
- `automation/vertice` automação local (Python/PowerShell); `.agents/skills` skill da rotina diária Vinted → dashboard → OLX

## Regras que não se podem quebrar
- Dados privados (compras, referências, custos, lucro, estados logísticos) nunca vão para a montra pública nem para anúncios. A montra só usa `get_public_store_products()`.
- Nenhuma chave secreta em código nem em variáveis `VITE_`. Chaves de terceiros só em secrets das Edge Functions. O `.env` só pode ter valores publicáveis.
- Cada compra/unidade tem produto próprio; reconciliar por referência/ID, nunca por nome.
- Mudanças de esquema: migração em `supabase/migrations`; verificar função e catálogo na montra depois.
- Não alterar repositórios antigos. O Lovable já não é usado.

## Publicação
Push para `main` → Vercel. Confirmar que o bundle novo está servido (um HTTP 200 não prova a versão); ver README.

## Respostas
Português europeu.
