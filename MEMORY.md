# Memória do projeto Vértice Unificado

Atualizado em 19 de setembro de 2026.

## Regra de continuidade

- Sempre que forem discutidas ou implementadas alterações importantes — funcionamento do negócio, arquitetura, dados, integrações, publicação ou decisões de produto — atualizar este ficheiro automaticamente.
- Uma alteração funcional só é considerada concluída depois de estar aplicada no serviço necessário (por exemplo, base de dados), validada e publicada no site público quando for relevante.

## Objetivo

Este é o terceiro repositório independente que unifica a loja pública e o dashboard do negócio. Os repositórios `verticemachine` e `tech-exchange-portugal` devem manter-se separados e não devem ser alterados para desenvolver esta versão.

## Ligações importantes

- Repositório: `https://github.com/Catering1/vertice-unificado`
- Site público: `https://catering1.github.io/vertice-unificado/`
- Administração: `https://catering1.github.io/vertice-unificado/admin/login`
- Supabase: projeto `mjtqdeesfapqfmxkhaby`

## Dados e stock

- A montra pública usa a função Supabase `get_public_store_products()`.
- A função só expõe campos seguros para visitantes e calcula o stock como compras menos vendas.
- Um produto com stock zero deixa de aparecer na loja pública. Registar uma venda no dashboard é, por isso, a ação que esgota a listagem.
- A migração de referência está em `supabase/migrations/20260919000000_public_inventory_rpc.sql`.

## Imagens e design

- As imagens de apresentação estão em `src/assets/products/` e são ilustrativas. Quando existirem fotografias reais, estas devem substituir as imagens correspondentes.
- A ligação entre o nome público do produto e a imagem local está em `src/pages/Storefront.tsx` (`productImages`). Ao criar novos produtos, acrescentar a fotografia e a chave normalizada ao mapa.
- A identidade visual usa azul-marinho, fundos claros, cartões limpos e tipografia forte.

## Publicação

- A aplicação é Vite/React. Para publicar no GitHub Pages, compilar com `VITE_BASE_PATH=/vertice-unificado/`.
- Copiar `dist/index.html` para `dist/404.html` antes de publicar, para que rotas como `/admin/login` funcionem no GitHub Pages.
- A página pública é publicada na branch `gh-pages`; o código fonte fica na branch `main`.

## Limitações conhecidas e próximos passos

- O formulário de contacto apresenta uma confirmação visual, mas ainda não envia email, WhatsApp ou pedido para a base de dados.
- Os preços atuais surgem como “Sob consulta” quando o preço de venda é zero.
- Criar no dashboard um fluxo de “pronto para anúncio” com fotos, estado, preço, descrição curta e links de publicação.
- A evolução em curso introduz páginas individuais de produto, preço de venda, estado, garantia, descrição, especificações e lista de URLs de fotografias por produto.
- As fotografias reais devem ficar no Supabase Storage, com um bucket próprio e regras que permitam ao administrador carregar imagens e ao público apenas lê-las. A publicação automática em canais externos deverá usar estas fotografias como fonte única.
