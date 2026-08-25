#!/usr/bin/env bash
#
# Verify that the PACKAGED artifact actually runs — not that the repo builds.
#
# Why this exists (issue #1409): mcp-adr-analysis-server@2.6.13 shipped with a
# static `import OpenAI from 'openai'` in src/utils/ai-executor.ts while `openai`
# sat in devDependencies. Since `files: ["dist/"]` ships no node_modules, every
# npm consumer who reached an AI path got ERR_MODULE_NOT_FOUND.
#
# Nothing in CI could have caught it:
#   - `npm run health` only boots the server, and startup never loads these paths
#   - `npm run build` compiles from the repo, where devDependencies ARE present
#   - scripts/test-npm-package.sh asserts three files exist; it never installs
#
# The only check that catches a misclassified dependency is installing the packed
# tarball somewhere with no node_modules of its own and importing the real entry
# points. That is what this does.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cd "$ROOT"
echo "==> Building"
npm run build >/dev/null

echo "==> Packing"
TARBALL="$(npm pack --pack-destination "$WORK" 2>/dev/null | tail -1)"
echo "    $TARBALL"

echo "==> Installing into a clean directory (no dev dependencies)"
cd "$WORK"
npm init -y >/dev/null 2>&1
# --omit=dev is belt and braces: a fresh dir has no devDependencies anyway, but
# it makes the intent explicit and survives someone adding a package.json here.
npm install --omit=dev "$WORK/$TARBALL" >/dev/null 2>&1

# Every module that reaches an external runtime dependency. Add to this list when
# a new one appears -- a module absent here is a module this check cannot defend.
MODULES=(
  "dist/src/utils/ai-executor.js"
  "dist/src/tools/adr-suggestion-tool.js"
  "dist/src/tools/adr-validation-tool.js"
  "dist/src/utils/prompt-execution.js"
  "dist/src/utils/file-system.js"
  "dist/src/utils/dynamic-deployment-intelligence.js"
  "dist/src/index.js"
)

echo "==> Importing AI-path entry points from the installed package"
FAILED=0
for m in "${MODULES[@]}"; do
  if node --input-type=module -e "await import('mcp-adr-analysis-server/$m')" 2>"$WORK/err.txt"; then
    echo "    ok    $m"
  else
    echo "    FAIL  $m"
    sed 's/^/          /' "$WORK/err.txt" | head -3
    FAILED=1
  fi
done

if [ "$FAILED" -ne 0 ]; then
  echo
  echo "The packaged artifact cannot resolve one or more imports."
  echo "Most likely a runtime dependency is declared under devDependencies."
  exit 1
fi

echo "==> Packaged artifact imports cleanly"
