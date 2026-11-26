# Install the five MBI 2026 figure/presentation skills into $HOME\.claude\skills\
# (Team repos must keep their own .claude\ folder untouched.)
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Target = Join-Path $HOME ".claude\skills"
New-Item -ItemType Directory -Force -Path $Target | Out-Null

$Skills = @("figure-style", "render-and-look", "schematic", "html-animation", "blender-scene")

foreach ($s in $Skills) {
    $src = Join-Path $ScriptDir $s
    $dst = Join-Path $Target $s
    if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
    Copy-Item -Recurse -Force $src $dst
    Write-Host "Installed $s -> $dst"
}

Write-Host ""
Write-Host "Done. All 5 skills are now available in Claude Code across any project."
Write-Host "Optional: copy $(Join-Path $ScriptDir 'figure-style\mbi.mplstyle') into your team repo as code\team.mplstyle."
