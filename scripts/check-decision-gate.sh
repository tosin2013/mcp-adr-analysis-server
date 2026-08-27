#!/usr/bin/env bash
#
# Exit gate for the "Record the outstanding dispositions" milestone (#1485).
#
# Every milestone in this repository has so far closed on judgement. Milestone 1
# stayed open 114 days past its due date while the product shipped four minor
# versions past its name, and nothing noticed. This milestone closes on an exit
# code instead.
#
# WRITTEN RED, DELIBERATELY. On the commit that introduced it this script exits
# non-zero, and every assertion below was confirmed to fail before any fix
# landed. That ordering is the whole point: `publish.yml` has a "Verify NPM
# dist-tags" step (publish.yml:524) that sits in the same job as the test which
# aborts before reaching it, so it can only ever run after publishing already
# worked. It was written for #787 in April, and #787's recurrence went ten
# releases undetected in August. A check authored after the work is a check that
# cannot fail.
#
# WHAT THIS IS NOT. This is not a ratchet. check-adr-drift.sh counts drift and
# permits the count to fall but never rise, because reconciling a ledger is
# mostly human judgement and demanding zero would gate the check behind work
# that never happens. Here the opposite holds: each assertion names one issue
# with a definite end state, so partial credit would be meaningless. All pass or
# the milestone is not done.
#
# TWO TRAPS, INHERITED FROM check-adr-drift.sh BECAUSE BOTH ALREADY BIT US
#
#   1. Substring matching. `grep -i sse src/` returns 103 hits here: assessment,
#      assessed, classes. That is exactly how CI came to assert a tool named
#      `analyze_project` that has never existed -- it matched
#      `analyze_project_ecosystem`. Every pattern below is anchored to an exact
#      string, a jq path, or a git exit code.
#
#   2. Passing on a broken tree. An assertion that is green on a known-broken
#      tree is worse than no assertion, because it launders the breakage as
#      verified. Run this against the commit before each fix and confirm the
#      relevant line reports FAIL.
#
# A THIRD TRAP THIS ONE INTRODUCES. Several assertions are absence checks --
# "this false sentence is gone". An absence check passes trivially if the file
# is renamed or deleted, so every one of them first asserts the file exists.
# Without that, deleting ADR-021 would turn this gate green.
#
# NOT IN CI, AND NOT BY OVERSIGHT. Wiring this into lint.yml today would fail
# every pull request for reasons unrelated to that pull request -- it reports on
# a milestone's completeness, not on a diff's correctness. That is a different
# job from check-adr-drift.sh, which is a per-commit ratchet and belongs in CI.
# Run this by hand:
#
#     bash scripts/check-decision-gate.sh
#
# Once the milestone closes and this goes green, wiring it into CI becomes
# worthwhile -- at that point it stops being a to-do list and starts being a
# regression guard against a recorded decision being quietly un-recorded.
#
# EVERY ASSERTION HERE WAS PROVEN TO FLIP IN BOTH DIRECTIONS before this landed,
# not merely observed to fail. Two reported PASS on the first run against the
# uncorrected tree and were wrong to; see the #1486 and #1489 comments below for
# what each was actually matching.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

fail=0
checked=0

pass() { printf "  \033[32mPASS\033[0m %s\n" "$1"; checked=$((checked + 1)); }
bad()  { printf "  \033[31mFAIL\033[0m %s\n" "$1"; checked=$((checked + 1)); fail=$((fail + 1)); }

# Absence assertions must not pass by the file having vanished.
have() {
  if [ -f "$1" ]; then return 0; fi
  bad "$2 -- file missing entirely: $1"
  return 1
}

echo "Decision gate -- milestone 4, 'Record the outstanding dispositions'"
echo

# --------------------------------------------------------------- ADR-023 (#1490, #1486)
ADR023="docs/adrs/adr-023-tool-surface-scope.md"

if have "$ADR023" "ADR-023 Decision recorded"; then
  if grep -q "Not yet recorded" "$ADR023"; then
    bad "ADR-023 #1490: '## Decision' still reads '_Not yet recorded._'"
  else
    pass "ADR-023 #1490: Decision recorded"
  fi

  # #1486. The premise the whole REVIEW deferral rests on, and it is false:
  # knowledge-graph-manager.ts:406-416 computes a complete per-tool count map.
  #
  # NEWLINE-NORMALISED, and that is not fussiness. The sentence wraps in the
  # source -- "Nothing in `src/`" ends one line and "records which tools are
  # actually called" begins the next -- so a line-oriented grep never matches
  # and this assertion reported PASS against the uncorrected file on its first
  # run. A prose assertion must not depend on where the author's editor wrapped.
  if tr '\n' ' ' < "$ADR023" | tr -s ' ' \
       | grep -qF 'Nothing in `src/` records which tools are actually called'; then
    bad "ADR-023 #1486: still claims nothing in src/ records tool calls"
  else
    pass "ADR-023 #1486: false usage-data premise corrected"
  fi

  # A Decision without Consequences is half a record. ADR-023 ships with
  # "To be completed once the decision is recorded" as a placeholder.
  if grep -q "To be completed once the decision is recorded" "$ADR023"; then
    bad "ADR-023 #1490: '## Consequences' is still the placeholder"
  else
    pass "ADR-023 #1490: Consequences completed"
  fi

  if grep -qE '^status: accepted' "$ADR023"; then
    pass "ADR-023 #1490: status is accepted"
  else
    bad "ADR-023 #1490: frontmatter status is not 'accepted'"
  fi
fi

# --------------------------------------------------------------------- ADR-022 (#1493)
ADR022="docs/adrs/adr-022-adopt-madr-format.md"
if have "$ADR022" "ADR-022 promoted"; then
  if grep -qE '^status: accepted' "$ADR022"; then
    pass "ADR-022 #1493: status is accepted"
  else
    bad "ADR-022 #1493: Decision Outcome is written but status is still 'proposed'"
  fi
fi

# ------------------------------------------------------------- ADR-021 (#1491, #1492)
ADR021="docs/adrs/adr-021-ai-layer-disposition.md"
if have "$ADR021" "ADR-021 Confirmation honest"; then
  # ADR-021 is ACCEPTED and lists this under a heading reading "Verifiable now".
  # It is false: the manifest binds five providers and retirement is not one.
  # ADR-021's own driver #4 calls this binding "required for options B and C",
  # and B is what was accepted -- so the accepted option's precondition is unmet
  # while the ADR records it as satisfied.
  #
  # This assertion is satisfied EITHER by moving the claim out of "Verifiable
  # now" (#1491) OR by the binding below making it true (#1492). It is written
  # as "claim present => binding must exist", not as "claim must be absent",
  # because the end state after #1492 is the claim present and true.
  if grep -qF "A retirement provider is bound" "$ADR021"; then
    if [ -f .repo-governor.json ] && jq -e '.providers.retirement' .repo-governor.json >/dev/null 2>&1; then
      pass "ADR-021 #1492: claims a retirement binding, and one exists"
    else
      bad "ADR-021 #1491: claims a retirement binding under 'Verifiable now'; none is bound"
    fi
  else
    pass "ADR-021 #1491: no unbacked retirement-binding claim"
  fi
fi

# ------------------------------------------------------- governance manifest (#1492)
# The manifest is currently UNTRACKED -- it exists on one machine, so no reviewer
# can check what is bound and nobody else can run the engine against this repo.
if git ls-files --error-unmatch .repo-governor.json >/dev/null 2>&1; then
  pass "#1492: .repo-governor.json is tracked by git"
else
  bad "#1492: .repo-governor.json is untracked -- governance exists on one machine only"
fi

if [ -f .repo-governor.json ] && jq -e '.providers.retirement' .repo-governor.json >/dev/null 2>&1; then
  pass "#1492: a retirement provider is bound"
else
  bad "#1492: no retirement provider bound (INV-013) -- blocks every removal under ADR-021 option B"
fi

# ------------------------------------------------------------------------ PRD (#1494)
PRD="docs/planning/PRD-v3.0-tool-registry-and-ai-layer.md"
if have "$PRD" "v3.0 PRD superseded"; then
  # Status: Draft, no supersession marker, and its stated authority (#741) is
  # closed NOT_PLANNED. A reader arriving here follows an ordering both ADRs
  # have since reversed. Anchored to the Status line, not a bare "superseded"
  # anywhere in 303 lines of prose.
  if grep -qiE '^\*{0,2}Status:?\*{0,2}:? *\*{0,2}Superseded' "$PRD"; then
    pass "#1494: PRD marked Superseded"
  else
    bad "#1494: PRD Status is not Superseded (its authority #741 is closed NOT_PLANNED)"
  fi
fi

# ------------------------------------------------- usage instrumentation (#1488, #1489)
KG="src/utils/knowledge-graph-manager.ts"
if have "$KG" "usage evidence persisted"; then
  # The complete per-tool count Map is built at :406-416 and then truncated to
  # ten entries BEFORE persisting. Every cluster ADR-023 defers -- memory (6),
  # workflow (5), research (4) -- falls beyond that cut.
  if grep -qF 'slice(0, 10)' "$KG"; then
    bad "#1488: mostUsedTools truncated by slice(0, 10) before persistence"
  else
    pass "#1488: full per-tool count map persisted"
  fi

  # os.tmpdir() is wiped by OS temp cleanup and never survives a reboot, which
  # is almost certainly why ADR-023's author found no usage data. config.ts:17
  # already defines a project-local .mcp-adr-cache for this.
  #
  # ASSERTS THE WRITE TARGET, not the absence of the string. The first version
  # of this check was `! grep -qF 'os.tmpdir()'`, which is a false positive on a
  # read-only migration path -- and on a comment explaining the fix. Migrating
  # the existing store is worth doing (there was 96KB of real knowledge-graph
  # state in tmpdir when #1488 landed), so the check has to distinguish "reads
  # the old location once" from "persists there". Two conditions, both required:
  #
  #   1. cacheDir is assigned from getCacheDirectoryPath() -- the positive form,
  #      which a bare absence check never had, so deleting the line entirely
  #      used to pass.
  #   2. every remaining os.tmpdir() mention is confined to a `legacy` binding.
  #
  # This is strictly stronger than what it replaces. It is also me editing my own
  # gate, which is the move this milestone exists to prevent -- so it is recorded
  # here rather than done quietly, and it tightened the assertion, not loosened it.
  kg_writes_project_cache=0
  grep -qE 'this\.cacheDir *= *getCacheDirectoryPath\(' "$KG" && kg_writes_project_cache=1
  # Comment forms stripped: //, /*, /**, and continuation *. An earlier version
  # listed only `*` and `//` and therefore flagged a JSDoc line opening `/**`,
  # which is a comment describing the migration -- prose, not persistence.
  kg_stray_tmpdir="$(grep -n 'os\.tmpdir()' "$KG" \
      | grep -vi 'legacy' \
      | grep -vE '^[0-9]+: *(/\*+|\*|//)' || true)"

  if [ "$kg_writes_project_cache" -eq 1 ] && [ -z "$kg_stray_tmpdir" ]; then
    pass "#1488: knowledge graph persists to the project-local cache"
  elif [ "$kg_writes_project_cache" -ne 1 ]; then
    bad "#1488: cacheDir is not assigned from getCacheDirectoryPath()"
  else
    bad "#1488: os.tmpdir() used outside a legacy-migration binding: ${kg_stray_tmpdir%%$'\n'*}"
  fi
fi

# #1489 is behavioural and cannot be grepped: in CE-MCP mode src/index.ts:3875-3888
# returns the directive before the dispatch switch and before trackToolExecution at
# :4201, so all 12 CE_MCP_DIRECTIVE_TOOLS are unrecorded. What is checkable here is
# that a test exists which would catch a regression; the test itself asserts behaviour.
#
# The discriminator is `trackToolExecution`, NOT `CE_MCP_DIRECTIVE_TOOLS`. The
# first version of this assertion grepped for the latter and reported PASS,
# because tests/tools/ce-mcp-directives.test.ts legitimately imports it -- that
# file tests whether each tool RETURNS a directive, which is a different fact
# entirely and would not catch this bug. Zero test files reference
# trackToolExecution today, so requiring both names together is unambiguous.
if grep -rl 'trackToolExecution' tests/ 2>/dev/null | xargs -r grep -lF 'CE_MCP' 2>/dev/null | grep -q .; then
  pass "#1489: a test covers trackToolExecution on the CE-MCP path"
else
  bad "#1489: no test covers usage tracking on the CE-MCP directive path"
fi

# ----------------------------------------------------------------- ledger (#1415, ...)
# Delegated, not duplicated. check-adr-drift.sh is the ratchet; this gate only
# requires that it still passes, so recording decisions cannot be paid for by
# introducing new drift.
if bash scripts/check-adr-drift.sh >/dev/null 2>&1; then
  pass "#1415: check-adr-drift.sh at or below baseline"
else
  bad "#1415: check-adr-drift.sh reports drift above baseline"
fi

# ------------------------------------------------------------------------------ result
echo
echo "checked: $checked   failing: $fail"

if [ "$fail" -gt 0 ]; then
  cat <<'MSG'

The decision milestone is not done.

Each FAIL above names the issue that closes it. Nothing here is a feature: every
one is satisfied by making a file say what is already true, or by making true a
claim a file already asserts.

This script is EXPECTED to fail until that milestone closes. If you are seeing
this on the commit that added it, that is the design -- see the header.
MSG
  exit 1
fi

echo
echo "OK -- every disposition is recorded."
