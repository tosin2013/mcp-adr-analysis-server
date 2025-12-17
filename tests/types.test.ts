/**
 * Basic tests for type definitions and schemas
 */

import { describe, it, expect } from 'vitest';
import {
  AdrSchema,
  DetectedTechnologySchema,
  DetectedPatternSchema,
  McpAdrError,
  ValidationError,
} from '../src/types/index.js';

describe('Type Definitions', () => {
  describe('AdrSchema', () => {
    it('should validate a valid ADR object', () => {
      const validAdr = {
        id: 'adr-001',
        title: 'Use TypeScript for development',
        status: 'accepted' as const,
        date: '2025-07-02',
        context: 'We need type safety in our codebase',
        decision: 'We will use TypeScript',
        consequences: 'Better type safety but longer build times',
        filePath: 'docs/adrs/001-typescript.md',
      };

      const result = AdrSchema.safeParse(validAdr);
      expect(result.success).toBe(true);
    });

    it('should reject an invalid ADR object', () => {
      const invalidAdr = {
        id: 'adr-001',
        title: 'Use TypeScript for development',
        status: 'invalid-status',
        date: '2025-07-02',
        // Missing required fields
      };

      const result = AdrSchema.safeParse(invalidAdr);
      expect(result.success).toBe(false);
    });
  });

  describe('DetectedTechnologySchema', () => {
    it('should validate a valid technology object', () => {
      const validTech = {
        name: 'TypeScript',
        category: 'language' as const,
        confidence: 0.95,
        evidence: ['package.json contains typescript'],
        filePaths: ['src/index.ts'],
      };

      const result = DetectedTechnologySchema.safeParse(validTech);
      expect(result.success).toBe(true);
    });
  });

  describe('DetectedPatternSchema', () => {
    it('should validate a valid pattern object', () => {
      const validPattern = {
        name: 'MVC Pattern',
        type: 'architectural' as const,
        confidence: 0.8,
        description: 'Model-View-Controller pattern detected',
        evidence: ['Separate model, view, and controller directories'],
        filePaths: ['src/models/', 'src/views/', 'src/controllers/'],
      };

      const result = DetectedPatternSchema.safeParse(validPattern);
      expect(result.success).toBe(true);
    });
  });
});

describe('Error Classes', () => {
  describe('McpAdrError', () => {
    it('should create error with code and message', () => {
      const error = new McpAdrError('Test error', 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('McpAdrError');
      expect(error.details).toBeUndefined();
    });

    it('should create error with details', () => {
      const details = { file: 'test.ts', line: 42 };
      const error = new McpAdrError('Test error', 'TEST_ERROR', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('ValidationError', () => {
    it('should extend McpAdrError with validation code', () => {
      const error = new ValidationError('Validation failed');

      expect(error).toBeInstanceOf(McpAdrError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });
  });
});

describe('Custom Jest Matchers', () => {
  it('should have custom ADR validation matcher', () => {
    const validAdr = {
      id: 'test',
      title: 'Test ADR',
      status: 'accepted',
      date: '2025-07-02',
      context: 'Test context',
      decision: 'Test decision',
      consequences: 'Test consequences',
    };

    expect(validAdr).toBeValidAdr();
  });

  it('should have custom schema validation matcher', () => {
    const testObject = { test: 'value' };
    expect(testObject).toHaveValidSchema();
  });
});
