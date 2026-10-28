# AGENTS.md

Instructions for coding agents that build changes in this repository (OpenCode, Claude Code
in a builder loop, or any harness that reads `AGENTS.md`). Project commands, architecture and
conventions are in [`CLAUDE.md`](CLAUDE.md); read it first.

This repo follows the [Invoice Exception Desk PLAYBOOK](https://raw.githubusercontent.com/tosin2013/invoice-exception-desk/main/PLAYBOOK.md):
a human rules on every change in a GitHub issue, a builder implements exactly that ruling,
checks the builder never saw grade it, and a human merges.

## When these rules apply

Only when you are working an issue labelled **`agent-ready`** (an "Agent ruling" issue). That
issue is the ruling: it answers every question you would otherwise guess. Without the label,
don't start.

## Builder rules

Inputs: `.specify/memory/constitution.md`, the ruling issue, and `specs/<NNN-feature>/spec.md`,
`plan.md` and `tasks.md`. A human approved them. Read them, every ADR listed in the spec's
`Governing Decisions` section (in `docs/adrs/`), and `ralph-memory.md` if it exists, before you
change anything. If a task would contradict an Accepted ADR, that's a `BLOCKED` stop (rule 6).

1. Work only in the feature folder you were given.
2. Take the first user story (phase) in `tasks.md` that still has unchecked tasks. Implement its
   tasks in order, dependencies first, non-`[P]` tasks before `[P]` ones. Work on that one story
   only.
3. Run the tests: `npm run typecheck && npm test`. If they fail, fix them within this story, at
   most 3 tries. Tick only the tasks whose tests pass; if none pass, tick nothing, commit
   nothing, end your turn.
4. Tick the completed tasks `[x]` in `tasks.md`, update `ralph-memory.md` and `progress.md`, and
   make one commit with the change, `tasks.md`, `ralph-memory.md` and `progress.md`. Then end
   your turn. Don't start the next story.
5. Never run `/speckit.specify`, `/speckit.clarify`, `/speckit.plan` or `/speckit.tasks`
   during a builder loop. Never edit `spec.md`, `plan.md` or the constitution. Don't add,
   reword or delete tasks.
6. If a task is unclear, conflicts with the spec, plan or ruling, or needs something that isn't
   done: don't guess and don't skip ahead. Append `BLOCKED: <task ID>: <question>` to
   `progress.md`, commit nothing, and end your turn.
7. Print `<promise>COMPLETE</promise>` on its own line only when every task is `[x]`, the tests
   pass and `git status --short --untracked-files=all` is empty.
8. Don't report sizes or counts. CI (`Acceptance Grader`) does that.

## Never touch

Stop rather than edit any of these, in addition to anything the ruling lists:

- `.github/`, `.specify/`, `.opencode/`, `.claude/`, `acceptance/`
- `AGENTS.md`, `CLAUDE.md`, `.repo-governor*`
- `docs/adrs/`: decisions are the owner's; a builder reads ADRs and never writes or edits them
- `package.json`, `package-lock.json`, `server.json`, `CHANGELOG.md`
- the grader's own files: `vitest.config.ts`, `vitest.acceptance.config.ts`,
  `scripts/check-base-test-ids.mjs`
- existing test files, except the exact edits the ruling allows

Never push, open PRs, or use credentials. A human or the operator does that.
