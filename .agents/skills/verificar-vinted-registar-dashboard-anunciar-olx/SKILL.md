---
name: verificar-vinted-registar-dashboard-anunciar-olx
description: Revê compras e pedidos na conta Vinted, mantém os registos e estados privados de compra no dashboard Vértice e anuncia no OLX artigos elegíveis que ainda não tenham anúncio.
---

# Rotina Vinted → dashboard Vértice → OLX

Executa esta rotina quando solicitado ou pela automação diária. Trabalha apenas no repositório `Catering1/vertice-unificado` e no respetivo dashboard. Antes de começar, lê `vertice-unificado/MEMORY.md` (quando estiver na raiz do projeto local, o caminho relativo é `MEMORY.md`) e verifica a data/resultado da última execução para evitar duplicados.

## 1. Rever a Vinted

- Usa a sessão autenticada existente. Acede pelo menu da conta a compras/encomendas e às conversas relevantes; não pressuponhas que um URL antigo continua válido.
- Revê explicitamente as vistas/filtros `Todos`, `Em curso`, `Concluídos` e `Cancelados`; não limites a reconciliação às encomendas em curso. Confirma tanto os modelos nas compras Vinted como produtos já criados sem uma compra associada no dashboard. Pesquisa por modelo e por referência.
- Revê novas compras e alterações desde a última execução. Para cada artigo, confirma identidade/modelo, quantidade, preço do artigo, portes e taxas, data, vendedor, estado atual e eventual devolução/reembolso.
- Distingue claramente estados como pago/em preparação, enviado, entregue, em verificação eletrónica, devolução, reembolso parcial/total e cancelado. Regista cada alteração relevante com data e fonte, sem transformar um pedido em compra concluída quando foi cancelado ou totalmente reembolsado.
- Inclui no inventário apenas artigos comprados para revenda; exclui compras pessoais, livros e roupa, conforme a memória do negócio.
- Antes de inserir, pesquisa o dashboard por artigo e referência para não duplicar. Se a referência não estiver disponível nos registos antigos, compara nome/modelo, data, custo e estado; mantém a operação pendente quando a correspondência continuar ambígua. Usa o custo total real de aquisição (incluindo portes e taxas atribuíveis), quantidade e data confirmados.

## 2. Registar compra e estado no dashboard

- Usa o formulário de Compras do dashboard, mantendo o produto associado ao respetivo registo de compra. Se o produto já existir, atualiza-o em vez de criar outro produto.
- Mantém estados de encomenda e informação da Vinted estritamente privados; não os coloques em descrição pública, especificações públicas, anúncio OLX ou na montra.
- Regista o estado atual nos campos privados da compra: estado, referência curta da encomenda e nota com atualização/data e montante parcial reembolsado, quando aplicável. Não guardes endereço, telefone, credenciais ou mensagens privadas integrais.
- Usa os estados disponíveis no dashboard: pedido realizado/a preparar, enviado, em verificação eletrónica, entregue por inspecionar, recebido e inspecionado, devolução em curso, reembolso parcial, reembolsado ou cancelado. Para encomendas antigas sem estado verificável, mantém “Não acompanhado” até confirmar.
- Os únicos estados visíveis de encomenda são exatamente `Por Receber`, `Recebido` e `Em devolução`. Mantém a fase detalhada da Vinted nos campos privados. Encomendas em trânsito, em verificação e entregues ainda por inspecionar são `Por Receber`; só marca `Recebido` após entrega física e inspeção; devoluções, cancelamentos e reembolsos são `Em devolução`.
- Para encomendas sem data real de entrega, preenche `estimated_delivery_date` apenas com previsão atual explícita da Vinted; quando houver intervalo, usa o último dia. Não substituas `delivery_date` pela previsão. Se não houver data fiável ou o detalhe não carregar, deixa-a vazia e informa o motivo; não uses previsões vencidas nem inventes datas.
- Regista encomendas canceladas/reembolsadas de revenda para auditoria sem as tornar stock elegível. No dashboard, `Confirmo que já recebi o reembolso` só deve ser marcado quando o dinheiro já chegou à conta; a mensagem Vinted “reembolso processado” por si só não confirma a receção. Ao confirmar, o registo permanece no histórico, mas deixa de impactar os cartões e totais financeiros. Reembolsos ainda não recebidos continuam contabilizados até confirmação.
- Um artigo em trânsito, em verificação, devolução, reembolso ou ainda sem posse física deve ficar registado com o estado correto, mas não está elegível para anúncio público.
- Só `recebido e inspecionado` pode passar a elegível para anúncio, desde que continue ativo/em stock e cumpra o restante checklist. Entregue mas por inspecionar continua bloqueado. A montra pública exclui compras com estados acompanhados diferentes de `recebido e inspecionado`; compras históricas em `Não acompanhado` mantêm o comportamento anterior até confirmação.
- Confirma depois de guardar que produto, custo, quantidade, data e estado ficaram corretos. Se a operação falhar, não afirmes que foi registada.

## 3. Determinar elegibilidade OLX

O dashboard é a fonte de verdade. Só considera artigos registados como compras de revenda e ainda ativos/em stock. Publica apenas quando o artigo foi recebido e inspecionado, a venda está autorizada pelo estado do negócio, e existem dados suficientes para um anúncio honesto.

Antes de cada anúncio:

- Confirma que não existe anúncio correspondente em ativos, pendentes, por pagar ou para edição no OLX. Considera títulos/variações do modelo e usa os IDs conhecidos na memória para evitar duplicados.
- Confirma variante, RAM, armazenamento, estado real, acessórios, garantia e fotografias da unidade. RAM e armazenamento são obrigatórios em eletrónica. Nunca uses fotografias geradas por IA em canais externos; usa fotos reais da unidade ou deixa-a pendente.
- Pesquisa comparáveis atuais do mesmo equipamento, priorizando OLX no distrito de Lisboa, e cruza com usados/recondicionados como CeX. Calcula preço para lucro líquido previsto mínimo de 75 € após custo total e despesas do canal/venda. Regista a fonte e pressupostos do preço.
- Descrição em português, completa e comercial, mas fiel ao artigo. Nunca revelar fornecedor/Vinted, custo de compra, estado da encomenda, verificação, devolução, reembolso, mensagens ou outros dados privados.
- Não pagar anúncios, pacotes, destaques ou qualquer taxa. Se OLX exigir pagamento, deixa o anúncio em `Por pagar` e reporta o estado; nunca concluas uma compra de serviço.
- A autorização para a rotina não permite inventar detalhes. Se faltar uma informação essencial (especialmente RAM, armazenamento, custo, posse ou fotos reais), continua os restantes artigos e deixa só esse pendente, solicitando apenas os dados em falta no relatório final.

Cria/publica anúncios sem duplicar, depois verifica o resultado na conta OLX. Se o OLX só permitir um anúncio incompleto de cada vez, não substituas um anúncio já existente para preparar outro.

## 4. Acesso, bloqueios e relatório

- Se Vinted, dashboard ou OLX não estiverem autenticados ou acessíveis, tenta navegar pela interface/menu atual uma vez; não repitas tentativas cegas em rotas antigas e não simules ações.
- Continua as partes independentes que forem seguras e acessíveis. Distingue claramente: visto, confirmado, atualizado, criado, publicado e pendente.
- No fim, resume compras novas/alteradas, estados, produtos publicados ou já anunciados, pendências e qualquer bloqueio. Não incluir dados privados desnecessários no anúncio público.
- Atualiza `MEMORY.md` quando houver decisões importantes ou alterações persistentes de processo, estado de anúncios, ou limitações descobertas.
