#!/usr/bin/env python3
"""Import-graph walk behind scripts/check-dead-code.sh (#1540).

Emits tab-separated records: SCANNED, TOTAL, DEAD, or ABORT.
Kept as its own file rather than a heredoc inside a command substitution,
which bash 3.2 -- the version macOS ships -- mis-lexes.
"""

import os, re, sys, collections

SRC = os.path.abspath('src')
ENTRY = os.path.join(SRC, 'index.ts')

if not os.path.isfile(ENTRY):
    print("ABORT\tsrc/index.ts not found -- cannot root the reachability walk")
    sys.exit(0)

files = sorted(
    os.path.join(root, n)
    for root, _, names in os.walk(SRC)
    for n in names if n.endswith('.ts')
)
TESTS = os.path.abspath('tests')
test_files = sorted(
    os.path.join(root, n)
    for root, _, names in os.walk(TESTS)
    for n in names if n.endswith('.ts')
) if os.path.isdir(TESTS) else []
if not files:
    print("ABORT\tno .ts files found under src/ -- the walk matched nothing")
    sys.exit(0)

def resolve(spec, frm):
    """Relative specifiers only. Package imports cannot make a local file live."""
    if not spec.startswith('.'):
        return None
    base = os.path.normpath(os.path.join(os.path.dirname(frm), spec))
    candidates = [base, base + '.ts', os.path.join(base, 'index.ts')]
    if base.endswith('.js'):
        candidates.insert(1, base[:-3] + '.ts')
    for c in candidates:
        if c.endswith('.ts') and os.path.isfile(c):
            return c
    return None

# Four edge shapes, all of which make a module live:
#
#   from '...'          static import/export, including `export * from`
#   import('...')       dynamic import -- several modules here are reached
#                       only this way, and omitting it reports live code dead
#   require('...')      a CommonJS interop shim
#   import '...'        SIDE-EFFECT import, no bindings
#
# The last one was missing from the first version of this script, and the
# mutation check caught it: wiring an orphan into src/index.ts with a bare
# `import './x.js';` did not move the count. A graph that misses an edge shape
# reports live code as dead, which is the one error here that a revert does not
# always undo.
IMP = re.compile(r"""(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"]([^'"]+)['"]""")

edges = collections.defaultdict(set)
importers = collections.defaultdict(set)
for f in files:
    for spec in IMP.findall(open(f, encoding='utf-8').read()):
        t = resolve(spec, f)
        if t:
            edges[f].add(t)
            importers[t].add(f)

# Importers from tests/ are tracked separately and never make a module live.
# A module with a test suite and no caller is code the suite keeps green while
# nothing runs it -- which reads as coverage, and is not.
test_importers = collections.defaultdict(set)
for f in test_files:
    for spec in IMP.findall(open(f, encoding='utf-8').read()):
        t = resolve(spec, f)
        if t and t.startswith(SRC + os.sep):
            test_importers[t].add(f)

seen, stack = set(), [ENTRY]
while stack:
    cur = stack.pop()
    if cur in seen:
        continue
    seen.add(cur)
    stack.extend(edges[cur])

def lines(f):
    return sum(1 for _ in open(f, encoding='utf-8'))

root = os.path.dirname(SRC)
dead = sorted((f for f in files if f not in seen), key=lambda f: -lines(f))

print(f"SCANNED\t{len(files)}\t{sum(lines(f) for f in files)}")
print(f"TOTAL\t{len(dead)}\t{sum(lines(f) for f in dead)}")
for f in dead:
    n = len(test_importers[f])
    note = f"{n} test file{'s' if n != 1 else ''}, no caller" if n else "no test, no caller"
    print(f"DEAD\t{lines(f)}\t{os.path.relpath(f, root)}\t{note}")
