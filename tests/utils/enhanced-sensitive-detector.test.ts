/**
 * Test suite for enhanced sensitive content detector
 */

import { describe, it, expect } from '@jest/globals';

describe('Enhanced Sensitive Content Detector', () => {
  describe('GitHub Token Detection', () => {
    it('should detect GitHub personal access tokens', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        const config = {
          githubToken: "ghp_1234567890abcdef1234567890abcdef12345678"
        };
      `;
      
      const result = await analyzeSensitiveContent('config.js', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'github-token')).toBe(true);
      expect(result.summary.criticalCount).toBeGreaterThan(0);
    });

    it('should detect GitHub PAT tokens', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = 'GITHUB_TOKEN=github_pat_11ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRST';
      
      const result = await analyzeSensitiveContent('.env', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'github-token')).toBe(true);
    });
  });

  describe('AWS Credentials Detection', () => {
    it('should detect AWS access keys', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
        AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
      `;
      
      const result = await analyzeSensitiveContent('.env', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'aws-access-key')).toBe(true);
      expect(result.summary.criticalCount).toBeGreaterThan(0);
    });

    it('should detect AWS secret keys in context', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        const awsConfig = {
          accessKeyId: "AKIAIOSFODNN7EXAMPLE",
          secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        };
      `;
      
      const result = await analyzeSensitiveContent('aws-config.js', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'aws-access-key')).toBe(true);
    });
  });

  describe('Database Credentials Detection', () => {
    it('should detect database connection URLs', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        const dbUrl = "postgres://username:password@localhost:5432/mydb";
        const mongoUrl = "mongodb://admin:secret123@cluster.mongodb.net/database";
      `;
      
      const result = await analyzeSensitiveContent('database.js', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'database-url')).toBe(true);
      expect(result.summary.criticalCount).toBeGreaterThan(0);
    });

    it('should detect database passwords', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        DB_PASSWORD=super_secret_db_password_123
        db_password: "another-secret-password"
      `;
      
      const result = await analyzeSensitiveContent('config.yaml', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'database-password')).toBe(true);
    });
  });

  describe('Private Key Detection', () => {
    it('should detect RSA private keys', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        -----BEGIN RSA PRIVATE KEY-----
        MIIEpAIBAAKCAQEA4f5wg5l2hKsTeNem/V41fGnJm6gOdrj8ym3rFkEjWT2btIA
        -----END RSA PRIVATE KEY-----
      `;
      
      const result = await analyzeSensitiveContent('private.key', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'private-key')).toBe(true);
      expect(result.summary.criticalCount).toBeGreaterThan(0);
    });

    it('should detect SSH private keys', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        -----BEGIN OPENSSH PRIVATE KEY-----
        b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAFwAAAAdzc2gtcn
        -----END OPENSSH PRIVATE KEY-----
      `;
      
      const result = await analyzeSensitiveContent('id_rsa', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'ssh-private-key')).toBe(true);
    });
  });

  describe('Generic Secrets Detection', () => {
    it('should detect generic API keys', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        const config = {
          apiKey: "sk-1234567890abcdef1234567890abcdef",
          api_key: "pk_live_abcdef1234567890abcdef1234567890",
          API_KEY: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        };
      `;
      
      const result = await analyzeSensitiveContent('config.js', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'generic-api-key')).toBe(true);
    });

    it('should detect generic secrets', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        JWT_SECRET=super-secret-jwt-key-1234567890
        encryption_secret: "aes-256-secret-key-abcdef1234567890"
      `;
      
      const result = await analyzeSensitiveContent('.env', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'generic-secret')).toBe(true);
    });

    it('should detect generic tokens', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        const authToken = "bearer_token_1234567890abcdef1234567890abcdef";
        access_token: "oauth_token_abcdef1234567890abcdef1234567890"
      `;
      
      const result = await analyzeSensitiveContent('auth.js', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'generic-token')).toBe(true);
    });
  });

  describe('Personal Information Detection', () => {
    it('should detect real email addresses', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        const user = {
          email: "john.doe@company.com",
          contactEmail: "support@realcompany.net"
        };
      `;
      
      const result = await analyzeSensitiveContent('user.js', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'email-address')).toBe(true);
    });

    it('should ignore example email addresses', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        const exampleUser = {
          email: "user@example.com",
          testEmail: "test@test.com"
        };
      `;
      
      const result = await analyzeSensitiveContent('example.js', testContent);
      
      // Should have low confidence for example emails
      const emailMatches = result.matches.filter(m => m.pattern.name === 'email-address');
      emailMatches.forEach(match => {
        expect(match.confidence).toBeLessThan(0.5);
      });
    });

    it('should detect phone numbers', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        const contact = {
          phone: "555-123-4567",
          mobile: "(555) 987-6543"
        };
      `;
      
      const result = await analyzeSensitiveContent('contact.js', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'phone-number')).toBe(true);
    });
  });

  describe('Development Secrets Detection', () => {
    it('should detect JWT secrets', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        const config = {
          jwtSecret: "super-secret-jwt-key-1234567890abcdef",
          jwt_secret: "another-jwt-secret-key-abcdef1234567890"
        };
      `;
      
      const result = await analyzeSensitiveContent('config.js', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'jwt-secret')).toBe(true);
    });

    it('should detect encryption keys', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        ENCRYPTION_KEY=aes-256-encryption-key-1234567890abcdef1234567890abcdef
        encryptionKey: "base64-encoded-key-abcdef1234567890+/="
      `;
      
      const result = await analyzeSensitiveContent('.env', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'encryption-key')).toBe(true);
    });

    it('should detect session secrets', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        const session = {
          sessionSecret: "session-secret-key-1234567890abcdef",
          session_secret: "another-session-secret-abcdef1234567890"
        };
      `;
      
      const result = await analyzeSensitiveContent('session.js', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'session-secret')).toBe(true);
    });
  });

  describe('Debug Information Detection', () => {
    it('should detect debug logging of sensitive info', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        console.log("User password:", userPassword);
        console.log("API key is:", apiKey);
        console.log("Secret token:", secretToken);
      `;
      
      const result = await analyzeSensitiveContent('debug.js', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'debug-info')).toBe(true);
    });

    it('should detect hardcoded passwords', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        const auth = {
          username: "admin",
          password: "hardcoded-password-123"
        };
        
        const dbConfig = {
          host: "localhost",
          password: "another-hardcoded-password!"
        };
      `;
      
      const result = await analyzeSensitiveContent('auth.js', testContent);
      
      expect(result.hasIssues).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'hardcoded-password')).toBe(true);
    });
  });

  describe('Confidence Scoring', () => {
    it('should assign high confidence to specific patterns', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = 'GITHUB_TOKEN=ghp_1234567890abcdef1234567890abcdef12345678';
      
      const result = await analyzeSensitiveContent('.env', testContent);
      
      const githubMatches = result.matches.filter(m => m.pattern.name === 'github-token');
      expect(githubMatches.length).toBeGreaterThan(0);
      expect(githubMatches[0]?.confidence).toBeGreaterThan(0.7);
    });

    it('should assign lower confidence to example content', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = `
        // Example configuration - not real
        const example = {
          apiKey: "example-api-key-placeholder"
        };
      `;
      
      const result = await analyzeSensitiveContent('example.js', testContent);
      
      const apiKeyMatches = result.matches.filter(m => m.pattern.name === 'generic-api-key');
      if (apiKeyMatches.length > 0) {
        expect(apiKeyMatches[0]?.confidence).toBeLessThan(0.5);
      }
    });

    it('should assign higher confidence to config files', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = 'API_KEY=sk-1234567890abcdef1234567890abcdef';
      
      const result = await analyzeSensitiveContent('.env', testContent);
      
      const matches = result.matches.filter(m => m.pattern.name === 'generic-api-key');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]?.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Suggestion Generation', () => {
    it('should provide appropriate suggestions for credentials', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = 'const apiKey = "ghp_1234567890abcdef1234567890abcdef12345678";';
      
      const result = await analyzeSensitiveContent('config.js', testContent);
      
      expect(result.recommendations).toContain('Use environment variables for sensitive configuration');
      expect(result.recommendations).toContain('Consider using a secrets management service');
    });

    it('should provide rotation warnings for critical secrets', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = 'GITHUB_TOKEN=ghp_1234567890abcdef1234567890abcdef12345678';
      
      const result = await analyzeSensitiveContent('.env', testContent);
      
      const criticalMatches = result.matches.filter(m => m.pattern.severity === 'critical');
      expect(criticalMatches.length).toBeGreaterThan(0);
      expect(criticalMatches[0]?.suggestions).toContain('🚨 ROTATE THIS CREDENTIAL IMMEDIATELY');
    });
  });

  describe('File Type Context', () => {
    it('should handle different file types appropriately', async () => {
      const { analyzeSensitiveContent } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = 'password: secret123';
      
      // Should be more confident in config files
      const configResult = await analyzeSensitiveContent('config.yaml', testContent);
      const docResult = await analyzeSensitiveContent('README.md', testContent);
      
      const configMatches = configResult.matches.filter(m => m.pattern.name === 'generic-secret');
      const docMatches = docResult.matches.filter(m => m.pattern.name === 'generic-secret');
      
      if (configMatches.length > 0 && docMatches.length > 0) {
        expect(configMatches[0]?.confidence).toBeGreaterThan(docMatches[0]?.confidence || 0);
      }
    });
  });

  describe('Integration with Content Masking', () => {
    it('should integrate with existing content masking tool', async () => {
      const { integrateWithContentMasking } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const testContent = 'const apiKey = "ghp_1234567890abcdef1234567890abcdef12345678";';
      
      const result = await integrateWithContentMasking('config.js', testContent);
      
      expect(result.sensitiveAnalysis).toBeDefined();
      expect(result.combinedRecommendations).toBeDefined();
      expect(result.combinedRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Obviously Sensitive Files', () => {
    it('should identify obviously sensitive files', async () => {
      const { isObviouslySensitive } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      expect(isObviouslySensitive('.env')).toBe(true);
      expect(isObviouslySensitive('secrets.json')).toBe(true);
      expect(isObviouslySensitive('private.key')).toBe(true);
      expect(isObviouslySensitive('id_rsa')).toBe(true);
      expect(isObviouslySensitive('keystore.p12')).toBe(true);
      
      expect(isObviouslySensitive('src/main.js')).toBe(false);
      expect(isObviouslySensitive('README.md')).toBe(false);
    });
  });

  describe('Custom Pattern Creation', () => {
    it('should create custom sensitive patterns', async () => {
      const { createSensitivePattern } = await import('../../src/utils/enhanced-sensitive-detector.js');
      
      const customPattern = createSensitivePattern(
        'custom-token',
        'CUSTOM_TOKEN_[A-Z0-9]{32}',
        'Custom application token',
        'credentials',
        'high'
      );
      
      expect(customPattern.name).toBe('custom-token');
      expect(customPattern.category).toBe('credentials');
      expect(customPattern.severity).toBe('high');
      expect(customPattern.pattern).toBeInstanceOf(RegExp);
    });
  });
});