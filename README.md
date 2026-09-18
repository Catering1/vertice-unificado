# My Trade Tracker

Quero criar um site/app de gestão de compras e vendas de produtos, com dashboard interativo, para uso pessoal. O site deve ter as seguintes funcionalidades:

1. **Banco de dados interno**
   - Tabela **Produtos**: , Nome, Categoria, Preço de compra, Fornecedor
   - Tabela **Compras**: , Produto (lookup para Produtos), Quantidade, Preço, Data
   - Tabela **Vendas**: ID, Produto (lookup para Produtos), Quantidade, Preço de venda, Data, Lucro calculado automaticamente

2. **Páginas**
   - **Dashboard**: Mostrar KPIs e gráficos
       - Total gasto em compras
       - Total recebido em vendas
       - Lucro total
       - Produtos mais vendidos
       - Evolução de lucro no tempo
   - **Compras**: Formulário para adicionar compras e lista com filtros por data, categoria e fornecedor
   - **Vendas**: Formulário para adicionar vendas e lista com filtros por produto, data e lucro
   - **Produtos**: Lista de produtos com opção de adicionar, editar ou remover
   - **Exportação/Configurações**: Exportar dados (Excel/CSV), configurar categorias e impostos

3. **Funcionalidades adicionais**
   - Cálculo automático de lucro por venda
   - Filtragem e ordenação de listas
   - Visualização gráfica no dashboard (barras, linhas, pizza)
   - Interface simples e intuitiva para dispositivos desktop e mobile

Cria o layout e as tabelas prontos para serem usados no Lovable, com integração entre Compras, Vendas e Produtos, e dashboard atualizado automaticamente.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://verticemachine.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/37e34560-c141-4c02-8861-1289f7c17fc3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
