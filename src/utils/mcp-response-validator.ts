/**
 * MCP Response Validator
 * 
 * Validates and sanitizes MCP tool responses to prevent JSON-RPC 2.0 parse errors
 */

export interface McpToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * Validate and sanitize an MCP tool response
 */
export function validateMcpResponse(response: any): McpToolResponse {
  try {
    // Ensure response has the correct structure
    if (!response || typeof response !== 'object') {
      return createErrorResponse('Invalid response structure');
    }

    // Ensure content array exists
    if (!Array.isArray(response.content)) {
      return createErrorResponse('Response must have content array');
    }

    // Validate and sanitize each content item
    const sanitizedContent = response.content.map((item: any, index: number) => {
      try {
        return sanitizeContentItem(item, index);
      } catch (error) {
        console.error(`Error sanitizing content item ${index}:`, error);
        return {
          type: 'text' as const,
          text: `[Error: Could not render content item ${index}]`
        };
      }
    });

    // Test JSON serialization
    const testSerialization = JSON.stringify({ content: sanitizedContent });
    
    // Verify it can be parsed back
    JSON.parse(testSerialization);

    return {
      content: sanitizedContent,
      isError: response.isError || false
    };
  } catch (error) {
    console.error('Response validation failed:', error);
    return createErrorResponse(`Response validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Sanitize a single content item
 */
function sanitizeContentItem(item: any, index: number): McpToolResponse['content'][0] {
  if (!item || typeof item !== 'object') {
    throw new Error(`Content item ${index} is not an object`);
  }

  const type = item.type;
  if (!type || !['text', 'image', 'resource'].includes(type)) {
    throw new Error(`Content item ${index} has invalid type: ${type}`);
  }

  switch (type) {
    case 'text':
      return {
        type: 'text',
        text: sanitizeTextContent(item.text || '')
      };
    
    case 'image':
      return {
        type: 'image',
        data: sanitizeBase64Content(item.data || ''),
        mimeType: sanitizeMimeType(item.mimeType || 'image/png')
      };
    
    case 'resource':
      return {
        type: 'resource',
        data: sanitizeTextContent(item.data || ''),
        mimeType: sanitizeMimeType(item.mimeType || 'text/plain')
      };
    
    default:
      throw new Error(`Unsupported content type: ${type}`);
  }
}

/**
 * Sanitize text content for JSON-RPC safety
 */
function sanitizeTextContent(text: string): string {
  if (typeof text !== 'string') {
    text = String(text);
  }

  // Remove or escape problematic characters
  return text
    // Escape backslashes first
    .replace(/\\/g, '\\\\')
    // Escape double quotes
    .replace(/"/g, '\\"')
    // Handle control characters
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    // Remove or escape other control characters
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, (char) => {
      const code = char.charCodeAt(0);
      switch (code) {
        case 0x08: return '\\b';
        case 0x0C: return '\\f';
        default:
          // Replace with safe placeholder for other control chars
          return `[CTRL:${code.toString(16).padStart(2, '0')}]`;
      }
    })
    // Limit length to prevent oversized responses
    .slice(0, 1000000); // 1MB limit
}

/**
 * Sanitize base64 content
 */
function sanitizeBase64Content(data: string): string {
  if (typeof data !== 'string') {
    return '';
  }
  
  // Validate base64 format and remove invalid characters
  return data.replace(/[^A-Za-z0-9+/=]/g, '').slice(0, 10000000); // 10MB limit
}

/**
 * Sanitize MIME type
 */
function sanitizeMimeType(mimeType: string): string {
  if (typeof mimeType !== 'string') {
    return 'text/plain';
  }
  
  // Only allow safe MIME types
  const allowedMimeTypes = [
    'text/plain', 'text/html', 'text/markdown', 'text/css', 'text/javascript',
    'application/json', 'application/xml', 'application/yaml',
    'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'
  ];
  
  const sanitized = mimeType.toLowerCase().trim();
  return allowedMimeTypes.includes(sanitized) ? sanitized : 'text/plain';
}

/**
 * Create a safe error response
 */
function createErrorResponse(message: string): McpToolResponse {
  return {
    content: [{
      type: 'text',
      text: sanitizeTextContent(`Error: ${message}`)
    }],
    isError: true
  };
}

/**
 * Validate that a response can be safely serialized as JSON-RPC 2.0
 */
export function validateJsonRpcSerialization(response: any): { valid: boolean; error?: string } {
  try {
    // Test full JSON-RPC 2.0 structure
    const jsonRpcResponse = {
      jsonrpc: '2.0',
      id: 1,
      result: response
    };
    
    const serialized = JSON.stringify(jsonRpcResponse);
    
    // Verify it can be parsed back
    const parsed = JSON.parse(serialized);
    
    // Verify structure is preserved
    if (!parsed.result || !Array.isArray(parsed.result.content)) {
      return { valid: false, error: 'Structure not preserved after serialization' };
    }
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `JSON-RPC serialization failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Safe wrapper for MCP tool functions
 */
export function safeMcpToolWrapper<T extends any[], R>(
  toolFunction: (...args: T) => Promise<R>,
  toolName: string
) {
  return async (...args: T): Promise<McpToolResponse> => {
    try {
      const result = await toolFunction(...args);
      const validated = validateMcpResponse(result);
      
      // Double-check JSON-RPC compatibility
      const jsonRpcCheck = validateJsonRpcSerialization(validated);
      if (!jsonRpcCheck.valid) {
        console.error(`JSON-RPC validation failed for ${toolName}:`, jsonRpcCheck.error);
        return createErrorResponse(`Tool response not JSON-RPC compatible: ${jsonRpcCheck.error}`);
      }
      
      return validated;
    } catch (error) {
      console.error(`Error in ${toolName}:`, error);
      return createErrorResponse(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
}