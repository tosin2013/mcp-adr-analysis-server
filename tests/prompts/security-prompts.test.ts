/**
 * Unit tests for security-prompts.ts
 * Testing all exported functions with comprehensive scenarios
 */

import {
  generateSensitiveContentDetectionPrompt,
  generateContentMaskingPrompt,
  generateCustomPatternConfigurationPrompt,
} from '../../src/prompts/security-prompts';

describe('Security Prompts', () => {
  describe('generateSensitiveContentDetectionPrompt', () => {
    const mockContent = `
      const config = {
        apiKey: 'sk-1234567890abcdef',
        dbPassword: 'mySecretPassword123',
        email: 'user@example.com',
        serverUrl: 'https://api.internal.company.com/v1'
      };
    `;

    it('should generate prompt with content and default parameters', () => {
      const result = generateSensitiveContentDetectionPrompt(mockContent);

      expect(result).toContain('Sensitive Information Detection Guide');
      expect(result).toContain('general');
      expect(result).toContain('sk-1234567890abcdef');
      expect(result).toContain('mySecretPassword123');
      expect(result).toContain('user@example.com');
      expect(result).not.toContain('User-Defined Sensitive Patterns');
    });

    it('should generate prompt with specific content type', () => {
      const result = generateSensitiveContentDetectionPrompt(mockContent, 'code');

      expect(result).toContain('Sensitive Information Detection Guide');
      expect(result).toContain('code');
      expect(result).toContain('sk-1234567890abcdef');
    });

    it('should generate prompt with user-defined patterns', () => {
      const userPatterns = ['CUSTOM_API_KEY_.*', 'INTERNAL_TOKEN_.*', 'SECRET_.*'];
      const result = generateSensitiveContentDetectionPrompt(
        mockContent,
        'configuration',
        userPatterns
      );

      expect(result).toContain('configuration');
      expect(result).toContain('User-Defined Sensitive Patterns');
      expect(result).toContain('CUSTOM_API_KEY_.*');
      expect(result).toContain('INTERNAL_TOKEN_.*');
      expect(result).toContain('SECRET_.*');
    });

    it('should handle different content types', () => {
      const codeResult = generateSensitiveContentDetectionPrompt(mockContent, 'code');
      const docsResult = generateSensitiveContentDetectionPrompt(mockContent, 'documentation');
      const configResult = generateSensitiveContentDetectionPrompt(mockContent, 'configuration');
      const logsResult = generateSensitiveContentDetectionPrompt(mockContent, 'logs');

      expect(codeResult).toContain('code');
      expect(docsResult).toContain('documentation');
      expect(configResult).toContain('configuration');
      expect(logsResult).toContain('logs');
    });

    it('should truncate long content', () => {
      const longContent = 'A'.repeat(6000) + ' This should be truncated';
      const result = generateSensitiveContentDetectionPrompt(longContent);

      expect(result).toContain('A'.repeat(5000));
      expect(result).toContain('... (content truncated for analysis)');
      expect(result).not.toContain('This should be truncated');
    });

    it('should handle empty content', () => {
      const result = generateSensitiveContentDetectionPrompt('');

      expect(result).toContain('Sensitive Information Detection Guide');
      expect(result).toContain('general');
      expect(result).not.toContain('... (content truncated for analysis)');
    });

    it('should handle empty user-defined patterns array', () => {
      const result = generateSensitiveContentDetectionPrompt(mockContent, 'code', []);

      expect(result).toContain('code');
      expect(result).toContain('User-Defined Sensitive Patterns');
    });

    it('should handle special characters in content', () => {
      const specialContent = `
        API_KEY="sk-test_1234567890!@#$%^&*()"
        PASSWORD='P@ssw0rd!#$%^&*()_+'
        EMAIL="test+user@domain.co.uk"
        URL="https://api.example.com/v1?key=abc123&secret=xyz789"
      `;

      const result = generateSensitiveContentDetectionPrompt(specialContent, 'configuration');

      expect(result).toContain('sk-test_1234567890!@#$%^&*()');
      expect(result).toContain('P@ssw0rd!#$%^&*()_+');
      expect(result).toContain('test+user@domain.co.uk');
      expect(result).toContain('https://api.example.com/v1?key=abc123&secret=xyz789');
    });

    it('should include JSON template structure', () => {
      const result = generateSensitiveContentDetectionPrompt(mockContent);

      expect(result).toContain('hasSensitiveContent');
      expect(result).toContain('detectedItems');
      expect(result).toContain('recommendations');
      expect(result).toContain('overallRisk');
      expect(result).toContain('summary');
    });

    it('should include detection categories', () => {
      const result = generateSensitiveContentDetectionPrompt(mockContent);

      expect(result).toContain('API Keys & Tokens');
      expect(result).toContain('Credentials & Authentication');
      expect(result).toContain('Connection Strings & URLs');
      expect(result).toContain('Personal & Sensitive Data');
      expect(result).toContain('Business Sensitive Information');
    });

    it('should include detection and masking guidelines', () => {
      const result = generateSensitiveContentDetectionPrompt(mockContent);

      expect(result).toContain('Detection Guidelines');
      expect(result).toContain('Be Conservative');
      expect(result).toContain('Context Matters');
      expect(result).toContain('Masking Strategies');
      expect(result).toContain('Full Redaction');
      expect(result).toContain('Partial Masking');
    });

    it('should handle large user-defined patterns array', () => {
      const manyPatterns = Array.from({ length: 20 }, (_, i) => `PATTERN_${i}_.*`);
      const result = generateSensitiveContentDetectionPrompt(mockContent, 'code', manyPatterns);

      expect(result).toContain('PATTERN_0_.*');
      expect(result).toContain('PATTERN_19_.*');
    });
  });

  describe('generateContentMaskingPrompt', () => {
    const mockContent = `
      const config = {
        apiKey: 'sk-1234567890abcdef',
        dbPassword: 'mySecretPassword123',
        email: 'user@example.com'
      };
    `;

    const mockDetectedItems = [
      {
        type: 'api_key',
        content: 'sk-1234567890abcdef',
        startPosition: 25,
        endPosition: 45,
        severity: 'high',
      },
      {
        type: 'password',
        content: 'mySecretPassword123',
        startPosition: 70,
        endPosition: 89,
        severity: 'critical',
      },
      {
        type: 'email',
        content: 'user@example.com',
        startPosition: 110,
        endPosition: 126,
        severity: 'medium',
      },
    ];

    it('should generate prompt with content and detected items using default strategy', () => {
      const result = generateContentMaskingPrompt(mockContent, mockDetectedItems);

      expect(result).toContain('Content Masking Request');
      expect(result).toContain('sk-1234567890abcdef');
      expect(result).toContain('mySecretPassword123');
      expect(result).toContain('user@example.com');
      expect(result).toContain('full');
      expect(result).toContain('api_key');
      expect(result).toContain('password');
      expect(result).toContain('email');
    });

    it('should generate prompt with full masking strategy', () => {
      const result = generateContentMaskingPrompt(mockContent, mockDetectedItems, 'full');

      expect(result).toContain('full');
      expect(result).toContain('Full Masking');
      expect(result).toContain('[REDACTED]');
    });

    it('should generate prompt with partial masking strategy', () => {
      const result = generateContentMaskingPrompt(mockContent, mockDetectedItems, 'partial');

      expect(result).toContain('partial');
      expect(result).toContain('Partial Masking');
      expect(result).toContain('sk-...****');
      expect(result).toContain('user...@domain.com');
    });

    it('should generate prompt with placeholder masking strategy', () => {
      const result = generateContentMaskingPrompt(mockContent, mockDetectedItems, 'placeholder');

      expect(result).toContain('placeholder');
      expect(result).toContain('Placeholder Masking');
      expect(result).toContain('<YOUR_API_KEY>');
      expect(result).toContain('<DATABASE_PASSWORD>');
    });

    it('should generate prompt with environment masking strategy', () => {
      const result = generateContentMaskingPrompt(mockContent, mockDetectedItems, 'environment');

      expect(result).toContain('environment');
      expect(result).toContain('Environment Variable Masking');
      expect(result).toContain('${API_KEY}');
      expect(result).toContain('${DATABASE_URL}');
    });

    it('should handle empty detected items array', () => {
      const result = generateContentMaskingPrompt(mockContent, []);

      expect(result).toContain('Content Masking Request');
      expect(result).toContain('sk-1234567890abcdef');
      expect(result).toContain('full');
    });

    it('should handle empty content', () => {
      const result = generateContentMaskingPrompt('', mockDetectedItems);

      expect(result).toContain('Content Masking Request');
      expect(result).toContain('api_key');
      expect(result).toContain('sk-1234567890abcdef');
    });

    it('should handle special characters in content and detected items', () => {
      const specialContent = `
        API_KEY="sk-test_1234!@#$%^&*()"
        PASSWORD='P@ssw0rd!#$%^&*()_+'
      `;

      const specialItems = [
        {
          type: 'api_key',
          content: 'sk-test_1234!@#$%^&*()',
          startPosition: 12,
          endPosition: 35,
          severity: 'high',
        },
        {
          type: 'password',
          content: 'P@ssw0rd!#$%^&*()_+',
          startPosition: 55,
          endPosition: 74,
          severity: 'critical',
        },
      ];

      const result = generateContentMaskingPrompt(specialContent, specialItems, 'partial');

      expect(result).toContain('sk-test_1234!@#$%^&*()');
      expect(result).toContain('P@ssw0rd!#$%^&*()_+');
    });

    it('should include JSON template structure', () => {
      const result = generateContentMaskingPrompt(mockContent, mockDetectedItems);

      expect(result).toContain('maskedContent');
      expect(result).toContain('maskingApplied');
      expect(result).toContain('preservedStructure');
      expect(result).toContain('readabilityScore');
      expect(result).toContain('securityScore');
      expect(result).toContain('recommendations');
    });

    it('should include masking requirements for all strategies', () => {
      const result = generateContentMaskingPrompt(mockContent, mockDetectedItems);

      expect(result).toContain('Masking Requirements');
      expect(result).toContain('Full Masking');
      expect(result).toContain('Partial Masking');
      expect(result).toContain('Placeholder Masking');
      expect(result).toContain('Environment Variable Masking');
    });

    it('should include masking guidelines', () => {
      const result = generateContentMaskingPrompt(mockContent, mockDetectedItems);

      expect(result).toContain('Masking Guidelines');
      expect(result).toContain('Preserve Functionality');
      expect(result).toContain('Maintain Context');
      expect(result).toContain('Consistent Approach');
      expect(result).toContain('Security First');
    });

    it('should handle large number of detected items', () => {
      const manyItems = Array.from({ length: 15 }, (_, i) => ({
        type: `type_${i}`,
        content: `sensitive_content_${i}`,
        startPosition: i * 10,
        endPosition: i * 10 + 5,
        severity: i % 2 === 0 ? 'high' : 'medium',
      }));

      const result = generateContentMaskingPrompt(mockContent, manyItems);

      expect(result).toContain('sensitive_content_0');
      expect(result).toContain('sensitive_content_14');
      expect(result).toContain('type_0');
      expect(result).toContain('type_14');
    });
  });

  describe('generateCustomPatternConfigurationPrompt', () => {
    const mockProjectContext = `
      This is a Node.js microservices project using:
      - Express.js for API endpoints
      - MongoDB for data storage
      - Redis for caching
      - JWT for authentication
      - Docker for containerization
      - AWS for cloud deployment
    `;

    const mockExistingPatterns = ['AWS_.*_KEY', 'MONGODB_.*_URI', 'JWT_.*_SECRET'];

    it('should generate prompt with project context only', () => {
      const result = generateCustomPatternConfigurationPrompt(mockProjectContext);

      expect(result).toContain('Custom Sensitive Pattern Configuration');
      expect(result).toContain('Node.js microservices project');
      expect(result).toContain('Express.js for API endpoints');
      expect(result).toContain('MongoDB for data storage');
      expect(result).toContain('JWT for authentication');
      expect(result).not.toContain('Existing Patterns');
    });

    it('should generate prompt with project context and existing patterns', () => {
      const result = generateCustomPatternConfigurationPrompt(
        mockProjectContext,
        mockExistingPatterns
      );

      expect(result).toContain('Custom Sensitive Pattern Configuration');
      expect(result).toContain('Node.js microservices project');
      expect(result).toContain('Existing Patterns');
      expect(result).toContain('AWS_.*_KEY');
      expect(result).toContain('MONGODB_.*_URI');
      expect(result).toContain('JWT_.*_SECRET');
    });

    it('should handle empty project context', () => {
      const result = generateCustomPatternConfigurationPrompt('');

      expect(result).toContain('Custom Sensitive Pattern Configuration');
      expect(result).not.toContain('Existing Patterns');
    });

    it('should handle empty existing patterns array', () => {
      const result = generateCustomPatternConfigurationPrompt(mockProjectContext, []);

      expect(result).toContain('Node.js microservices project');
      expect(result).toContain('Existing Patterns');
    });

    it('should handle special characters in project context', () => {
      const specialContext = `
        Project uses special configurations:
        - API endpoints with rate limiting >10K req/s
        - OAuth 2.0 with "bearer" tokens
        - Database URLs with special chars: mongodb://user:p@ss@host:27017/db
        - Redis connection: redis://user:p@ss@host:6379
      `;

      const result = generateCustomPatternConfigurationPrompt(specialContext);

      expect(result).toContain('>10K req/s');
      expect(result).toContain('OAuth 2.0 with "bearer" tokens');
      expect(result).toContain('mongodb://user:p@ss@host:27017/db');
      expect(result).toContain('redis://user:p@ss@host:6379');
    });

    it('should include JSON template structure', () => {
      const result = generateCustomPatternConfigurationPrompt(mockProjectContext);

      expect(result).toContain('customPatterns');
      expect(result).toContain('recommendations');
      expect(result).toContain('integrationNotes');
      expect(result).toContain('name');
      expect(result).toContain('description');
      expect(result).toContain('regex');
      expect(result).toContain('category');
      expect(result).toContain('severity');
      expect(result).toContain('examples');
      expect(result).toContain('falsePositives');
      expect(result).toContain('maskingStrategy');
    });

    it('should include configuration requirements sections', () => {
      const result = generateCustomPatternConfigurationPrompt(mockProjectContext);

      expect(result).toContain('Configuration Requirements');
      expect(result).toContain('Project-Specific Patterns');
      expect(result).toContain('Technology-Specific Patterns');
      expect(result).toContain('Domain-Specific Patterns');
      expect(result).toContain('Custom API endpoints');
      expect(result).toContain('Framework-specific configuration');
      expect(result).toContain('Industry-specific identifiers');
    });

    it('should include pattern guidelines', () => {
      const result = generateCustomPatternConfigurationPrompt(mockProjectContext);

      expect(result).toContain('Pattern Guidelines');
      expect(result).toContain('Specific but Flexible');
      expect(result).toContain('Performance Conscious');
      expect(result).toContain('Maintainable');
      expect(result).toContain('Context Aware');
      expect(result).toContain('Severity Appropriate');
    });

    it('should handle large project context', () => {
      const largeContext = `
        This is a comprehensive enterprise project with multiple components:
        ${Array.from({ length: 50 }, (_, i) => `- Component ${i}: Description of component ${i}`).join('\n')}
      `;

      const result = generateCustomPatternConfigurationPrompt(largeContext);

      expect(result).toContain('Component 0');
      expect(result).toContain('Component 49');
    });

    it('should handle large existing patterns array', () => {
      const manyPatterns = Array.from({ length: 25 }, (_, i) => `PATTERN_${i}_.*`);
      const result = generateCustomPatternConfigurationPrompt(mockProjectContext, manyPatterns);

      expect(result).toContain('PATTERN_0_.*');
      expect(result).toContain('PATTERN_24_.*');
    });

    it('should handle multiline project context', () => {
      const multilineContext = `
        Project Architecture:
        
        Frontend:
        - React.js with TypeScript
        - Material-UI components
        - Redux for state management
        
        Backend:
        - Node.js with Express
        - GraphQL API layer
        - PostgreSQL database
        
        Infrastructure:
        - Docker containers
        - Kubernetes orchestration
        - AWS cloud services
      `;

      const result = generateCustomPatternConfigurationPrompt(multilineContext);

      expect(result).toContain('React.js with TypeScript');
      expect(result).toContain('GraphQL API layer');
      expect(result).toContain('Kubernetes orchestration');
    });
  });
});
