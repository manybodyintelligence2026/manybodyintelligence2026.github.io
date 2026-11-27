#!/usr/bin/env bash
# Install the MBI 2026 scoping skill into ~/.claude/skills/
# (Team repos must keep their own .claude/ folder untouched.)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${HOME}/.claude/skills"
mkdir -p "${TARGET}"

s=scope-to-one-day
rm -rf "${TARGET}/${s}"
cp -R "${SCRIPT_DIR}/${s}" "${TARGET}/${s}"
echo "Installed ${s} -> ${TARGET}/${s}"

echo ""
echo "Done. Start a new Claude Code session in your team repository and type /scope-to-one-day."
