#!/usr/bin/env node
// Fails if any test that exists on the PR's base commit is missing from its head.
//
// Usage: node scripts/check-base-test-ids.mjs <base.json> <head.json> <base-root> <head-root>
// Inputs are `vitest list --json=<file>` outputs. File paths are absolute, so each
// list is made relative to its own checkout before comparing.
//
// Known limit (PLAYBOOK §10): this proves a test still EXISTS, not that its body
// is unchanged. A weakened test with the same name passes. PRs that touch existing
// tests still need a review against the ruling's "allowed test edits".
import { readFileSync, appendFileSync } from 'node:fs';
import { relative } from 'node:path';

const [basePath, headPath, baseRoot, headRoot] = process.argv.slice(2);
if (!headRoot) {
  console.error('usage: check-base-test-ids.mjs <base.json> <head.json> <base-root> <head-root>');
  process.exit(2);
}

const ids = (path, root) =>
  new Set(
    JSON.parse(readFileSync(path, 'utf8')).map(t => `${relative(root, t.file)} :: ${t.name}`)
  );

const base = ids(basePath, baseRoot);
const head = ids(headPath, headRoot);
const missing = [...base].filter(id => !head.has(id)).sort();

const lines = [
  '### Base test IDs',
  `- base: ${base.size}, head: ${head.size}, missing from head: ${missing.length}`,
  ...missing.map(id => `  - \`${id}\``),
];
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
}

if (missing.length > 0) {
  console.error(
    `\n${missing.length} base test(s) were removed or renamed. If the ruling allows it, say so in the PR and get a human review.`
  );
  process.exit(1);
}
