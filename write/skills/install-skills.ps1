# Install the MBI 2026 Write skills into $HOME\.claude\skills\
# (Team repos must keep their own .claude\ folder untouched.)
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Target = Join-Path $HOME ".claude\skills"
New-Item -ItemType Directory -Force -Path $Target | Out-Null

$Skills = @("check-results", "write-note")

foreach ($s in $Skills) {
    $src = Join-Path $ScriptDir $s
    $dst = Join-Path $Target $s
    if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
    Copy-Item -Recurse -Force $src $dst
    Write-Host "Installed $s -> $dst"
}

Write-Host ""
Write-Host "Done. Start a new Claude Code session in your team repository: /check-results first, then /write-note."
