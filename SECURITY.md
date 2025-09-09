# Security Policy

## Supported Versions

We actively support the following versions of the MCP ADR Analysis Server:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting Vulnerabilities

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. Private Disclosure
Please **DO NOT** create a public GitHub issue for security vulnerabilities. Instead:

- Use GitHub's [Security Advisory](https://github.com/tosin2013/mcp-adr-analysis-server/security/advisories) feature
- Or email us directly at security@example.com (replace with actual contact)

### 2. What to Include
When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes or mitigations
- Your contact information for follow-up

### 3. Response Timeline
- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Critical issues within 30 days, others within 90 days

## Security Features

This project implements several security measures:

- **Automated Dependency Scanning**: Dependabot monitors for vulnerable dependencies
- **Security Scanning Pipeline**: CodeQL analysis on all code changes
- **Supply Chain Security**: Dependency review for all pull requests
- **Regular Security Audits**: Weekly automated security scans

## Security Best Practices

When contributing to this project:

1. **Dependencies**: Only add necessary dependencies from trusted sources
2. **Secrets**: Never commit API keys, passwords, or other sensitive data
3. **Input Validation**: Always validate and sanitize user inputs
4. **Error Handling**: Avoid exposing sensitive information in error messages
5. **Testing**: Include security test cases for new features

## Security Updates

Security updates are prioritized and typically released as patch versions. Subscribe to our releases to stay informed about security fixes.

## Contact

For security-related questions or concerns, please contact:
- GitHub Security Advisories: [Create Advisory](https://github.com/tosin2013/mcp-adr-analysis-server/security/advisories)
- Project Maintainer: @tosin2013

---

*This security policy is reviewed and updated regularly to ensure it meets current best practices.*
