/**
 * Unit tests for conversation-context.ts
 * Testing interfaces, schemas, and utility functions with comprehensive coverage
 * Confidence: 90% - Systematic verification with pragmatic approach
 */

import {
  ConversationContext,
  CONVERSATION_CONTEXT_SCHEMA,
  formatContextForPrompt,
  hasMeaningfulContext
} from '../../src/types/conversation-context';

describe('Conversation Context Types', () => {
  describe('ConversationContext Interface', () => {
    it('should allow creating empty context object', () => {
      const context: ConversationContext = {};
      expect(context).toBeDefined();
      expect(typeof context).toBe('object');
    });

    it('should allow creating context with all optional properties', () => {
      const context: ConversationContext = {
        humanRequest: 'Help me migrate to microservices',
        userGoals: ['improve scalability', 'reduce coupling'],
        focusAreas: ['security', 'performance'],
        constraints: ['budget under $50k', 'minimal downtime'],
        previousContext: 'User mentioned concerns about database splitting',
        projectPhase: 'planning',
        userRole: 'architect',
        requirements: ['GDPR compliance', 'high availability'],
        timeline: '3 months',
        budget: 'limited'
      };

      expect(context.humanRequest).toBe('Help me migrate to microservices');
      expect(context.userGoals).toEqual(['improve scalability', 'reduce coupling']);
      expect(context.focusAreas).toEqual(['security', 'performance']);
      expect(context.constraints).toEqual(['budget under $50k', 'minimal downtime']);
      expect(context.previousContext).toBe('User mentioned concerns about database splitting');
      expect(context.projectPhase).toBe('planning');
      expect(context.userRole).toBe('architect');
      expect(context.requirements).toEqual(['GDPR compliance', 'high availability']);
      expect(context.timeline).toBe('3 months');
      expect(context.budget).toBe('limited');
    });

    it('should allow predefined project phases', () => {
      const phases: ConversationContext['projectPhase'][] = [
        'planning',
        'development',
        'migration',
        'production',
        'maintenance'
      ];

      phases.forEach(phase => {
        const context: ConversationContext = { projectPhase: phase };
        expect(context.projectPhase).toBe(phase);
      });
    });

    it('should allow custom project phases', () => {
      const context: ConversationContext = { projectPhase: 'custom-phase' };
      expect(context.projectPhase).toBe('custom-phase');
    });

    it('should allow predefined user roles', () => {
      const roles: ConversationContext['userRole'][] = [
        'architect',
        'developer',
        'manager',
        'ops',
        'security'
      ];

      roles.forEach(role => {
        const context: ConversationContext = { userRole: role };
        expect(context.userRole).toBe(role);
      });
    });

    it('should allow custom user roles', () => {
      const context: ConversationContext = { userRole: 'custom-role' };
      expect(context.userRole).toBe('custom-role');
    });

    it('should handle arrays with empty values', () => {
      const context: ConversationContext = {
        userGoals: [],
        focusAreas: [],
        constraints: [],
        requirements: []
      };

      expect(context.userGoals).toEqual([]);
      expect(context.focusAreas).toEqual([]);
      expect(context.constraints).toEqual([]);
      expect(context.requirements).toEqual([]);
    });

    it('should handle special characters in string fields', () => {
      const context: ConversationContext = {
        humanRequest: 'Help with API rate limiting & OAuth 2.0 "bearer" tokens',
        previousContext: 'User mentioned >10K req/s requirements',
        timeline: '2-3 months (Q4 2024)',
        budget: '$50K-$100K range'
      };

      expect(context.humanRequest).toBe('Help with API rate limiting & OAuth 2.0 "bearer" tokens');
      expect(context.previousContext).toBe('User mentioned >10K req/s requirements');
      expect(context.timeline).toBe('2-3 months (Q4 2024)');
      expect(context.budget).toBe('$50K-$100K range');
    });
  });

  describe('CONVERSATION_CONTEXT_SCHEMA', () => {
    it('should have correct schema structure', () => {
      expect(CONVERSATION_CONTEXT_SCHEMA.type).toBe('object');
      expect(CONVERSATION_CONTEXT_SCHEMA.description).toBe('Rich context from the calling LLM about user goals and discussion history');
      expect(CONVERSATION_CONTEXT_SCHEMA.additionalProperties).toBe(false);
      expect(CONVERSATION_CONTEXT_SCHEMA.properties).toBeDefined();
    });

    it('should define all expected properties', () => {
      const expectedProperties = [
        'humanRequest',
        'userGoals',
        'focusAreas',
        'constraints',
        'previousContext',
        'projectPhase',
        'userRole',
        'requirements',
        'timeline',
        'budget'
      ];

      expectedProperties.forEach(prop => {
        expect(CONVERSATION_CONTEXT_SCHEMA.properties).toHaveProperty(prop);
      });
    });

    it('should have correct property types', () => {
      const { properties } = CONVERSATION_CONTEXT_SCHEMA;

      // String properties
      expect(properties.humanRequest.type).toBe('string');
      expect(properties.previousContext.type).toBe('string');
      expect(properties.projectPhase.type).toBe('string');
      expect(properties.userRole.type).toBe('string');
      expect(properties.timeline.type).toBe('string');
      expect(properties.budget.type).toBe('string');

      // Array properties
      expect(properties.userGoals.type).toBe('array');
      expect(properties.userGoals.items.type).toBe('string');
      expect(properties.focusAreas.type).toBe('array');
      expect(properties.focusAreas.items.type).toBe('string');
      expect(properties.constraints.type).toBe('array');
      expect(properties.constraints.items.type).toBe('string');
      expect(properties.requirements.type).toBe('array');
      expect(properties.requirements.items.type).toBe('string');
    });

    it('should have meaningful descriptions for all properties', () => {
      const { properties } = CONVERSATION_CONTEXT_SCHEMA;

      Object.keys(properties).forEach(key => {
        expect(properties[key].description).toBeDefined();
        expect(properties[key].description.length).toBeGreaterThan(10);
      });
    });

    it('should include examples in descriptions', () => {
      const { properties } = CONVERSATION_CONTEXT_SCHEMA;

      expect(properties.userGoals.description).toContain('["microservices migration", "improve security"]');
      expect(properties.focusAreas.description).toContain('["security", "performance", "maintainability"]');
      expect(properties.constraints.description).toContain('["GDPR compliance", "budget under $50k", "minimal downtime"]');
    });
  });

  describe('formatContextForPrompt', () => {
    it('should return empty string for undefined context', () => {
      const result = formatContextForPrompt(undefined);
      expect(result).toBe('');
    });

    it('should return empty string for empty context', () => {
      const result = formatContextForPrompt({});
      expect(result).toBe('');
    });

    it('should format human request', () => {
      const context: ConversationContext = {
        humanRequest: 'Help me migrate to microservices'
      };
      const result = formatContextForPrompt(context);
      
      expect(result).toContain('## User Context');
      expect(result).toContain('Human Request: "Help me migrate to microservices"');
    });

    it('should format user goals', () => {
      const context: ConversationContext = {
        userGoals: ['improve scalability', 'reduce coupling']
      };
      const result = formatContextForPrompt(context);
      
      expect(result).toContain('User Goals: improve scalability, reduce coupling');
    });

    it('should format focus areas', () => {
      const context: ConversationContext = {
        focusAreas: ['security', 'performance']
      };
      const result = formatContextForPrompt(context);
      
      expect(result).toContain('Focus Areas: security, performance');
    });

    it('should format constraints', () => {
      const context: ConversationContext = {
        constraints: ['budget under $50k', 'minimal downtime']
      };
      const result = formatContextForPrompt(context);
      
      expect(result).toContain('Constraints: budget under $50k, minimal downtime');
    });

    it('should format project phase', () => {
      const context: ConversationContext = {
        projectPhase: 'planning'
      };
      const result = formatContextForPrompt(context);
      
      expect(result).toContain('Project Phase: planning');
    });

    it('should format user role', () => {
      const context: ConversationContext = {
        userRole: 'architect'
      };
      const result = formatContextForPrompt(context);
      
      expect(result).toContain('User Role: architect');
    });

    it('should format timeline', () => {
      const context: ConversationContext = {
        timeline: '3 months'
      };
      const result = formatContextForPrompt(context);
      
      expect(result).toContain('Timeline: 3 months');
    });

    it('should format previous context', () => {
      const context: ConversationContext = {
        previousContext: 'User mentioned concerns about database splitting'
      };
      const result = formatContextForPrompt(context);
      
      expect(result).toContain('Previous Context: User mentioned concerns about database splitting');
    });

    it('should format all fields together', () => {
      const context: ConversationContext = {
        humanRequest: 'Help me migrate to microservices',
        userGoals: ['improve scalability', 'reduce coupling'],
        focusAreas: ['security', 'performance'],
        constraints: ['budget under $50k', 'minimal downtime'],
        projectPhase: 'planning',
        userRole: 'architect',
        timeline: '3 months',
        previousContext: 'User mentioned concerns about database splitting'
      };
      const result = formatContextForPrompt(context);
      
      expect(result).toContain('## User Context');
      expect(result).toContain('Human Request: "Help me migrate to microservices"');
      expect(result).toContain('User Goals: improve scalability, reduce coupling');
      expect(result).toContain('Focus Areas: security, performance');
      expect(result).toContain('Constraints: budget under $50k, minimal downtime');
      expect(result).toContain('Project Phase: planning');
      expect(result).toContain('User Role: architect');
      expect(result).toContain('Timeline: 3 months');
      expect(result).toContain('Previous Context: User mentioned concerns about database splitting');
    });

    it('should handle empty arrays gracefully', () => {
      const context: ConversationContext = {
        userGoals: [],
        focusAreas: [],
        constraints: []
      };
      const result = formatContextForPrompt(context);
      
      expect(result).toBe('');
    });

    it('should handle special characters in formatting', () => {
      const context: ConversationContext = {
        humanRequest: 'Help with API rate limiting & OAuth 2.0 "bearer" tokens',
        constraints: ['Handle >10K req/s', 'PCI-DSS compliance'],
        timeline: '2-3 months (Q4 2024)'
      };
      const result = formatContextForPrompt(context);
      
      expect(result).toContain('API rate limiting & OAuth 2.0 "bearer" tokens');
      expect(result).toContain('Handle >10K req/s, PCI-DSS compliance');
      expect(result).toContain('2-3 months (Q4 2024)');
    });

    it('should maintain proper formatting structure', () => {
      const context: ConversationContext = {
        humanRequest: 'Test request',
        userRole: 'developer'
      };
      const result = formatContextForPrompt(context);
      
      expect(result).toContain('## User Context');
      expect(result).toContain('Human Request: "Test request"');
      expect(result).toContain('User Role: developer');
      expect(result.endsWith('\n\n')).toBe(true);
    });

    it('should not include requirements field in formatting', () => {
      const context: ConversationContext = {
        requirements: ['GDPR compliance', 'high availability'],
        userRole: 'architect'
      };
      const result = formatContextForPrompt(context);
      
      expect(result).not.toContain('Requirements:');
      expect(result).toContain('User Role: architect');
    });
  });

  describe('hasMeaningfulContext', () => {
    it('should return false for undefined context', () => {
      const result = hasMeaningfulContext(undefined);
      expect(result).toBe(false);
    });

    it('should return false for empty context', () => {
      const result = hasMeaningfulContext({});
      expect(result).toBe(false);
    });

    it('should return true for context with humanRequest', () => {
      const context: ConversationContext = {
        humanRequest: 'Help me migrate to microservices'
      };
      const result = hasMeaningfulContext(context);
      expect(result).toBe(true);
    });

    it('should return true for context with userGoals', () => {
      const context: ConversationContext = {
        userGoals: ['improve scalability']
      };
      const result = hasMeaningfulContext(context);
      expect(result).toBe(true);
    });

    it('should return true for context with focusAreas', () => {
      const context: ConversationContext = {
        focusAreas: ['security']
      };
      const result = hasMeaningfulContext(context);
      expect(result).toBe(true);
    });

    it('should return true for context with constraints', () => {
      const context: ConversationContext = {
        constraints: ['budget under $50k']
      };
      const result = hasMeaningfulContext(context);
      expect(result).toBe(true);
    });

    it('should return true for context with previousContext', () => {
      const context: ConversationContext = {
        previousContext: 'User mentioned concerns'
      };
      const result = hasMeaningfulContext(context);
      expect(result).toBe(true);
    });

    it('should return true for context with projectPhase', () => {
      const context: ConversationContext = {
        projectPhase: 'planning'
      };
      const result = hasMeaningfulContext(context);
      expect(result).toBe(true);
    });

    it('should return true for context with userRole', () => {
      const context: ConversationContext = {
        userRole: 'architect'
      };
      const result = hasMeaningfulContext(context);
      expect(result).toBe(true);
    });

    it('should return true for context with requirements', () => {
      const context: ConversationContext = {
        requirements: ['GDPR compliance']
      };
      const result = hasMeaningfulContext(context);
      expect(result).toBe(true);
    });

    it('should return false for context with only timeline and budget', () => {
      const context: ConversationContext = {
        timeline: '3 months',
        budget: 'limited'
      };
      const result = hasMeaningfulContext(context);
      expect(result).toBe(false);
    });

    it('should return false for context with empty arrays', () => {
      const context: ConversationContext = {
        userGoals: [],
        focusAreas: [],
        constraints: [],
        requirements: []
      };
      const result = hasMeaningfulContext(context);
      expect(result).toBe(false);
    });

    it('should return true when any meaningful field is present', () => {
      const context: ConversationContext = {
        timeline: '3 months',
        budget: 'limited',
        userRole: 'developer' // This makes it meaningful
      };
      const result = hasMeaningfulContext(context);
      expect(result).toBe(true);
    });

    it('should handle complex context with mixed meaningful and non-meaningful fields', () => {
      const context: ConversationContext = {
        humanRequest: '', // Empty string should not count
        userGoals: [], // Empty array should not count
        focusAreas: ['security'], // This makes it meaningful
        timeline: '3 months',
        budget: 'limited'
      };
      const result = hasMeaningfulContext(context);
      expect(result).toBe(true);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle null values gracefully', () => {
      // TypeScript would prevent this, but testing runtime behavior
      const context = {
        humanRequest: null,
        userGoals: null,
        focusAreas: null
      } as any;

      expect(() => formatContextForPrompt(context)).not.toThrow();
      expect(() => hasMeaningfulContext(context)).not.toThrow();
    });

    it('should handle very long strings', () => {
      const longString = 'A'.repeat(10000);
      const context: ConversationContext = {
        humanRequest: longString,
        previousContext: longString
      };

      const formatted = formatContextForPrompt(context);
      expect(formatted).toContain(longString);
      expect(hasMeaningfulContext(context)).toBe(true);
    });

    it('should handle arrays with many items', () => {
      const manyItems = Array.from({ length: 100 }, (_, i) => `item-${i}`);
      const context: ConversationContext = {
        userGoals: manyItems,
        focusAreas: manyItems,
        constraints: manyItems,
        requirements: manyItems
      };

      const formatted = formatContextForPrompt(context);
      expect(formatted).toContain('item-0');
      expect(formatted).toContain('item-99');
      expect(hasMeaningfulContext(context)).toBe(true);
    });

    it('should handle unicode and special characters', () => {
      const context: ConversationContext = {
        humanRequest: '🚀 Help with microservices migration 中文 العربية',
        userGoals: ['Improve 性能', 'Enhance أمان'],
        focusAreas: ['🔒 Security', '⚡ Performance'],
        projectPhase: 'планирование'
      };

      const formatted = formatContextForPrompt(context);
      expect(formatted).toContain('🚀 Help with microservices migration 中文 العربية');
      expect(formatted).toContain('Improve 性能, Enhance أمان');
      expect(formatted).toContain('🔒 Security, ⚡ Performance');
      expect(formatted).toContain('планирование');
      expect(hasMeaningfulContext(context)).toBe(true);
    });

    it('should maintain consistency between formatContextForPrompt and hasMeaningfulContext', () => {
      const testCases = [
        {},
        { timeline: '3 months' },
        { userRole: 'architect' },
        { userGoals: [] },
        { userGoals: ['goal1'] },
        { humanRequest: 'test' }
      ];

      testCases.forEach(context => {
        const hasContext = hasMeaningfulContext(context);
        const formatted = formatContextForPrompt(context);
        const hasFormattedContent = formatted.length > 0;

        // If hasMeaningfulContext returns true, formatContextForPrompt should return content
        if (hasContext) {
          expect(hasFormattedContent).toBe(true);
        }
      });
    });
  });
});
