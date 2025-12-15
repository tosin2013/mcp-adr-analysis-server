# ADR-013: Documentation Platform Strategy

## Status

Accepted

## Context

The MCP ADR Analysis Server's documentation was initially managed with VitePress but has been migrated to Docusaurus for better features like built-in search, versioning, and GitHub Pages integration. This migration addresses limitations in scalability, SEO, and maintenance. We need to formalize this decision to track rationale, alternatives considered, and long-term implications, ensuring alignment with the project's MCP protocol and extensibility goals. Key requirements include Diataxis compliance, easy updates via code sync, and CI/CD integration for validation.

## Options Considered

1. **Stick with VitePress**: Simple and lightweight, but lacks advanced features like native search and versioning.
2. **MkDocs**: Python-based, good for static sites, but less integrated with JavaScript ecosystem and requires additional setup for React components.
3. **Docusaurus**: JavaScript-based, excellent React support, built-in Diataxis structure, and seamless GitHub Pages deployment.
4. **Custom Solution**: Build from scratch for full control, but high development overhead.

## Decision

Adopt Docusaurus as the primary documentation platform. This choice supports our JavaScript/Node.js ecosystem, enables easy integration with MCP tools (e.g., auto-sync via AST analysis), and provides robust features for developer-friendly docs. We'll maintain Diataxis structure and implement CI gates for link/freshness validation.

## Consequences

**Positive:**

- Improved SEO and searchability, enhancing user discovery.
- Better maintainability with auto-generated content and code sync.
- Seamless deployment via GitHub Actions, reducing manual overhead.
- Enhanced extensibility for future features like versioning and i18n.

**Negative:**

- Learning curve for Docusaurus-specific configurations.
- Slightly higher build times compared to lighter alternatives.
- Dependency on React ecosystem, which may require updates for security.

**Rationale:** Docusaurus aligns with MCP's memory-centric architecture by enabling intelligent content population and drift detection, as seen in tools like `mcp_documcp_sync_code_to_docs`. This decision builds on existing ADRs (e.g., ADR-001 for protocol strategy) by ensuring docs remain a living reflection of the codebase.

## Implementation Status

**Last Updated**: 2025-12-15  
**Implementation**: ✅ Complete

### Current Implementation

- ✅ **Docusaurus Configuration**: `docs/docusaurus.config.js` exists and configured
- ✅ **Dependencies**: Docusaurus packages installed in `docs/package.json`
- ✅ **Navigation**: Sidebar configuration in `docs/sidebars.js`
- ✅ **Documentation Structure**: Diataxis-compliant structure implemented
- ✅ **GitHub Pages**: Deployment configured and functional
- ✅ **Search**: Built-in search functionality operational

### Implementation Files

- `docs/docusaurus.config.js` - Main Docusaurus configuration
- `docs/package.json` - Docusaurus dependencies
- `docs/sidebars.js` - Navigation sidebar configuration
- `docs/index.md` - Homepage
- `docs/diataxis-index.md` - Documentation navigation

### Status Note

This ADR was initially marked as "Proposed" but Docusaurus has been fully implemented and is in active use. Status updated to "Accepted" to reflect implementation reality.

## Related ADRs

- ADR-001: MCP Protocol Implementation Strategy (protocol foundation)
- ADR-007: CI/CD Pipeline Strategy (documentation CI gates)
- ADR-008: Development Workflow Strategy (documentation updates in workflow)
