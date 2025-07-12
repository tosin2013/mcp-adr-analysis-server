# Changelog

All notable changes to the MCP ADR Analysis Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.4] - 2025-01-12

### 🚀 UNIVERSAL LLM COMPATIBILITY & FILE SYSTEM REVOLUTION

This release transforms the MCP ADR Analysis Server from a prompt-only system to a **hybrid intelligent architecture** that provides universal compatibility with all LLM providers while delivering sophisticated AI-enhanced analysis.

### ✨ Added

#### Universal LLM Provider Compatibility
- **NEW**: Three fundamental file system tools for universal LLM compatibility:
  - `read_file` - Read contents of any file with security validation
  - `write_file` - Write content to files with proper permissions
  - `list_directory` - List directory contents with filtering
- **BREAKTHROUGH**: Fixed Google Gemini "tool didn't function as expected" error
- **ENHANCED**: All MCP tools now work with Claude, Gemini, OpenAI, and any LLM provider

#### Intelligent Hybrid Architecture
- **NEW**: `src/utils/adr-discovery.js` - Actual ADR file reading and parsing engine
- **NEW**: `src/utils/actual-file-operations.js` - Comprehensive project structure scanning
- **ENHANCED**: Internal AI processing with intelligent fallback strategy
- **SMART**: Tools return either AI analysis or structured prompts based on capabilities

#### Enhanced File Operations
- **ADDED**: Shell script detection and analysis (`.sh`, `.bash` files)
- **IMPROVED**: Project structure scanning with configurable content reading
- **SECURITY**: Path validation and sandboxing for all file operations
- **PERFORMANCE**: Intelligent file filtering and content truncation

### 🔧 Fixed

#### Critical LLM Compatibility Issues
- **RESOLVED**: Google Gemini compatibility - now receives actual file content instead of prompts
- **FIXED**: OpenAI integration issues with file system operations  
- **CORRECTED**: Template-based responses vs actual analysis confusion

#### Tool Implementation Fixes
- **FIXED**: `rule-generation-tool` now reads ADR files directly using `discoverAdrsInDirectory()`
- **FIXED**: `research-question-tool` uses actual file operations via `scanProjectStructure()`
- **FIXED**: `content-masking-tool` performs real project analysis instead of prompts
- **FIXED**: `research-integration-tool` reads and writes files directly
- **FIXED**: `deployment-analysis-tool` reads actual ADR and TODO file content

#### TypeScript & Build Issues
- **RESOLVED**: All TypeScript strict mode compliance issues
- **FIXED**: Type errors in research-integration.ts with proper function annotations
- **CORRECTED**: CommonJS import issues with fast-glob package
- **IMPROVED**: Unused variable warnings and missing property issues

### 🏗️ Architecture Changes

#### Before vs After Transformation
```
BEFORE (2.2.0):
LLM Client → MCP Server → Generate Prompt Template → Return Template
↳ Client must process externally (❌ Failed with Gemini/OpenAI)

AFTER (2.0.4): 
LLM Client → MCP Server → Read Actual Files → AI Processing → Smart Response
↳ Returns either AI insights or structured data (✅ Works with all LLMs)
```

#### New Communication Flow
- **Enhanced**: MCP protocol handling with proper JSON-RPC validation
- **Improved**: Security validation with absolute path requirements
- **Added**: Comprehensive error handling and graceful fallbacks
- **Streamlined**: Resource and prompt management

### 🛡️ Security Enhancements

#### File System Security
```typescript
// Path security validation
if (!path.isAbsolute(filePath)) {
  throw new McpAdrError('File path must be absolute', 'INVALID_PATH');
}

// Project boundary validation  
if (!filePath.startsWith(projectPath)) {
  throw new McpAdrError('Access denied: file outside project', 'ACCESS_DENIED');
}
```

#### Content Protection
- **ENHANCED**: Sensitive data detection and masking
- **IMPROVED**: Pattern-based content filtering
- **ADDED**: Project boundary enforcement
- **SECURED**: Validation for all file operations

### 📊 Performance Improvements

#### Caching & Optimization
- **IMPROVED**: File content caching with TTL management
- **OPTIMIZED**: Lazy loading of utility modules  
- **ENHANCED**: Intelligent file filtering based on content type
- **ADDED**: Configurable project scanning limits

#### Resource Management
- **REDUCED**: Memory usage through streaming file operations
- **IMPROVED**: Response time with efficient file reading
- **ENHANCED**: Error handling to prevent resource leaks

### 📚 Documentation

#### New Architecture Documentation
- **NEW**: `docs/architecture-overview.md` - Comprehensive architecture documentation
- **ADDED**: Mermaid diagrams showing communication flow and system architecture
- **ENHANCED**: Integration examples for different LLM providers
- **IMPROVED**: Security and deployment guidance

#### Technical Specifications  
- **DETAILED**: File system tool implementation examples
- **COMPREHENSIVE**: AI integration patterns and fallback strategies
- **PRACTICAL**: Migration notes for existing users

### 🔄 Migration & Compatibility

#### Backward Compatibility
- **✅ FULLY COMPATIBLE**: All existing tool calls continue to work
- **✅ ENHANCED RESULTS**: Better analysis with actual file content
- **✅ NO BREAKING CHANGES**: Existing configurations unchanged

#### For Existing Users
- **AUTOMATIC**: Improved results without configuration changes
- **ENHANCED**: More reliable analysis across all LLM providers  
- **ROBUST**: Better error handling and validation

#### For New Users
- **SIMPLIFIED**: Easier setup with universal LLM compatibility
- **COMPREHENSIVE**: Full feature access regardless of LLM provider
- **RELIABLE**: Consistent behavior and error handling

### 🎯 Impact Summary

This release transforms the MCP ADR Analysis Server into a **universal intelligent platform**:

1. **🌐 Universal Compatibility**: Works with any LLM provider (Claude, Gemini, OpenAI, etc.)
2. **🧠 Intelligent Processing**: Actual file analysis with AI-enhanced insights  
3. **🔒 Robust Security**: Validated file operations with content protection
4. **⚡ Enhanced Performance**: Optimized caching and resource management
5. **🛠️ Developer-Friendly**: Better error handling and comprehensive documentation

The server evolution: **Prompt Generator** → **Intelligent Analysis Platform**

### 🔗 Related Links

- [Architecture Overview](docs/architecture-overview.md) - Complete system architecture documentation
- [Usage Guide](docs/USAGE_GUIDE.md) - Comprehensive usage instructions
- [Repository](https://github.com/tosin2013/mcp-adr-analysis-server) - Source code and issues

---

## [2.2.0] - 2025-01-03

### 🎯 WORKFLOW & DEVELOPMENT GUIDANCE SYSTEM

This release introduces **intelligent workflow guidance** and **development guidance** tools that create a complete development lifecycle assistant, plus critical path resolution fixes.

### ✨ Added

#### Workflow & Development Guidance Tools
- **`get_workflow_guidance`**: Intelligent workflow advisor that recommends optimal tool sequences
  - Context-aware tool recommendations based on project goals
  - Alternative workflow paths with timeline estimates
  - Success metrics and best practices guidance
  - Integration with all 25 MCP tools for comprehensive workflows

- **`get_development_guidance`**: Development implementation assistant
  - Translates architectural decisions into specific coding tasks
  - Phase-specific guidance (planning, implementation, testing, deployment)
  - Technology stack-aware recommendations
  - Team context consideration (size, experience level)
  - ADR-to-code translation with implementation patterns

- **`check_ai_execution_status`**: Diagnostic tool for AI execution troubleshooting
  - Real-time configuration status checking
  - Step-by-step fix instructions for common issues
  - Environment variable validation and guidance

#### Path Resolution Fixes
- **Fixed ADR directory path resolution**: All tools now correctly resolve ADR paths relative to PROJECT_PATH
- **Enhanced `get_architectural_context`**: Automatic ADR infrastructure setup with outcome-focused workflows
- **Improved file system operations**: Consistent project-relative path handling across all tools

#### Documentation Enhancements
- **New guide**: `docs/getting-started-workflow-guidance.md` - Comprehensive workflow guidance tutorial
- **Updated README.md**: Complete development lifecycle examples and tool integration
- **Enhanced troubleshooting**: Built-in diagnostic tool guidance

## [2.1.0] - 2025-01-03

### 🤖 AI EXECUTION ENGINE INTEGRATION

This release introduced **AI-powered execution capabilities** that transform the MCP server from returning prompts to returning actual results, solving the fundamental UX issue where AI agents receive prompts instead of actionable data.

### ✨ Added

#### OpenRouter.ai Integration
- **`src/config/ai-config.ts`**: Comprehensive AI configuration management
  - Support for multiple AI models (Claude, GPT-4, etc.)
  - Environment variable configuration with validation
  - Cost optimization and performance tuning options
  - Model selection based on use case and budget

- **`src/utils/ai-executor.ts`**: Core AI execution service
  - OpenRouter.ai API integration with OpenAI SDK compatibility
  - Intelligent caching system with configurable TTL
  - Retry mechanisms with exponential backoff
  - Token usage tracking and optimization
  - Error handling with graceful fallback to prompt-only mode

- **`src/utils/prompt-execution.ts`**: Hybrid execution utilities
  - Execute prompts with AI when enabled, return prompts when disabled
  - Specialized execution functions for different tool types
  - Response formatting for MCP tool compatibility
  - AI execution status monitoring and configuration

#### Enhanced Tool Capabilities
- **TRANSFORMED**: `suggest_adrs` now generates actual ADR suggestions using AI
- **TRANSFORMED**: `generate_adr_from_decision` creates complete ADRs automatically
- **ENHANCED**: All tools support both AI execution and prompt-only modes
- **IMPROVED**: Consistent response formatting with AI metadata

#### Environment Configuration
- **NEW**: `.env.example` with comprehensive configuration options
- **NEW**: Support for 4 AI models with cost/performance trade-offs
- **NEW**: Execution mode switching (`full` vs `prompt-only`)
- **NEW**: Performance tuning (temperature, tokens, timeout, retries)

### 🔧 Configuration

#### Required Environment Variables (for AI execution)
```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
EXECUTION_MODE=full
AI_MODEL=anthropic/claude-3-sonnet
```

#### Optional Performance Tuning
```bash
AI_TEMPERATURE=0.1          # Response consistency (0-1)
AI_MAX_TOKENS=4000          # Response length limit
AI_TIMEOUT=60000            # Request timeout (ms)
AI_MAX_RETRIES=3            # Retry attempts
AI_CACHE_ENABLED=true       # Enable response caching
AI_CACHE_TTL=3600           # Cache lifetime (seconds)
```

### 📊 Supported AI Models

| Model | Provider | Use Case | Input Cost | Output Cost |
|-------|----------|----------|------------|-------------|
| `anthropic/claude-3-sonnet` | Anthropic | Analysis, reasoning | $3.00/1K | $15.00/1K |
| `anthropic/claude-3-haiku` | Anthropic | Quick tasks | $0.25/1K | $1.25/1K |
| `openai/gpt-4o` | OpenAI | Versatile analysis | $5.00/1K | $15.00/1K |
| `openai/gpt-4o-mini` | OpenAI | Cost-effective | $0.15/1K | $0.60/1K |

### 🔄 Migration Guide

#### Backward Compatibility
- **✅ Fully backward compatible**: Existing configurations continue to work
- **✅ Graceful fallback**: AI execution failures fall back to prompt-only mode
- **✅ No breaking changes**: All existing tools maintain their interfaces

#### Upgrading to AI Execution
1. Get OpenRouter API key from https://openrouter.ai/keys
2. Add environment variables to your configuration
3. Restart the MCP server
4. Tools will now return actual results instead of prompts

### 📚 Documentation Updates
- **ENHANCED**: README with comprehensive AI execution setup guide
- **ADDED**: Troubleshooting section for AI execution issues
- **ADDED**: Configuration examples for different use cases
- **IMPROVED**: Environment variable documentation with examples

## [2.0.0] - 2025-01-03

### 🚀 MAJOR ARCHITECTURAL TRANSFORMATION

This release represents a complete architectural transformation from a mixed data processing approach to a **100% prompt-driven architecture**. The server now acts as a pure prompt orchestrator, delegating all file operations and data processing to AI agents while maintaining full MCP functionality.

### ✨ Added

#### New Prompt Composition Framework
- **`src/utils/prompt-composition.ts`**: Comprehensive prompt composition utilities
  - `combinePrompts()`: Merge multiple prompt objects with metadata tracking
  - `createAIDelegationPrompt()`: Standardized AI task delegation patterns
  - `addJSONSchema()`: Embed JSON schema specifications for structured responses
  - `validatePromptResponse()`: Validate AI responses against expected formats
  - `CommonSchemas`: Pre-defined JSON schemas for ADR lists, file analysis, and project structure
  - 17 exported functions and interfaces for consistent prompt composition

#### Enhanced Documentation
- **`docs/README.md`**: Comprehensive usage documentation
- **`docs/USAGE_GUIDE.md`**: Detailed usage guide with examples
- **`docs/getting-started-*.md`**: Getting started guides for different scenarios
- **`docs/mcp-logging-fix.md`**: MCP logging configuration guide

#### Testing and Configuration
- **`mcp-test-config.json`**: MCP testing framework configuration
- **`config/`**: Enhanced configuration management
- **`scripts/test-mcp-logging.ts`**: MCP logging test utilities

### 🔄 Changed

#### Complete Prompt-Driven Conversion
- **Resources Module** (`src/resources/index.ts`):
  - Converted from data processing to pure prompt composition
  - All architectural knowledge graphs now generated via AI delegation
  - Eliminated direct file system operations in favor of prompt instructions

- **Tools Module**:
  - **`src/tools/content-masking-tool.ts`**: Converted to prompt-based pattern configuration
  - **`src/tools/adr-suggestion-tool.ts`**: Enhanced with AI delegation patterns
  - All tools now generate comprehensive prompts instead of processing data directly

- **Utility Modules** (Complete transformation of 5 modules):
  - **`src/utils/deployment-analysis.ts`**: ADR-based deployment analysis via prompts
  - **`src/utils/environment-analysis.ts`**: Environment specification analysis via AI
  - **`src/utils/research-integration.ts`**: Research topic extraction via prompt delegation
  - **`src/utils/research-questions.ts`**: Pattern-based research question generation
  - **`src/utils/rule-generation.ts`**: Architectural rule extraction via AI agents

#### File System Architecture
- **`src/utils/file-system.ts`**: 
  - Converted `analyzeProjectStructure()` to return `ProjectAnalysisPrompt` objects
  - `findFiles()` now generates file discovery prompts for AI execution
  - Eliminated direct file reading in favor of AI delegation instructions

#### Core Server Enhancements
- **`src/index.ts`**: 
  - Enhanced MCP tool implementations with prompt composition
  - Improved error handling and logging
  - Better configuration management integration

### 🛠️ Technical Improvements

#### TypeScript Error Resolution
- **Resolved 59 TypeScript compilation errors** through architectural conversion
- Eliminated all `ProjectStructure` type mismatches by converting to prompt patterns
- Removed array method usage on prompt objects (`.length`, `.map()`, `.reduce()`)
- Fixed property access errors (`.totalFiles`, `.totalDirectories`) on prompt objects

#### Code Quality Enhancements
- Removed unused functions and imports across all modules
- Standardized prompt composition patterns
- Enhanced type safety with comprehensive interfaces
- Improved error handling and validation

#### Build and Testing
- **All tests passing**: Fixed config.test.ts path mismatch issue
- **Clean compilation**: `make lint && npm run build` completes without errors
- **Enhanced CI/CD**: Improved GitHub Actions workflow compatibility

### 🔧 Fixed

- **TypeScript Compilation**: Resolved all 59 compilation errors
- **Test Suite**: Fixed failing config test for cross-platform compatibility
- **Import Dependencies**: Cleaned up unused imports and circular dependencies
- **Type Safety**: Eliminated implicit 'any' types and property access errors

### 💥 Breaking Changes

#### API Changes
- **All utility functions now return prompt objects** instead of processed data
- **Function signatures changed** from returning data to returning `{ prompt: string, instructions: string }`
- **File system operations** now delegate to AI agents rather than performing direct operations

#### Migration Guide
For users upgrading from v1.x:

1. **Tool Usage**: All MCP tools now return comprehensive prompts for AI execution
2. **Integration**: Submit returned prompts to AI agents for actual processing
3. **Response Handling**: Parse AI responses according to provided JSON schemas
4. **Configuration**: No configuration changes required - all changes are internal

#### Compatibility
- **MCP Protocol**: Fully compatible - all tools maintain proper MCP response formats
- **Node.js**: Requires Node.js >=20.0.0 (unchanged)
- **Dependencies**: No breaking dependency changes

### 🎯 Benefits of 2.0.0 Architecture

#### Performance & Scalability
- **Reduced Server Load**: File operations delegated to AI agents
- **Improved Responsiveness**: Server focuses on prompt generation only
- **Better Resource Management**: Eliminated memory-intensive data processing

#### Maintainability
- **Simplified Codebase**: Clear separation between prompt generation and data processing
- **Consistent Patterns**: Standardized prompt composition across all modules
- **Enhanced Extensibility**: Easy addition of new prompt-driven tools

#### AI Integration
- **Maximized AI Leverage**: Full utilization of AI capabilities for complex operations
- **Structured Responses**: JSON schema specifications ensure consistent AI outputs
- **Quality Validation**: Built-in response validation and error handling

### 📊 Statistics

- **Files Modified**: 14 core files transformed
- **New Files Added**: 8 new files (utilities, documentation, configuration)
- **TypeScript Errors**: 59 → 0 (100% resolution)
- **Test Coverage**: All 23 tests passing
- **Architecture**: 100% prompt-driven implementation achieved

---

## [1.1.1] - 2024-12-XX

### Fixed
- GitHub Actions workflow NPM package creation issue
- Removed obsolete npm-package/.npmignore creation

## [1.0.0] - 2024-12-XX

### Added
- Initial MCP ADR Analysis Server implementation
- Basic ADR analysis and architectural decision support
- MCP protocol integration
- Core utility functions for project analysis

---

**Note**: Version 2.0.0 represents a fundamental architectural shift that maintains full backward compatibility at the MCP protocol level while completely transforming the internal implementation to leverage AI agents for all data processing operations.
