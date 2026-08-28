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
#
# The list is also a liability, which is #1469: dynamic-deployment-intelligence.js
# sat here until ADR-025 retired it, and its absence from the package then failed
# this check with "most likely a runtime dependency is declared under
# devDependencies" -- a misdiagnosis of a module that was deliberately deleted.
# The two failures are distinguished below until #1469 replaces the list with
# enumerated entry points.
MODULES=(
  "dist/src/utils/ai-executor.js"
  "dist/src/tools/adr-suggestion-tool.js"
  "dist/src/tools/adr-validation-tool.js"
  "dist/src/utils/prompt-execution.js"
  "dist/src/utils/file-system.js"
  "dist/src/index.js"
)

echo "==> Importing AI-path entry points from the installed package"
FAILED=0
STALE=0
for m in "${MODULES[@]}"; do
  # A listed module that is not in the tarball is a stale list entry, not a
  # missing dependency. Saying so is the difference between a one-line fix and
  # an afternoon spent auditing devDependencies.
  if [ ! -f "$WORK/node_modules/mcp-adr-analysis-server/$m" ]; then
    echo "    STALE $m -- listed here but not in the package"
    STALE=1
    continue
  fi
  if node --input-type=module -e "await import('mcp-adr-analysis-server/$m')" 2>"$WORK/err.txt"; then
    echo "    ok    $m"
  else
    echo "    FAIL  $m"
    sed 's/^/          /' "$WORK/err.txt" | head -3
    FAILED=1
  fi
done

if [ "$STALE" -ne 0 ]; then
  echo
  echo "MODULES lists a module the package does not contain."
  echo "If it was deliberately removed, delete its line above. This is #1469:"
  echo "a hand-maintained list goes stale silently and then misreports why."
  exit 1
fi

if [ "$FAILED" -ne 0 ]; then
  echo
  echo "The packaged artifact cannot resolve one or more imports."
  echo "Most likely a runtime dependency is declared under devDependencies."
  exit 1
fi

echo "==> Packaged artifact imports cleanly"
