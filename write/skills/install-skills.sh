#!/usr/bin/env bash
# Install the MBI 2026 Write skills into ~/.claude/skills/
# (Team repos must keep their own .claude/ folder untouched.)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${HOME}/.claude/skills"
mkdir -p "${TARGET}"

SKILLS=(check-results write-note)

for s in "${SKILLS[@]}"; do
  rm -rf "${TARGET}/${s}"
  cp -R "${SCRIPT_DIR}/${s}" "${TARGET}/${s}"
  echo "Installed ${s} -> ${TARGET}/${s}"
done

echo ""
echo "Done. Start a new Claude Code session in your team repository: /check-results first, then /write-note."
