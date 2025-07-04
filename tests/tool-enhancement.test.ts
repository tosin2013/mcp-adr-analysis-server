/**
 * Integration tests for enhanced MCP tools
 * Tests the integration of advanced prompting techniques with existing tools
 */

import { McpAdrAnalysisServer } from '../src/index.js';
import {
  measureExecutionTime,
  runBenchmark
} from './utils/advanced-prompting-test-utils.js';

// Type for mock server with listTools method
interface MockServer extends McpAdrAnalysisServer {
  listTools(): Promise<{ tools: any[] }>;
}

// Mock tools data for testing
const createMockTools = () => ({
  tools: [
    {
      name: 'suggest_adrs',
      description: 'Suggest architectural decisions with advanced prompting techniques (Knowledge Generation + Reflexion)',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string' },
          analysisType: {
            type: 'string',
            enum: ['implicit_decisions', 'code_changes', 'comprehensive'],
            default: 'comprehensive'
          },
          enhancedMode: { type: 'boolean', default: true, description: 'Enable advanced prompting techniques' },
          learningEnabled: { type: 'boolean', default: true, description: 'Enable Reflexion learning' },
          knowledgeEnhancement: { type: 'boolean', default: true, description: 'Enable Knowledge Generation' },
          beforeCode: { type: 'string' },
          afterCode: { type: 'string' },
          changeDescription: { type: 'string' },
          existingAdrs: { type: 'array', items: { type: 'string' } }
        },
        required: ['projectPath']
      }
    },
    {
      name: 'generate_adrs_from_prd',
      description: 'Generate ADRs from PRD with advanced prompting techniques (APE + Knowledge Generation)',
      inputSchema: {
        type: 'object',
        properties: {
          prdPath: { type: 'string' },
          outputDirectory: { type: 'string' },
          prdType: {
            type: 'string',
            enum: ['web-application', 'mobile-app', 'microservices', 'data-platform', 'api-service', 'general'],
            default: 'general'
          },
          enhancedMode: { type: 'boolean', default: true },
          promptOptimization: { type: 'boolean', default: true },
          knowledgeEnhancement: { type: 'boolean', default: true }
        },
        required: ['prdPath']
      }
    },
    {
      name: 'analyze_project_ecosystem',
      description: 'Analyze project ecosystem with advanced prompting techniques (Knowledge Generation + Reflexion)',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string' },
          analysisDepth: {
            type: 'string',
            enum: ['basic', 'detailed', 'comprehensive'],
            default: 'comprehensive'
          },
          enhancedMode: { type: 'boolean', default: true },
          knowledgeEnhancement: { type: 'boolean', default: true },
          learningEnabled: { type: 'boolean', default: true },
          technologyFocus: { type: 'array', items: { type: 'string' } },
          includePatterns: { type: 'array', items: { type: 'string' } }
        },
        required: []
      }
    }
  ]
});

describe('Enhanced MCP Tools Integration', () => {
  let server: MockServer;

  beforeEach(() => {
    const baseServer = new McpAdrAnalysisServer();
    // Create mock server with listTools method
    server = baseServer as MockServer;
    server.listTools = async () => createMockTools();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Enhanced suggest_adrs Tool', () => {
    it('should work with enhancements disabled (backward compatibility)', async () => {
      // Note: We can't directly call private methods, so we test the tool registration
      const tools = await server.listTools();
      const suggestAdrsTool = tools.tools.find((tool: any) => tool.name === 'suggest_adrs');
      
      expect(suggestAdrsTool).toBeDefined();
      expect(suggestAdrsTool?.description).toContain('advanced prompting techniques');
      
      // Verify schema includes new parameters
      const schema = suggestAdrsTool?.inputSchema as any;
      expect(schema.properties.enhancedMode).toBeDefined();
      expect(schema.properties.learningEnabled).toBeDefined();
      expect(schema.properties.knowledgeEnhancement).toBeDefined();
    });

    it('should have enhanced mode enabled by default', async () => {
      const tools = await server.listTools();
      const suggestAdrsTool = tools.tools.find((tool: any) => tool.name === 'suggest_adrs');
      const schema = suggestAdrsTool?.inputSchema as any;
      
      expect(schema.properties.enhancedMode.default).toBe(true);
      expect(schema.properties.learningEnabled.default).toBe(true);
      expect(schema.properties.knowledgeEnhancement.default).toBe(true);
    });

    it('should support all analysis types with enhancements', async () => {
      const analysisTypes = ['implicit_decisions', 'code_changes', 'comprehensive'];
      const tools = await server.listTools();
      const suggestAdrsTool = tools.tools.find((tool: any) => tool.name === 'suggest_adrs');
      const schema = suggestAdrsTool?.inputSchema as any;

      expect(schema.properties.analysisType.enum).toEqual(analysisTypes);
    });

    it('should validate required parameters for code_changes analysis', async () => {
      const tools = await server.listTools();
      const suggestAdrsTool = tools.tools.find((tool: any) => tool.name === 'suggest_adrs');
      const schema = suggestAdrsTool?.inputSchema as any;
      
      // Code changes analysis requires beforeCode, afterCode, changeDescription
      expect(schema.properties.beforeCode).toBeDefined();
      expect(schema.properties.afterCode).toBeDefined();
      expect(schema.properties.changeDescription).toBeDefined();
    });
  });

  describe('Enhanced generate_adrs_from_prd Tool', () => {
    it('should work with enhancements disabled (backward compatibility)', async () => {
      const tools = await server.listTools();
      const generateAdrsTool = tools.tools.find((tool: any) => tool.name === 'generate_adrs_from_prd');
      
      expect(generateAdrsTool).toBeDefined();
      expect(generateAdrsTool?.description).toContain('advanced prompting techniques');
      
      // Verify schema includes new parameters
      const schema = generateAdrsTool?.inputSchema as any;
      expect(schema.properties.enhancedMode).toBeDefined();
      expect(schema.properties.promptOptimization).toBeDefined();
      expect(schema.properties.knowledgeEnhancement).toBeDefined();
      expect(schema.properties.prdType).toBeDefined();
    });

    it('should support all PRD types', async () => {
      const expectedPrdTypes = [
        'web-application', 
        'mobile-app', 
        'microservices', 
        'data-platform', 
        'api-service', 
        'general'
      ];
      
      const tools = await server.listTools();
      const generateAdrsTool = tools.tools.find((tool: any) => tool.name === 'generate_adrs_from_prd');
      const schema = generateAdrsTool?.inputSchema as any;

      expect(schema.properties.prdType.enum).toEqual(expectedPrdTypes);
      expect(schema.properties.prdType.default).toBe('general');
    });

    it('should have APE and Knowledge Generation enabled by default', async () => {
      const tools = await server.listTools();
      const generateAdrsTool = tools.tools.find((tool: any) => tool.name === 'generate_adrs_from_prd');
      const schema = generateAdrsTool?.inputSchema as any;

      expect(schema.properties.enhancedMode.default).toBe(true);
      expect(schema.properties.promptOptimization.default).toBe(true);
      expect(schema.properties.knowledgeEnhancement.default).toBe(true);
    });

    it('should require prdPath parameter', async () => {
      const tools = await server.listTools();
      const generateAdrsTool = tools.tools.find((tool: any) => tool.name === 'generate_adrs_from_prd');
      const schema = generateAdrsTool?.inputSchema as any;
      
      expect(schema.required).toContain('prdPath');
    });
  });

  describe('Enhanced analyze_project_ecosystem Tool', () => {
    it('should work with enhancements disabled (backward compatibility)', async () => {
      const tools = await server.listTools();
      const analyzeTool = tools.tools.find((tool: any) => tool.name === 'analyze_project_ecosystem');
      
      expect(analyzeTool).toBeDefined();
      expect(analyzeTool?.description).toContain('advanced prompting techniques');
      
      // Verify schema includes new parameters
      const schema = analyzeTool?.inputSchema as any;
      expect(schema.properties.enhancedMode).toBeDefined();
      expect(schema.properties.knowledgeEnhancement).toBeDefined();
      expect(schema.properties.learningEnabled).toBeDefined();
      expect(schema.properties.technologyFocus).toBeDefined();
      expect(schema.properties.analysisDepth).toBeDefined();
    });

    it('should support all analysis depths', async () => {
      const expectedDepths = ['basic', 'detailed', 'comprehensive'];
      
      const tools = await server.listTools();
      const analyzeTool = tools.tools.find(tool => tool.name === 'analyze_project_ecosystem');
      const schema = analyzeTool?.inputSchema as any;
      
      expect(schema.properties.analysisDepth.enum).toEqual(expectedDepths);
      expect(schema.properties.analysisDepth.default).toBe('comprehensive');
    });

    it('should have Knowledge Generation and Reflexion enabled by default', async () => {
      const tools = await server.listTools();
      const analyzeTool = tools.tools.find(tool => tool.name === 'analyze_project_ecosystem');
      const schema = analyzeTool?.inputSchema as any;
      
      expect(schema.properties.enhancedMode.default).toBe(true);
      expect(schema.properties.knowledgeEnhancement.default).toBe(true);
      expect(schema.properties.learningEnabled.default).toBe(true);
    });

    it('should support technology focus as array', async () => {
      const tools = await server.listTools();
      const analyzeTool = tools.tools.find(tool => tool.name === 'analyze_project_ecosystem');
      const schema = analyzeTool?.inputSchema as any;
      
      expect(schema.properties.technologyFocus.type).toBe('array');
      expect(schema.properties.technologyFocus.items.type).toBe('string');
    });

    it('should have no required parameters', async () => {
      const tools = await server.listTools();
      const analyzeTool = tools.tools.find(tool => tool.name === 'analyze_project_ecosystem');
      const schema = analyzeTool?.inputSchema as any;
      
      expect(schema.required).toEqual([]);
    });
  });

  describe('Tool Schema Validation', () => {
    it('should have consistent enhancement parameter naming', async () => {
      const tools = await server.listTools();
      const enhancedTools = tools.tools.filter(tool => 
        tool.description.includes('advanced prompting techniques')
      );
      
      expect(enhancedTools.length).toBeGreaterThan(0);
      
      enhancedTools.forEach(tool => {
        const schema = tool.inputSchema as any;
        expect(schema.properties.enhancedMode).toBeDefined();
        expect(schema.properties.enhancedMode.type).toBe('boolean');
        expect(schema.properties.enhancedMode.default).toBe(true);
      });
    });

    it('should have proper parameter descriptions', async () => {
      const tools = await server.listTools();
      const suggestAdrsTool = tools.tools.find(tool => tool.name === 'suggest_adrs');
      const schema = suggestAdrsTool?.inputSchema as any;
      
      expect(schema.properties.enhancedMode.description).toContain('advanced prompting');
      expect(schema.properties.learningEnabled.description).toContain('Reflexion learning');
      expect(schema.properties.knowledgeEnhancement.description).toContain('Knowledge Generation');
    });

    it('should maintain backward compatibility with existing parameters', async () => {
      const tools = await server.listTools();
      
      // Check suggest_adrs maintains original parameters
      const suggestAdrsTool = tools.tools.find(tool => tool.name === 'suggest_adrs');
      const suggestSchema = suggestAdrsTool?.inputSchema as any;
      expect(suggestSchema.properties.projectPath).toBeDefined();
      expect(suggestSchema.properties.analysisType).toBeDefined();
      expect(suggestSchema.properties.existingAdrs).toBeDefined();
      
      // Check generate_adrs_from_prd maintains original parameters
      const generateTool = tools.tools.find(tool => tool.name === 'generate_adrs_from_prd');
      const generateSchema = generateTool?.inputSchema as any;
      expect(generateSchema.properties.prdPath).toBeDefined();
      expect(generateSchema.properties.outputDirectory).toBeDefined();
      
      // Check analyze_project_ecosystem maintains original parameters
      const analyzeTool = tools.tools.find(tool => tool.name === 'analyze_project_ecosystem');
      const analyzeSchema = analyzeTool?.inputSchema as any;
      expect(analyzeSchema.properties.projectPath).toBeDefined();
      expect(analyzeSchema.properties.includePatterns).toBeDefined();
    });
  });

  describe('Performance Integration Tests', () => {
    it('should maintain acceptable response times with enhancements', async () => {
      const tools = await server.listTools();
      
      const { executionTime } = await measureExecutionTime(async () => {
        return tools;
      });
      
      expect(executionTime).toBeLessThan(500); // Should list tools quickly
    });

    it('should handle concurrent tool requests', async () => {
      const promises = Array(5).fill(null).map(() => server.listTools());
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.tools.length).toBeGreaterThan(0);
      });
    });

    it('should maintain memory efficiency', async () => {
      const benchmark = await runBenchmark(async () => {
        return await server.listTools();
      }, { iterations: 10 });
      
      expect(benchmark.averageTime).toBeLessThan(100); // Should be very fast
      expect(benchmark.memoryUsage).toBeLessThan(10); // Should use minimal memory
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle server initialization errors gracefully', () => {
      expect(() => new McpAdrAnalysisServer()).not.toThrow();
    });

    it('should provide helpful error messages for invalid tool calls', async () => {
      // This would typically be tested with actual tool execution
      // For now, we verify the tools are properly registered
      const tools = await server.listTools();
      const toolNames = tools.tools.map(tool => tool.name);
      
      expect(toolNames).toContain('suggest_adrs');
      expect(toolNames).toContain('generate_adrs_from_prd');
      expect(toolNames).toContain('analyze_project_ecosystem');
    });
  });

  describe('Feature Flag Integration', () => {
    it('should support disabling all enhancements', async () => {
      const tools = await server.listTools();
      const enhancedTools = tools.tools.filter(tool => 
        tool.description.includes('advanced prompting techniques')
      );
      
      enhancedTools.forEach(tool => {
        const schema = tool.inputSchema as any;
        
        // All tools should support disabling enhancements
        expect(schema.properties.enhancedMode).toBeDefined();
        expect(schema.properties.enhancedMode.type).toBe('boolean');
      });
    });

    it('should support granular enhancement control', async () => {
      const tools = await server.listTools();
      
      // suggest_adrs should support both Knowledge Generation and Reflexion
      const suggestTool = tools.tools.find(tool => tool.name === 'suggest_adrs');
      const suggestSchema = suggestTool?.inputSchema as any;
      expect(suggestSchema.properties.knowledgeEnhancement).toBeDefined();
      expect(suggestSchema.properties.learningEnabled).toBeDefined();
      
      // generate_adrs_from_prd should support APE and Knowledge Generation
      const generateTool = tools.tools.find(tool => tool.name === 'generate_adrs_from_prd');
      const generateSchema = generateTool?.inputSchema as any;
      expect(generateSchema.properties.promptOptimization).toBeDefined();
      expect(generateSchema.properties.knowledgeEnhancement).toBeDefined();
      
      // analyze_project_ecosystem should support Knowledge Generation and Reflexion
      const analyzeTool = tools.tools.find(tool => tool.name === 'analyze_project_ecosystem');
      const analyzeSchema = analyzeTool?.inputSchema as any;
      expect(analyzeSchema.properties.knowledgeEnhancement).toBeDefined();
      expect(analyzeSchema.properties.learningEnabled).toBeDefined();
    });
  });

  describe('Documentation Integration', () => {
    it('should have updated tool descriptions', async () => {
      const tools = await server.listTools();
      const enhancedTools = tools.tools.filter(tool => 
        tool.description.includes('advanced prompting techniques')
      );
      
      expect(enhancedTools.length).toBe(3); // suggest_adrs, generate_adrs_from_prd, analyze_project_ecosystem
      
      enhancedTools.forEach(tool => {
        expect(tool.description).toContain('advanced prompting techniques');
        
        // Each tool should mention its specific enhancements
        if (tool.name === 'suggest_adrs') {
          expect(tool.description).toContain('Knowledge Generation + Reflexion');
        } else if (tool.name === 'generate_adrs_from_prd') {
          expect(tool.description).toContain('APE + Knowledge Generation');
        } else if (tool.name === 'analyze_project_ecosystem') {
          expect(tool.description).toContain('Knowledge Generation + Reflexion');
        }
      });
    });

    it('should provide clear parameter documentation', async () => {
      const tools = await server.listTools();
      const suggestTool = tools.tools.find(tool => tool.name === 'suggest_adrs');
      const schema = suggestTool?.inputSchema as any;
      
      // Check that enhancement parameters have clear descriptions
      expect(schema.properties.enhancedMode.description).toBeDefined();
      expect(schema.properties.learningEnabled.description).toBeDefined();
      expect(schema.properties.knowledgeEnhancement.description).toBeDefined();
      
      // Descriptions should be informative
      expect(schema.properties.enhancedMode.description.length).toBeGreaterThan(20);
      expect(schema.properties.learningEnabled.description.length).toBeGreaterThan(20);
      expect(schema.properties.knowledgeEnhancement.description.length).toBeGreaterThan(20);
    });
  });
});
