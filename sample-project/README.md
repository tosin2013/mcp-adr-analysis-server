# Sample Project

This is a sample project used for testing the MCP ADR Analysis Server functionality.

## Architecture Decisions

Our ADRs are located in `docs/adrs/` and track our key architectural decisions.

## Current Status
- Database architecture: Implemented (PostgreSQL + Redis)
- API authentication: In progress (JWT + RBAC)
- Legacy migration: Deprecated (replaced by streaming approach)

## Development

This project is used to test:
- ADR discovery and parsing
- Task extraction from architectural decisions
- JSON-first TODO management
- Progress tracking and health scoring 