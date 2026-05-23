#!/usr/bin/env bash
# Rebuild OMA from local source and redeploy over the global install.
#
# WHY: `oma update` (and the `auto_update_cli: true` flag) overwrites the
# global cli.js with the npm registry build, which does NOT contain our
# local fixes:
#   - Windows codex spawn wrapper auto-correction (.exe -> .cmd -> npm)
#   - Result-file fallback creation after subagent exit
#   - Antigravity stdout capture via `agy`
#   - `docs` AGENT_TYPE registration
#   - verify findResultFile prioritization (.agents/results first)
#   - Charter Preflight auto-generated CHARTER_CHECK line
#
# HOW TO USE:
#   bash scripts/rebuild-oma.sh
# or from PowerShell:
#   & "C:\Program Files\Git\bin\bash.exe" scripts/rebuild-oma.sh
#
# Run this script every time after `oma update` or whenever the global
# cli.js SHA256 differs from the locally-built one.
set -euo pipefail

SRC="C:/Users/user/AI_Orchestra_Lab/core_system/oh-my-agent"
GLOBAL_CLI="C:/Users/user/.bun/install/global/node_modules/oh-my-agent/bin/cli.js"

echo "[1/4] Building OMA from $SRC"
cd "$SRC"
bun run build | tail -5

echo "[2/4] Deploying to global install"
cp "cli/bin/cli.js" "$GLOBAL_CLI"

echo "[3/4] Verifying new global SHA256"
sha256sum "$GLOBAL_CLI"

echo "[4/4] Confirming oma --version"
oma --version

echo
echo "OMA local build redeployed. Run 'oma doctor' to confirm health."
echo "Reminder: keep 'auto_update_cli: false' in .agents/oma-config.yaml"
echo "          until upstream PR is merged."
