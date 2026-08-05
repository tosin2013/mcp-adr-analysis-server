# MCP ADR Analysis Server - Makefile
# Code quality and validation driven build system

.PHONY: help install build test test-ci lint lint-ci clean dev check-deps security-check format

# Default target
help:
	@echo "MCP ADR Analysis Server - Available targets:"
	@echo "  install      - Install dependencies"
	@echo "  build        - Build TypeScript to JavaScript"
	@echo "  test         - Run Vitest tests (checks dependencies first)"
	@echo "  test-ci      - Run Vitest tests without the audit gate (used by CI)"
	@echo "  lint         - Run ESLint checks"
	@echo "  clean        - Clean build artifacts and cache"
	@echo "  dev          - Start development server"
	@echo "  check-deps   - Check for dependency vulnerabilities"
	@echo "  security-check - Run security validation"
	@echo "  format       - Format code with ESLint"
	@echo "  ci           - Run full CI pipeline (lint, test, build)"

# Check Node.js version compatibility
check-node:
	@echo "Checking Node.js version..."
	@node -e "const v=process.version.slice(1).split('.').map(Number); if(v[0]<20) { console.error('❌ Node.js >=20.0.0 required, found:', process.version); process.exit(1); } else { console.log('✅ Node.js', process.version, 'is compatible'); }"

# Install dependencies (handles lock file sync issues)
install: check-node
	@echo "Installing dependencies..."
	@echo "Checking package files..."
	@ls -la package*.json || echo "Package files not found"
	@if npm ci 2>/dev/null; then \
		echo "✅ Dependencies installed with npm ci"; \
	else \
		echo "⚠️  npm ci failed, trying npm install..."; \
		npm install; \
		echo "✅ Dependencies installed and lock file updated"; \
	fi
	@echo "Verifying critical dependencies..."
	@npm list @modelcontextprotocol/sdk @types/node typescript || echo "⚠️  Some dependencies missing"

# Build the project
build: install
	@echo "Building TypeScript..."
	npm run clean
	npm run build
	@echo "Build completed successfully"

# Run tests without coverage (local dev — surfaces advisories via check-deps)
test: check-deps
	@echo "Running tests..."
	npm test
	@echo "Tests completed successfully"

# CI-safe tests (skips audit check)
# A transitive advisory must not fail the required test checks and freeze the
# PR queue; the audit is enforced by the security-scan job instead.
test-ci:
	@echo "Running tests (CI)..."
	npm test
	@echo "Tests completed successfully"

# Run tests with coverage
test-coverage: check-deps
	@echo "Running tests with coverage..."
	npm run test:coverage
	@echo "Tests with coverage completed successfully"

# Test Node.js compatibility
node-compat: build
	@echo "Testing Node.js compatibility..."
	@node -e " \
		console.log('🔍 Node.js Compatibility Check'); \
		console.log('=============================='); \
		console.log('Node.js version:', process.version); \
		console.log('Platform:', process.platform); \
		console.log('Architecture:', process.arch); \
		console.log(''); \
		const v = process.version.slice(1).split('.').map(Number); \
		if (v[0] < 20) { \
			console.error('❌ Node.js >=20.0.0 required, found:', process.version); \
			process.exit(1); \
		} \
		console.log('✅ Node.js version compatible'); \
		try { \
			require('./dist/src/utils/config.js'); \
			console.log('✅ Module loading working'); \
		} catch (e) { \
			console.log('⚠️  Module loading test skipped (build required)'); \
		} \
		console.log(''); \
		console.log('🎉 Node.js compatibility verified!'); \
	"
	@echo "Node.js compatibility check completed"

# Health check
health: build
	@echo "Running server health check..."
	npm run health
	@echo "Health check completed"

# Run linting (ESLint + TypeScript check)
lint: check-deps
	@echo "Running ESLint and TypeScript checks..."
	@npm run lint
	@echo "✅ Linting completed successfully"

# CI-safe linting (skips audit check)
lint-ci:
	@echo "Running CI-safe ESLint and TypeScript checks..."
	@npm run lint
	@echo "✅ CI linting completed successfully"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	npm run clean
	rm -rf node_modules/.cache
	@echo "Clean completed successfully"

# Development server
dev: check-deps
	@echo "Starting development server..."
	npm run dev

# Check production dependencies for vulnerabilities (dev deps checked separately)
check-deps:
	@echo "Checking production dependencies..."
	npm audit --omit=dev --audit-level=moderate
	@echo "Dependency check completed"

# Security validation
security-check: check-deps
	@echo "Running security checks..."
	npm audit --omit=dev --audit-level=high
	@if [ -f ".mcp-adr-cache" ]; then \
		echo "ERROR: Cache directory should not be committed"; \
		exit 1; \
	fi
	@if [ -f "PRD.md" ]; then \
		echo "ERROR: PRD.md should not be committed"; \
		exit 1; \
	fi
	@echo "Security checks passed"

# Format code
format: check-deps
	@echo "Formatting code..."
	npm run lint:fix
	@echo "Code formatting completed"

# Full CI pipeline
ci: security-check lint test build
	@echo "CI pipeline completed successfully"

# Pre-commit validation
pre-commit: security-check format lint test
	@echo "Pre-commit validation completed"
