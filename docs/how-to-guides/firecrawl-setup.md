# 🔥 How-To: Setup Firecrawl Integration

**Goal**: Enable web research capabilities for enhanced architectural analysis and comprehensive ADR generation.

**When to use this guide**: When you want to add web search and research capabilities to your MCP ADR Analysis Server for more comprehensive architectural decision-making.

---

## 🎯 What is Firecrawl?

Firecrawl provides intelligent web scraping and content extraction, enabling the MCP ADR Analysis Server to:

- **Research Best Practices** - Find current architectural patterns and recommendations
- **Gather External Context** - Access technical documentation, blogs, and case studies
- **Enhance ADRs** - Generate more comprehensive decision records with real-world examples
- **Intelligent Scraping** - Extract relevant content from complex web pages

---

## 🚀 Quick Setup

### **Option 1: Cloud Service (Recommended)**

**Best for**: Most users, easy setup, no infrastructure management

```bash
# 1. Get your API key from https://firecrawl.dev
# Sign up and get your API key (starts with "fc-")

# 2. Configure environment variables
export FIRECRAWL_ENABLED="true"
export FIRECRAWL_API_KEY="fc-your-api-key-here"

# 3. Test the integration
mcp-adr-analysis-server --test
```

### **Option 2: Self-Hosted**

**Best for**: Enterprise users, privacy concerns, custom configurations

```bash
# 1. Run Firecrawl locally with Docker
docker run -p 3000:3000 firecrawl/firecrawl

# 2. Configure environment variables
export FIRECRAWL_ENABLED="true"
export FIRECRAWL_BASE_URL="https://localhost:3000"

# 3. Test the integration
mcp-adr-analysis-server --test
```

### **Option 3: Disabled (Default)**

**Best for**: Users who don't need web search capabilities

```bash
# Firecrawl is disabled by default
# Server works perfectly without web search
# No configuration needed
```

---

## 🔧 Detailed Configuration

### **Environment Variables**

| Variable             | Required | Default                  | Description                  |
| -------------------- | -------- | ------------------------ | ---------------------------- |
| `FIRECRAWL_ENABLED`  | No       | `false`                  | Enable Firecrawl integration |
| `FIRECRAWL_API_KEY`  | No\*     | -                        | API key for cloud service    |
| `FIRECRAWL_BASE_URL` | No       | `https://localhost:3000` | Self-hosted instance URL     |

\*Required if using cloud service

### **Configuration Examples**

#### **Development Environment**

```bash
# .env.development
FIRECRAWL_ENABLED="true"
FIRECRAWL_API_KEY="fc-dev-key-here"
LOG_LEVEL="DEBUG"
```

#### **Production Environment**

```bash
# .env.production
FIRECRAWL_ENABLED="true"
FIRECRAWL_BASE_URL="https://firecrawl:3000"
LOG_LEVEL="INFO"
```

#### **CI/CD Environment**

```bash
# .env.ci
FIRECRAWL_ENABLED="false"  # Disable for CI performance
LOG_LEVEL="ERROR"
```

### **MCP Client Configuration**

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "fc-your-api-key-here"
      }
    }
  }
}
```

---

## 🧪 Testing Firecrawl Integration

### **Basic Test**

```bash
# Test if Firecrawl is properly configured
mcp-adr-analysis-server --test

# Look for this output:
# ✅ Firecrawl integration: ENABLED
# ✅ Firecrawl connection: SUCCESS
```

### **Advanced Test**

```bash
# Test web search functionality
mcp-adr-analysis-server --test-web-search

# Expected output:
# 🔍 Testing web search capabilities...
# ✅ Web search: SUCCESS
# ✅ Content extraction: SUCCESS
# ✅ Relevance scoring: SUCCESS
```

### **Manual Test**

```typescript
// Test in your MCP client
const result = await llm_web_search({
  query: 'microservices architecture best practices 2024',
  maxResults: 3,
  includeContent: true,
});

console.log(result);
// Should return relevant web content with relevance scores
```

---

## 🛠️ Firecrawl-Enhanced Tools

When Firecrawl is enabled, these tools gain enhanced capabilities:

### **`llm_web_search`**

- **Purpose**: Intelligent web search with relevance scoring
- **Enhanced with**: Real-time content extraction and analysis
- **Use case**: Research architectural patterns and best practices

### **`llm_cloud_management`**

- **Purpose**: Cloud provider research and recommendations
- **Enhanced with**: Current pricing, features, and best practices
- **Use case**: Make informed cloud architecture decisions

### **`llm_database_management`**

- **Purpose**: Database technology research and recommendations
- **Enhanced with**: Performance benchmarks and real-world usage
- **Use case**: Select optimal database technologies

### **Research Orchestrator**

- **Purpose**: Multi-source research with confidence scoring
- **Enhanced with**: Web search as additional research source
- **Use case**: Comprehensive architectural analysis

---

## 🚨 Troubleshooting

### **Common Issues**

#### **"Firecrawl integration: DISABLED"**

```bash
# Check if FIRECRAWL_ENABLED is set
echo $FIRECRAWL_ENABLED

# If not set, enable it
export FIRECRAWL_ENABLED="true"
```

#### **"Firecrawl connection: FAILED"**

```bash
# Check API key format
echo $FIRECRAWL_API_KEY
# Should start with "fc-" for cloud service

# Check base URL for self-hosted
echo $FIRECRAWL_BASE_URL
# Should be accessible (test with curl)
curl "$FIRECRAWL_BASE_URL/health"
```

#### **"Web search: FAILED"**

```bash
# Check network connectivity
curl -I https://firecrawl.dev

# Check API key validity
curl -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
     https://api.firecrawl.dev/v0/health
```

#### **"Content extraction: FAILED"**

```bash
# Check if target URLs are accessible
curl -I "https://example.com"

# Check Firecrawl service status
curl "$FIRECRAWL_BASE_URL/health"
```

### **Debug Mode**

```bash
# Enable debug logging
export LOG_LEVEL="DEBUG"

# Run with verbose output
mcp-adr-analysis-server --test --verbose

# Check logs for detailed error information
```

### **Fallback Behavior**

The server gracefully handles Firecrawl failures:

- **Web search fails**: Falls back to local analysis only
- **Content extraction fails**: Uses cached results if available
- **API rate limits**: Implements exponential backoff
- **Network issues**: Continues with local capabilities

---

## 📊 Performance Considerations

### **Response Times**

- **Web search**: 2-5 seconds per query
- **Content extraction**: 1-3 seconds per page
- **Relevance scoring**: 0.5-1 second per result

### **Rate Limits**

- **Cloud service**: 100 requests/minute (free tier)
- **Self-hosted**: No rate limits (depends on your infrastructure)

### **Caching**

- **Research results**: 5-minute TTL
- **Web content**: 1-hour TTL
- **Relevance scores**: 24-hour TTL

### **Optimization Tips**

```bash
# Use self-hosted for high-volume usage
export FIRECRAWL_BASE_URL="https://your-firecrawl-instance:3000"

# Enable caching for better performance
export AI_CACHE_ENABLED="true"
export CACHE_TTL="3600"  # 1 hour

# Limit concurrent requests
export MAX_CONCURRENT_REQUESTS="5"
```

---

## 🔒 Security Considerations

### **API Key Security**

```bash
# Never commit API keys to version control
echo "FIRECRAWL_API_KEY=fc-*" >> .gitignore

# Use environment-specific keys
export FIRECRAWL_API_KEY="fc-dev-key"  # Development
export FIRECRAWL_API_KEY="fc-prod-key" # Production
```

### **Self-Hosted Security**

```bash
# Use HTTPS in production
export FIRECRAWL_BASE_URL="https://firecrawl.yourcompany.com"

# Implement authentication
export FIRECRAWL_AUTH_TOKEN="your-auth-token"

# Restrict network access
# Only allow access from your MCP server
```

### **Content Filtering**

```bash
# Filter sensitive domains
export FIRECRAWL_BLOCKED_DOMAINS="internal.company.com,private.*"

# Enable content sanitization
export FIRECRAWL_SANITIZE_CONTENT="true"
```

---

## 📚 Further Reading

- **[Environment Configuration](../reference/environment-config.md)** - Complete configuration reference
- **[API Reference](../reference/api-reference.md)** - Firecrawl-enhanced tools documentation
- **[Research Integration](../how-to-guides/research-integration.md)** - Using web research in workflows
- **[Troubleshooting Guide](./troubleshooting.md)** - Common issues and solutions

---

**Need help with Firecrawl setup?** → **[Join the Discussion](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**

**Firecrawl issues?** → **[Check Troubleshooting](./troubleshooting.md#firecrawl-integration-issues)**
