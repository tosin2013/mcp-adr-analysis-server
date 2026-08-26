## What and why

<!-- What changes, and what problem it solves. Link the issue: "Closes #123". -->

## How this was verified

<!--
Say what you actually ran, not what should pass. If you changed behaviour, the most
useful thing here is evidence it failed before and passes after.
-->

- [ ] `npm test` passes locally
- [ ] `npm run typecheck` is clean

## Before you open this

- [ ] Branch is not `main` — CONTRIBUTING.md asks for `feature/…` or `fix/…`
- [ ] Commits follow conventional format: `type(scope): description`
      (`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`) — this is
      validated automatically, so a non-conforming message will fail CI
- [ ] Docs updated if behaviour changed

## Ratchets that will run

Three checks only allow their numbers to **fall**, never rise. If CI reports one went
up, that is the check working — fix the increase rather than raising the baseline.

| check          | where                 | what it means                                     |
| -------------- | --------------------- | ------------------------------------------------- |
| coverage floor | `vitest.config.ts`    | statements/branches/functions/lines must not drop |
| test typecheck | `.tsc-test-baseline`  | type errors in `tests/` must not increase         |
| ADR drift      | `.adr-drift-baseline` | ADRs must not contradict the code in new ways     |

## If you touched an ADR

- [ ] `docs/adrs/README.md` index row matches the file's status — the drift check
      compares them and will fail if they diverge
- [ ] New ADRs use MADR front matter (ADR-022), including `tags:`

---

<!--
First time here? The useful starting points are issues labelled `good first issue`.
If something in this template is wrong or unclear, say so in the PR — that is a
valid contribution too.
-->
