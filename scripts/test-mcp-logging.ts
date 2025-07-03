#!/usr/bin/env node

/**
 * Test script to verify MCP logging doesn't corrupt the protocol
 * This script tests that all logging goes to stderr and not stdout
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

console.log('🧪 Testing MCP Server Logging');
console.log('============================');

// Create a temporary test directory
const testDir = join(process.cwd(), '.test-mcp-logging');
mkdirSync(testDir, { recursive: true });

// Test 1: Verify server starts without stdout pollution
console.log('\n📋 Test 1: Server Startup (with logging)');
console.log('----------------------------------------');

const serverProcess = spawn('node', ['dist/src/index.js'], {
  env: {
    ...process.env,
    PROJECT_PATH: testDir,
    LOG_LEVEL: 'DEBUG', // Enable all logging levels
  },
  stdio: ['pipe', 'pipe', 'pipe'] // stdin, stdout, stderr
});

let stdoutData = '';
let stderrData = '';
let jsonResponseReceived = false;

// Capture stdout (should only contain JSON-RPC messages)
serverProcess.stdout.on('data', (data) => {
  stdoutData += data.toString();
  
  // Try to parse as JSON-RPC
  const lines = data.toString().split('\n').filter(line => line.trim());
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.jsonrpc === '2.0') {
        jsonResponseReceived = true;
        console.log('✅ Valid JSON-RPC response received on stdout');
      }
    } catch (e) {
      if (line.trim()) {
        console.error('❌ Non-JSON data on stdout:', line);
        console.error('   This will corrupt the MCP protocol!');
      }
    }
  }
});

// Capture stderr (should contain all logging)
serverProcess.stderr.on('data', (data) => {
  stderrData += data.toString();
});

// Send a test JSON-RPC request
const testRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '0.1.0',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

// Send request after a short delay to ensure server is ready
setTimeout(() => {
  serverProcess.stdin.write(JSON.stringify(testRequest) + '\n');
}, 500);

// Give the server time to respond
setTimeout(() => {
  serverProcess.kill();
  
  console.log('\n📊 Results:');
  console.log('----------');
  
  // Check if logging appeared on stderr
  if (stderrData.includes('[INFO]') || stderrData.includes('[DEBUG]')) {
    console.log('✅ Logging correctly sent to stderr');
    console.log('   Sample stderr output:', stderrData.split('\\n')[0]);
  } else {
    console.log('⚠️  No logging detected on stderr');
  }
  
  // Check if stdout is clean
  const nonJsonLines = stdoutData.split('\n').filter(line => {
    if (!line.trim()) return false;
    try {
      JSON.parse(line);
      return false;
    } catch {
      return true;
    }
  });
  
  if (nonJsonLines.length === 0 && jsonResponseReceived) {
    console.log('✅ stdout contains only valid JSON-RPC messages');
  } else if (nonJsonLines.length > 0) {
    console.error('❌ stdout contains non-JSON data:');
    nonJsonLines.forEach(line => console.error('   ', line));
  } else {
    console.log('⚠️  No JSON-RPC response received');
  }
  
  // Cleanup
  rmSync(testDir, { recursive: true, force: true });
  
  console.log('\n✨ Test complete');
  
  process.exit(nonJsonLines.length > 0 ? 1 : 0);
}, 2000);

// Handle errors
serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  rmSync(testDir, { recursive: true, force: true });
  process.exit(1);
});