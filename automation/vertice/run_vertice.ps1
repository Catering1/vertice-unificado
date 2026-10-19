param(
    [switch]$Visible
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root ".venv\Scripts\python.exe"
$config = Join-Path $root "config.toml"

if (-not (Test-Path -LiteralPath $python)) {
    throw "Ambiente Python em falta. Executa install_local_automation.ps1 primeiro."
}
if (-not (Test-Path -LiteralPath $config)) {
    throw "Configuração em falta. Executa install_local_automation.ps1 primeiro."
}

if ($Visible) {
    $env:VERTICE_FORCE_VISIBLE = "1"
}

& $python -m vertice_automation.runner --config $config
exit $LASTEXITCODE
