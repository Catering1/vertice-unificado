# Excel ligado ao dashboard Vértice

O ficheiro `Vertice_Dashboard.pq` contém a função Power Query que consulta, em modo apenas de leitura, os dados atuais do dashboard.

## Configuração no Excel

1. Abra um livro novo no Excel e escolha **Dados → Obter Dados → De Outras Origens → Consulta em Branco**.
2. Abra o **Editor Avançado**, substitua o conteúdo pela função de `Vertice_Dashboard.pq` e dê-lhe o nome `fnVertice`.
3. Crie seis consultas novas com estas fórmulas, carregando cada uma numa folha:

   - `= fnVertice("purchases")` — Compras
   - `= fnVertice("sales")` — Vendas
   - `= fnVertice("stock")` — Stock ativo
   - `= fnVertice("returns")` — Devoluções excluídas
   - `= fnVertice("expenses")` — Despesas
   - `= fnVertice("summary")` — Resumo de gestão

4. Em **Dados → Consultas e Ligações → Propriedades**, ative **Atualizar dados ao abrir o ficheiro** e defina a atualização periódica desejada.

O endpoint só aceita pedidos com a chave privada configurada no Excel. Não expõe a chave de administrador do Supabase, nem permite alterar dados. Produtos em devolução, reembolso ou cancelados surgem na consulta `returns` e ficam excluídos dos totais de stock.
