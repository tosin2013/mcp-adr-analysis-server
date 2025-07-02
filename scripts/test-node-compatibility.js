#!/usr/bin/env node

/**
 * Test Node.js compatibility for MCP ADR Analysis Server
 * This script tests basic functionality across different Node.js versions
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Testing Node.js Compatibility');
console.log('================================');

// Test 1: Node.js version
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);

// Test 2: ESM support
console.log('\n✅ ESM imports working');

// Test 3: Package.json validation
try {
  const packagePath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  console.log(`✅ Package: ${packageJson.name}@${packageJson.version}`);
  console.log(`✅ Type: ${packageJson.type}`);
} catch (error) {
  console.error('❌ Package.json error:', error.message);
  process.exit(1);
}

// Test 4: TypeScript compilation check
try {
  const distPath = join(__dirname, '..', 'dist', 'src', 'index.js');
  const compiledCode = readFileSync(distPath, 'utf8');
  if (compiledCode.includes('export')) {
    console.log('✅ TypeScript ESM compilation working');
  } else {
    console.log('⚠️  TypeScript compilation may have issues');
  }
} catch (error) {
  console.log('⚠️  Compiled code not found (run npm run build first)');
}

// Test 5: Basic module loading
try {
  const { loadConfig } = await import('../dist/src/utils/config.js');
  console.log('✅ Module loading working');
  
  // Test configuration loading
  const config = loadConfig();
  console.log(`✅ Configuration loaded: ${config.projectPath}`);
} catch (error) {
  console.error('❌ Module loading error:', error.message);
  process.exit(1);
}

// Test 6: Zod validation
try {
  const { z } = await import('zod');
  const testSchema = z.object({
    test: z.string()
  });
  testSchema.parse({ test: 'hello' });
  console.log('✅ Zod validation working');
} catch (error) {
  console.error('❌ Zod validation error:', error.message);
  process.exit(1);
}

// Test 7: MCP SDK compatibility
try {
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  console.log('✅ MCP SDK import working');
} catch (error) {
  console.error('❌ MCP SDK error:', error.message);
  process.exit(1);
}

console.log('\n🎉 All Node.js compatibility tests passed!');
console.log(`✅ Node.js ${process.version} is fully compatible`);
