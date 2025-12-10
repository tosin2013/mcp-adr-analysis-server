# ADR-001: MCP Protocol Implementation Strategy

## Status

Accepted

## Context

The MCP ADR Analysis Server requires implementation of the Model Context Protocol (MCP) for communication with AI systems. The selection of transport protocol, message format, and tool architecture significantly impacts system performance, maintainability, and extensibility. The project requires a solution that balances compatibility, simplicity, and future extensibility while supporting dynamic tool integration.

## Decision

We will implement MCP using Server-Sent Events (SSE) as the primary transport protocol with JSON-RPC for message formatting, combined with a plugin-based tool architecture for extensibility. This approach provides HTTP/1.1 compatibility, simplifies client implementation, and enables dynamic tool registration without requiring core system modifications.

## Consequences

**Positive:**

- Enhanced HTTP compatibility with existing infrastructure
- Simplified client implementation due to SSE's straightforward nature
- Improved maintainability through modular plugin architecture
- Easier debugging and monitoring with standard HTTP tools
- Dynamic tool registration and extension without system restarts

**Negative:**

- Potentially higher latency compared to WebSockets for high-frequency messaging
- Increased complexity in managing tool interaction and lifecycle
- Additional overhead for plugin management and dependency resolution
- Requires careful state management in stateless HTTP connections

## Evolution Notes (2025)

> **CE-MCP Paradigm Shift**: This ADR documents the original MCP implementation strategy (November 2024). As of 2025, the CE-MCP (Code Execution with MCP) paradigm has been adopted as a recommended best practice. See **ADR-014** for the evolution of this architecture.

**Key Changes in CE-MCP:**

- MCP's role shifts from direct tool-calling to standardized RPC interface consumed by AI-generated code
- LLM generates orchestration scripts rather than making sequential tool calls
- Intermediate results remain in sandbox memory rather than passing through context
- Progressive tool discovery replaces monolithic upfront loading

**This ADR Remains Valid For:**

- SSE transport protocol selection
- JSON-RPC message formatting
- Plugin-based tool architecture foundation

**Superseded By ADR-014 For:**

- Tool loading strategy (now progressive discovery)
- Context management patterns (now sandbox-based)
- Tool invocation flow (now code-generated orchestration)

## Related ADRs

- ADR-014: CE-MCP Architecture (evolves this ADR)
