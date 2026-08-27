#!/usr/bin/env bash
#
# Check the ADR ledger against the code, and against itself (#1415).
#
# Why: this repository's documented claims and its behaviour drift, and nothing
# notices. Docs claimed 85% coverage with no threshold configured. TOOL_CATALOG
# claimed 70 CE-MCP directives with 12 implemented. CI grepped the bundle for a
# tool named `analyze_project` that has never existed. Every one was found by
# EXECUTING a check, never by reading a document. The ADRs had never been checked
# at all.
#
# This is a RATCHET, not a zero-drift gate: the count may fall, never rise.
# Demanding zero would gate the check behind reconciliation work that is mostly
# human judgement, and the realistic outcome is the check never lands.
#
# It REPORTS. It never edits an ADR -- reconciling a ledger is a judgement act.
#
# TWO TRAPS THIS DELIBERATELY AVOIDS
#
#   1. Substring matching. `grep -i sse src/` returns 103 hits here: assessment,
#      assessed, classes. That is exactly how CI came to assert a tool that does
#      not exist (`analyze_project` matched `analyze_project_ecosystem`). Every
#      pattern below is anchored to a real symbol or an exact field.
#
#   2. Two status formats. Most ADRs use `## Status` with the value on a later
#      line; two use `**Status**: X` inline. A parser handling only the first
#      reports `?` and invents drift.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

ADR_DIR="docs/adrs"
BASELINE_FILE=".adr-drift-baseline"
drift=0

ok()    { printf "  \033[32mOK   \033[0m %s\n" "$1"; }
bad()   { printf "  \033[31mDRIFT\033[0m %s\n" "$1"; drift=$((drift + 1)); }

# Read an ADR's declared status. Four dialects, in the frequency repo-governor's
# adr adapter measured across 439 real ADRs in 34 collections -- not guessed:
#
#     heading  57%   ## Status \n\n Accepted      MADR / Nygard
#     bullet   19%   - **Status:** Accepted        colon inside the bold
#     inline   16%   **Status**: Accepted
#     yaml      2%   --- \n status: accepted      MADR 3.0 front matter
#
# An earlier version of this function handled only `heading` and `inline`. That
# was enough for this repository as it stood, and would have silently reported
# the bullet form as unparseable -- and YAML front matter too, which matters now
# that ADR-022 adopts MADR. Fixed rather than left as a latent trap.
#
# YAML is checked FIRST: a MADR file has front matter at the top and may also
# carry a `## Status` heading later in prose.
adr_status() {
  local f="$1" s=""
  # 1. YAML front matter, only within the leading --- ... --- block.
  if [ "$(head -1 "$f" | tr -d "\r")" = "---" ]; then
    s="$(awk 'NR>1{if($0=="---"||$0=="---\r")exit; print}' "$f" \
          | sed -nE 's/^[[:space:]]*status[[:space:]]*:[[:space:]]*(.*[^[:space:]])[[:space:]]*$/\1/Ip' | head -1)"
  fi
  # 2. bullet or inline bold, with the colon inside or outside the asterisks.
  [ -z "$s" ] && s="$(sed -nE 's/^[[:space:]]*[-*]?[[:space:]]*\*\*Status:?\*\*:?[[:space:]]*(.*[^[:space:]])[[:space:]]*$/\1/p' "$f" | head -1)"
  # 3. `## Status` heading with the value on a following line.
  [ -z "$s" ] && s="$(awk '/^#{1,4}[[:space:]]*Status[[:space:]]*$/{f=1;next} f&&NF{gsub(/\r/,"");print;exit}' "$f")"
  # Normalise MADR's lowercase vocabulary to the corpus's Title Case so index
  # comparison does not report false drift on `accepted` vs `Accepted`.
  printf '%s' "$s" | sed 's/^ *//;s/ *$//' \
    | awk '{ if (length($0)) { $1=toupper(substr($1,1,1)) substr($1,2) } print }'
}

# Is this ADR still making live claims about the code?
#
# A Superseded or Deprecated ADR that contradicts the code is THE RECORD WORKING,
# not drift. Superseding ADR-001 leaves the word "SSE" in it -- that is what
# superseding means. Before this existed the code-vs-claim checks below fired on
# any mention of a keyword, so every honest fix still tripped them and the only
# way to green them was to delete the history. An ADR ledger that punishes you for
# keeping history is worse than none.
#
# adr_status() has parsed four dialects since this script was written. These checks
# simply never called it (#1507).
adr_is_live() {
  case "$(adr_status "$1")" in
    Superseded*|Deprecated*|Rejected*) return 1 ;;
    *) return 0 ;;
  esac
}

# The ADR's text with historical sections removed.
#
# Within a still-Accepted ADR, "ADR-017 removed HCL and Dockerfile support" is a
# CORRECTION, not a claim to support them -- but it contains the word "HCL", so a
# whole-file grep reads it as the very claim it retracts. Text under an Evolution
# Notes / Corrections / Superseded heading is history; everything else is live.
#
# Deliberately NOT a general markdown parser. It strips from such a heading to the
# next heading of the same or shallower depth, which is all the corpus needs and is
# small enough to be obviously correct.
#
# THE HOLE THIS OPENS, STATED RATHER THAN DISCOVERED LATER. Anything inside a
# Corrections heading is invisible to these checks, so a live claim MOVED there is
# laundered. That is not a bug to fix -- the whole point is that a correction
# mentioning "HCL" is not a claim to support HCL, and no syntactic rule separates
# "we removed HCL" from "we support HCL" once both sit under the same heading.
#
# What limits the damage: the Decision, Context and Consequences sections are never
# stripped, so a claim has to be deleted from where it belongs before it can be
# hidden -- which is a visible edit in review, not an oversight. Verified: adding
# "We will support HCL and Dockerfile grammars." to ADR-006's Decision is still
# caught with the Corrections section present.
#
# If this is ever abused, the fix is a declared Confirmation per ADR (ADR-022's
# Consequences already argue for it) rather than a cleverer grep.
adr_live_text() {
  awk '
    /^#{1,6}[[:space:]]/ {
      depth = length($1)
      if (tolower($0) ~ /^#+[[:space:]]*(evolution note|correction|superseded|historical|amendment)/) {
        skip = 1; skipdepth = depth; next
      }
      if (skip && depth <= skipdepth) skip = 0
    }
    !skip { print }
  ' "$1"
}

echo "ADR ledger drift"
echo

# ---------------------------------------------------------------- code vs claim
echo "code vs claim"

# 1. ADR-001 decided SSE transport. Anchored to real symbols, never bare "sse".
adr001="$(ls "$ADR_DIR"/adr-001-*.md 2>/dev/null | head -1)"
if [ -n "$adr001" ] && ! adr_is_live "$adr001"; then
  ok "ADR-001 is $(adr_status "$adr001") -- a retired decision may contradict the code"
elif [ -n "$adr001" ] && adr_live_text "$adr001" | grep -qi 'sse'; then
  sse_hits=$( { grep -rl 'SSEServerTransport' src/ 2>/dev/null
                grep -rl 'sdk/server/sse' src/ 2>/dev/null
                grep -ril 'server-sent' src/ 2>/dev/null; } | sort -u | wc -l | tr -d ' ')
  stdio_hits=$(grep -rl 'StdioServerTransport' src/ 2>/dev/null | wc -l | tr -d ' ')
  if [ "$sse_hits" -eq 0 ] && [ "$stdio_hits" -gt 0 ]; then
    bad "ADR-001 [$(adr_status "$(ls "$ADR_DIR"/adr-001-*.md | head -1)")] decided SSE transport; 0 SSE symbols in src/, StdioServerTransport in $stdio_hits file(s)"
  else
    ok "ADR-001 transport claim matches the code"
  fi
fi

# 2. ADR-006 claims HCL / Dockerfile AST support; ADR-017 removed those grammars.
adr006="$(ls "$ADR_DIR"/adr-006-*.md 2>/dev/null | head -1)"
if [ -n "$adr006" ] && ! adr_is_live "$adr006"; then
  ok "ADR-006 is $(adr_status "$adr006") -- a retired decision may contradict the code"
elif [ -n "$adr006" ] && adr_live_text "$adr006" | grep -qiE 'hcl|dockerfile'; then
  have=$(node -e "const d=require('./package.json');const a={...d.dependencies,...d.devDependencies};console.log(['tree-sitter-hcl','tree-sitter-dockerfile'].filter(k=>a[k]).length)" 2>/dev/null || echo 0)
  if [ "$have" -eq 0 ]; then
    bad "ADR-006 claims HCL/Dockerfile AST support; neither grammar is a dependency"
  else
    ok "ADR-006 grammar claims match package.json"
  fi
fi

# 3. ADR-018a: "DON'T create orchestrator instances"
if grep -rqi "create orchestrator instances" "$ADR_DIR" 2>/dev/null; then
  # Exclude research-orchestrator.ts itself: a module constructing its own type
  # is not a consumer violating the rule. Counting it was a false positive.
  n=$(grep -rl 'new ResearchOrchestrator' src/ 2>/dev/null \
        | grep -v 'src/utils/research-orchestrator.ts' | wc -l | tr -d ' ')
  if [ "$n" -gt 0 ]; then
    bad "ADR-018a forbids creating orchestrator instances; $n source file(s) call new ResearchOrchestrator"
  else
    ok "no orchestrator instances constructed"
  fi
fi

# 4. ADR-019 (Vitest) migration checkboxes vs the migration being finished.
adr019="$(ls "$ADR_DIR"/adr-019-*.md 2>/dev/null | head -1)"
if [ -n "$adr019" ]; then
  unchecked=$(grep -cE '^- \[ \]' "$adr019" || true)
  jest=$(node -e "const d=require('./package.json');const a={...d.dependencies,...d.devDependencies};console.log(Object.keys(a).filter(k=>k.toLowerCase().includes('jest')).length)" 2>/dev/null || echo 0)
  if [ "$unchecked" -gt 0 ] && [ "$jest" -eq 0 ]; then
    bad "ADR-019 has $unchecked unchecked migration boxes, but no jest package remains -- it under-reports itself"
  else
    ok "ADR-019 checkboxes consistent with dependency state"
  fi
fi

# ------------------------------------------------------- ledger self-consistency
echo
echo "ledger self-consistency"

# 5. Index status vs file status.
for f in "$ADR_DIR"/adr-[0-9]*.md; do
  base="$(basename "$f")"; num="$(printf '%s' "$base" | sed -E 's/^adr-0*([0-9]+).*/\1/')"
  [ "${#num}" -gt 3 ] && continue                 # skip the 4-digit fixture, handled below
  padded="$(printf '%03d' "$num")"
  file_status="$(adr_status "$f")"
  [ -z "$file_status" ] && { bad "$base declares no parseable Status"; continue; }
  idx="$(grep -oE "\[ADR-$padded\][^|]*\|[^|]*\|[^|]*\|" "$ADR_DIR/README.md" 2>/dev/null | awk -F'|' '{print $3}' | sed 's/^ *//;s/ *$//' | head -1)"
  if [ -z "$idx" ]; then
    bad "ADR-$padded ($file_status) is missing from the README index"
  elif [ "${idx%% *}" != "${file_status%% *}" ]; then
    bad "ADR-$padded: index says '$idx', file says '$file_status'"
  fi
done

# 6. Duplicate ADR numbers.
# Globbing a normalised number back into a pattern is a trap: `adr-0*1-*.md`
# matches adr-011 and adr-021 as well as adr-001. Pair each file with its number
# and group, rather than re-globbing.
while IFS= read -r line; do
  num="${line%% *}"; files="${line#* }"
  bad "ADR-$num is claimed by more than one file: $files"
done < <(
  for f in "$ADR_DIR"/adr-[0-9]*.md; do
    b="$(basename "$f")"
    # Known fixtures are reported by their own check; do not double-count them.
    grep -q 'ADR_CONTENT_PLACEHOLDER' "$f" 2>/dev/null && continue
    printf '%03d %s\n' "$(printf '%s' "$b" | sed -E 's/^adr-0*([0-9]+).*/\1/')" "$b"
  done | awk '{m[$1]=m[$1]" "$2; c[$1]++} END{for(k in m) if(c[k]>1) print k m[k]}' | sort
)

# 7. Placeholder stubs written by adr-suggestion-tool.ts:1101 in prompt-only mode.
#    Must match a file that IS the placeholder, not one that MENTIONS it: ADR-022
#    discusses the bug in prose and was reported as a 5,616-byte "fixture" by the
#    first version of this check. Compare the whole body, whitespace stripped.
for f in "$ADR_DIR"/*.md; do
  body="$(tr -d '[:space:]' < "$f" 2>/dev/null)"
  if [ "$body" = "[ADR_CONTENT_PLACEHOLDER]" ]; then
    bad "$(basename "$f") is an unfilled placeholder stub ($(wc -c < "$f" | tr -d ' ') bytes), not an ADR"
  fi
done

# 8. Dangling file references from ADRs and from source @see comments.
while IFS= read -r ref; do
  [ -z "$ref" ] && continue
  [ -e "$ref" ] || bad "dangling reference: $ref"
done < <(
  grep -rhoE '/tmp/[A-Za-z0-9_./-]+\.md' "$ADR_DIR" 2>/dev/null | sort -u
  grep -rhoE '@see docs/[A-Za-z0-9_./-]+\.md' src/ 2>/dev/null | sed 's/@see //' | sort -u
)

# ------------------------------------------------------------------------ ratchet
echo
if [ ! -f "$BASELINE_FILE" ]; then
  echo "no $BASELINE_FILE; current drift is $drift"
  exit 0
fi
baseline="$(tr -d '[:space:]' < "$BASELINE_FILE")"
echo "drift: $drift   baseline: $baseline"

if [ "$drift" -gt "$baseline" ]; then
  echo
  echo "FAIL: ADR drift rose by $((drift - baseline))."
  echo "An ADR now contradicts the code, or the ledger contradicts itself, in a new way."
  echo "Fix it, or if the increase is deliberate raise $BASELINE_FILE in the same commit"
  echo "and say why."
  exit 1
fi

if [ "$drift" -lt "$baseline" ]; then
  echo
  echo "Drift fell to $drift. Lower $BASELINE_FILE to lock the gain in:"
  echo "    echo $drift > $BASELINE_FILE"
fi

echo "OK"
