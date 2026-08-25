#!/usr/bin/env bash
#
# Assert that each of the four gh-aw validators has DEMONSTRATED it can run its
# agent to success.
#
# Why this exists (issue #1417, split out of #1410):
#
# These four presented as green for months while doing nothing. Their runs showed
#   pre_activation: success
#   activation / agent / detection / safe_outputs: skipped
# and GitHub reports a run whose jobs all skipped as a SUCCESS. A green tick meant
# "nothing ran", and the checks page could not show the difference.
#
# WHAT THIS ASSERTS, precisely: each validator has at least one run in recent
# history whose `agent` job concluded `success`.
#
# WHAT IT DOES NOT ASSERT: that the most recent run reviewed anything. That was
# this script's first implementation and it was wrong twice over:
#
#   1. A run still in flight has no `agent` job yet, so "latest run" reported
#      NO AGENT JOB and failed spuriously. It did exactly that within minutes of
#      landing on main, while three runs were in progress.
#   2. Validators legitimately skip when a commit touches none of their filtered
#      paths. Asserting the latest run's agent succeeded would fail after any
#      docs-only merge -- and a check that oscillates gets muted, which is how
#      the original false green survived.
#
# Capability is the stable, checkable property. A validator that has NEVER run
# its agent to success is broken; one that skipped this morning is not.
#
# It also does NOT check the run conclusion -- that is the value that was lying.
# And it does not merely check "not skipped": an earlier draft of this bar
# asserted not-skipped at a moment when the agent was FAILING on every run, so it
# would have passed while all four validators were useless.

set -uo pipefail

REPO="${REPO_OVERRIDE:-tosin2013/mcp-adr-analysis-server}"
# How far back to look for a successful agent run.
DEPTH="${DEPTH:-20}"

WORKFLOWS=(
  "mcp-server-validation"
  "esm-module-validation"
  "knowledge-graph-validation"
  "deployment-pattern-validation"
)

fail=0
printf "%-32s %-10s %s\n" "VALIDATOR" "AGENT" "EVIDENCE"
printf "%-32s %-10s %s\n" "---------" "-----" "--------"

for w in "${WORKFLOWS[@]}"; do
  # Completed runs only: an in-flight run has not created its agent job yet.
  runs="$(gh run list --repo "$REPO" --workflow "$w.lock.yml" \
            --status completed --limit "$DEPTH" \
            --json databaseId --jq '.[].databaseId' 2>/dev/null)"

  if [ -z "$runs" ]; then
    # No completed run at all is NOT a pass. An unexercised validator is exactly
    # the condition this exists to detect, and excusing it as "n/a" would rebuild
    # the false green somewhere new.
    printf "%-32s %-10s %s\n" "$w" "NONE" "no completed runs in last $DEPTH"
    fail=1
    continue
  fi

  found=""
  for r in $runs; do
    c="$(gh run view "$r" --repo "$REPO" --json jobs \
           --jq '.jobs[] | select(.name=="agent") | .conclusion' 2>/dev/null | head -1)"
    if [ "$c" = "success" ]; then found="$r"; break; fi
  done

  if [ -n "$found" ]; then
    printf "%-32s %-10s %s\n" "$w" "success" "run $found"
  else
    printf "%-32s %-10s %s\n" "$w" "NEVER" "no agent success in last $DEPTH runs"
    fail=1
  fi
done

echo
if [ "$fail" -ne 0 ]; then
  echo "FAIL: at least one validator has never run its agent to success."
  echo "Such a validator reports its runs as green while reviewing nothing."
  echo "Investigate before trusting these as a safety net."
  exit 1
fi

echo "OK: all four validators have run their agent to success."
