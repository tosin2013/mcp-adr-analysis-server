---
sidebar_position: 99
---

# Glossary

Key terms used throughout the MCP ADR Analysis Server documentation.

## ADR (Architectural Decision Record)

A short document that captures an important architectural decision, including the context, the decision itself, and its consequences. ADRs provide a log of decisions that affect a project's structure and behavior. This project follows the [Nygard template](https://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions).

## AST (Abstract Syntax Tree)

A tree representation of the syntactic structure of source code. The server uses AST analysis (via tree-sitter) to understand code patterns, detect architectural decisions embedded in code, and perform intelligent code linking.

## Firecrawl

An optional web scraping and content extraction service that enhances the server's research capabilities. When enabled, it allows tools like `llm_web_search` to gather real-time information from the web for more comprehensive ADR generation. See the [Firecrawl Setup Guide](../how-to-guides/firecrawl-setup.md).

## Knowledge Graph

An in-memory data structure maintained by the server that models relationships between ADRs, code implementations, technology decisions, and their impacts. It powers intelligent features like pattern recognition and cross-ADR dependency analysis.

## MCP (Model Context Protocol)

An open protocol created by Anthropic that enables AI assistants to connect to external tools and data sources. MCP defines a standard way for clients (like Claude Desktop) to discover and invoke tools provided by servers (like this one). See the [official specification](https://modelcontextprotocol.io/).

## OpenRouter

An API gateway that provides access to multiple AI models (Claude, GPT, Gemini, etc.) through a single API key. The server uses OpenRouter for AI-powered analysis in "full" execution mode. Sign up at [openrouter.ai](https://openrouter.ai/).

## Ripgrep

A fast text search tool (`rg`) used by the server for code search operations such as Smart Code Linking. It searches file contents significantly faster than traditional `grep`. The server uses it alongside fast-glob for file matching.

## tree-sitter

An incremental parsing library that builds and maintains ASTs for source code. The server uses tree-sitter to analyze code in multiple languages (TypeScript, Python, Java, Go, etc.) without executing it, enabling language-aware architectural analysis.
