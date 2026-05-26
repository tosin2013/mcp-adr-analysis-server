# Planning Documents

This directory consolidates historical and active planning documents for the MCP ADR Analysis Server. Each document has a status header indicating whether it is still in use.

## Document Taxonomy

| Document                                                                 | Status                | Description                                                                                                                                                              |
| ------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)                       | Superseded by ADR-014 | Original CE-MCP migration plan for converting 82 tools to directive-based architecture. Accepted and implemented; see [ADR-014](../adrs/adr-014-ce-mcp-architecture.md). |
| [DOCUMENTATION-UPDATE-PLAN.md](./DOCUMENTATION-UPDATE-PLAN.md)           | Active                | Tracks documentation updates needed to communicate the research-driven architecture paradigm shift.                                                                      |
| [DOCUMENTATION_IMPROVEMENT_PLAN.md](./DOCUMENTATION_IMPROVEMENT_PLAN.md) | Active                | 4-phase initiative to raise documentation coverage from 35% to 90%+.                                                                                                     |
| [DOCUSAURUS_MIGRATION.md](./DOCUSAURUS_MIGRATION.md)                     | Completed             | Step-by-step guide for the VitePress → Docusaurus v3 migration. Migration is complete; retained as historical reference.                                                 |

## Status Definitions

- **Active** — The plan is currently being executed. Check the document for open tasks.
- **Completed** — All objectives have been met. Retained for historical context.
- **Superseded by ADR-N** — The work was formalised into an Architectural Decision Record. The ADR is the authoritative source; this document provides background detail.

## Related Resources

- [ADRs](../adrs/) — Architectural Decision Records
- [How-to Guides](../how-to-guides/) — Operational playbooks
- [CHANGELOG](../../CHANGELOG.md) — Release history
