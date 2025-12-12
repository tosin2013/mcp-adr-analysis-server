/**
 * Mock implementation of child_process for Jest testing
 *
 * The child_process module causes issues in Jest's ESM mode with dynamic imports,
 * particularly when using the node: prefix resolution. This mock provides
 * test-friendly implementations that can be overridden in individual tests.
 */

/**
 * Mock exec function - returns empty result by default
 */
export function exec(
  command: string,
  options?: any,
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
export function execSync(command: string, options?: any): Buffer | string {
  return options?.encoding ? '' : Buffer.from('');
}

/**
 * Mock spawn function - returns mock child process
 */
export function spawn(_command: string, _args?: readonly string[], _options?: any): any {
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
export function fork(_modulePath: string, _args?: readonly string[], _options?: any): any {
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
 */
export function execFile(
  file: string,
  args?: readonly string[] | null,
  options?: any,
  callback?: (error: Error | null, stdout: string, stderr: string) => void
): any {
  const cb = typeof options === 'function' ? options : callback;
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
export function execFileSync(file: string, args?: readonly string[], options?: any): Buffer | string {
  return options?.encoding ? '' : Buffer.from('');
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
