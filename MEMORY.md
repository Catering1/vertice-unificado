# Memória do projeto Vendig Machine Store

Atualizado em 28 de setembro de 2026.

## Regra de continuidade

- Sempre que forem discutidas ou implementadas alterações importantes — funcionamento do negócio, arquitetura, dados, integrações, publicação ou decisões de produto — atualizar este ficheiro automaticamente.
- Uma alteração funcional só é considerada concluída depois de estar aplicada no serviço necessário (por exemplo, base de dados), validada e publicada no site público quando for relevante.

## Objetivo

O repositório ativo da loja pública e do dashboard é `Catering1/vertice-unificado`. Em 28 de setembro de 2026, a pesquisa GitHub `user:Catering1` encontrou apenas este repositório relacionado com Vértice (além do repositório sem relação `play-gather-app`). Os nomes antigos `verticemachine`, `tech-exchange-portugal` e `v-rtice-unificado` devolveram 404 na API GitHub; não é possível concluir apenas pelo 404 se foram eliminados ou tornados privados. Usar apenas `vertice-unificado` como fonte canónica.

## Ligações importantes

- Repositório: `https://github.com/Catering1/vertice-unificado`
- Site público: `https://catering1.github.io/vertice-unificado/`
- Administração: `https://catering1.github.io/vertice-unificado/admin/login`
- Supabase ativo: projeto `pxpxipewhwwsiogoyjov` (`https://pxpxipewhwwsiogoyjov.supabase.co`). Os dados do dashboard foram migrados para este projeto.
- O código corre a partir de `Catering1/vertice-unificado`; produção é servida por GitHub Pages em `https://catering1.github.io/vertice-unificado/`.
- No teste GitHub de 28 de setembro, o repositório `Catering1/vertice-unificado` tinha ID `1377287079`, visibilidade pública e branches `main` e `gh-pages`. As alterações de estado Vinted foram publicadas em `main` (commit `2febb98`) e em `gh-pages` (commit `411adb2`); nenhum outro repositório foi alterado.
- O projeto Lovable `My Trade Tracker` (ID `37e34560-c141-4c02-8861-1289f7c17fc3`) e os antigos endereços Lovable são históricos. Não fazem parte do fluxo ativo nem devem receber alterações.
- O repositório separado `https://github.com/Catering1/v-rtice-unificado` também é histórico; não publicar lá.

## Dados e stock

- A montra pública usa a função Supabase `get_public_store_products()`.
- A função só expõe campos seguros para visitantes e calcula o stock como compras menos vendas.
- Um produto com stock zero deixa de aparecer na loja pública. Registar uma venda no dashboard é, por isso, a ação que esgota a listagem.
- A migração de referência está em `supabase/migrations/20260919000000_public_inventory_rpc.sql`.
- O dashboard suporta visões por categoria e uma visão agregada. O histórico dos livros é importado da folha `Livros` nas Configurações com referências estáveis por linha, para permitir repetir uma importação interrompida sem duplicar registos.
- Livros em leitura ficam marcados como uso pessoal, fora do stock disponível. Todos os livros importados ficam ocultos da montra pública. Custos e datas desconhecidos ficam vazios; o dashboard apresenta o lucro conhecido como parcial e sinaliza esses registos para revisão.
- A migração `supabase/migrations/20260926231640_books_categories_and_source_data.sql` foi originalmente aplicada no ambiente Cloud do Lovable. A estrutura e os dados necessários estão agora também no projeto Supabase ativo `pxpxipewhwwsiogoyjov`.
- O site e os dados já não dependem do Lovable. A análise por IA é opcional e requer `OPENAI_API_KEY` configurada como secret da Edge Function Supabase `analyze-dashboard`.

## Imagens e design

- As imagens de apresentação estão em `src/assets/products/` e são ilustrativas. Quando existirem fotografias reais, estas devem substituir as imagens correspondentes.
- As imagens ilustrativas ou geradas por IA destinam-se apenas à montra do site enquanto não existirem fotografias reais. Nunca usar imagens geradas por IA em anúncios externos (OLX, Vinted ou outros canais); nesses canais, publicar apenas fotografias reais do artigo ou deixar o anúncio sem fotografia até elas existirem.
- As fotografias reais confirmadas ficam em `src/assets/products/real/`. Em 22 de setembro de 2026 foram adicionadas fotografias reais do Z Flip8, Z Fold8 Ultra, Z Fold7, S25 Ultra e Surface Laptop Go 3. Capturas de pagamentos, devoluções, faturas e etiquetas com IMEI ou números de série foram excluídas.
- A apresentação comercial complementar está centralizada em `src/lib/catalog.ts`. O stock e a elegibilidade continuam a vir do Supabase; os dados do dashboard têm prioridade quando estiverem preenchidos, e o catálogo local completa preço, descrição, especificações e fotografias enquanto esses campos estiverem vazios.
- As descrições do catálogo devem ser comerciais e completas, não frases genéricas: explicar o benefício principal, utilização indicada, estado real, conteúdo incluído e limitações importantes. As especificações técnicas devem ser confirmadas em fontes oficiais do fabricante e nunca inventadas para preencher campos em falta.
- Produtos ainda sem fotografia real são identificados no site com a indicação visível `Imagem ilustrativa`.
- A ligação entre o nome público do produto e a imagem local está em `src/pages/Storefront.tsx` (`productImages`). Ao criar novos produtos, acrescentar a fotografia e a chave normalizada ao mapa.
- A identidade visual usa azul-marinho, fundos claros, cartões limpos e tipografia forte.
- A galeria de stock deve ser a primeira secção visível do site público. O objetivo principal da home é mostrar rapidamente os produtos disponíveis; secções institucionais ou de venda/troca devem aparecer depois.

## Publicação

- A aplicação é Vite/React. Para publicar no GitHub Pages, compilar com `VITE_BASE_PATH=/vertice-unificado/`; localmente o valor predefinido `/` mantém as rotas do servidor de desenvolvimento funcionais.
- Copiar `dist/index.html` para `dist/404.html` antes de publicar, para que rotas como `/admin/login` funcionem no GitHub Pages.
- A página pública é publicada na branch `gh-pages`; o código fonte fica na branch `main`.
- `Catering1/vertice-unificado` é a única fonte canónica. Todas as alterações de código, memória e publicação deste projeto devem ser feitas apenas nesse repositório. Não sincronizar `Catering1/v-rtice-unificado` e não alterar os repositórios originais `verticemachine` ou `tech-exchange-portugal`.
- A skill do fluxo recorrente Vinted → dashboard → OLX está em `.agents/skills/verificar-vinted-registar-dashboard-anunciar-olx/SKILL.md`. A rotina ativa do Codex `verificar-vinted-dashboard-e-an-ncios-olx` corre todos os dias às 09:00, hora local de Lisboa, no projeto local `Master Vending Machine and Vertice`; deve atuar apenas sobre `vertice-unificado` e seguir as salvaguardas da skill.
- Execução manual da rotina em 28/09/2026: sessões autenticadas da Vinted, dashboard e OLX acessíveis. As oito encomendas em curso foram sincronizadas com o dashboard. Fold 7 (629,75 € Vinted / 630 € dashboard) ficou `Enviado`; Fold 8 Ultra (980,54 € / 980 €) ficou `Enviado`; Flip 8 (665,54 € / 665,54 €) ficou `Em verificação eletrónica`, com nota de verificação aprovada e expedição prevista pelo centro em 2 dias úteis; segundo S25 Ultra (611,19 €) ficou `Devolução em curso`; S26 Ultra 1 TB (639,29 €) criado como compra, `Em verificação eletrónica`; Buds3 Silver (46,29 €) criado como compra, `Pedido realizado / a preparar`; S26+ (429,29 €) criado como compra, `Pedido realizado / a preparar`; Watch4 Classic (41,29 €) criado como compra com data aproximada de 28/08/2026, `Devolução em curso`. Referências e notas de encomenda foram guardadas em campos privados. A Vinted mostrava diferenças de 0,25 €, 0,54 €, 8,59 €, 1,49 €, 8,59 € e 3,85 € entre alguns totais da lista e o detalhe/dashboard; cada diferença foi anotada para reconciliação, sem alterar os valores já registados. RAM/armazenamento continuam pendentes nos S26 Ultra e S26+; não criar anúncios até confirmar posse física, inspeção, fotos reais e especificações.
- A skill da rotina diária estava em falta: a automação continuava ativa, mas apontava para `.agents/skills/verificar-vinted-registar-dashboard-anunciar-olx/SKILL.md`, que não existia no projeto nem na pasta pessoal de skills. Foi reconstruída no repositório unificado nesse caminho e a agenda deve usar essas instruções.
- A rotina inclui revisão de compras e mudanças de estado Vinted (envio, verificação eletrónica, reembolso, devolução e cancelamento), com informação sempre privada. Em 28/09/2026 foram acrescentados à tabela `purchases` os campos privados `order_status`, `order_reference`, `order_status_note` e `order_status_updated_at`, editáveis no formulário administrativo de Compras. A tabela mantém RLS por utilizador. A função pública `get_public_store_products()` continua a devolver apenas dados de catálogo e contagem de stock; não expõe estes campos e agora exclui do stock compras acompanhadas cujo estado não seja `received_verified`. Compras históricas em `not_tracked` mantêm o comportamento antigo.
- Regra operacional da rotina: um produto em trânsito, em verificação, em devolução/reembolso ou sem posse física não pode ser anunciado no OLX. Para anunciar, confirmar que está recebido, inspecionado, ativo no stock, sem anúncio OLX correspondente, com RAM/armazenamento confirmados e fotografias reais. A autorização anterior cobre anúncios elegíveis, mas não pagamentos de taxas, pacotes ou destaques.
- A atualização do dashboard em 28/09/2026 revelou que o diálogo de registo ultrapassava a altura do ecrã e ocultava campos de estado; `DialogContent` foi corrigido com altura máxima e scroll interno, publicado em `main` e `gh-pages` e confirmado no dashboard de produção.
- Verificação OLX em 28/09/2026: 3 anúncios ativos — Logitech Brio, Surface Laptop Go 3 e um anúncio de serviços sem relação — e 2 anúncios `Por pagar`; nenhum pagamento foi feito. Não havia anúncio Samsung S25 Ultra ativo. O anúncio S25 conhecido (ID `673782413`) está `Por pagar`, logo não está público. A loja pública mostra o S25 Ultra da compra antiga concluída (531,69 €), diferente da unidade de 611,19 € em devolução; as encomendas acompanhadas em trânsito/devolução estão excluídas do stock público.

## Preços e anúncios externos

- O dashboard é a única fonte de elegibilidade para anúncios externos: publicar apenas produtos registados como compras e atualmente ativos/em venda no dashboard. O histórico da Vinted serve apenas para confirmar dados, custo e fotografias do produto correspondente; nunca anunciar outras compras da Vinted que não estejam ativas no dashboard (por exemplo, livros, roupa ou artigos pessoais).
- Em 28/09/2026 o utilizador confirmou que criou dois perfis Chrome separados para trabalhar com duas contas OLX autenticadas. A automação deve tratar cada perfil como uma sessão independente e publicar apenas na conta atribuída ao produto no dashboard, quando esse campo existir. Não terminar sessão nem misturar contas durante o mesmo anúncio.
- O dashboard deve evoluir para suportar perfis/contas OLX por produto, por exemplo `conta_olx`, `olx_profile_name`, `olx_ad_id`, `olx_status`, `olx_published_at` e `olx_published_account`. Enquanto estes campos não existirem, usar decisão operacional conservadora: produtos premium numa conta e acessórios/produtos mais baratos noutra, registando a escolha na nota privada do produto.
- Não duplicar o mesmo artigo em várias contas OLX sem decisão explícita. Usar múltiplas contas para segmentar tipos de produto, gerir volume e separar canais, não para criar anúncios repetidos do mesmo equipamento.
- Antes de publicar cada produto, pesquisar anúncios atuais do mesmo equipamento. Dar prioridade aos comparáveis do OLX no distrito de Lisboa e confirmar a faixa de mercado em lojas de usados ou recondicionados, como a CeX ou equivalentes.
- O preço mínimo aceitável deve ser calculado por `custo total de aquisição + despesas do canal, envio e outras despesas da venda + 75 €`. Os 75 € são lucro mínimo líquido previsto, não apenas diferença entre compra e preço anunciado.
- Excluir anúncios manifestamente anómalos, suspeitos ou que não sejam comparáveis em capacidade, estado, garantia e acessórios. Registar no produto o custo total, preço recomendado, preço publicado e preço mínimo de negociação.
- Nunca incluir num anúncio público informações internas de compra, abastecimento ou operação: plataforma ou fornecedor de origem, custo de aquisição, estado da encomenda, transporte, devolução, centro de verificação, mensagens privadas ou outros processos internos.
- A descrição pública deve limitar-se às características do produto, estado confirmado, acessórios incluídos, garantia, preço e condições de entrega. Informação ainda não confirmada não deve ser publicada como facto.
- RAM e armazenamento são campos obrigatórios nos anúncios de equipamentos eletrónicos. Antes de criar ou publicar um anúncio, procurar estes dados em fontes fiáveis (ficha técnica oficial, caixa/fotografias reais, anúncio de origem ou histórico da compra). Se, depois dessa pesquisa, continuarem por confirmar, perguntar ao utilizador e não inventar nem omitir silenciosamente a informação.
- Esta regra aplica-se também às descrições do site e aos rascunhos: quando RAM ou armazenamento não estiverem confirmados, marcar o campo como pendente internamente e bloquear a publicação externa até obter confirmação.
- O OLX conserva apenas um anúncio inacabado de cada vez nesta conta; não existe uma área de vários rascunhos. Preparar os anúncios em fila e só substituir o rascunho atual depois de este ser publicado ou descartado com confirmação do utilizador.
- A autorização anterior permite publicar anúncios elegíveis sem nova confirmação, mas não permite inventar detalhes. Nunca pagar taxas, pacotes ou destaques. Se faltar uma informação essencial (RAM, armazenamento, custo, posse ou fotos reais), deixar apenas esse item pendente.

## Estado da campanha OLX em 22 de setembro de 2026

- O anúncio `Samsung Galaxy Z Fold7 256GB Azul - SIM bloqueado` foi criado com quatro fotografias reais, preço de 849 € e ID OLX `673788064`. O OLX exige pagamento para ativar a categoria Samsung; o anúncio ficou em `Por pagar` e nenhum pagamento foi realizado.
- O anúncio `Samsung Galaxy S25 Ultra 256GB Titanium Black`, ID OLX `673782413`, também permanece em `Por pagar`. Não efetuar pagamentos sem uma instrução explícita do utilizador.
- O anúncio `Logitech Brio 4K Ultra HD Webcam`, ID OLX `673787302`, foi corrigido para remover a imagem gerada por IA e está ativo, sem fotografia.
- Os anúncios `Samsung Galaxy Z Flip8 256GB Novo - Mint` (ID OLX `673781444`) e `Samsung Galaxy Z Fold8 Ultra 256GB Novo - Shadow Violet` (ID OLX `673776297`) foram reativados sem pagamento e estão pendentes de moderação.
- O anúncio `Microsoft Surface Laptop Go 3 (2023) - Bateria 86%`, ID OLX `673786275`, está ativo com fotografias reais.
- Verificação OLX em 28/09/2026: separador “Ativos” mostra Logitech Brio ID `673787302`, Surface Laptop Go 3 ID `673786275` e um anúncio de serviço sem relação ID `672706240`; “Por pagar” mostra dois itens. Nenhum serviço pago. Não há confirmação nesta vista de Samsung ativo; confirmar os separadores “Pendentes”, “Por pagar” e “Para edição” antes de considerar criar duplicados.
- Não preparar o segundo S25 Ultra enquanto a compra correspondente continuar com devolução iniciada na Vinted.
- Não publicar o Surface Laptop Studio até existirem correspondência confirmada da compra, custo total, especificações e fotografias reais do equipamento.

## Limitações conhecidas e próximos passos

- O formulário de contacto apresenta uma confirmação visual, mas ainda não envia email, WhatsApp ou pedido para a base de dados.
- Os preços atuais surgem como “Sob consulta” quando o preço de venda é zero.
- Criar no dashboard um fluxo de “pronto para anúncio” com fotos, estado, preço, descrição curta e links de publicação.
- As páginas individuais de produto e os campos de preço de venda, estado, garantia, descrição, especificações e URLs de fotografias já estão aplicados no frontend e no Supabase. Os produtos existentes mantêm valores predefinidos até serem enriquecidos no dashboard.
- As fotografias reais devem ficar no Supabase Storage, com um bucket próprio e regras que permitam ao administrador carregar imagens e ao público apenas lê-las. A publicação automática em canais externos deverá usar estas fotografias como fonte única.
