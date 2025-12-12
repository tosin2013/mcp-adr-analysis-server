/**
 * Mock implementation of child_process for Jest testing
 *
 * The child_process module causes issues in Jest's ESM mode with dynamic imports,
 * particularly when using the node: prefix resolution. This mock provides
 * test-friendly implementations that can be overridden in individual tests.
 */

/**
 * Simplified options type for child_process functions
 * Using a more specific type than 'any' for better type safety
 */
interface MockExecOptions {
  encoding?: 'utf8' | 'utf-8' | 'ascii' | 'base64' | 'hex' | 'buffer';
  cwd?: string;
  maxBuffer?: number;
  [key: string]: unknown;
}

/**
 * Mock exec function - returns empty result by default
 */
export function exec(
  command: string,
  options?: MockExecOptions,
  callback?: (error: Error | null, stdout: string, stderr: string) => void
): any {
  // If callback is provided, call it asynchronously with empty result
  if (callback) {
    process.nextTick(() => callback(null, '', ''));
  }
  // Return a mock child process object
  return {
    stdout: { on: () => {}, pipe: () => {} },
    stderr: { on: () => {}, pipe: () => {} },
    on: () => {},
    kill: () => true,
  };
}

/**
 * Mock execSync function - returns empty string by default
 */
export function execSync(command: string, options?: MockExecOptions): Buffer | string {
  return options?.encoding && options.encoding !== 'buffer' ? '' : Buffer.from('');
}

/**
 * Mock spawn function - returns mock child process
 */
export function spawn(
  _command: string,
  _args?: readonly string[],
  _options?: MockExecOptions
): any {
  return {
    stdout: {
      on: () => {},
      pipe: () => {},
      setEncoding: () => {},
    },
    stderr: {
      on: () => {},
      pipe: () => {},
      setEncoding: () => {},
    },
    stdin: {
      write: () => true,
      end: () => {},
    },
    on: () => {},
    kill: () => true,
    pid: 12345,
  };
}

/**
 * Mock fork function - returns mock child process
 */
export function fork(
  _modulePath: string,
  _args?: readonly string[],
  _options?: MockExecOptions
): any {
  return {
    send: () => true,
    on: () => {},
    kill: () => true,
    disconnect: () => {},
    pid: 12345,
  };
}

/**
 * Mock execFile function
 * Handles multiple overload patterns for better compatibility
 */
export function execFile(
  file: string,
  argsOrOptions?: readonly string[] | MockExecOptions | null,
  optionsOrCallback?:
    | MockExecOptions
    | ((error: Error | null, stdout: string, stderr: string) => void),
  callback?: (error: Error | null, stdout: string, stderr: string) => void
): any {
  // Determine which parameter is the callback based on the overload pattern
  let cb: ((error: Error | null, stdout: string, stderr: string) => void) | undefined;

  if (typeof optionsOrCallback === 'function') {
    cb = optionsOrCallback;
  } else if (typeof callback === 'function') {
    cb = callback;
  }

  if (cb) {
    process.nextTick(() => cb(null, '', ''));
  }
  return {
    stdout: { on: () => {}, pipe: () => {} },
    stderr: { on: () => {}, pipe: () => {} },
    on: () => {},
    kill: () => true,
  };
}

/**
 * Mock execFileSync function
 */
export function execFileSync(
  file: string,
  args?: readonly string[],
  options?: MockExecOptions
): Buffer | string {
  return options?.encoding && options.encoding !== 'buffer' ? '' : Buffer.from('');
}

// Default export for ES modules
export default {
  exec,
  execSync,
  spawn,
  fork,
  execFile,
  execFileSync,
};
