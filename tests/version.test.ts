/**
 * Version tests for MCP ADR Analysis Server
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Version Management', () => {
  test('should return correct version from package.json', () => {
    // Mock getCurrentDirCompat to return test directory
    const currentDir = process.cwd();
    const packageJsonPath = join(currentDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    expect(packageJson.name).toBe('mcp-adr-analysis-server');
    expect(packageJson.version).toBe('2.0.15');
  });

  test('should use fallback version when package.json not found', () => {
    // Import the getPackageVersion function (we'll need to export it for testing)
    // For now, just test that the fallback version is correct in the source
    const indexSource = readFileSync(join(process.cwd(), 'src', 'index.ts'), 'utf-8');
    
    // Check that fallback version matches package.json
    expect(indexSource).toContain("return '2.0.15'; // fallback version");
    expect(indexSource).not.toContain("return '2.0.2'; // fallback version");
  });
});