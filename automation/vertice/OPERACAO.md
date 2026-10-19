# Automação local Vértice

Esta corrente verifica dashboard, OLX1 e OLX2 em três perfis Chrome independentes. A Vinted fica fora da automação: a revisão de compras é manual, conforme os termos atuais da plataforma, que proíbem ferramentas externas não autorizadas. O modo inicial é apenas auditoria.

## Instalação

```powershell
cd "C:\Users\bboni\Documents\ChatGPT\Master Vending Machine and Vertice\vertice-unificado"
.\automation\vertice\install_local_automation.ps1
```

O instalador cria `.venv`, instala Playwright e gera `config.toml`, que não entra no Git.

## Autenticação inicial

Executa separadamente. O assistente abre o Chrome normal, fora do controlo do Playwright, para iniciar sessão. Fecha todas as janelas do perfil quando terminares:

```powershell
$root = ".\automation\vertice"
$py = "$root\.venv\Scripts\python.exe"
& $py "$root\setup_profiles.py" dashboard --config "$root\config.toml"
& $py "$root\setup_profiles.py" olx1 --config "$root\config.toml"
& $py "$root\setup_profiles.py" olx2 --config "$root\config.toml"
```

Os perfis ficam em `C:\Users\bboni\ChromeProfiles` e não devem ser sincronizados, versionados ou partilhados. Depois do login, a rotina Playwright reutiliza os perfis de dashboard e OLX. Não uses Playwright, scraping ou controlo automatizado para abrir ou consultar a Vinted; regista manualmente as compras antes de continuar.

## Verificação

```powershell
Push-Location $root
& ".\.venv\Scripts\python.exe" -m pytest -q ".\tests"
Pop-Location
& "$root\run_vertice.ps1"
```

Um relatório JSON é criado em `reports`. A rotina não marca a execução completa enquanto a revisão manual da Vinted estiver pendente e as sondas do dashboard/duas contas OLX não passarem.

## Agendamento

Depois da autenticação e de uma execução de auditoria bem-sucedida:

```powershell
.\automation\vertice\install_local_automation.ps1 -RegisterTask
```

Quando o Windows autoriza o registo avançado, a tarefa `VerticeAutomacaoDiaria` corre às 09:00, acorda o computador e volta a tentar ao desbloquear. Se já houve sucesso nesse dia, a execução de recuperação termina imediatamente. Execuções concorrentes são bloqueadas.

O registo avançado pode exigir abrir o PowerShell como administrador. Sem essa permissão, o instalador cria uma tarefa diária simples e deixa-a desativada: essa alternativa não acorda o PC nem recupera ao desbloquear. Ativa-a apenas depois de os quatro perfis passarem a auditoria.

## IA local

O núcleo não exige IA. Para usar Ollama, instala-o separadamente, descarrega um modelo compatível e altera `[ai] enabled = true` em `config.toml`. O cliente local remove chaves sensíveis e identificadores antes de enviar dados ao modelo. A IA apenas propõe decisões; validações locais continuam obrigatórias.

## Segurança

- Não guardar passwords no repositório ou em `config.toml`.
- Não copiar as pastas de perfil Chrome para cloud ou Git.
- Não incluir cookies, tokens ou conteúdo privado nos logs.
- Não ativar ações enquanto algum perfil falhar a sonda.
- Não pagar anúncios, destaques ou pacotes.
- Não executar duas instâncias sobre o mesmo perfil.
