#!/usr/bin/env bash
# Install the five MBI 2026 figure/presentation skills into ~/.claude/skills/
# (Team repos must keep their own .claude/ folder untouched.)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${HOME}/.claude/skills"
mkdir -p "${TARGET}"

SKILLS=(figure-style render-and-look schematic html-animation blender-scene)

for s in "${SKILLS[@]}"; do
  rm -rf "${TARGET}/${s}"
  cp -R "${SCRIPT_DIR}/${s}" "${TARGET}/${s}"
  echo "Installed ${s} -> ${TARGET}/${s}"
done

echo ""
echo "Done. All 5 skills are now available in Claude Code across any project."
echo "Optional: copy ${SCRIPT_DIR}/figure-style/mbi.mplstyle into your team repo as code/team.mplstyle."
