# Makefile for Docusaurus Documentation

.PHONY: help install dev build serve clean docker-dev docker-prod docker-build docker-clean test

# Default target
help:
	@echo "📚 Docusaurus Documentation - Available Commands"
	@echo ""
	@echo "Local Development:"
	@echo "  make install      - Install dependencies"
	@echo "  make dev          - Start development server"
	@echo "  make build        - Build for production"
	@echo "  make serve        - Preview production build"
	@echo "  make clean        - Clean build artifacts"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make docker-dev   - Run dev server in Docker (hot reload)"
	@echo "  make docker-prod  - Run production server in Docker"
	@echo "  make docker-build - Build only (test build)"
	@echo "  make docker-clean - Clean Docker containers and images"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run all tests"
	@echo "  make test-links   - Check for broken links"
	@echo ""

# Local development
install:
	@echo "📦 Installing dependencies..."
	npm install

dev:
	@echo "🌐 Starting development server..."
	npm run start

build:
	@echo "🔨 Building for production..."
	npm run build

serve:
	@echo "👀 Previewing production build..."
	npm run serve

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf build .docusaurus node_modules/.cache
	@echo "✅ Cleanup complete"

# Docker commands
docker-dev:
	@echo "🐳 Starting Docker development server..."
	docker-compose --profile dev up

docker-dev-bg:
	@echo "🐳 Starting Docker development server (background)..."
	docker-compose --profile dev up -d

docker-prod:
	@echo "🐳 Building and running production Docker server..."
	docker-compose --profile prod up --build

docker-prod-bg:
	@echo "🐳 Building and running production Docker server (background)..."
	docker-compose --profile prod up --build -d

docker-build:
	@echo "🐳 Testing Docker build..."
	docker-compose --profile build up --build

docker-clean:
	@echo "🐳 Cleaning Docker containers and images..."
	docker-compose down -v
	docker system prune -f
	@echo "✅ Docker cleanup complete"

docker-logs:
	@echo "📋 Showing Docker logs..."
	docker-compose logs -f

# Testing
test: build
	@echo "✅ Build test passed"

test-links:
	@echo "🔍 Checking for broken links..."
	@if command -v linkchecker >/dev/null 2>&1; then \
		npm run build && linkchecker build/index.html; \
	else \
		echo "⚠️  linkchecker not installed. Install with: pip install linkchecker"; \
	fi

# Deployment
deploy:
	@echo "🚀 Deploying to GitHub Pages..."
	@echo "Pushing to main branch will trigger automatic deployment"
	git status

# Quick setup
setup:
	@echo "🚀 Running automated setup..."
	./setup-docusaurus.sh

# All-in-one commands
quick-start: install dev

docker-quick: docker-dev

rebuild: clean install build

docker-rebuild: docker-clean docker-build
