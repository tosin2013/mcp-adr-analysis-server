#!/usr/bin/env bash
#
# Report modules under src/ that nothing in src/ imports (#1540).
#
# Why: the dead-code census that opened this milestone was a one-off audit run
# by hand. A number in an issue body decays the moment someone lands a commit,
# and every claim in this repository that nothing executes has eventually turned
# out to be wrong. This makes the 9,062-line figure reproducible on demand.
#
# This is a RATCHET, not a zero-dead-code gate: the count may fall, never rise.
# Demanding zero would gate CI behind a retirement queue that needs a human
# disposition per asset -- ADR-025's precedent -- and the realistic outcome is
# the check never lands.
#
# It REPORTS. It never deletes. Deletion needs retirement.py plus an admission,
# and a zero-reference asset returning RETIREMENT_REVIEW is the correct terminal
# result, not a false positive to argue with.
#
# THREE TRAPS THIS DELIBERATELY AVOIDS
#
#   1. Grep for the module name. Substring matching is how CI came to assert a
#      tool that has never existed (`analyze_project` matched
#      `analyze_project_ecosystem`). This builds a real import graph instead:
#      relative specifiers only, .js -> .ts resolution, directory -> index.ts.
#
#   2. Missing `await import()` edges. Several modules here are reached only
#      through dynamic import. A static-import-only graph reports them dead and
#      would have had us delete live code.
#
#   3. A check that silently scans nothing. If the walk finds no files, or
#      src/index.ts is missing, that is a BROKEN CHECK reported as a clean
#      repository -- the exact failure this milestone keeps finding in the code
#      it is cleaning up. Both conditions abort loudly.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

BASELINE_FILE=".dead-code-baseline"

report="$(python3 scripts/dead-code.py)"

if [ -z "$report" ] || printf '%s' "$report" | grep -q '^ABORT'; then
  reason="$(printf '%s' "$report" | sed -n 's/^ABORT\t//p')"
  printf "  \033[31mABORT\033[0m %s\n" "${reason:-the check produced no output}"
  echo "The dead-code check could not run. That is a failure, not a clean result."
  exit 2
fi

scanned="$(printf '%s' "$report" | awk -F'\t' '$1=="SCANNED"{print $2" files, "$3" lines"}')"
count="$(printf '%s'  "$report" | awk -F'\t' '$1=="TOTAL"{print $2}')"
deadlines="$(printf '%s' "$report" | awk -F'\t' '$1=="TOTAL"{print $3}')"

echo "Dead code under src/ -- modules no other src/ module imports"
echo "  scanned: $scanned"
echo

printf '%s' "$report" | awk -F'\t' '$1=="DEAD"{printf "  \033[33m%6d\033[0m  %s  (%s)\n", $2, $3, $4}'

echo
echo "  $count files, $deadlines lines"

# First integer on the first line. The rest of the file is prose, so the number
# always arrives with the reason it is what it is.
baseline="$count"
if [ -f "$BASELINE_FILE" ]; then
  parsed="$(sed -n 's/^[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$BASELINE_FILE" | head -1)"
  [ -n "$parsed" ] && baseline="$parsed"
fi

if [ "$count" -gt "$baseline" ]; then
  printf "  \033[31mFAIL\033[0m dead modules rose from %s to %s. Wire it up or do not add it.\n" "$baseline" "$count"
  exit 1
fi

if [ "$count" -lt "$baseline" ]; then
  printf "  \033[32mOK\033[0m   dead modules fell from %s to %s -- ratchet %s into %s\n" \
    "$baseline" "$count" "$count" "$BASELINE_FILE"
else
  printf "  \033[32mOK\033[0m   dead modules holding at %s\n" "$count"
fi
