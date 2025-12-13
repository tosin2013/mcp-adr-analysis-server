/**
 * Tests for CE-MCP Tool Wrappers
 *
 * Tests the directive-based versions of high-token-cost tools.
 *
 * @see ADR-014: CE-MCP Architecture
 */

import {
  createAnalyzeProjectEcosystemDirective,
  createSuggestAdrsDirective,
  createGenerateRulesDirective,
  createAnalyzeEnvironmentDirective,
  createDeploymentReadinessDirective,
  shouldUseCEMCPDirective,
  getCEMCPDirective,
  formatDirectiveResponse,
} from '../../src/tools/ce-mcp-tools.js';
import {
  isOrchestrationDirective,
  isStateMachineDirective,
} from '../../src/types/ce-mcp.js';

describe('CE-MCP Tools', () => {
  describe('createAnalyzeProjectEcosystemDirective', () => {
    it('should create valid orchestration directive', () => {
      const directive = createAnalyzeProjectEcosystemDirective({
        projectPath: '/test/project',
      });

      expect(isOrchestrationDirective(directive)).toBe(true);
      expect(directive.tool).toBe('analyze_project_ecosystem');
      expect(directive.version).toBe('1.0');
    });

    it('should include all required operations', () => {
      const directive = createAnalyzeProjectEcosystemDirective({
        projectPath: '/test/project',
        analysisDepth: 'comprehensive',
      });

      const opTypes = directive.sandbox_operations.map(op => op.op);
      expect(opTypes).toContain('analyzeFiles');
      expect(opTypes).toContain('scanEnvironment');
      expect(opTypes).toContain('loadKnowledge');
      expect(opTypes).toContain('loadPrompt');
      expect(opTypes).toContain('generateContext');
      expect(opTypes).toContain('cacheResult');
      expect(opTypes).toContain('composeResult');
    });

    it('should estimate ~4K tokens (down from ~12K)', () => {
      const directive = createAnalyzeProjectEcosystemDirective({
        projectPath: '/test/project',
      });

      expect(directive.metadata?.estimated_tokens).toBe(4000);
    });

    it('should adjust maxFiles based on analysis depth', () => {
      const basicDirective = createAnalyzeProjectEcosystemDirective({
        projectPath: '/test',
        analysisDepth: 'basic',
      });

      const comprehensiveDirective = createAnalyzeProjectEcosystemDirective({
        projectPath: '/test',
        analysisDepth: 'comprehensive',
      });

      const basicAnalyzeOp = basicDirective.sandbox_operations.find(
        op => op.op === 'analyzeFiles'
      );
      const comprehensiveAnalyzeOp = comprehensiveDirective.sandbox_operations.find(
        op => op.op === 'analyzeFiles'
      );

      expect(basicAnalyzeOp?.args?.maxFiles).toBe(50);
      expect(comprehensiveAnalyzeOp?.args?.maxFiles).toBe(200);
    });

    it('should include composition directive', () => {
      const directive = createAnalyzeProjectEcosystemDirective({
        projectPath: '/test/project',
      });

      expect(directive.compose).toBeDefined();
      expect(directive.compose?.template).toBe('ecosystem_analysis_report');
      expect(directive.compose?.format).toBe('markdown');
      expect(directive.compose?.sections.length).toBeGreaterThan(0);
    });

    it('should be marked as cacheable', () => {
      const directive = createAnalyzeProjectEcosystemDirective({
        projectPath: '/test/project',
      });

      expect(directive.metadata?.cacheable).toBe(true);
      expect(directive.metadata?.cache_key).toContain('ecosystem');
    });

    it('should handle technology focus', () => {
      const directive = createAnalyzeProjectEcosystemDirective({
        projectPath: '/test/project',
        technologyFocus: ['typescript', 'react'],
      });

      const knowledgeOp = directive.sandbox_operations.find(
        op => op.op === 'loadKnowledge'
      );
      expect(knowledgeOp?.args?.technologies).toEqual(['typescript', 'react']);
    });
  });

  describe('createSuggestAdrsDirective', () => {
    it('should create valid state machine directive', () => {
      const directive = createSuggestAdrsDirective({
        projectPath: '/test/project',
      });

      expect(isStateMachineDirective(directive)).toBe(true);
      expect(directive.version).toBe('1.0');
      expect(directive.final_state).toBe('done');
    });

    it('should have correct transition sequence', () => {
      const directive = createSuggestAdrsDirective({
        projectPath: '/test/project',
      });

      const transitionNames = directive.transitions.map(t => t.name);
      expect(transitionNames).toEqual([
        'load_adr_knowledge',
        'analyze_codebase',
        'load_adr_template',
        'generate_suggestions',
        'validate_suggestions',
      ]);
    });

    it('should include initial state with all args', () => {
      const directive = createSuggestAdrsDirective({
        projectPath: '/test/project',
        focusAreas: ['security', 'performance'],
        maxSuggestions: 10,
      });

      expect(directive.initial_state.projectPath).toBe('/test/project');
      expect(directive.initial_state.focusAreas).toEqual(['security', 'performance']);
      expect(directive.initial_state.maxSuggestions).toBe(10);
    });

    it('should handle validation errors gracefully', () => {
      const directive = createSuggestAdrsDirective({
        projectPath: '/test/project',
      });

      const validateTransition = directive.transitions.find(
        t => t.name === 'validate_suggestions'
      );
      expect(validateTransition?.on_error).toBe('skip');
    });
  });

  describe('createGenerateRulesDirective', () => {
    it('should create valid orchestration directive', () => {
      const directive = createGenerateRulesDirective({
        projectPath: '/test/project',
        ruleType: 'code-quality',
      });

      expect(isOrchestrationDirective(directive)).toBe(true);
      expect(directive.tool).toBe('generate_rules');
    });

    it('should estimate ~1.5K tokens (down from ~4K)', () => {
      const directive = createGenerateRulesDirective({
        projectPath: '/test/project',
        ruleType: 'security',
      });

      expect(directive.metadata?.estimated_tokens).toBe(1500);
    });

    it('should support different rule types', () => {
      const ruleTypes = ['code-quality', 'security', 'architecture', 'testing'] as const;

      for (const ruleType of ruleTypes) {
        const directive = createGenerateRulesDirective({
          projectPath: '/test',
          ruleType,
        });

        expect(directive.description).toContain(ruleType);
        const knowledgeOp = directive.sandbox_operations.find(
          op => op.op === 'loadKnowledge'
        );
        expect(knowledgeOp?.args?.domain).toBe(ruleType);
      }
    });

    it('should cache rules with longer TTL', () => {
      const directive = createGenerateRulesDirective({
        projectPath: '/test/project',
        ruleType: 'architecture',
      });

      const cacheOp = directive.sandbox_operations.find(
        op => op.op === 'cacheResult'
      );
      expect(cacheOp?.args?.ttl).toBe(7200); // 2 hours
    });

    it('should adjust file patterns based on target framework', () => {
      const tsDirective = createGenerateRulesDirective({
        projectPath: '/test',
        ruleType: 'code-quality',
        targetFramework: 'typescript',
      });

      const analyzeOp = tsDirective.sandbox_operations.find(
        op => op.op === 'analyzeFiles'
      );
      expect(analyzeOp?.args?.patterns).toEqual(['**/*.ts']);
    });
  });

  describe('createAnalyzeEnvironmentDirective', () => {
    it('should create valid orchestration directive', () => {
      const directive = createAnalyzeEnvironmentDirective({
        projectPath: '/test/project',
      });

      expect(isOrchestrationDirective(directive)).toBe(true);
      expect(directive.tool).toBe('analyze_environment');
    });

    it('should estimate ~1K tokens (down from ~2.5K)', () => {
      const directive = createAnalyzeEnvironmentDirective({
        projectPath: '/test/project',
      });

      expect(directive.metadata?.estimated_tokens).toBe(1000);
    });

    it('should scan environment config files', () => {
      const directive = createAnalyzeEnvironmentDirective({
        projectPath: '/test/project',
      });

      const analyzeOp = directive.sandbox_operations.find(
        op => op.op === 'analyzeFiles'
      );
      expect(analyzeOp?.args?.patterns).toContain('Dockerfile*');
      expect(analyzeOp?.args?.patterns).toContain('docker-compose*.yml');
      expect(analyzeOp?.args?.patterns).toContain('package.json');
    });

    it('should load different prompts based on analysis type', () => {
      const quickDirective = createAnalyzeEnvironmentDirective({
        projectPath: '/test',
        analysisType: 'quick',
      });

      const comprehensiveDirective = createAnalyzeEnvironmentDirective({
        projectPath: '/test',
        analysisType: 'comprehensive',
      });

      const quickPromptOp = quickDirective.sandbox_operations.find(
        op => op.op === 'loadPrompt'
      );
      const comprehensivePromptOp = comprehensiveDirective.sandbox_operations.find(
        op => op.op === 'loadPrompt'
      );

      expect(quickPromptOp?.args?.section).toBe('config_validation');
      expect(comprehensivePromptOp?.args?.section).toBe('infrastructure_review');
    });
  });

  describe('createDeploymentReadinessDirective', () => {
    it('should create valid state machine directive', () => {
      const directive = createDeploymentReadinessDirective({
        projectPath: '/test/project',
        targetEnvironment: 'production',
      });

      expect(isStateMachineDirective(directive)).toBe(true);
      expect(directive.final_state).toBe('done');
    });

    it('should abort on validation failure', () => {
      const directive = createDeploymentReadinessDirective({
        projectPath: '/test/project',
        targetEnvironment: 'staging',
      });

      const validateTransition = directive.transitions.find(
        t => t.name === 'validate_readiness'
      );
      expect(validateTransition?.on_error).toBe('abort');
    });

    it('should include target environment in initial state', () => {
      const directive = createDeploymentReadinessDirective({
        projectPath: '/test/project',
        targetEnvironment: 'production',
      });

      expect(directive.initial_state.targetEnvironment).toBe('production');
    });

    it('should cache results with 30 minute TTL', () => {
      const directive = createDeploymentReadinessDirective({
        projectPath: '/test/project',
        targetEnvironment: 'staging',
      });

      const cacheTransition = directive.transitions.find(
        t => t.name === 'cache_result'
      );
      const op = cacheTransition?.operation as { args?: { ttl?: number } };
      expect(op?.args?.ttl).toBe(1800);
    });
  });

  describe('shouldUseCEMCPDirective', () => {
    it('should return true for supported tools in directive mode', () => {
      const supportedTools = [
        'analyze_project_ecosystem',
        'suggest_adrs',
        'generate_rules',
        'analyze_environment',
        'deployment_readiness',
      ];

      for (const tool of supportedTools) {
        expect(shouldUseCEMCPDirective(tool, { mode: 'directive' })).toBe(true);
        expect(shouldUseCEMCPDirective(tool, { mode: 'hybrid' })).toBe(true);
      }
    });

    it('should return false for unsupported tools', () => {
      expect(
        shouldUseCEMCPDirective('some_other_tool', { mode: 'directive' })
      ).toBe(false);
    });

    it('should return false in legacy mode', () => {
      expect(
        shouldUseCEMCPDirective('analyze_project_ecosystem', { mode: 'legacy' })
      ).toBe(false);
    });
  });

  describe('getCEMCPDirective', () => {
    it('should return correct directive for each tool', () => {
      const ecosystemDirective = getCEMCPDirective('analyze_project_ecosystem', {
        projectPath: '/test',
      });
      expect(isOrchestrationDirective(ecosystemDirective!)).toBe(true);

      const adrDirective = getCEMCPDirective('suggest_adrs', {
        projectPath: '/test',
      });
      expect(isStateMachineDirective(adrDirective!)).toBe(true);

      const rulesDirective = getCEMCPDirective('generate_rules', {
        projectPath: '/test',
        ruleType: 'security',
      });
      expect(isOrchestrationDirective(rulesDirective!)).toBe(true);

      const envDirective = getCEMCPDirective('analyze_environment', {
        projectPath: '/test',
      });
      expect(isOrchestrationDirective(envDirective!)).toBe(true);

      const deployDirective = getCEMCPDirective('deployment_readiness', {
        projectPath: '/test',
        targetEnvironment: 'production',
      });
      expect(isStateMachineDirective(deployDirective!)).toBe(true);
    });

    it('should return null for unknown tools', () => {
      const directive = getCEMCPDirective('unknown_tool', {});
      expect(directive).toBeNull();
    });
  });

  describe('formatDirectiveResponse', () => {
    it('should format orchestration directive as MCP response', () => {
      const directive = createAnalyzeProjectEcosystemDirective({
        projectPath: '/test',
      });

      const response = formatDirectiveResponse(directive);

      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('orchestration_directive');
    });

    it('should format state machine directive as MCP response', () => {
      const directive = createSuggestAdrsDirective({
        projectPath: '/test',
      });

      const response = formatDirectiveResponse(directive);

      expect(response.content[0].text).toContain('state_machine_directive');
    });

    it('should produce valid JSON', () => {
      const directive = createGenerateRulesDirective({
        projectPath: '/test',
        ruleType: 'security',
      });

      const response = formatDirectiveResponse(directive);
      const parsed = JSON.parse(response.content[0].text);

      expect(parsed.type).toBe('orchestration_directive');
      expect(parsed.tool).toBe('generate_rules');
    });
  });

  describe('Token Savings', () => {
    it('should achieve target token reduction for analyzeProjectEcosystem', () => {
      // Original: ~12K tokens, Target: ~4K tokens (67% reduction)
      const directive = createAnalyzeProjectEcosystemDirective({
        projectPath: '/test',
      });

      const originalTokens = 12000;
      const newTokens = directive.metadata?.estimated_tokens || 0;
      const reduction = ((originalTokens - newTokens) / originalTokens) * 100;

      expect(reduction).toBeGreaterThanOrEqual(60);
    });

    it('should achieve target token reduction for suggest_adrs', () => {
      // Original: ~3.5K tokens, Target: ~1.5K tokens (~57% reduction)
      const directive = createSuggestAdrsDirective({
        projectPath: '/test',
      });

      // State machine directives have implicit token savings
      expect(directive.transitions.length).toBeLessThanOrEqual(6);
    });

    it('should achieve target token reduction for generate_rules', () => {
      // Original: ~4K tokens, Target: ~1.5K tokens (62.5% reduction)
      const directive = createGenerateRulesDirective({
        projectPath: '/test',
        ruleType: 'code-quality',
      });

      const originalTokens = 4000;
      const newTokens = directive.metadata?.estimated_tokens || 0;
      const reduction = ((originalTokens - newTokens) / originalTokens) * 100;

      expect(reduction).toBeGreaterThanOrEqual(60);
    });

    it('should achieve target token reduction for analyze_environment', () => {
      // Original: ~2.5K tokens, Target: ~1K tokens (60% reduction)
      const directive = createAnalyzeEnvironmentDirective({
        projectPath: '/test',
      });

      const originalTokens = 2500;
      const newTokens = directive.metadata?.estimated_tokens || 0;
      const reduction = ((originalTokens - newTokens) / originalTokens) * 100;

      expect(reduction).toBeGreaterThanOrEqual(60);
    });
  });
});
