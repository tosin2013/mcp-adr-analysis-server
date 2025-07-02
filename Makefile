# MCP ADR Analysis Server - Makefile
# Code quality and validation driven build system

.PHONY: help install build test lint clean dev check-deps security-check format

# Default target
help:
	@echo "MCP ADR Analysis Server - Available targets:"
	@echo "  install      - Install dependencies"
	@echo "  build        - Build TypeScript to JavaScript"
	@echo "  test         - Run Jest tests with coverage"
	@echo "  lint         - Run ESLint checks"
	@echo "  clean        - Clean build artifacts and cache"
	@echo "  dev          - Start development server"
	@echo "  check-deps   - Check for dependency vulnerabilities"
	@echo "  security-check - Run security validation"
	@echo "  format       - Format code with ESLint"
	@echo "  ci           - Run full CI pipeline (lint, test, build)"

# Install dependencies
install:
	@echo "Installing dependencies..."
	@if [ ! -f package-lock.json ]; then \
		echo "No package-lock.json found, running npm install..."; \
		npm install; \
	else \
		npm ci; \
	fi
	@echo "Dependencies installed successfully"

# Build the project
build: check-deps
	@echo "Building TypeScript..."
	npm run clean
	npm run build
	@echo "Build completed successfully"

# Run tests with coverage
test: check-deps
	@echo "Running tests with coverage..."
	npm run test:coverage
	@echo "Tests completed successfully"

# Run linting
lint: check-deps
	@echo "Running ESLint..."
	npm run lint
	@echo "Linting completed successfully"

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

# Check dependencies for vulnerabilities
check-deps:
	@echo "Checking dependencies..."
	npm audit --audit-level=moderate
	@echo "Dependency check completed"

# Security validation
security-check: check-deps
	@echo "Running security checks..."
	npm audit --audit-level=high
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
