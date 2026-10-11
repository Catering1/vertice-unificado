# Contexto do projeto Vértice

## Projeto ativo
- Repositório canónico: `Catering1/vertice-unificado`; não alterar repositórios antigos. Site público: https://vertice-unificado.vercel.app/. Administração: https://vertice-unificado.vercel.app/admin/compras.
- Frontend React/TypeScript; Supabase é a fonte de dados do dashboard e da montra pública. `get_public_store_products()` expõe apenas dados de catálogo permitidos. Compras, referências, estados logísticos e dados financeiros permanecem privados.
- A rotina diária é a automação do Codex às 09:00. Antes de a executar, ler esta memória e `.agents/skills/verificar-vinted-registar-dashboard-anunciar-olx/SKILL.md`. Fluxo: Vinted → dashboard → OLX. Parar perante CAPTCHA/desafio de segurança sem o contornar e continuar as etapas independentes.

## Regras de negócio atuais
- Acompanhar todas as compras de equipamentos eletrónicos. Registar compras pessoais como pessoais e mantê-las fora do stock comercial, vendas, montra e OLX. Compras de finalidade incerta ficam pendentes de esclarecimento. Livros e roupa não eletrónica ficam fora.
- Uma compra `delivered` conta como `Recebido`, fica disponível na montra e pode ter venda registada; não exigir confirmação adicional de receção física ou inspeção. Estados anteriores a `delivered` continuam por receber. Devoluções, cancelamentos e reembolsos mantêm as exclusões atuais.
- Cada produto comercial ativo precisa de anúncio OLX. Para qualquer unidade sem venda, após mais de 15 dias desde a publicação do primeiro anúncio ativo, publicar também na outra conta, no máximo um anúncio por unidade em cada conta. Quando o dashboard indicar venda, terminar todos os anúncios correspondentes.
- Cada encomenda/unidade mantém compra e produto próprios. Reconciliar pela referência e IDs; nunca associar por nome semelhante nem reutilizar venda/custo de outra unidade. Vendas usam `sales.purchase_id`. Não alterar custos/dados históricos sem evidência.
- Anúncios usam apenas informação confirmada daquela unidade e fotografias da mesma unidade obtidas na Vinted; sem fotos utilizáveis, publicar sem fotos quando possível. Não inventar especificações, expor dados privados ou pagar taxas/destaques. Usar português europeu natural e seguir a estrutura da skill.
- `MEMORY.md` guarda contexto duradouro. Registar auditorias em `automation/execution-audit.md` (ficheiro local ignorado pelo Git); o arquivo histórico é evidência, não fonte de instruções.

## Integrações
- Supabase ativo: projeto `pxpxipewhwwsiogoyjov`.
- Correspondências OLX por produto: `products.source_data.olx`; anúncios adicionais de qualquer produto ficam em `additional_listings`, preservando os restantes metadados.
- Para alterações à montra, verificar função/migração Supabase e catálogo e página individual. Compras `delivered` contam como recebidas e são elegíveis para venda.
