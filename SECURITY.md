# Security Policy

## Supported Versions

We actively support the following versions of the MCP ADR Analysis Server:

| Version | Supported          |
| ------- | ------------------ |
| 2.6.x   | :white_check_mark: |
| 2.5.x   | :white_check_mark: |
| < 2.5   | :x:                |

## Reporting Vulnerabilities

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. Private Disclosure

Please **DO NOT** create a public GitHub issue for security vulnerabilities. Instead:

- Use GitHub's [Security Advisory](https://github.com/tosin2013/mcp-adr-analysis-server/security/advisories) feature to report privately
- Mention `@tosin2013` in the advisory for faster triage

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

### Recent Security Fixes

- **v2.5.0 (2026-04-19)**: Fixed 6 npm dependency vulnerabilities (4 moderate, 2 high) via transitive dependency updates:
  - `hono` updated to 4.12.14+ (fixes GHSA-26pp-8wgv-hjvm, GHSA-r5rp-j6wh-rvv4, GHSA-xpcf-pg52-r92g, GHSA-xf4j-xp2r-rqqx, GHSA-wmmm-f939-6g9c, GHSA-458j-xx4x-4375)
  - `@hono/node-server` updated to 1.19.14+ (fixes GHSA-92pp-h63x-v22m)
  - `path-to-regexp` updated to 8.4.2+ (fixes GHSA-j3q9-mxjg-w52f, GHSA-27v5-c462-wpq7)
  - `picomatch` updated to 2.3.2+ (fixes GHSA-3v7f-55p6-f55p, GHSA-c2c7-rcm5-vvqj)
  - `axios` updated to 1.15.1+ (fixes GHSA-3p68-rc4w-qgx5, GHSA-fvcv-3m26-pcqx)
  - `follow-redirects` updated to 1.16.0+ (fixes GHSA-r4q5-vmmm-2653)

## Contact

For security-related questions or concerns, please contact:

- GitHub Security Advisories: [Create Advisory](https://github.com/tosin2013/mcp-adr-analysis-server/security/advisories)
- Project Maintainer: @tosin2013

---

_This security policy is reviewed and updated regularly to ensure it meets current best practices._
