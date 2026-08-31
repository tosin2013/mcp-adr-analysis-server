import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExec = vi.fn();
const mockExecFile = vi.fn();

vi.mock('node:child_process', () => {
  const promisifiedExec = (...args: unknown[]) => mockExec(...args);
  const promisifiedExecFile = (...args: unknown[]) => mockExecFile(...args);

  const rawExec = Object.assign(
    (..._args: unknown[]) => {
      /* noop */
    },
    { __promisified__: promisifiedExec }
  );
  const rawExecFile = Object.assign(
    (..._args: unknown[]) => {
      /* noop */
    },
    { __promisified__: promisifiedExecFile }
  );

  return { exec: rawExec, execFile: rawExecFile };
});

vi.mock('util', async importOriginal => {
  const orig = (await importOriginal()) as Record<string, unknown>;
  return {
    ...orig,
    promisify: (fn: unknown) => {
      if (fn && typeof fn === 'function' && '__promisified__' in fn) {
        return (fn as { __promisified__: unknown }).__promisified__;
      }
      return (orig.promisify as (fn: unknown) => unknown)(fn);
    },
  };
});

import {
  searchWithRipgrep,
  searchWithRipgrepDetailed,
  isRipgrepAvailable,
  getRipgrepVersion,
} from '../../src/utils/ripgrep-wrapper.js';

describe('ripgrep-wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExec.mockResolvedValue({ stdout: 'ripgrep 14.1.0', stderr: '' });
  });

  describe('isRipgrepAvailable', () => {
    it('returns true when rg is installed', async () => {
      expect(await isRipgrepAvailable()).toBe(true);
    });

    it('returns false when rg is missing', async () => {
      mockExec.mockRejectedValue(new Error('not found'));
      expect(await isRipgrepAvailable()).toBe(false);
    });
  });

  describe('getRipgrepVersion', () => {
    it('returns version string', async () => {
      expect(await getRipgrepVersion()).toBe('14.1.0');
    });

    it('returns null when rg is missing', async () => {
      mockExec.mockRejectedValue(new Error('not found'));
      expect(await getRipgrepVersion()).toBeNull();
    });
  });

  describe('searchWithRipgrep', () => {
    it('returns file paths from rg output', async () => {
      mockExecFile.mockResolvedValue({
        stdout: 'src/foo.ts\nsrc/bar.ts\n',
        stderr: '',
      });

      const results = await searchWithRipgrep({ pattern: 'hello', path: '/project' });
      expect(results).toEqual(['src/foo.ts', 'src/bar.ts']);

      const callArgs = mockExecFile.mock.calls[0];
      expect(callArgs[0]).toBe('rg');
      const args: string[] = callArgs[1];
      expect(args).toContain('--files-with-matches');
      expect(args).toContain('--no-heading');
      expect(args.slice(-2)).toEqual(['hello', '/project']);
    });

    it('passes --no-ignore when gitignore is false', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      await searchWithRipgrep({ pattern: 'x', path: '/p', gitignore: false });
      const args: string[] = mockExecFile.mock.calls[0][1];
      expect(args).toContain('--no-ignore');
    });

    it('passes --max-count with value', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      await searchWithRipgrep({ pattern: 'x', path: '/p', maxMatches: 5 });
      const args: string[] = mockExecFile.mock.calls[0][1];
      const idx = args.indexOf('--max-count');
      expect(idx).toBeGreaterThan(-1);
      expect(args[idx + 1]).toBe('5');
    });

    it('passes --type for each comma-separated file type', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      await searchWithRipgrep({ pattern: 'x', path: '/p', fileType: 'ts,js' });
      const args: string[] = mockExecFile.mock.calls[0][1];
      const typeIndices = args.reduce<number[]>(
        (acc, a, i) => (a === '--type' ? [...acc, i] : acc),
        []
      );
      expect(typeIndices).toHaveLength(2);
      expect(args[typeIndices[0] + 1]).toBe('ts');
      expect(args[typeIndices[1] + 1]).toBe('js');
    });

    it('passes --ignore-case when caseInsensitive', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      await searchWithRipgrep({ pattern: 'x', path: '/p', caseInsensitive: true });
      const args: string[] = mockExecFile.mock.calls[0][1];
      expect(args).toContain('--ignore-case');
    });

    it('passes --glob for include and exclude globs', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      await searchWithRipgrep({
        pattern: 'x',
        path: '/p',
        glob: '*.ts',
        excludeGlob: '*.test.ts',
      });
      const args: string[] = mockExecFile.mock.calls[0][1];
      expect(args).toContain('--glob');
      expect(args[args.indexOf('--glob') + 1]).toBe('*.ts');
      const secondGlob = args.indexOf('--glob', args.indexOf('--glob') + 1);
      expect(args[secondGlob + 1]).toBe('!*.test.ts');
    });

    it('returns empty array when exit code is 1 (no matches)', async () => {
      const err = new Error('exit 1') as Error & { code: number };
      err.code = 1;
      mockExecFile.mockRejectedValue(err);
      const results = await searchWithRipgrep({ pattern: 'nope', path: '/p' });
      expect(results).toEqual([]);
    });

    it('returns empty array when ripgrep is unavailable', async () => {
      mockExec.mockRejectedValue(new Error('not found'));
      const results = await searchWithRipgrep({ pattern: 'x', path: '/p' });
      expect(results).toEqual([]);
    });

    it('throws FileSystemError on unexpected errors', async () => {
      mockExecFile.mockRejectedValue(new Error('disk full'));
      await expect(searchWithRipgrep({ pattern: 'x', path: '/p' })).rejects.toThrow(
        'Ripgrep search failed'
      );
    });
  });

  describe('searchWithRipgrepDetailed', () => {
    it('parses JSON match output', async () => {
      const jsonLine = JSON.stringify({
        type: 'match',
        data: {
          path: { text: 'src/foo.ts' },
          lines: { text: 'const hello = 1;' },
          line_number: 42,
          absolute_offset: 5,
        },
      });
      mockExecFile.mockResolvedValue({ stdout: jsonLine + '\n', stderr: '' });

      const results = await searchWithRipgrepDetailed({ pattern: 'hello', path: '/p' });
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        file: 'src/foo.ts',
        match: 'const hello = 1;',
        line: 42,
        column: 5,
      });
    });

    it('builds correct argv with all options', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      await searchWithRipgrepDetailed({
        pattern: 'x',
        path: '/p',
        gitignore: false,
        maxMatches: 3,
        fileType: 'py',
        caseInsensitive: true,
        includeLineNumbers: true,
        contextBefore: 2,
        contextAfter: 2,
        glob: '*.py',
        excludeGlob: 'test_*',
      });
      const args: string[] = mockExecFile.mock.calls[0][1];
      expect(args).toContain('--json');
      expect(args).toContain('--no-ignore');
      expect(args).toContain('--ignore-case');
      expect(args).toContain('--line-number');
      expect(args).toContain('--column');
      expect(args[args.indexOf('--max-count') + 1]).toBe('3');
      expect(args[args.indexOf('--before-context') + 1]).toBe('2');
      expect(args[args.indexOf('--after-context') + 1]).toBe('2');
      expect(args.slice(-2)).toEqual(['x', '/p']);
    });

    it('returns empty on exit code 1', async () => {
      const err = new Error('exit 1') as Error & { code: number };
      err.code = 1;
      mockExecFile.mockRejectedValue(err);
      const results = await searchWithRipgrepDetailed({ pattern: 'nope', path: '/p' });
      expect(results).toEqual([]);
    });

    it('skips non-match JSON lines', async () => {
      const lines = [
        JSON.stringify({ type: 'begin', data: { path: { text: 'foo.ts' } } }),
        JSON.stringify({
          type: 'match',
          data: {
            path: { text: 'foo.ts' },
            lines: { text: 'hit' },
            line_number: 1,
            absolute_offset: 0,
          },
        }),
        JSON.stringify({ type: 'end', data: { path: { text: 'foo.ts' } } }),
      ].join('\n');
      mockExecFile.mockResolvedValue({ stdout: lines, stderr: '' });

      const results = await searchWithRipgrepDetailed({ pattern: 'hit', path: '/p' });
      expect(results).toHaveLength(1);
    });

    it('returns empty when ripgrep is unavailable', async () => {
      mockExec.mockRejectedValue(new Error('not found'));
      const results = await searchWithRipgrepDetailed({ pattern: 'x', path: '/p' });
      expect(results).toEqual([]);
    });

    it('throws on unexpected errors', async () => {
      mockExecFile.mockRejectedValue(new Error('boom'));
      await expect(searchWithRipgrepDetailed({ pattern: 'x', path: '/p' })).rejects.toThrow(
        'Ripgrep detailed search failed'
      );
    });
  });
});
