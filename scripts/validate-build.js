#!/usr/bin/env node

/**
 * Validate build output for CI/CD
 * This script checks that the build completed successfully
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 Validating Build Output');
console.log('==========================');

const errors = [];
const warnings = [];

// Check 1: Dist directory exists
if (!existsSync('dist')) {
  errors.push('dist directory not found');
} else {
  console.log('✅ dist directory exists');
}

// Check 2: Main entry point exists
const mainEntry = 'dist/src/index.js';
if (!existsSync(mainEntry)) {
  errors.push(`Main entry point not found: ${mainEntry}`);
} else {
  console.log('✅ Main entry point exists');
  
  // Check if it's a valid JS file with MCP functionality
  try {
    const content = readFileSync(mainEntry, 'utf8');
    if (content.length < 100) {
      warnings.push('Main entry point seems too small');
    } else {
      console.log('✅ Main entry point has content');

      // Check for MCP server functionality
      if (content.includes('McpAdrAnalysisServer') || content.includes('Server')) {
        console.log('✅ MCP server class found');
      } else {
        warnings.push('MCP server class not found in main entry');
      }

      if (content.includes('tools') && content.includes('resources')) {
        console.log('✅ MCP tools and resources detected');
      } else {
        warnings.push('MCP tools/resources not detected');
      }
    }
  } catch (error) {
    errors.push(`Cannot read main entry point: ${error.message}`);
  }
}

// Check 3: Package.json exists and is valid
if (!existsSync('package.json')) {
  errors.push('package.json not found');
} else {
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    console.log(`✅ Package: ${pkg.name}@${pkg.version}`);
    
    if (!pkg.main) {
      warnings.push('package.json missing main field');
    }
    
    if (!pkg.bin) {
      warnings.push('package.json missing bin field');
    }
  } catch (error) {
    errors.push(`Invalid package.json: ${error.message}`);
  }
}

// Check 4: TypeScript declaration files
const declarationFile = 'dist/src/index.d.ts';
if (!existsSync(declarationFile)) {
  warnings.push('TypeScript declaration file not found');
} else {
  console.log('✅ TypeScript declarations generated');
}

// Check 5: Essential utility files
const essentialFiles = [
  'dist/src/utils/config.js',
  'dist/src/types/index.js',
  'dist/src/utils/file-system.js'
];

for (const file of essentialFiles) {
  if (!existsSync(file)) {
    errors.push(`Essential file missing: ${file}`);
  } else {
    console.log(`✅ ${file} exists`);
  }
}

// Check 6: Tool files (optional but expected)
const toolFiles = [
  'dist/src/tools',
  'dist/src/resources',
  'dist/src/prompts'
];

for (const file of toolFiles) {
  if (!existsSync(file)) {
    warnings.push(`Tool directory missing: ${file}`);
  } else {
    console.log(`✅ ${file} directory exists`);
  }
}

// Report results
console.log('\n📊 Build Validation Results');
console.log('============================');

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(warning => console.log(`  - ${warning}`));
}

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.forEach(error => console.log(`  - ${error}`));
  console.log('\n💥 Build validation failed!');
  process.exit(1);
} else {
  console.log('\n🎉 Build validation passed!');
  console.log('✅ All required files are present and valid');
}
