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
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/); // Matches semantic versioning pattern
    expect(typeof packageJson.version).toBe('string');
  });

  test('should use generic fallback version when package.json not found', () => {
    // Import the getPackageVersion function (we'll need to export it for testing)
    // For now, just test that the fallback version is generic in the source
    const indexSource = readFileSync(join(process.cwd(), 'src', 'index.ts'), 'utf-8');
    
    // Check that fallback version is now generic (not tied to specific version)
    expect(indexSource).toContain("return 'unknown'; // Generic fallback - no longer tied to specific version");
    
    // Ensure old hardcoded versions are removed
    expect(indexSource).not.toContain("return '2.0.2'; // fallback version");
    expect(indexSource).not.toContain("return '2.0.15'; // fallback version");
    
    // Verify the fallback approach is documented
    expect(indexSource).toContain("// This prevents the need to update this code when version changes");
  });

  test('should be future-proof for version updates', () => {
    // This test ensures that when package.json version is updated,
    // no code changes are needed for the version functionality
    const indexSource = readFileSync(join(process.cwd(), 'src', 'index.ts'), 'utf-8');
    
    // The fallback should be generic, not tied to any specific version
    expect(indexSource).toContain("return 'unknown'");
    
    // Should not contain any hardcoded version numbers in fallbacks
    const fallbackVersionRegex = /return\s+'[\d.]+'\s*;\s*\/\/ fallback/;
    expect(indexSource).not.toMatch(fallbackVersionRegex);
    
    // Should have documentation about future-proofing
    expect(indexSource).toContain("prevents the need to update this code when version changes");
  });
});