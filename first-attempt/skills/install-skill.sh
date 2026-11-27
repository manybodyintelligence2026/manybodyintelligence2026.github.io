#!/usr/bin/env bash
# Install the MBI 2026 board-to-latex skill into ~/.claude/skills/
# (Team repos must keep their own .claude/ folder untouched.)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${HOME}/.claude/skills"
mkdir -p "${TARGET}"

s=board-to-latex
rm -rf "${TARGET:?}/${s:?}"
cp -R "${SCRIPT_DIR}/${s}" "${TARGET}/${s}"
echo "Installed ${s} -> ${TARGET}/${s}"

echo ""
echo "Done. Start a new Claude Code session and ask /board-to-latex to transcribe a photo in photos/."
