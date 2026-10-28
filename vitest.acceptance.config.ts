import { defineConfig } from 'vitest/config';
import base from './vitest.config';

// Runs only the grader's acceptance tests (acceptance/issue-<N>/). They are
// written from the ruling issue and added in a separate commit after the
// builder's work is sealed, so the main `include` deliberately never sees them.
// Spread rather than mergeConfig: mergeConfig concatenates `include`, which
// would run the whole tests/ suite again. Coverage thresholds belong to that
// suite, not to this run.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['acceptance/**/*.test.ts'],
    coverage: { ...base.test?.coverage, enabled: false },
  },
});
