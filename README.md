# Vendig Machine Store

Aplicação única para a loja e a gestão do negócio. O dashboard inclui gestão de inventário, compras, vendas, despesas, categorias e importação de livros.

## Onde está cada parte

- Código e histórico: [GitHub — Catering1/vertice-unificado](https://github.com/Catering1/vertice-unificado), branch `main`.
- Site: [GitHub Pages](https://catering1.github.io/vertice-unificado/).
- Base de dados, autenticação e funções: projeto Supabase `pxpxipewhwwsiogoyjov`.
- Painel: `/admin`; montra pública: `/`.

O Lovable já não faz parte do fluxo de execução nem de publicação. As alterações fazem-se neste repositório e os dados ficam no Supabase; compilar ou publicar o site não recria nem apaga registos.

## Desenvolvimento local

1. Instala Node.js e executa `npm ci`.
2. Mantém as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env` local. O endereço e a chave publicável atuais estão configurados neste repositório; nunca coloques chaves secretas no código ou em variáveis `VITE_`.
3. Executa `npm run dev`, `npm test` e `npm run build`.

## Publicação e autenticação

O site de produção está em GitHub Pages. No Supabase, configura o URL do site como `https://catering1.github.io/vertice-unificado/` e permite os redirecionamentos `https://catering1.github.io/vertice-unificado/**` e `http://localhost:8080/**` em Authentication → URL Configuration. O link de confirmação de email usa o caminho-base correto em cada ambiente.

## Análise por IA (opcional)

A análise do dashboard usa uma Edge Function própria e um fornecedor compatível com a API Chat Completions. Para a ativar, define `OPENAI_API_KEY` nos secrets das Edge Functions do projeto Supabase. Opcionalmente, define `AI_MODEL` ou `AI_CHAT_COMPLETIONS_URL` para selecionar outro modelo ou fornecedor compatível. Sem uma chave, o resto da aplicação continua disponível e a análise informa que ainda não foi configurada. Os dados enviados para análise são os indicadores e os produtos agregados apresentados pelo dashboard.
