/**
 * Security-focused prompts for content masking and secret detection
 * Following prompt-driven development approach
 */

/**
 * AI prompt for detecting sensitive information patterns in content
 */
export function generateSensitiveContentDetectionPrompt(
  content: string,
  contentType: 'code' | 'documentation' | 'configuration' | 'logs' | 'general' = 'general',
  userDefinedPatterns?: string[]
): string {
  return `
# Sensitive Information Detection Guide

**Note: Use this as guidance for analyzing the content to identify sensitive information that should be masked or redacted. Focus on the most critical security patterns for this specific content type.**

## Content Type
${contentType}

## Content to Analyze
\`\`\`
${content.slice(0, 5000)}${content.length > 5000 ? '\n... (content truncated for analysis)' : ''}
\`\`\`

${
  userDefinedPatterns
    ? `## User-Defined Sensitive Patterns
${userDefinedPatterns.map(pattern => `- ${pattern}`).join('\n')}
`
    : ''
}

## Suggested Detection Categories (focus on what's applicable)

Consider identifying instances of sensitive information from these categories where relevant:

### 🔑 **API Keys & Tokens**
- API keys (AWS, Google, GitHub, Stripe, etc.)
- Access tokens, bearer tokens, JWT tokens
- OAuth client secrets and refresh tokens
- Service account keys and credentials
- Database connection tokens

### 🔐 **Credentials & Authentication**
- Passwords, passphrases, PINs
- Private keys (RSA, SSH, SSL/TLS certificates)
- Database usernames and passwords
- SMTP credentials
- FTP/SFTP credentials

### 🌐 **Connection Strings & URLs**
- Database connection strings with credentials
- Redis/MongoDB connection URLs with auth
- SMTP server configurations with passwords
- Internal URLs with embedded credentials
- Cloud service endpoints with keys

### 📧 **Personal & Sensitive Data**
- Email addresses (unless clearly public)
- Phone numbers
- IP addresses (internal/private ranges)
- Social Security Numbers, credit card numbers
- Personal names in sensitive contexts

### 🏢 **Business Sensitive Information**
- Internal server names and hostnames
- Internal network configurations
- Proprietary algorithms or business logic
- Customer data or identifiers
- Financial information

## Suggested Output Format

The following JSON structure provides a template for organizing your security analysis (adapt fields as needed):

\`\`\`json
{
  "hasSensitiveContent": true/false,
  "detectedItems": [
    {
      "type": "api_key|password|private_key|connection_string|email|phone|ip_address|other",
      "category": "authentication|network|personal|business|crypto",
      "content": "the actual sensitive content found",
      "startPosition": 123,
      "endPosition": 156,
      "confidence": 0.0-1.0,
      "reasoning": "why this is considered sensitive",
      "severity": "low|medium|high|critical",
      "suggestedMask": "how to mask this content"
    }
  ],
  "recommendations": [
    "specific recommendations for handling this content"
  ],
  "overallRisk": "low|medium|high|critical",
  "summary": "brief summary of findings"
}
\`\`\`

## Detection Guidelines

1. **Be Conservative**: When in doubt, flag as potentially sensitive
2. **Context Matters**: Consider the context and content type
3. **Confidence Scoring**: Rate your confidence in each detection
4. **Severity Assessment**: Evaluate the risk level of exposure
5. **Practical Masking**: Suggest appropriate masking strategies

## Masking Strategies

- **Full Redaction**: \`[REDACTED]\` for highly sensitive content
- **Partial Masking**: \`sk-...****\` for API keys (show prefix only)
- **Type Indication**: \`[API_KEY_REDACTED]\` for specific types
- **Placeholder**: \`<YOUR_API_KEY>\` for documentation examples
- **Environment Variable**: \`\${API_KEY}\` for configuration templates

Please analyze thoroughly and provide detailed, actionable results.
`;
}

/**
 * AI prompt for intelligent content masking decisions
 */
export function generateContentMaskingPrompt(
  content: string,
  detectedSensitiveItems: Array<{
    type: string;
    content: string;
    startPosition: number;
    endPosition: number;
    severity: string;
  }>,
  maskingStrategy: 'full' | 'partial' | 'placeholder' | 'environment' = 'full'
): string {
  return `
# Content Masking Request

Please apply intelligent masking to the following content based on detected sensitive information.

## Original Content
\`\`\`
${content}
\`\`\`

## Detected Sensitive Items
${detectedSensitiveItems
  .map(
    (item, index) => `
### Item ${index + 1}
- **Type**: ${item.type}
- **Content**: ${item.content}
- **Position**: ${item.startPosition}-${item.endPosition}
- **Severity**: ${item.severity}
`
  )
  .join('')}

## Masking Strategy
${maskingStrategy}

## Masking Requirements

Please apply appropriate masking based on the strategy:

### **Full Masking**
- Replace entire sensitive content with \`[REDACTED]\`
- Maintain original content structure and readability
- Preserve context for understanding

### **Partial Masking**
- Show safe prefix/suffix, mask middle portion
- API keys: \`sk-...****\` or \`ghp_...****\`
- Emails: \`user...@domain.com\`
- IPs: \`192.168.*.***\`

### **Placeholder Masking**
- Replace with descriptive placeholders
- \`<YOUR_API_KEY>\`, \`<DATABASE_PASSWORD>\`
- Maintain documentation value

### **Environment Variable Masking**
- Replace with environment variable references
- \`\${API_KEY}\`, \`\${DATABASE_URL}\`
- Suitable for configuration files

## Output Format

Please provide the masked content in the following JSON format:

\`\`\`json
{
  "maskedContent": "the content with sensitive information masked",
  "maskingApplied": [
    {
      "originalContent": "sensitive content that was masked",
      "maskedWith": "what it was replaced with",
      "position": "start-end position",
      "reason": "why this masking approach was chosen"
    }
  ],
  "preservedStructure": true/false,
  "readabilityScore": 0.0-1.0,
  "securityScore": 0.0-1.0,
  "recommendations": [
    "additional security recommendations"
  ]
}
\`\`\`

## Masking Guidelines

1. **Preserve Functionality**: Don't break code syntax or structure
2. **Maintain Context**: Keep enough context for understanding
3. **Consistent Approach**: Use consistent masking patterns
4. **Documentation Friendly**: Ensure masked content is still useful
5. **Security First**: Prioritize security over convenience

Please apply intelligent masking that balances security with usability.
`;
}

/**
 * AI prompt for user-defined sensitive pattern configuration
 */
export function generateCustomPatternConfigurationPrompt(
  projectContext: string,
  existingPatterns?: string[]
): string {
  return `
# Custom Sensitive Pattern Configuration

Please help configure custom sensitive information patterns for this specific project.

## Project Context
\`\`\`
${projectContext}
\`\`\`

${
  existingPatterns
    ? `## Existing Patterns
${existingPatterns.map(pattern => `- ${pattern}`).join('\n')}
`
    : ''
}

## Configuration Requirements

Based on the project context, please suggest custom sensitive patterns that should be detected and masked.

Consider:

### **Project-Specific Patterns**
- Custom API endpoints or service URLs
- Internal service names or identifiers
- Project-specific configuration keys
- Custom authentication schemes
- Business-specific data formats

### **Technology-Specific Patterns**
- Framework-specific configuration patterns
- Database-specific connection formats
- Cloud provider specific identifiers
- Container orchestration secrets
- CI/CD specific variables

### **Domain-Specific Patterns**
- Industry-specific identifiers
- Regulatory compliance requirements
- Customer-specific data formats
- Partner integration credentials
- Third-party service configurations

## Output Format

Please provide custom pattern configuration in JSON format:

\`\`\`json
{
  "customPatterns": [
    {
      "name": "pattern name",
      "description": "what this pattern detects",
      "regex": "regular expression pattern",
      "category": "api_key|credential|identifier|url|other",
      "severity": "low|medium|high|critical",
      "examples": ["example matches"],
      "falsePositives": ["potential false positives to watch for"],
      "maskingStrategy": "full|partial|placeholder|environment"
    }
  ],
  "recommendations": [
    "additional security recommendations for this project"
  ],
  "integrationNotes": [
    "notes on integrating these patterns with existing detection"
  ]
}
\`\`\`

## Pattern Guidelines

1. **Specific but Flexible**: Patterns should be specific to avoid false positives but flexible enough to catch variations
2. **Performance Conscious**: Avoid overly complex regex that could impact performance
3. **Maintainable**: Patterns should be easy to understand and modify
4. **Context Aware**: Consider the specific technology stack and domain
5. **Severity Appropriate**: Assign appropriate severity levels based on risk

Please provide thoughtful, project-specific pattern recommendations.
`;
}
