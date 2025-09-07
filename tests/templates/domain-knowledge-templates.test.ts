/**
 * Unit Tests for domain-knowledge-templates.ts
 * Target Coverage: 43.75% → 80%
 * 
 * Following methodological pragmatism principles:
 * - Systematic Verification: Structured test cases with clear assertions
 * - Explicit Fallibilism: Testing both success and failure scenarios
 * - Pragmatic Success Criteria: Focus on reliable, maintainable test coverage
 */

import {
  webApplicationsTemplate,
  microservicesTemplate,
  databaseDesignTemplate,
  apiDesignTemplate,
  cloudInfrastructureTemplate,
  domainTemplateRegistry,
  getDomainTemplate,
  getAllDomainTemplates,
  getDomainTemplates,
  getDomainCategories,
  hasDomainTemplate,
  getDomainTemplateMetadata
} from '../../src/templates/domain-knowledge-templates.js';

import { 
  ArchitecturalDomain
} from '../../src/types/knowledge-generation.js';

describe('Domain Knowledge Templates', () => {
  
  // ============================================================================
  // Template Structure Validation Tests
  // ============================================================================
  
  describe('Template Structure Validation', () => {
    
    test('webApplicationsTemplate has correct structure', () => {
      expect(webApplicationsTemplate).toBeDefined();
      expect(webApplicationsTemplate.domain).toBe('web-applications');
      expect(webApplicationsTemplate.categories).toHaveLength(4);
      expect(webApplicationsTemplate.metadata).toBeDefined();
      expect(webApplicationsTemplate.metadata.version).toBe('1.0.0');
      expect(webApplicationsTemplate.metadata.author).toBe('MCP ADR Analysis Server');
    });

    test('microservicesTemplate has correct structure', () => {
      expect(microservicesTemplate).toBeDefined();
      expect(microservicesTemplate.domain).toBe('microservices');
      expect(microservicesTemplate.categories).toHaveLength(4);
      expect(microservicesTemplate.metadata).toBeDefined();
      expect(microservicesTemplate.metadata.tags).toContain('microservices');
    });

    test('databaseDesignTemplate has correct structure', () => {
      expect(databaseDesignTemplate).toBeDefined();
      expect(databaseDesignTemplate.domain).toBe('database-design');
      expect(databaseDesignTemplate.categories).toHaveLength(3);
      expect(databaseDesignTemplate.metadata.tags).toContain('database');
    });

    test('apiDesignTemplate has correct structure', () => {
      expect(apiDesignTemplate).toBeDefined();
      expect(apiDesignTemplate.domain).toBe('api-design');
      expect(apiDesignTemplate.categories).toHaveLength(3);
      expect(apiDesignTemplate.metadata.tags).toContain('api');
    });

    test('cloudInfrastructureTemplate has correct structure', () => {
      expect(cloudInfrastructureTemplate).toBeDefined();
      expect(cloudInfrastructureTemplate.domain).toBe('cloud-infrastructure');
      expect(cloudInfrastructureTemplate.categories).toHaveLength(3);
      expect(cloudInfrastructureTemplate.metadata.tags).toContain('cloud');
    });

  });

  // ============================================================================
  // Template Content Validation Tests
  // ============================================================================
  
  describe('Template Content Validation', () => {
    
    test('all templates have required categories with valid priorities', () => {
      const templates = [
        webApplicationsTemplate,
        microservicesTemplate,
        databaseDesignTemplate,
        apiDesignTemplate,
        cloudInfrastructureTemplate
      ];

      templates.forEach(template => {
        template.categories.forEach(category => {
          expect(category.category).toBeDefined();
          expect(category.items).toBeInstanceOf(Array);
          expect(category.items.length).toBeGreaterThan(0);
          expect(category.priority).toBeGreaterThanOrEqual(1);
          expect(category.priority).toBeLessThanOrEqual(10);
          expect(category.applicability).toBeInstanceOf(Array);
        });
      });
    });

    test('web applications template contains expected best practices', () => {
      const bestPractices = webApplicationsTemplate.categories.find(
        cat => cat.category === 'best-practices'
      );
      
      expect(bestPractices).toBeDefined();
      expect(bestPractices?.items).toContain(
        'Component-based architecture with clear separation of concerns'
      );
      expect(bestPractices?.items).toContain(
        'State management patterns (Redux, Zustand, Context API)'
      );
      expect(bestPractices?.priority).toBe(9);
    });

    test('microservices template contains expected design patterns', () => {
      const designPatterns = microservicesTemplate.categories.find(
        cat => cat.category === 'design-patterns'
      );
      
      expect(designPatterns).toBeDefined();
      expect(designPatterns?.items).toContain(
        'API Gateway pattern for unified entry point'
      );
      expect(designPatterns?.items).toContain(
        'Circuit breaker pattern for fault tolerance'
      );
    });

  });

  // ============================================================================
  // Registry and Utility Function Tests
  // ============================================================================
  
  describe('Domain Template Registry', () => {
    
    test('domainTemplateRegistry contains all expected templates', () => {
      expect(domainTemplateRegistry.size).toBe(5);
      expect(domainTemplateRegistry.has('web-applications')).toBe(true);
      expect(domainTemplateRegistry.has('microservices')).toBe(true);
      expect(domainTemplateRegistry.has('database-design')).toBe(true);
      expect(domainTemplateRegistry.has('api-design')).toBe(true);
      expect(domainTemplateRegistry.has('cloud-infrastructure')).toBe(true);
    });

    test('registry maps domains to correct templates', () => {
      expect(domainTemplateRegistry.get('web-applications')).toBe(webApplicationsTemplate);
      expect(domainTemplateRegistry.get('microservices')).toBe(microservicesTemplate);
      expect(domainTemplateRegistry.get('database-design')).toBe(databaseDesignTemplate);
      expect(domainTemplateRegistry.get('api-design')).toBe(apiDesignTemplate);
      expect(domainTemplateRegistry.get('cloud-infrastructure')).toBe(cloudInfrastructureTemplate);
    });

  });

  describe('getDomainTemplate function', () => {
    
    test('returns correct template for valid domain', () => {
      const template = getDomainTemplate('web-applications');
      expect(template).toBe(webApplicationsTemplate);
      expect(template?.domain).toBe('web-applications');
    });

    test('returns undefined for invalid domain', () => {
      const template = getDomainTemplate('invalid-domain' as ArchitecturalDomain);
      expect(template).toBeUndefined();
    });

    test('returns correct template for all valid domains', () => {
      const validDomains: ArchitecturalDomain[] = [
        'web-applications',
        'microservices', 
        'database-design',
        'api-design',
        'cloud-infrastructure'
      ];

      validDomains.forEach(domain => {
        const template = getDomainTemplate(domain);
        expect(template).toBeDefined();
        expect(template!.domain).toBe(domain);
      });
    });

  });

  describe('getAllDomainTemplates function', () => {
    
    test('returns all available templates', () => {
      const allTemplates = getAllDomainTemplates();
      expect(allTemplates).toHaveLength(5);
      
      const domains = allTemplates.map(t => t.domain);
      expect(domains).toContain('web-applications');
      expect(domains).toContain('microservices');
      expect(domains).toContain('database-design');
      expect(domains).toContain('api-design');
      expect(domains).toContain('cloud-infrastructure');
    });

    test('returned templates are valid DomainTemplate objects', () => {
      const allTemplates = getAllDomainTemplates();
      
      allTemplates.forEach(template => {
        expect(template.domain).toBeDefined();
        expect(template.categories).toBeInstanceOf(Array);
        expect(template.metadata).toBeDefined();
        expect(template.metadata.version).toBeDefined();
        expect(template.metadata.author).toBeDefined();
      });
    });

  });

  describe('getDomainTemplates function', () => {
    
    test('returns templates for valid domains array', () => {
      const domains: ArchitecturalDomain[] = ['web-applications', 'microservices'];
      const templates = getDomainTemplates(domains);
      
      expect(templates).toHaveLength(2);
      expect(templates[0]?.domain).toBe('web-applications');
      expect(templates[1]?.domain).toBe('microservices');
    });

    test('filters out invalid domains', () => {
      const domains: (ArchitecturalDomain | string)[] = [
        'web-applications', 
        'invalid-domain', 
        'microservices'
      ];
      const templates = getDomainTemplates(domains as ArchitecturalDomain[]);
      
      expect(templates).toHaveLength(2);
      expect(templates.map(t => t.domain)).not.toContain('invalid-domain');
    });

    test('returns empty array for empty input', () => {
      const templates = getDomainTemplates([]);
      expect(templates).toHaveLength(0);
    });

    test('returns empty array for all invalid domains', () => {
      const invalidDomains = ['invalid1', 'invalid2'] as unknown as ArchitecturalDomain[];
      const templates = getDomainTemplates(invalidDomains);
      expect(templates).toHaveLength(0);
    });

  });

  describe('getDomainCategories function', () => {
    
    test('returns correct categories for web-applications domain', () => {
      const categories = getDomainCategories('web-applications');
      expect(categories).toHaveLength(4);
      expect(categories).toContain('best-practices');
      expect(categories).toContain('design-patterns');
      expect(categories).toContain('anti-patterns');
      expect(categories).toContain('performance-considerations');
    });

    test('returns correct categories for microservices domain', () => {
      const categories = getDomainCategories('microservices');
      expect(categories).toHaveLength(4);
      expect(categories).toContain('best-practices');
      expect(categories).toContain('design-patterns');
      expect(categories).toContain('anti-patterns');
      expect(categories).toContain('security-guidelines');
    });

    test('returns empty array for invalid domain', () => {
      const categories = getDomainCategories('invalid-domain' as ArchitecturalDomain);
      expect(categories).toHaveLength(0);
    });

  });

  describe('hasDomainTemplate function', () => {
    
    test('returns true for valid domains', () => {
      expect(hasDomainTemplate('web-applications')).toBe(true);
      expect(hasDomainTemplate('microservices')).toBe(true);
      expect(hasDomainTemplate('database-design')).toBe(true);
      expect(hasDomainTemplate('api-design')).toBe(true);
      expect(hasDomainTemplate('cloud-infrastructure')).toBe(true);
    });

    test('returns false for invalid domains', () => {
      expect(hasDomainTemplate('invalid-domain' as ArchitecturalDomain)).toBe(false);
      expect(hasDomainTemplate('non-existent' as ArchitecturalDomain)).toBe(false);
    });

  });

  describe('getDomainTemplateMetadata function', () => {
    
    test('returns correct metadata for valid domain', () => {
      const metadata = getDomainTemplateMetadata('web-applications');
      expect(metadata).toBeDefined();
      expect(metadata?.version).toBe('1.0.0');
      expect(metadata?.author).toBe('MCP ADR Analysis Server');
      expect(metadata?.description).toContain('web application');
      expect(metadata?.tags).toContain('web');
    });

    test('returns undefined for invalid domain', () => {
      const metadata = getDomainTemplateMetadata('invalid-domain' as ArchitecturalDomain);
      expect(metadata).toBeUndefined();
    });

    test('metadata contains required fields for all domains', () => {
      const validDomains: ArchitecturalDomain[] = [
        'web-applications',
        'microservices',
        'database-design', 
        'api-design',
        'cloud-infrastructure'
      ];

      validDomains.forEach(domain => {
        const metadata = getDomainTemplateMetadata(domain);
        expect(metadata).toBeDefined();
        expect(metadata?.version).toBeDefined();
        expect(metadata?.author).toBeDefined();
        expect(metadata?.lastUpdated).toBeDefined();
        expect(metadata?.description).toBeDefined();
        expect(metadata?.tags).toBeInstanceOf(Array);
        expect(metadata?.tags.length).toBeGreaterThan(0);
      });
    });

  });

  // ============================================================================
  // Edge Cases and Error Handling Tests
  // ============================================================================
  
  describe('Edge Cases and Error Handling', () => {
    
    test('handles undefined and null inputs gracefully', () => {
      expect(() => getDomainTemplate(undefined as any)).not.toThrow();
      expect(() => getDomainTemplate(null as any)).not.toThrow();
      expect(() => getDomainTemplates([undefined as any])).not.toThrow();
    });

    test('handles empty string domain input', () => {
      expect(getDomainTemplate('' as ArchitecturalDomain)).toBeUndefined();
      expect(hasDomainTemplate('' as ArchitecturalDomain)).toBe(false);
    });

    test('template categories have non-empty items arrays', () => {
      const allTemplates = getAllDomainTemplates();
      
      allTemplates.forEach(template => {
        template.categories.forEach(category => {
          expect(category.items.length).toBeGreaterThan(0);
          category.items.forEach(item => {
            expect(typeof item).toBe('string');
            expect(item.length).toBeGreaterThan(0);
          });
        });
      });
    });

    test('template metadata dates are valid format', () => {
      const allTemplates = getAllDomainTemplates();
      
      allTemplates.forEach(template => {
        expect(template.metadata.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(template.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });

  });

  // ============================================================================
  // Integration and Performance Tests
  // ============================================================================
  
  describe('Integration and Performance', () => {
    
    test('registry operations are performant', () => {
      const startTime = performance.now();
      
      // Perform multiple registry operations
      for (let i = 0; i < 1000; i++) {
        getDomainTemplate('web-applications');
        hasDomainTemplate('microservices');
        getAllDomainTemplates();
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(executionTime).toBeLessThan(100); // 100ms threshold
    });

    test('template data integrity across multiple accesses', () => {
      const template1 = getDomainTemplate('web-applications');
      const template2 = getDomainTemplate('web-applications');
      
      // Should return the same object reference (not a copy)
      expect(template1).toBe(template2);
      
      // Verify data hasn't been mutated
      expect(template1?.domain).toBe('web-applications');
      expect(template1?.categories.length).toBe(4);
    });

  });

});