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
- O Lovable criou anteriormente o repositório separado `https://github.com/Catering1/v-rtice-unificado`. Deve ser tratado apenas como uma cópia histórica: não aplicar lá novas alterações nem o usar para publicação.
- Publicação Lovable: `https://unified-vertex-core.lovable.app/`.

## Dados e stock

- A montra pública usa a função Supabase `get_public_store_products()`.
- A função só expõe campos seguros para visitantes e calcula o stock como compras menos vendas.
- Um produto com stock zero deixa de aparecer na loja pública. Registar uma venda no dashboard é, por isso, a ação que esgota a listagem.
- A migração de referência está em `supabase/migrations/20260919000000_public_inventory_rpc.sql`.

## Imagens e design

- As imagens de apresentação estão em `src/assets/products/` e são ilustrativas. Quando existirem fotografias reais, estas devem substituir as imagens correspondentes.
- As imagens ilustrativas ou geradas por IA destinam-se apenas à montra do site enquanto não existirem fotografias reais. Nunca usar imagens geradas por IA em anúncios externos (OLX, Vinted ou outros canais); nesses canais, publicar apenas fotografias reais do artigo ou deixar o anúncio sem fotografia até elas existirem.
- As fotografias reais confirmadas ficam em `src/assets/products/real/`. Em 22 de setembro de 2026 foram adicionadas fotografias reais do Z Flip8, Z Fold8 Ultra, Z Fold7, S25 Ultra e Surface Laptop Go 3. Capturas de pagamentos, devoluções, faturas e etiquetas com IMEI ou números de série foram excluídas.
- A apresentação comercial complementar está centralizada em `src/lib/catalog.ts`. O stock e a elegibilidade continuam a vir do Supabase; os dados do dashboard têm prioridade quando estiverem preenchidos, e o catálogo local completa preço, descrição, especificações e fotografias enquanto esses campos estiverem vazios.
- As descrições do catálogo devem ser comerciais e completas, não frases genéricas: explicar o benefício principal, utilização indicada, estado real, conteúdo incluído e limitações importantes. As especificações técnicas devem ser confirmadas em fontes oficiais do fabricante e nunca inventadas para preencher campos em falta.
- Produtos ainda sem fotografia real são identificados no site com a indicação visível `Imagem ilustrativa`.
- A ligação entre o nome público do produto e a imagem local está em `src/pages/Storefront.tsx` (`productImages`). Ao criar novos produtos, acrescentar a fotografia e a chave normalizada ao mapa.
- A identidade visual usa azul-marinho, fundos claros, cartões limpos e tipografia forte.

## Publicação

- A aplicação é Vite/React. Para publicar no GitHub Pages, compilar com `VITE_BASE_PATH=/vertice-unificado/`.
- Copiar `dist/index.html` para `dist/404.html` antes de publicar, para que rotas como `/admin/login` funcionem no GitHub Pages.
- A página pública é publicada na branch `gh-pages`; o código fonte fica na branch `main`.
- `Catering1/vertice-unificado` é a única fonte canónica. Todas as alterações de código, memória e publicação deste projeto devem ser feitas apenas nesse repositório. Não sincronizar `Catering1/v-rtice-unificado` e não alterar os repositórios originais `verticemachine` ou `tech-exchange-portugal`.

## Preços e anúncios externos

- O dashboard é a única fonte de elegibilidade para anúncios externos: publicar apenas produtos registados como compras e atualmente ativos/em venda no dashboard. O histórico da Vinted serve apenas para confirmar dados, custo e fotografias do produto correspondente; nunca anunciar outras compras da Vinted que não estejam ativas no dashboard (por exemplo, livros, roupa ou artigos pessoais).
- Antes de publicar cada produto, pesquisar anúncios atuais do mesmo equipamento. Dar prioridade aos comparáveis do OLX no distrito de Lisboa e confirmar a faixa de mercado em lojas de usados ou recondicionados, como a CeX ou equivalentes.
- O preço mínimo aceitável deve ser calculado por `custo total de aquisição + despesas do canal, envio e outras despesas da venda + 75 €`. Os 75 € são lucro mínimo líquido previsto, não apenas diferença entre compra e preço anunciado.
- Excluir anúncios manifestamente anómalos, suspeitos ou que não sejam comparáveis em capacidade, estado, garantia e acessórios. Registar no produto o custo total, preço recomendado, preço publicado e preço mínimo de negociação.
- Nunca incluir num anúncio público informações internas de compra, abastecimento ou operação: plataforma ou fornecedor de origem, custo de aquisição, estado da encomenda, transporte, devolução, centro de verificação, mensagens privadas ou outros processos internos.
- A descrição pública deve limitar-se às características do produto, estado confirmado, acessórios incluídos, garantia, preço e condições de entrega. Informação ainda não confirmada não deve ser publicada como facto.
- O OLX conserva apenas um anúncio inacabado de cada vez nesta conta; não existe uma área de vários rascunhos. Preparar os anúncios em fila e só substituir o rascunho atual depois de este ser publicado ou descartado com confirmação do utilizador.
- Os anúncios podem ser preparados automaticamente com as fotografias e dados guardados no Vértice, mas a publicação final num canal externo deve ser confirmada pelo utilizador.

## Estado da campanha OLX em 22 de setembro de 2026

- O anúncio `Samsung Galaxy Z Fold7 256GB Azul - SIM bloqueado` foi criado com quatro fotografias reais, preço de 849 € e ID OLX `673788064`. O OLX exige pagamento para ativar a categoria Samsung; o anúncio ficou em `Por pagar` e nenhum pagamento foi realizado.
- O anúncio `Samsung Galaxy S25 Ultra 256GB Titanium Black`, ID OLX `673782413`, também permanece em `Por pagar`. Não efetuar pagamentos sem uma instrução explícita do utilizador.
- O anúncio `Logitech Brio 4K Ultra HD Webcam`, ID OLX `673787302`, foi corrigido para remover a imagem gerada por IA e está ativo, sem fotografia.
- Os anúncios `Samsung Galaxy Z Flip8 256GB Novo - Mint` (ID OLX `673781444`) e `Samsung Galaxy Z Fold8 Ultra 256GB Novo - Shadow Violet` (ID OLX `673776297`) foram reativados sem pagamento e estão pendentes de moderação.
- O anúncio `Microsoft Surface Laptop Go 3 (2023) - Bateria 86%`, ID OLX `673786275`, está ativo com fotografias reais.
- Não preparar o segundo S25 Ultra enquanto a compra correspondente continuar com devolução iniciada na Vinted.
- Não publicar o Surface Laptop Studio até existirem correspondência confirmada da compra, custo total, especificações e fotografias reais do equipamento.

## Limitações conhecidas e próximos passos

- O formulário de contacto apresenta uma confirmação visual, mas ainda não envia email, WhatsApp ou pedido para a base de dados.
- Os preços atuais surgem como “Sob consulta” quando o preço de venda é zero.
- Criar no dashboard um fluxo de “pronto para anúncio” com fotos, estado, preço, descrição curta e links de publicação.
- As páginas individuais de produto e os campos de preço de venda, estado, garantia, descrição, especificações e URLs de fotografias já estão aplicados no frontend e no Supabase. Os produtos existentes mantêm valores predefinidos até serem enriquecidos no dashboard.
- As fotografias reais devem ficar no Supabase Storage, com um bucket próprio e regras que permitam ao administrador carregar imagens e ao público apenas lê-las. A publicação automática em canais externos deverá usar estas fotografias como fonte única.
