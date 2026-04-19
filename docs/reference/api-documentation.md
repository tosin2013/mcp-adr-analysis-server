---
title: API Documentation
---

# API Documentation

This page explains how API documentation is generated and served in this repository.

## Overview

The MCP ADR Analysis Server publishes generated API docs using [TypeDoc](https://typedoc.org/), with output in `docs/api/`.

For tool and resource reference content, use:

- [API Reference](./api-reference.md)
- [Comprehensive API Reference](./comprehensive-api-reference.md)

## Generate API Docs Locally

From the repository root:

```bash
npm install
npm run docs:build
```

This writes output to `docs/api/`.

## Serve API Docs Locally

```bash
npm run docs:serve
```

Then open `http://localhost:8080`.

## Common Notes

- `npm install` is required before `docs:build` because `typedoc` is a dev dependency.
- If TypeDoc reports warnings, review `typedoc.json` and markdown links in `README.md`.
- Directory links in markdown should be avoided for generated docs to prevent broken `media/*` links.

## Related

- [Quick Start for docs](../QUICK_START.md)
- [Reference index](./index.md)
- [README local docs instructions](../../README.md#viewing-documentation-locally)
