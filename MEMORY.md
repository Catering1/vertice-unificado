# Memória do projeto Vértice Unificado

Atualizado em 22 de setembro de 2026.

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
- O projeto Lovable atual (`My Trade Tracker`, ID `37e34560-c141-4c02-8861-1289f7c17fc3`) continua ligado a `Catering1/verticemachine`. A interface Lovable não disponibilizou a troca desse repositório por `Catering1/vertice-unificado`; não forçar código para o repositório original sem uma instrução explícita para o alterar.
- Projeto Lovable independente: `Vértice Unificado` (ID `b7bb56f3-4641-4faf-90c9-ef28268d9299`), criado na conta `bbonito003@gmail.com`.
- O Lovable criou e sincroniza bidirecionalmente o repositório próprio `https://github.com/Catering1/v-rtice-unificado`. Este recebeu o código do repositório canónico `Catering1/vertice-unificado`; os dois repositórios originais não foram alterados.
- Publicação Lovable: `https://unified-vertex-core.lovable.app/`.

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
- As alterações no repositório canónico `Catering1/vertice-unificado` não são automaticamente espelhadas no repositório criado pelo Lovable. Até ser definida uma fonte única, aplicar a mesma alteração a ambos ou decidir explicitamente qual passa a ser o repositório canónico antes de editar.

## Preços e anúncios externos

- Antes de publicar cada produto, pesquisar anúncios atuais do mesmo equipamento. Dar prioridade aos comparáveis do OLX no distrito de Lisboa e confirmar a faixa de mercado em lojas de usados ou recondicionados, como a CeX ou equivalentes.
- O preço mínimo aceitável deve ser calculado por `custo total de aquisição + despesas do canal, envio e outras despesas da venda + 75 €`. Os 75 € são lucro mínimo líquido previsto, não apenas diferença entre compra e preço anunciado.
- Excluir anúncios manifestamente anómalos, suspeitos ou que não sejam comparáveis em capacidade, estado, garantia e acessórios. Registar no produto o custo total, preço recomendado, preço publicado e preço mínimo de negociação.
- Nunca incluir num anúncio público informações internas de compra, abastecimento ou operação: plataforma ou fornecedor de origem, custo de aquisição, estado da encomenda, transporte, devolução, centro de verificação, mensagens privadas ou outros processos internos.
- A descrição pública deve limitar-se às características do produto, estado confirmado, acessórios incluídos, garantia, preço e condições de entrega. Informação ainda não confirmada não deve ser publicada como facto.
- O OLX conserva apenas um anúncio inacabado de cada vez nesta conta; não existe uma área de vários rascunhos. Preparar os anúncios em fila e só substituir o rascunho atual depois de este ser publicado ou descartado com confirmação do utilizador.
- Os anúncios podem ser preparados automaticamente com as fotografias e dados guardados no Vértice, mas a publicação final num canal externo deve ser confirmada pelo utilizador.

## Limitações conhecidas e próximos passos

- O formulário de contacto apresenta uma confirmação visual, mas ainda não envia email, WhatsApp ou pedido para a base de dados.
- Os preços atuais surgem como “Sob consulta” quando o preço de venda é zero.
- Criar no dashboard um fluxo de “pronto para anúncio” com fotos, estado, preço, descrição curta e links de publicação.
- As páginas individuais de produto e os campos de preço de venda, estado, garantia, descrição, especificações e URLs de fotografias já estão aplicados no frontend e no Supabase. Os produtos existentes mantêm valores predefinidos até serem enriquecidos no dashboard.
- As fotografias reais devem ficar no Supabase Storage, com um bucket próprio e regras que permitam ao administrador carregar imagens e ao público apenas lê-las. A publicação automática em canais externos deverá usar estas fotografias como fonte única.
