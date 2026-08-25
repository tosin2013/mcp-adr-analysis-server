#!/usr/bin/env bash
#
# Ratchet on test-suite type errors (#1412).
#
# tsconfig.json includes 'src/**/*' only, so `npm run typecheck` has always been
# checking half the TypeScript here. Turning tests on surfaced 905 errors; two
# mechanical fixes took that to the number in .tsc-test-baseline.
#
# Demanding ZERO would mean fixing ~290 individually-judged errors before any of
# this could land, and the realistic outcome of that is the check never lands.
# So this is a RATCHET: the count may fall, never rise.
#
# Lower the baseline whenever you fix errors. Raising it is a decision, not a
# convenience -- it means new drift was accepted, and the diff should say why.
#
# The remaining errors are real. A sample:
#   Property 'compliance_results' does not exist on type 'ValidateComplianceResponse'
#   Cannot find name 'MockInstance'
# Each needs a judgement about whether the test or the source is wrong, which is
# why they are not swept.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

BASELINE_FILE=".tsc-test-baseline"
[ -f "$BASELINE_FILE" ] || { echo "missing $BASELINE_FILE"; exit 1; }
baseline="$(tr -d '[:space:]' < "$BASELINE_FILE")"

count="$(npx tsc --noEmit -p tsconfig.test.json 2>&1 | grep -cE 'error TS')"

echo "test type errors: $count   baseline: $baseline"

if [ "$count" -gt "$baseline" ]; then
  echo
  echo "FAIL: test type errors rose by $((count - baseline))."
  echo "Tests drifted from the code they exercise. Fix the new errors, or if the"
  echo "increase is deliberate, raise $BASELINE_FILE in the same commit and say why."
  npx tsc --noEmit -p tsconfig.test.json 2>&1 | grep -E 'error TS' | head -20
  exit 1
fi

if [ "$count" -lt "$baseline" ]; then
  echo
  echo "Errors fell to $count. Lower $BASELINE_FILE to $count to lock the gain in:"
  echo "    echo $count > $BASELINE_FILE"
  echo "(not a failure -- but the ratchet only holds if you tighten it)"
fi

echo "OK"
