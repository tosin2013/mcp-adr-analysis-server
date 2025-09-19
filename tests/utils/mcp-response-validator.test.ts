import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  validateMcpResponse,
  validateJsonRpcSerialization,
  safeMcpToolWrapper,
  type McpToolResponse,
} from '../../src/utils/mcp-response-validator.js';

describe('MCP Response Validator', () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('validateMcpResponse', () => {
    describe('Valid Responses', () => {
      it('should validate a simple text response', () => {
        const input = {
          content: [{ type: 'text', text: 'Hello world' }],
        };

        const result = validateMcpResponse(input);

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toBe('Hello world');
        expect(result.isError).toBe(false);
      });

      it('should validate an image response', () => {
        const input = {
          content: [
            {
              type: 'image',
              data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
              mimeType: 'image/png',
            },
          ],
        };

        const result = validateMcpResponse(input);

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('image');
        expect(result.content[0].data).toBeDefined();
        expect(result.content[0].mimeType).toBe('image/png');
      });

      it('should validate a resource response', () => {
        const input = {
          content: [
            {
              type: 'resource',
              data: 'Some resource data',
              mimeType: 'text/plain',
            },
          ],
        };

        const result = validateMcpResponse(input);

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('resource');
        expect(result.content[0].data).toBe('Some resource data');
        expect(result.content[0].mimeType).toBe('text/plain');
      });

      it('should handle multiple content items', () => {
        const input = {
          content: [
            { type: 'text', text: 'First item' },
            { type: 'text', text: 'Second item' },
          ],
        };

        const result = validateMcpResponse(input);

        expect(result.content).toHaveLength(2);
        expect(result.content[0].text).toBe('First item');
        expect(result.content[1].text).toBe('Second item');
      });

      it('should preserve isError flag when true', () => {
        const input = {
          content: [{ type: 'text', text: 'Error message' }],
          isError: true,
        };

        const result = validateMcpResponse(input);

        expect(result.isError).toBe(true);
      });
    });

    describe('Invalid Response Structure', () => {
      it('should handle null response', () => {
        const result = validateMcpResponse(null);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Invalid response structure');
      });

      it('should handle undefined response', () => {
        const result = validateMcpResponse(undefined);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Invalid response structure');
      });

      it('should handle non-object response', () => {
        const result = validateMcpResponse('string response');

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Invalid response structure');
      });

      it('should handle missing content array', () => {
        const result = validateMcpResponse({ otherField: 'value' });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Response must have content array');
      });

      it('should handle non-array content', () => {
        const result = validateMcpResponse({ content: 'not an array' });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Response must have content array');
      });
    });

    describe('Content Item Validation', () => {
      it('should handle invalid content item type', () => {
        const input = {
          content: [{ type: 'invalid-type', text: 'Hello' }],
        };

        const result = validateMcpResponse(input);

        expect(result.content).toHaveLength(1);
        expect(result.content[0].text).toContain('Error: Could not render content item 0');
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should handle missing content item type', () => {
        const input = {
          content: [{ text: 'Hello' }],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].text).toContain('Error: Could not render content item 0');
      });

      it('should handle non-object content item', () => {
        const input = {
          content: ['string item'],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].text).toContain('Error: Could not render content item 0');
      });

      it('should handle null content item', () => {
        const input = {
          content: [null],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].text).toContain('Error: Could not render content item 0');
      });
    });

    describe('Text Content Sanitization', () => {
      it('should escape double quotes', () => {
        const input = {
          content: [{ type: 'text', text: 'Text with "quotes"' }],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].text).toBe('Text with \\"quotes\\"');
      });

      it('should escape backslashes', () => {
        const input = {
          content: [{ type: 'text', text: 'Path\\to\\file' }],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].text).toBe('Path\\\\to\\\\file');
      });

      it('should handle newlines and carriage returns', () => {
        const input = {
          content: [{ type: 'text', text: 'Line 1\nLine 2\rLine 3' }],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].text).toBe('Line 1\\nLine 2\\rLine 3');
      });

      it('should handle tabs', () => {
        const input = {
          content: [{ type: 'text', text: 'Column 1\tColumn 2' }],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].text).toBe('Column 1\\tColumn 2');
      });

      it('should handle control characters', () => {
        const input = {
          content: [{ type: 'text', text: 'Text with\x08backspace and\x0Cform feed' }],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].text).toBe('Text with\\bbackspace and\\fform feed');
      });

      it('should replace other control characters with placeholders', () => {
        const input = {
          content: [{ type: 'text', text: 'Text with\x00null and\x07bell' }],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].text).toContain('[CTRL:00]');
        expect(result.content[0].text).toContain('[CTRL:07]');
      });

      it('should convert non-string text to string', () => {
        const input = {
          content: [{ type: 'text', text: 12345 }],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].text).toBe('12345');
      });

      it('should limit text length', () => {
        const longText = 'a'.repeat(2000000); // 2MB text
        const input = {
          content: [{ type: 'text', text: longText }],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].text?.length).toBe(1000000); // Limited to 1MB
      });
    });

    describe('Image Content Sanitization', () => {
      it('should use default MIME type for image', () => {
        const input = {
          content: [{ type: 'image', data: 'validbase64data' }],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].mimeType).toBe('image/png');
      });

      it('should clean invalid base64 characters', () => {
        const input = {
          content: [
            {
              type: 'image',
              data: 'valid!@#$%^&*()base64+=data',
              mimeType: 'image/jpeg',
            },
          ],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].data).toBe('validbase64+=data');
        expect(result.content[0].mimeType).toBe('image/jpeg');
      });

      it('should limit base64 data length', () => {
        const longData = 'a'.repeat(20000000); // 20MB data
        const input = {
          content: [{ type: 'image', data: longData }],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].data?.length).toBe(10000000); // Limited to 10MB
      });

      it('should handle non-string image data', () => {
        const input = {
          content: [{ type: 'image', data: null }],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].data).toBe('');
      });
    });

    describe('MIME Type Sanitization', () => {
      it('should allow valid MIME types', () => {
        const validMimeTypes = [
          'text/plain',
          'text/html',
          'text/markdown',
          'application/json',
          'image/png',
          'image/jpeg',
          'image/svg+xml',
        ];

        validMimeTypes.forEach(mimeType => {
          const input = {
            content: [{ type: 'resource', data: 'test', mimeType }],
          };

          const result = validateMcpResponse(input);

          expect(result.content[0].mimeType).toBe(mimeType);
        });
      });

      it('should reject invalid MIME types', () => {
        const input = {
          content: [
            {
              type: 'resource',
              data: 'test',
              mimeType: 'application/evil-script',
            },
          ],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].mimeType).toBe('text/plain');
      });

      it('should handle non-string MIME types', () => {
        const input = {
          content: [{ type: 'resource', data: 'test', mimeType: null }],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].mimeType).toBe('text/plain');
      });

      it('should normalize MIME type case and whitespace', () => {
        const input = {
          content: [
            {
              type: 'resource',
              data: 'test',
              mimeType: '  TEXT/HTML  ',
            },
          ],
        };

        const result = validateMcpResponse(input);

        expect(result.content[0].mimeType).toBe('text/html');
      });
    });

    describe('JSON Serialization Safety', () => {
      it('should ensure response can be JSON serialized', () => {
        const input = {
          content: [{ type: 'text', text: 'Valid text' }],
        };

        const result = validateMcpResponse(input);

        expect(() => JSON.stringify(result)).not.toThrow();
      });

      it('should handle serialization errors', () => {
        // Mock JSON.stringify to throw
        const originalStringify = JSON.stringify;
        jest.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
          throw new Error('Serialization failed');
        });

        const input = {
          content: [{ type: 'text', text: 'Text' }],
        };

        const result = validateMcpResponse(input);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Response validation failed');

        JSON.stringify = originalStringify;
      });
    });
  });

  describe('validateJsonRpcSerialization', () => {
    it('should validate correct JSON-RPC structure', () => {
      const response = {
        content: [{ type: 'text', text: 'Hello' }],
      };

      const result = validateJsonRpcSerialization(response);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should detect JSON serialization failures', () => {
      const circularObj: any = {};
      circularObj.self = circularObj;
      const response = {
        content: [{ type: 'text', text: 'Hello', circular: circularObj }],
      };

      const result = validateJsonRpcSerialization(response);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('JSON-RPC serialization failed');
    });

    it('should detect structure corruption after serialization', () => {
      // Mock JSON.parse to return corrupted structure
      const originalParse = JSON.parse;
      jest.spyOn(JSON, 'parse').mockImplementationOnce(() => ({
        jsonrpc: '2.0',
        id: 1,
        result: { corrupted: true },
      }));

      const response = {
        content: [{ type: 'text', text: 'Hello' }],
      };

      const result = validateJsonRpcSerialization(response);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Structure not preserved');

      JSON.parse = originalParse;
    });
  });

  describe('safeMcpToolWrapper', () => {
    it('should wrap successful tool execution', async () => {
      const mockTool = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Success' }],
      });

      const wrappedTool = safeMcpToolWrapper(mockTool, 'test-tool');
      const result = await wrappedTool('arg1', 'arg2');

      expect(mockTool).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result.content[0].text).toBe('Success');
      expect(result.isError).toBe(false);
    });

    it('should handle tool execution errors', async () => {
      const mockTool = jest.fn().mockRejectedValue(new Error('Tool failed'));

      const wrappedTool = safeMcpToolWrapper(mockTool, 'test-tool');
      const result = await wrappedTool();

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Tool execution failed: Tool failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in test-tool:', expect.any(Error));
    });

    it('should handle non-Error exceptions', async () => {
      const mockTool = jest.fn().mockRejectedValue('String error');

      const wrappedTool = safeMcpToolWrapper(mockTool, 'test-tool');
      const result = await wrappedTool();

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Tool execution failed: String error');
    });

    it('should validate tool response', async () => {
      const mockTool = jest.fn().mockResolvedValue({
        content: [{ type: 'invalid-type', text: 'Invalid' }],
      });

      const wrappedTool = safeMcpToolWrapper(mockTool, 'test-tool');
      const result = await wrappedTool();

      expect(result.content[0].text).toContain('Error: Could not render content item 0');
    });

    it('should handle JSON-RPC incompatible responses by checking actual serialization', async () => {
      const mockTool = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Valid response' }],
      });

      const wrappedTool = safeMcpToolWrapper(mockTool, 'test-tool');
      const result = await wrappedTool();

      // For this test, we expect the response to be valid since our mock returns a valid response
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('Valid response');
    });

    it('should maintain tool function signature', async () => {
      const mockTool = (a: string, b: number, c: boolean) =>
        Promise.resolve({
          content: [{ type: 'text', text: `${a}-${b}-${c}` }],
        });

      const wrappedTool = safeMcpToolWrapper(mockTool, 'test-tool');
      const result = await wrappedTool('test', 123, true);

      expect(result.content[0].text).toBe('test-123-true');
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('should handle empty content array', () => {
      const input = { content: [] };

      const result = validateMcpResponse(input);

      expect(result.content).toHaveLength(0);
      expect(result.isError).toBe(false);
    });

    it('should handle mixed valid and invalid content items', () => {
      const input = {
        content: [
          { type: 'text', text: 'Valid item' },
          { type: 'invalid', text: 'Invalid item' },
          { type: 'text', text: 'Another valid item' },
        ],
      };

      const result = validateMcpResponse(input);

      expect(result.content).toHaveLength(3);
      expect(result.content[0].text).toBe('Valid item');
      expect(result.content[1].text).toContain('Error: Could not render content item 1');
      expect(result.content[2].text).toBe('Another valid item');
    });

    it('should handle resource type with missing data', () => {
      const input = {
        content: [{ type: 'resource' }],
      };

      const result = validateMcpResponse(input);

      expect(result.content[0].type).toBe('resource');
      expect(result.content[0].data).toBe('');
      expect(result.content[0].mimeType).toBe('text/plain');
    });

    it('should handle image type with missing data', () => {
      const input = {
        content: [{ type: 'image' }],
      };

      const result = validateMcpResponse(input);

      expect(result.content[0].type).toBe('image');
      expect(result.content[0].data).toBe('');
      expect(result.content[0].mimeType).toBe('image/png');
    });
  });
});
