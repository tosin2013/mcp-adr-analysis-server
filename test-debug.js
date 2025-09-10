import { TodoJsonManager } from './src/utils/todo-json-manager.js';
import { mkdirSync, rmSync } from 'fs';

const testPath = '/tmp/test-todo-debug';
try { rmSync(testPath, { recursive: true }); } catch {}
mkdirSync(testPath, { recursive: true });

const manager = new TodoJsonManager(testPath);

async function test() {
  console.log('Creating task...');
  const taskId = await manager.createTask({
    title: 'Test task'
  });
  console.log('Task created:', taskId);

  console.log('Adding comment...');
  const comment1 = await manager.addComment({
    taskId,
    author: 'alice',
    text: 'Hello world',
    mentions: ['@bob']
  });
  console.log('Comment added:', comment1);

  console.log('Getting comments...');
  const comments = await manager.getTaskComments(taskId);
  console.log('Retrieved comments:', comments);
  console.log('Comments length:', comments.length);
}

test().catch(console.error);
