#!/usr/bin/env bash
#
# Assert that the four gh-aw validators actually RAN THE AGENT and it SUCCEEDED.
#
# Why this exists (issue #1417, split out of #1410):
#
# These four presented as green for months while doing nothing. Their runs showed
#   pre_activation: success
#   activation / agent / detection / safe_outputs: skipped
# and GitHub reports a run whose jobs all skipped as a SUCCESS. A green tick meant
# "nothing ran", and nobody could tell the difference from the checks page.
#
# So this deliberately does NOT check the run conclusion, and does NOT merely
# check that the agent job is "not skipped". An earlier draft of this bar asserted
# not-skipped; at that moment the agent job was FAILING on every run, so that
# check would have passed while all four validators were useless. The only
# assertion worth making is that the `agent` job concluded `success`.
#
# Exit 0 only if all four have a most-recent run whose agent job succeeded.

set -uo pipefail

REPO="${REPO_OVERRIDE:-tosin2013/mcp-adr-analysis-server}"

WORKFLOWS=(
  "mcp-server-validation"
  "esm-module-validation"
  "knowledge-graph-validation"
  "deployment-pattern-validation"
)

fail=0
printf "%-32s %-12s %s\n" "VALIDATOR" "AGENT JOB" "RUN"
printf "%-32s %-12s %s\n" "---------" "---------" "---"

for w in "${WORKFLOWS[@]}"; do
  run_id="$(gh run list --repo "$REPO" --workflow "$w.lock.yml" \
              --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null)"

  if [ -z "$run_id" ] || [ "$run_id" = "null" ]; then
    # No run at all is NOT a pass. An unexercised validator is exactly the
    # condition this script exists to detect, and reporting it as "n/a — ok"
    # would rebuild the false green in a new place.
    printf "%-32s %-12s %s\n" "$w" "NO RUNS" "-"
    fail=1
    continue
  fi

  concl="$(gh run view "$run_id" --repo "$REPO" --json jobs \
             --jq '.jobs[] | select(.name=="agent") | .conclusion' 2>/dev/null | head -1)"
  [ -z "$concl" ] && concl="NO AGENT JOB"

  printf "%-32s %-12s %s\n" "$w" "$concl" "$run_id"
  [ "$concl" = "success" ] || fail=1
done

echo
if [ "$fail" -ne 0 ]; then
  echo "FAIL: at least one validator has not run its agent to success."
  echo "A validator whose agent skips or fails reports the run as green while"
  echo "reviewing nothing. Investigate before trusting these as a safety net."
  exit 1
fi

echo "OK: all four validators ran their agent job to success."
