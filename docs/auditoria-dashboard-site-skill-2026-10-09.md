# Auditoria do dashboard, site e skill — 09/10/2026

## Fluxo verificado
Vinted → compra identificada por referência privada → unidade/produto → venda ligada à compra → métricas e catálogo público → correspondência OLX da mesma unidade.
Repositório: Catering1/vertice-unificado. Supabase: pxpxipewhwwsiogoyjov.

## Correções
- Edição de vendas: a própria venda deixava de ser descontada do limite de unidades porque o esquema removia o ID; corrigida a comparação e impedido o envio repetido enquanto guarda.
- Compras recebidas sem data de levantamento deixam de voltar a Por Receber ao abrir/guardar uma edição.
- Receção separada do resultado da encomenda: apenas Por Receber e Recebido na receção; devoluções, cancelamentos e reembolsos permanecem auditáveis.
- Referências internas continuam ocultas e uma edição preserva a versão atual da referência, incluindo alterações feitas pela automação.
- Vendas relacionadas são apresentadas por purchase_id, evitando herdar vendas de outra compra do mesmo produto.
- Custos/datas históricos desconhecidos podem continuar vazios; não são substituídos por zero ou uma data inventada.
- Devoluções/reembolsos continuam a contar como custo até a receção do dinheiro ser confirmada, sem entrar no stock.
- RPC público desconta vendas por compra e conserva stock após vendas parciais. Servidor impede novas vendas antes da receção, excesso de quantidade e vendas de artigos pessoais/reembolsados.
- Dashboard e catálogo recarregam ao recuperar foco e a cada 30 segundos quando visíveis; categorias estáveis não reiniciam filtros durante a atualização.
- Site distingue falha da API de catálogo vazio/produto vendido e oferece nova tentativa. Fichas usam apenas preço, conteúdo e fotografias da unidade, sem inferir por nome dados de outra unidade.
- Corrigidos no registo real do S26+ nome, armazenamento (512 GB), cor preta, descrição e preço de 649 €, confirmados no OLX e no relatório anteriormente verificado. Removida a menção SIM desbloqueado das especificações públicas do S26 Ultra.
- Criadas correspondências privadas por produto para os cinco anúncios já conhecidos: conta, ID, URL e último preço conhecido; marcadas needs_recheck quando provenientes do histórico, sem afirmar estado ativo atual.
- Ligação produto → contacto mantém o ID/assunto e abre a secção correta. O formulário prepara um email apenas com destino configurado e nunca afirma ter enviado. Sem email configurado, encaminha para o chat dos anúncios OLX.
- Skill alinhada com campos ocultos, IDs de compra/venda, atualização de dados confirmados no site, metadados OLX e tratamento de moderação. Regras atuais prevalecem sobre notas históricas.
- Removidos erros de lint e TypeScript encontrados. Build inclui agora typecheck; GitHub executa lint, testes e build nos pushes para main e nos PRs.

## Validação
- Testes automatizados de inventário, métricas, datas, livros/importação, contacto, persistência de compras/vendas/despesas e ficha pública.
- Testes SQL transacionais de stock misto, venda parcial, excesso de quantidade, bloqueio de venda por receber, atualização de venda, pessoal/livros, cancelamento, receção e reembolso: passaram. Dados temporários revertidos; zero produtos de teste ficaram na base.
- Papel anon: sem acesso a linhas privadas de produtos, compras ou vendas; RPC público devolve os 8 produtos elegíveis.
- Base real: zero referências de encomenda duplicadas e zero vendas sem compra associada.
- Skill validada pelo validador oficial.

## Limites e pendências
- Falta o email/WhatsApp do negócio para concluir a configuração de contacto direto; foi pedido ao utilizador. O chat OLX continua acessível.
- Não foram publicadas/terminadas novas ofertas OLX, enviados emails de teste ou alteradas credenciais. A retirada OLX ocorre na rotina diária/manual, não imediatamente ao guardar uma venda.
- Os dois Surface ainda não têm fotografias reais inequivocamente ligadas à unidade. Mostram fotografia em preparação; a ambiguidade histórica permanece documentada.
- Nove avisos Fast Refresh permanecem no lint; não são erros. O build ainda avisa sobre dimensão dos bundles e a base Browserslist antiga.
- O advisor Supabase assinala a projeção pública SECURITY DEFINER (intencional e limitada a campos públicos) e proteção contra passwords comprometidas desativada. Acesso anónimo a dados privados foi efetivamente testado; não foram alteradas configurações de autenticação.


## Resultados locais finais
- 53/53 testes passaram (7 ficheiros). TypeScript e build passaram. Lint sem erros, com os 9 avisos Fast Refresh já identificados.

