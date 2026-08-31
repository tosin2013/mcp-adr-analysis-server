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
#
# #1469: entry points are enumerated from the installed package, not a MODULES
# array in this file. Sources:
#   - package.json main, bin, and exports
#   - static relative imports reachable from those (starting at dist/src/index.js)
#   - every shipped dist/src/**/*.js that imports a third-party package
# A declared entry missing from the tarball is STALE. An import that cannot
# resolve is a missing runtime dependency. Adding a fake list entry is not how
# this check is maintained.

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

PKG="$WORK/node_modules/mcp-adr-analysis-server"
REPORT="$WORK/entrypoints.json"

cat >"$WORK/enumerate.mjs" <<'ENUM'
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';

const pkgRoot = process.env.PKG;
const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));
const deps = new Set(Object.keys(pkg.dependencies || {}));
const builtins = new Set(
  builtinModules.flatMap(m => [m, `node:${m}`, `node:${m}/promises`, `${m}/promises`])
);

function pkgName(spec) {
  if (spec.startsWith('@')) {
    const parts = spec.split('/');
    return parts.slice(0, 2).join('/');
  }
  return spec.split('/')[0];
}

function isRelative(spec) {
  return spec.startsWith('./') || spec.startsWith('../') || spec === '.' || spec === '..';
}

function isBuiltin(spec) {
  if (builtins.has(spec)) return true;
  if (spec.startsWith('node:')) return true;
  return builtins.has(spec.split('/')[0]);
}

function declaredEntries() {
  const out = [];
  if (pkg.main) out.push(pkg.main);
  if (pkg.bin) {
    const bins = typeof pkg.bin === 'string' ? [pkg.bin] : Object.values(pkg.bin);
    out.push(...bins);
  }
  if (pkg.exports) {
    const walk = v => {
      if (typeof v === 'string') out.push(v);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(pkg.exports);
  }
  return [...new Set(out.map(p => p.replace(/^\.\//, '')))];
}

function* walkJs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkJs(p);
    else if (e.isFile() && e.name.endsWith('.js')) yield p;
  }
}

const FROM_RE = /^\s*(?:import|export)\b[^'"\n]*\bfrom\s+['"]([^'"]+)['"]/gm;
const BARE_IMPORT_RE = /^\s*import\s+['"]([^'"]+)['"]/gm;
const DYNAMIC_PKG_RE = /import\(\s*['"]((?![./])[^'"]+)['"]\s*\)/g;

function specifiers(file, { includeDynamicPackages = false } = {}) {
  const src = fs.readFileSync(file, 'utf8');
  const specs = [];
  for (const m of src.matchAll(FROM_RE)) specs.push(m[1]);
  for (const m of src.matchAll(BARE_IMPORT_RE)) specs.push(m[1]);
  if (includeDynamicPackages) {
    for (const m of src.matchAll(DYNAMIC_PKG_RE)) specs.push(m[1]);
  }
  return specs;
}

function resolveRelative(fromFile, spec) {
  let resolved = path.normalize(path.join(path.dirname(fromFile), spec));
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    resolved = path.join(resolved, 'index.js');
  } else if (!resolved.endsWith('.js')) {
    resolved += '.js';
  }
  return resolved;
}

function staticGraph(entryAbs) {
  const seen = new Set();
  const missing = [];
  const q = [entryAbs];
  while (q.length) {
    const f = q.pop();
    if (seen.has(f)) continue;
    if (!fs.existsSync(f)) {
      missing.push(path.relative(pkgRoot, f));
      continue;
    }
    seen.add(f);
    for (const spec of specifiers(f)) {
      if (isRelative(spec)) q.push(resolveRelative(f, spec));
    }
  }
  return { seen, missing };
}

const stale = [];
const modules = new Set();
const undeclared = [];

for (const rel of declaredEntries()) {
  const abs = path.join(pkgRoot, rel);
  if (!fs.existsSync(abs)) {
    stale.push(rel);
    continue;
  }
  modules.add(path.relative(pkgRoot, abs));
  const graph = staticGraph(abs);
  for (const m of graph.missing) stale.push(m);
  for (const f of graph.seen) modules.add(path.relative(pkgRoot, f));
}

const distSrc = path.join(pkgRoot, 'dist', 'src');
for (const abs of walkJs(distSrc)) {
  const rel = path.relative(pkgRoot, abs);
  for (const spec of specifiers(abs, { includeDynamicPackages: true })) {
    if (isRelative(spec) || isBuiltin(spec)) continue;
    const name = pkgName(spec);
    if (!deps.has(name)) {
      undeclared.push({ file: rel, spec, name });
    }
    modules.add(rel);
  }
}

const report = {
  stale: [...new Set(stale)].sort(),
  modules: [...modules].sort(),
  undeclared,
};
fs.writeFileSync(process.env.REPORT, JSON.stringify(report, null, 2));
console.log(
  `    ${report.modules.length} entry points, ${report.stale.length} stale, ${report.undeclared.length} undeclared`
);
ENUM

PKG="$PKG" REPORT="$REPORT" node "$WORK/enumerate.mjs"

export PKG REPORT
STALE=0
FAILED=0

STALE_COUNT="$(node --input-type=module -e 'import fs from "node:fs"; const r=JSON.parse(fs.readFileSync(process.env.REPORT,"utf8")); process.stdout.write(String(r.stale.length))')"
UNDECLARED_COUNT="$(node --input-type=module -e 'import fs from "node:fs"; const r=JSON.parse(fs.readFileSync(process.env.REPORT,"utf8")); process.stdout.write(String(r.undeclared.length))')"
MODULE_COUNT="$(node --input-type=module -e 'import fs from "node:fs"; const r=JSON.parse(fs.readFileSync(process.env.REPORT,"utf8")); process.stdout.write(String(r.modules.length))')"
mapfile -t STALE_PATHS < <(node --input-type=module -e 'import fs from "node:fs"; const r=JSON.parse(fs.readFileSync(process.env.REPORT,"utf8")); process.stdout.write(r.stale.join("\n"))')
mapfile -t MODULES < <(node --input-type=module -e 'import fs from "node:fs"; const r=JSON.parse(fs.readFileSync(process.env.REPORT,"utf8")); process.stdout.write(r.modules.join("\n"))')

if [ "$STALE_COUNT" -ne 0 ]; then
  echo
  echo "Declared entry points or static imports are missing from the package:"
  for m in "${STALE_PATHS[@]}"; do
    echo "    STALE $m -- enumerated but not in the package"
  done
  echo "That is a packaging hole, not a missing runtime dependency."
  STALE=1
fi

if [ "$UNDECLARED_COUNT" -ne 0 ]; then
  echo
  echo "Shipped modules import packages that are not in dependencies:"
  node --input-type=module -e '
    import fs from "node:fs";
    const r = JSON.parse(fs.readFileSync(process.env.REPORT, "utf8"));
    for (const u of r.undeclared) {
      console.log(`    ${u.file} imports ${u.spec} (package ${u.name})`);
    }
  '
  echo "Most likely a runtime dependency is declared under devDependencies."
  FAILED=1
fi

echo "==> Importing enumerated packaged entry points from the installed package"
for m in "${MODULES[@]}"; do
  if [ ! -f "$PKG/$m" ]; then
    echo "    STALE $m -- enumerated but not in the package"
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
  echo "An enumerated entry is not in the package."
  echo "If it was deliberately removed, the package.json main/bin/exports or a"
  echo "static import still names it. That is not a missing-dependency failure."
  exit 1
fi

if [ "$FAILED" -ne 0 ]; then
  echo
  echo "The packaged artifact cannot resolve one or more imports."
  echo "Most likely a runtime dependency is declared under devDependencies."
  exit 1
fi

echo "==> Packaged artifact imports cleanly ($MODULE_COUNT entry points)"
