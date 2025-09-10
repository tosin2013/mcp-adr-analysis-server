/**
 * Test for the completion preservation fix for issue #91
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { manageTodoV2 } from '../src/tools/todo-management-tool-v2.js';

// Mock external dependencies
jest.unstable_mockModule('../src/utils/knowledge-graph-manager.js', () => ({
  KnowledgeGraphManager: jest.fn().mockImplementation(() => ({
    updateTodoSnapshot: jest.fn(),
    loadKnowledgeGraph: jest.fn(() => Promise.resolve({})),
  }))
}));

jest.unstable_mockModule('../src/utils/project-health-scoring.js', () => ({
  ProjectHealthScoring: jest.fn().mockImplementation(() => ({
    getProjectHealthScore: jest.fn(() => Promise.resolve({})),
    generateScoreDisplay: jest.fn(() => '# Mock Score Display\n'),
    updateTaskCompletionScore: jest.fn(() => Promise.resolve(undefined)),
  }))
}));

describe('TODO Completion Preservation Fix (#91)', () => {
  let testProjectPath: string;

  beforeEach(async () => {
    // Create temporary test directory
    testProjectPath = join(tmpdir(), `test-completion-fix-${Date.now()}`);
    mkdirSync(testProjectPath, { recursive: true });
    
    const cacheDir = join(testProjectPath, '.mcp-adr-cache');
    mkdirSync(cacheDir, { recursive: true });

    // Create test ADR directory and files
    const adrDir = join(testProjectPath, 'docs', 'adrs');
    mkdirSync(adrDir, { recursive: true });

    // Create sample ADR file
    const fs = await import('fs/promises');
    const adrContent = `# ADR-001: Sample Implementation

## Status
Accepted

## Decision
- Implement feature A
- Setup component B  
- Configure system C

## Consequences
- Feature A will provide value
- Component B will need maintenance
- System C will require monitoring
`;

    await fs.writeFile(join(adrDir, 'adr-001-sample.md'), adrContent);
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  it('should preserve task completions when regenerating with preserveExisting: false', async () => {
    console.log('\n🧪 Testing completion preservation fix...\n');

    // Step 1: Initial ADR import
    console.log('Step 1: Initial import from ADRs');
    const initialImport = await manageTodoV2({
      operation: 'import_adr_tasks',
      projectPath: testProjectPath,
      adrDirectory: 'docs/adrs',
      preserveExisting: false,
      autoLinkDependencies: true
    });

    expect(initialImport.content[0].text).toContain('ADR Task Import Completed');
    console.log('✅ Initial import completed');

    // Step 2: Get tasks and complete some
    const tasksResult = await manageTodoV2({
      operation: 'get_tasks',
      projectPath: testProjectPath,
      showFullIds: true,
      sortBy: 'priority',
      sortOrder: 'desc'
    });

    // Extract task IDs
    const taskIds = [];
    const lines = tasksResult.content[0].text.split('\n');
    for (const line of lines) {
      const match = line.match(/\(ID: ([a-f0-9-]+)\)/);
      if (match) taskIds.push(match[1]);
    }

    expect(taskIds.length).toBeGreaterThan(0);
    console.log(`Found ${taskIds.length} tasks to test with`);

    // Complete the first 2 tasks
    console.log('Step 2: Complete some tasks');
    for (let i = 0; i < Math.min(2, taskIds.length); i++) {
      await manageTodoV2({
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId: taskIds[i],
        updates: {
          status: 'completed',
          progressPercentage: 100,
          notes: `✅ COMPLETED: Test completion ${i + 1}`
        },
        reason: 'Testing completion preservation'
      });
    }

    console.log('✅ Completed 2 tasks');

    // Step 3: Verify completions exist
    const completedBefore = await manageTodoV2({
      operation: 'get_tasks',
      projectPath: testProjectPath,
      filters: { status: 'completed' }
    });

    const completedCountBefore = (completedBefore.content[0].text.match(/\*\*/g) || []).length / 2;
    expect(completedCountBefore).toBe(2);
    console.log(`✅ Verified ${completedCountBefore} completed tasks before regeneration`);

    // Step 4: Regenerate with preserveExisting: false (this should preserve completions now)
    console.log('Step 3: Regenerate with preserveExisting: false (testing fix)');
    const regenerateResult = await manageTodoV2({
      operation: 'import_adr_tasks',
      projectPath: testProjectPath,
      adrDirectory: 'docs/adrs',
      preserveExisting: false, // This used to lose completions, but should preserve them now
      autoLinkDependencies: true
    });

    expect(regenerateResult.content[0].text).toContain('ADR Task Import Completed');
    
    // Check if the fix worked - should show preserved completions
    const hasPreservedCompletions = regenerateResult.content[0].text.includes('Completions Preserved');
    console.log(`Completion preservation indicator: ${hasPreservedCompletions}`);

    // Step 5: Verify completions are preserved after regeneration
    console.log('Step 4: Verify completions preserved after regeneration');
    const completedAfter = await manageTodoV2({
      operation: 'get_tasks',
      projectPath: testProjectPath,
      filters: { status: 'completed' }
    });

    const completedCountAfter = (completedAfter.content[0].text.match(/\*\*/g) || []).length / 2;
    console.log(`Completed tasks after regeneration: ${completedCountAfter}`);

    // THE FIX: This should now pass (completions preserved)
    expect(completedCountAfter).toBeGreaterThan(0);
    
    // Check if completions were actually preserved
    const fixWorked = completedCountAfter >= completedCountBefore;
    console.log(`Fix verification: completions preserved = ${fixWorked}`);
    console.log(`   Before: ${completedCountBefore}, After: ${completedCountAfter}`);
    
    // The fix should preserve at least the same number of completions
    expect(completedCountAfter).toBeGreaterThanOrEqual(completedCountBefore);

    console.log('✅ FIXED: Completions are preserved during regeneration!');

    // Step 6: Verify markdown sync shows completed tasks correctly
    console.log('Step 5: Verify markdown sync shows completed tasks');
    const syncResult = await manageTodoV2({
      operation: 'sync_to_markdown',
      projectPath: testProjectPath,
      force: true
    });

    expect(syncResult.content[0].text).toContain('Markdown sync completed');

    // Read the markdown file and verify it shows completed tasks
    const fs = await import('fs/promises');
    const todoPath = join(testProjectPath, 'TODO.md');
    expect(existsSync(todoPath)).toBe(true);

    const todoContent = await fs.readFile(todoPath, 'utf-8');
    
    // Check for completion indicators
    const hasCompletedCheckbox = todoContent.includes('[x]');
    const hasCompletedEmoji = todoContent.includes('✅');
    const hasCompletedSection = todoContent.includes('## ✅ Completed') || todoContent.includes('Completed');

    console.log(`Markdown has [x] checkbox: ${hasCompletedCheckbox}`);
    console.log(`Markdown has ✅ emoji: ${hasCompletedEmoji}`);
    console.log(`Markdown has completed section: ${hasCompletedSection}`);

    // All should be true with the fix
    expect(hasCompletedCheckbox).toBe(true);
    expect(hasCompletedEmoji).toBe(true);

    console.log('✅ VERIFIED: Markdown sync correctly shows completed tasks');
    console.log('\n🎉 Issue #91 is FIXED!');
    console.log('   - Smart completion preservation works during regeneration');
    console.log('   - Markdown sync correctly displays completed tasks');
    console.log('   - Progress is preserved across ADR re-imports\n');
  });

  it('should show completion preservation in import results', async () => {
    // Test that the import results properly show when completions are preserved
    
    // Initial import
    await manageTodoV2({
      operation: 'import_adr_tasks',
      projectPath: testProjectPath,
      adrDirectory: 'docs/adrs',
      preserveExisting: false,
      autoLinkDependencies: true
    });

    // Get a task and complete it
    const tasksResult = await manageTodoV2({
      operation: 'get_tasks',
      projectPath: testProjectPath,
      showFullIds: true,
      limit: 1
    });

    const taskIdMatch = tasksResult.content[0].text.match(/\(ID: ([a-f0-9-]+)\)/);
    expect(taskIdMatch).toBeTruthy();
    const taskId = taskIdMatch![1];

    await manageTodoV2({
      operation: 'update_task',
      projectPath: testProjectPath,
      taskId: taskId,
      updates: {
        status: 'completed',
        progressPercentage: 100,
        notes: 'Test completion'
      },
      reason: 'Testing preservation display'
    });

    // Regenerate and check the result message
    const result = await manageTodoV2({
      operation: 'import_adr_tasks',
      projectPath: testProjectPath,
      adrDirectory: 'docs/adrs',
      preserveExisting: false,
      autoLinkDependencies: true
    });

    // Should show completion preservation in the results
    expect(result.content[0].text).toContain('Completions Preserved');
    expect(result.content[0].text).toContain('Smart Completion Preservation');
    expect(result.content[0].text).toContain('preserved completion');
  });
});