/**
 * JSON-Safe String Utilities
 *
 * Utilities for safely escaping strings in JSON-RPC 2.0 responses
 * to prevent parse errors in MCP communication
 */

/**
 * Escape a string to be JSON-safe for MCP responses
 * Only escapes actual control characters and problematic JSON chars
 */
export function jsonSafe(str: string | undefined | null): string {
  if (str === null || str === undefined) {
    return '';
  }

  return (
    String(str)
      // Escape backslashes first (before escaping quotes)
      .replace(/\\/g, '\\\\')
      // Escape double quotes
      .replace(/"/g, '\\"')
      // Only escape actual control characters (not regex \b)
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      // Escape other potentially problematic control characters (but not \b word boundary)
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, char => {
        const code = char.charCodeAt(0);
        switch (code) {
          case 0x08:
            return '\\b'; // actual backspace character
          case 0x0c:
            return '\\f'; // form feed
          default:
            return '\\u' + ('0000' + code.toString(16)).slice(-4);
        }
      })
  );
}

/**
 * Escape an array of strings to be JSON-safe
 */
export function jsonSafeArray(arr: (string | undefined | null)[]): string[] {
  return arr.map(jsonSafe);
}

/**
 * Safely join an array of strings with JSON-safe escaping
 */
export function jsonSafeJoin(arr: (string | undefined | null)[], separator: string = '\n'): string {
  return jsonSafeArray(arr).join(separator);
}

/**
 * Create a JSON-safe markdown list from an array of items
 */
export function jsonSafeMarkdownList(
  items: (string | undefined | null)[],
  prefix: string = '- '
): string {
  return jsonSafeArray(items)
    .filter(item => item.length > 0)
    .map(item => `${prefix}${item}`)
    .join('\n');
}

/**
 * Safely escape file paths for JSON output - minimal escaping for display
 * Only normalizes path separators and escapes quotes
 */
export function jsonSafeFilePath(filePath: string | undefined | null): string {
  if (!filePath) {
    return '';
  }

  // For file paths, only escape quotes and backslashes, normalize separators
  return String(filePath)
    .replace(/\\/g, '/') // Normalize Windows paths
    .replace(/"/g, '\\"'); // Only escape quotes for JSON safety
}

/**
 * Safely escape user input content that might contain dangerous characters
 * Use this for content that comes from external sources or user input
 */
export function jsonSafeUserInput(str: string | undefined | null): string {
  return jsonSafe(str);
}

/**
 * Safely escape error messages that might contain quotes or special chars
 */
export function jsonSafeError(error: unknown): string {
  if (!error) {
    return 'Unknown error';
  }

  const message = error instanceof Error ? error.message : String(error);
  return jsonSafe(message);
}
