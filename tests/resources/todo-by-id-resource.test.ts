import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateTodoByIdResource } from '../../src/resources/todo-by-id-resource.js';
import { resourceCache } from '../../src/resources/resource-cache.js';
import { McpAdrError } from '../../src/types/index.js';
import { URLSearchParams } from 'url';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('generateTodoByIdResource', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    resourceCache.clear();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'todo-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('throws INVALID_PARAMS when task_id is missing', async () => {
    await expect(generateTodoByIdResource({}, new URLSearchParams())).rejects.toThrow(McpAdrError);

    try {
      await generateTodoByIdResource({}, new URLSearchParams());
    } catch (e) {
      expect((e as McpAdrError).code).toBe('INVALID_PARAMS');
    }
  });

  it('throws RESOURCE_NOT_FOUND when todo.md does not exist', async () => {
    await expect(
      generateTodoByIdResource({ task_id: 'task-1' }, new URLSearchParams())
    ).rejects.toThrow(McpAdrError);

    try {
      await generateTodoByIdResource({ task_id: 'task-1' }, new URLSearchParams());
    } catch (e) {
      expect((e as McpAdrError).code).toBe('RESOURCE_NOT_FOUND');
    }
  });

  it('throws RESOURCE_NOT_FOUND when task is not found', async () => {
    await fs.writeFile(path.join(tmpDir, 'todo.md'), '## Some Other Task\n**Status:** Pending\n');

    await expect(
      generateTodoByIdResource({ task_id: 'nonexistent' }, new URLSearchParams())
    ).rejects.toThrow(McpAdrError);

    try {
      await generateTodoByIdResource({ task_id: 'nonexistent' }, new URLSearchParams());
    } catch (e) {
      expect((e as McpAdrError).code).toBe('RESOURCE_NOT_FOUND');
    }
  });

  it('returns correct structure when task exists', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'todo.md'),
      '## Test Task\n**Status:** In Progress\n**Priority:** High\nThis is a test task description\n'
    );

    const result = await generateTodoByIdResource({ task_id: 'task-1' }, new URLSearchParams());

    expect(result.contentType).toBe('application/json');
    expect(result.cacheKey).toBe('todo-task:task-1');
    expect(result.ttl).toBe(60);
    expect(result.etag).toBeDefined();
    expect(result.data.id).toBe('task-1');
    expect(result.data.title).toBe('Test Task');
  });

  it('returns empty history array (unmeasured output)', async () => {
    await fs.writeFile(path.join(tmpDir, 'todo.md'), '## Test Task\n**Status:** Pending\n');

    const result = await generateTodoByIdResource({ task_id: 'task-1' }, new URLSearchParams());

    expect(result.data.history).toEqual([]);
  });

  it('parses In Progress status correctly', async () => {
    await fs.writeFile(path.join(tmpDir, 'todo.md'), '## Active Task\n**Status:** In Progress\n');

    const result = await generateTodoByIdResource({ task_id: 'task-1' }, new URLSearchParams());

    expect(result.data.status).toBe('in_progress');
  });

  it('parses completed status correctly', async () => {
    await fs.writeFile(path.join(tmpDir, 'todo.md'), '## Done Task\n**Status:** Completed\n');

    const result = await generateTodoByIdResource({ task_id: 'task-1' }, new URLSearchParams());

    expect(result.data.status).toBe('completed');
  });

  it('parses priority correctly', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'todo.md'),
      '## Important Task\n**Status:** Pending\n**Priority:** High\n'
    );

    const result = await generateTodoByIdResource({ task_id: 'task-1' }, new URLSearchParams());

    expect(result.data.priority).toBe('high');
  });

  it('finds task by title match', async () => {
    await fs.writeFile(path.join(tmpDir, 'todo.md'), '## My Special Task\n**Status:** Pending\n');

    const result = await generateTodoByIdResource({ task_id: 'special' }, new URLSearchParams());

    expect(result.data.title).toBe('My Special Task');
  });
});
