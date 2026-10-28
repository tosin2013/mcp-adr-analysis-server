#!/usr/bin/env python3
"""Drift check between ROADMAP.md and specs/NNN-*/ (PLAYBOOK: "PM: plan the roadmap first").

Drift findings are WARNINGS (exit 0). Execution errors are ERRORS (exit 1): the check could not
inspect something, so the result is UNKNOWN, never clean.

Drift checks (warnings):
  1. every specs/NNN-* dir on an inspected branch is referenced by a row, or listed under
     "Specs outside this roadmap";
  2. every row at specified, building or done names spec dirs that exist on the named branch;
  3. every done row has an evidence link (a PR: "PR #N" or .../pull/N, or a commit: .../commit/<sha>);
     a done row may have Spec dir "— (pre-Spec Kit)" instead of a spec dir if it has a commit link;
  4. status is one of planned|specified|building|blocked|done|dropped; blocked and dropped carry a
     reason after the status ("blocked — <reason>");
  5. "Depends on" names known IDs; a row (other than a dropped one) that depends on a dropped row
     is flagged, because a dropped dependency is not satisfied and the row needs re-planning.
It checks that evidence is PRESENT. It never decides that a row is done: acceptance of the whole
row is a human review, and this script does not read it.

Branches: a spec dir may be branch-qualified, "l5-setup:specs/003-desk-import/". The branch is
resolved to origin/<branch> first, then a local <branch>, and the resolved commit SHA is printed.
An unqualified "specs/NNN-x/" is read from the COMMITTED tree at HEAD with `git ls-tree` (uncommitted
spec dirs are not seen), and HEAD's SHA is printed. ROADMAP.md itself is read from the path given, which
may include uncommitted edits. A named branch that can't be resolved is an ERROR (not "missing spec"),
including a branch that doesn't exist yet: fetch it (CI uses fetch-depth: 0), fix the name, or leave a
planned row's Spec dir unset until its spec exists.

Standard library only; no network; read-only.
"""
import re
import subprocess
import sys

STATUSES = {"planned", "specified", "building", "blocked", "done", "dropped"}
NEEDS_SPEC = {"specified", "building", "done"}
NEEDS_REASON = {"blocked", "dropped"}
QUALIFIED = re.compile(r"([A-Za-z0-9._/-]+?):(specs/\d{3}-[A-Za-z0-9._-]+)")
BARE = re.compile(r"(?<![\w/:.-])(specs/\d{3}-[A-Za-z0-9._-]+)")
PR_LINK = re.compile(r"\bPR #\d+|/pull/\d+")
COMMIT_LINK = re.compile(r"/commit/[0-9a-f]{7,40}\b")
PRE_SPEC_KIT = re.compile(r"^[—-]\s*\(pre-spec kit\)$", re.I)
ROW_ID = re.compile(r"\bR\d+\b")
SPEC_DIR_NAME = re.compile(r"^specs/\d{3}-")
REQUIRED_COLS = ["id", "status", "spec dir", "issue / pr", "depends on"]

FILE = "ROADMAP.md"
WARNINGS = 0
ERRORS = 0


class CheckError(Exception):
    pass


def warn(msg, line=None):
    global WARNINGS
    WARNINGS += 1
    loc = f" file={FILE},line={line}" if line else f" file={FILE}"
    print(f"::warning{loc}::{msg}")


def error(msg, line=None):
    global ERRORS
    ERRORS += 1
    loc = f" file={FILE},line={line}" if line else f" file={FILE}"
    print(f"::error{loc}::ERROR (result UNKNOWN): {msg}")


def git(*args):
    try:
        r = subprocess.run(["git", *args], capture_output=True, text=True)
    except OSError as exc:
        raise CheckError(f"git could not run: {exc}")
    return r.returncode, r.stdout, r.stderr.strip()


def resolve(branch):
    """(ref, sha) for a branch name, or None if it can't be resolved."""
    for ref in (f"origin/{branch}", branch):
        rc, out, _ = git("rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}")
        if rc == 0 and out.strip():
            return ref, out.strip()
    return None


def spec_dirs_at(sha):
    rc, out, err = git("ls-tree", "-d", "--name-only", sha, "specs/")
    if rc != 0:
        raise CheckError(f"git ls-tree {sha[:12]} specs/ failed: {err}")
    return {d for d in out.split() if SPEC_DIR_NAME.match(d)}


def refs_in(text):
    found = [(b, d) for b, d in QUALIFIED.findall(text)]
    found += [(None, d) for d in BARE.findall(QUALIFIED.sub("", text))]
    return found


def split_row(line):
    # Pipes inside `code` are not used in ROADMAP.md tables; a plain split is enough.
    return [c.strip() for c in line.strip().strip("|").split("|")]


def parse(path):
    try:
        lines = open(path, encoding="utf-8").read().splitlines()
    except OSError as exc:
        raise CheckError(f"can't read {path}: {exc}")
    header, rows, accounted, outside = None, [], set(), False
    for n, line in enumerate(lines, 1):
        if line.startswith("#"):
            outside = "specs outside this roadmap" in line.lower()
        if outside:
            accounted.update(refs_in(line))
        if not line.startswith("|"):
            if not line.strip():
                header = None
            continue
        cells = split_row(line)
        if header is None:
            header = [c.lower() for c in cells]
            continue
        if all(set(c) <= set("-: ") for c in cells):
            continue
        if not all(c in header for c in REQUIRED_COLS):
            continue
        if len(cells) != len(header):
            raise CheckError(f"line {n}: row has {len(cells)} cells, header has {len(header)}")
        rows.append((n, dict(zip(header, cells))))
    if not rows:
        raise CheckError(f"no roadmap table with columns {', '.join(REQUIRED_COLS)} in {path}")
    return rows, accounted


def main(path="ROADMAP.md"):
    global FILE
    FILE = path
    rows, accounted = parse(path)

    rc, head, err = git("rev-parse", "HEAD")
    if rc != 0:
        raise CheckError(f"git rev-parse HEAD failed: {err}")
    head = head.strip()
    print(f"inspected: committed tree at HEAD @ {head} (unqualified spec dirs; ROADMAP.md read from {path})")

    named = set()
    for _, row in rows:
        named.update(b for b, _ in refs_in(row.get("spec dir", "")) if b)
    named.update(b for b, _ in accounted if b)
    existing = {None: spec_dirs_at(head)}
    unreadable = set()
    for b in sorted(named):
        r = resolve(b)
        if r is None:
            unreadable.add(b)
            error(f"branch '{b}' can't be resolved (not origin/{b} or a local branch); "
                  f"its spec dirs were NOT checked")
            continue
        ref, sha = r
        existing[b] = spec_dirs_at(sha)
        print(f"inspected: branch {b} -> {ref} @ {sha} ({len(existing[b])} spec dirs)")

    def first_word(cell):
        words = cell.strip("` ").split()
        return words[0].strip("`").lower() if words else ""

    status_of = {row.get("id", ""): first_word(row.get("status", "")) for _, row in rows}

    done_with_evidence = 0
    for n, row in rows:
        rid = row.get("id", "?")
        raw = row.get("status", "").strip()
        status = status_of.get(rid, "")
        note = raw[len(status):].strip(" `—-:;") if status else ""
        if status not in STATUSES:
            warn(f"{rid}: status '{raw}' is not one of {'|'.join(sorted(STATUSES))}", n)
        if status in NEEDS_REASON and not note:
            warn(f"{rid} is '{status}' with no reason (write '{status} — <reason>')", n)

        for dep in ROW_ID.findall(row.get("depends on", "")):
            if dep not in status_of:
                warn(f"{rid} depends on {dep}, which is not a row", n)
            elif status_of[dep] == "dropped" and status != "dropped":
                warn(f"{rid} is '{status}' but depends on {dep}, which is dropped (not satisfied)", n)

        dirs = refs_in(row.get("spec dir", ""))
        accounted.update(dirs)
        evidence = row.get("issue / pr", "")
        has_commit = bool(COMMIT_LINK.search(evidence))
        has_pr = bool(PR_LINK.search(evidence))
        pre_spec_kit = (status == "done" and not dirs and has_commit
                        and PRE_SPEC_KIT.match(row.get("spec dir", "").strip()))
        if status in NEEDS_SPEC and not pre_spec_kit:
            if not dirs:
                warn(f"{rid} is '{status}' but names no spec dir", n)
            for b, d in dirs:
                if b in unreadable:
                    continue  # already reported as an ERROR; never reported as missing
                if d not in existing[b]:
                    where = f"branch {b}" if b else "the committed tree at HEAD"
                    warn(f"{rid}: spec dir {d} does not exist on {where}", n)
        if status == "done":
            if has_pr or has_commit:
                done_with_evidence += 1
            else:
                warn(f"{rid} is 'done' but has no PR or commit link in Issue / PR", n)

    for b, have in existing.items():
        for d in sorted(have):
            if (b, d) not in accounted:
                where = f"{b}:{d}" if b else d
                warn(f"{where} has no ROADMAP row (add one, or list it under 'Specs outside this roadmap')")

    print(f"rows: {len(rows)}; done rows with an evidence link: {done_with_evidence} "
          f"(evidence presence only; whole-row acceptance is a human review, not checked here)")


if __name__ == "__main__":
    try:
        main(*sys.argv[1:2])
    except CheckError as exc:
        error(str(exc))
    except Exception as exc:  # any crash is an execution error, never a clean result
        error(f"checker crashed: {type(exc).__name__}: {exc}")
    if ERRORS:
        print(f"RESULT: ERROR — {ERRORS} error(s), {WARNINGS} warning(s); the check did not complete, result UNKNOWN")
        sys.exit(1)
    print(f"RESULT: {'CLEAN' if WARNINGS == 0 else 'DRIFT'} — {WARNINGS} warning(s), 0 errors")
    sys.exit(0)
