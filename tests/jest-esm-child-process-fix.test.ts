/**
 * Test to verify that Jest ESM dynamic imports work with child_process modules
 * 
 * This test validates the fix for: "Jest ESM: Dynamic imports fail with node:child_process module resolution"
 * 
 * The fix uses a global mock in jest.config.js to intercept both 'child_process' and 'node:child_process'
 * imports, preventing module resolution failures in Jest's ESM VM environment.
 */

import { describe, it, expect } from '@jest/globals';

describe('Jest ESM child_process Mock Fix', () => {
  it('should allow dynamic import of index.js without module resolution errors', async () => {
    // This test validates that we can dynamically import the main server file
    // which transitively imports modules that use child_process
    // Previously this would fail with: "The requested module 'node:child_process' does not provide an export named 'exec'"
    
    const { McpAdrAnalysisServer } = await import('../src/index.js');
    
    expect(McpAdrAnalysisServer).toBeDefined();
    expect(typeof McpAdrAnalysisServer).toBe('function');
    
    // Verify we can instantiate the server
    const server = new McpAdrAnalysisServer();
    expect(server).toBeDefined();
  });

  it('should allow dynamic import of modules that directly use child_process', async () => {
    // Test importing a module that directly uses child_process (exec)
    const ripgrepModule = await import('../src/utils/ripgrep-wrapper.js');
    expect(ripgrepModule).toBeDefined();
    expect(typeof ripgrepModule.searchWithRipgrep).toBe('function');
    expect(typeof ripgrepModule.isRipgrepAvailable).toBe('function');
  });

  it('should allow dynamic import of tools that use execSync', async () => {
    // Test importing a tool that uses execSync from child_process
    const { smartGitPush } = await import('../src/tools/smart-git-push-tool.js');
    expect(smartGitPush).toBeDefined();
    expect(typeof smartGitPush).toBe('function');
  });

  it('should work without jest.unstable_mockModule in individual tests', async () => {
    // This test verifies that we don't need to use jest.unstable_mockModule
    // in each test file - the global mock in jest.config.js handles it
    
    // Import multiple modules that use child_process
    const [
      { McpAdrAnalysisServer },
      ripgrepModule,
      gitPushModule,
    ] = await Promise.all([
      import('../src/index.js'),
      import('../src/utils/ripgrep-wrapper.js'),
      import('../src/tools/smart-git-push-tool.js'),
    ]);
    
    expect(McpAdrAnalysisServer).toBeDefined();
    expect(ripgrepModule.searchWithRipgrep).toBeDefined();
    expect(gitPushModule.smartGitPush).toBeDefined();
  });
});
