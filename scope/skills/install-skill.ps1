# Install the MBI 2026 scoping skill into $HOME\.claude\skills\
# (Team repos must keep their own .claude\ folder untouched.)
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Target = Join-Path $HOME ".claude\skills"
New-Item -ItemType Directory -Force -Path $Target | Out-Null

$s = "scope-to-one-day"
$src = Join-Path $ScriptDir $s
$dst = Join-Path $Target $s
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
Copy-Item -Recurse -Force $src $dst
Write-Host "Installed $s -> $dst"

Write-Host ""
Write-Host "Done. Start a new Claude Code session in your team repository and type /scope-to-one-day."
