param(
    [switch]$RegisterTask
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$venv = Join-Path $root ".venv"
$python = Join-Path $venv "Scripts\python.exe"
$config = Join-Path $root "config.toml"

if (-not (Test-Path -LiteralPath $venv)) {
    py -3.12 -m venv $venv
}
& $python -m pip install --disable-pip-version-check -r (Join-Path $root "requirements.txt")
& $python -m playwright install chromium

if (-not (Test-Path -LiteralPath $config)) {
    Copy-Item -LiteralPath (Join-Path $root "config.example.toml") -Destination $config
}

New-Item -ItemType Directory -Force -Path (Join-Path $root "logs"), (Join-Path $root "reports"), (Join-Path $root "state") | Out-Null

if ($RegisterTask) {
    $userSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $scriptPath = [Security.SecurityElement]::Escape((Join-Path $root "run_vertice.ps1"))
    $working = [Security.SecurityElement]::Escape($root)
    $start = (Get-Date -Hour 9 -Minute 0 -Second 0).ToString("yyyy-MM-ddTHH:mm:ssK")
    $xml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.3" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Rotina local dashboard → OLX da Vértice, com revisão manual prévia da Vinted. Corre às 09:00 e recupera ao desbloquear o Windows.</Description></RegistrationInfo>
  <Principals><Principal id="Author"><UserId>$userSid</UserId><LogonType>InteractiveToken</LogonType></Principal></Principals>
  <Settings>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <ExecutionTimeLimit>PT3H</ExecutionTimeLimit><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <StartWhenAvailable>true</StartWhenAvailable><WakeToRun>true</WakeToRun><UseUnifiedSchedulingEngine>true</UseUnifiedSchedulingEngine>
  </Settings>
  <Triggers>
    <CalendarTrigger><StartBoundary>$start</StartBoundary><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger>
    <SessionStateChangeTrigger><StateChange>SessionUnlock</StateChange></SessionStateChangeTrigger>
  </Triggers>
  <Actions Context="Author"><Exec><Command>powershell.exe</Command><Arguments>-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File &quot;$scriptPath&quot;</Arguments><WorkingDirectory>$working</WorkingDirectory></Exec></Actions>
</Task>
"@
    try {
        Register-ScheduledTask -TaskName "VerticeAutomacaoDiaria" -Xml $xml -Force -ErrorAction Stop | Out-Null
        Write-Host "Tarefa avançada instalada: 09:00, despertar e recuperação ao desbloquear."
    }
    catch {
        Write-Warning "O Windows recusou a tarefa avançada sem privilégios de administrador."
        $runner = Join-Path $root "run_vertice.ps1"
        $taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runner`""
        & schtasks.exe /Create /TN "VerticeAutomacaoDiaria" /TR $taskCommand /SC DAILY /ST 09:00 /F | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Também não foi possível criar a tarefa diária simples."
        }
        & schtasks.exe /Change /TN "VerticeAutomacaoDiaria" /DISABLE | Out-Null
        Write-Warning "Foi criada uma tarefa simples, desativada por segurança. Não desperta o PC nem recupera ao desbloquear. Importa a tarefa avançada como administrador depois da autenticação."
    }
}

Write-Host "Instalação concluída."
Write-Host "Abre e autentica os perfis dashboard e OLX com:"
Write-Host "  & '$python' '$(Join-Path $root 'setup_profiles.py')' dashboard --config '$config'"
Write-Host "  & '$python' '$(Join-Path $root 'setup_profiles.py')' olx1 --config '$config'"
Write-Host "  & '$python' '$(Join-Path $root 'setup_profiles.py')' olx2 --config '$config'"
