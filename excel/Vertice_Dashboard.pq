// Vértice — Power Query para Excel
// 1. Substitui COLE_A_CHAVE_AQUI pela chave privada recebida do administrador.
// 2. Guarda esta consulta com o nome fnVertice.
// 3. Cria consultas para cada conjunto de dados, por exemplo: = fnVertice("stock")
(dataset as text) as table =>
let
    BaseUrl = "https://pxpxipewhwwsiogoyjov.supabase.co/functions/v1/excel-report",
    Fonte = Json.Document(
        Web.Contents(
            BaseUrl,
            [
                Query = [dataset = dataset],
                Headers = [#"x-excel-api-key" = "COLE_A_CHAVE_AQUI"],
                ManualCredentials = true
            ]
        )
    ),
    Linhas = Fonte[rows],
    Tabela = Table.FromRecords(Linhas)
in
    Tabela
