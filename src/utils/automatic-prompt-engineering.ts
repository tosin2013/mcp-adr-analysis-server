/**
 * Automatic Prompt Engineering (APE) Utility Module - 100% Prompt-Driven Architecture
 * Generates AI delegation prompts for automatic prompt optimization and evaluation
 * All functions return prompts for AI execution, never execute operations directly
 */

import { McpAdrError } from '../types/index.js';
import {
  APEConfig,
  GenerationStrategy,
  EvaluationCriterion,
  SelectionStrategy,
  PromptCandidate,
  ToolOptimizationConfig
} from '../types/ape-framework.js';
import { PromptObject } from './prompt-composition.js';

// ============================================================================
// Configuration and Constants
// ============================================================================

const DEFAULT_APE_CONFIG: Required<APEConfig> = {
  candidateCount: 5,
  evaluationCriteria: ['task-completion', 'clarity', 'specificity'],
  optimizationRounds: 3,
  selectionStrategy: 'multi-criteria',
  cacheEnabled: true,
  performanceTracking: true,
  maxOptimizationTime: 180000, // 3 minutes
  qualityThreshold: 0.7,
  diversityWeight: 0.3
};

const APE_VERSION = '1.0.0';

// ============================================================================
// Core APE Functions - 100% Prompt-Driven
// ============================================================================

/**
 * Generate AI delegation prompt for automatic prompt optimization
 * Returns prompts for AI to optimize the given prompt using APE techniques
 */
export async function optimizePromptWithAPE(
  originalPrompt: PromptObject,
  config: Partial<APEConfig> = {}
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    const mergedConfig = { ...DEFAULT_APE_CONFIG, ...config };
    console.error(`[DEBUG] Generating APE optimization prompt for prompt optimization`);

    // Generate cache key for this optimization request
    const contextHash = Buffer.from(JSON.stringify(originalPrompt)).toString('base64').substring(0, 16);
    const configHash = Buffer.from(JSON.stringify(mergedConfig)).toString('base64').substring(0, 16);
    const cacheKey = `ape:optimization:${contextHash}-${configHash}`;

    // Create comprehensive APE optimization prompt
    const prompt = `
# Automatic Prompt Engineering (APE) Optimization Request

Please optimize the following prompt using APE techniques for better performance and effectiveness.

## Original Prompt to Optimize
\`\`\`
${originalPrompt.prompt}
\`\`\`

## Original Instructions
\`\`\`
${originalPrompt.instructions}
\`\`\`

## Original Context
${JSON.stringify(originalPrompt.context, null, 2)}

## APE Configuration
- **Candidate Count**: ${mergedConfig.candidateCount}
- **Evaluation Criteria**: ${mergedConfig.evaluationCriteria.join(', ')}
- **Selection Strategy**: ${mergedConfig.selectionStrategy}
- **Quality Threshold**: ${mergedConfig.qualityThreshold}
- **Diversity Weight**: ${mergedConfig.diversityWeight}
- **Max Optimization Time**: ${mergedConfig.maxOptimizationTime}ms

## APE Optimization Process

### Step 1: Generate Prompt Candidates (${mergedConfig.candidateCount} candidates)
Create ${mergedConfig.candidateCount} prompt variations using these strategies:

#### Template-based Variation
- Use different prompt templates and structures
- Vary instruction formats (imperative, collaborative, question-based)
- Adjust formality levels and communication styles

#### Semantic Variation
- Rephrase while preserving core meaning and intent
- Use synonyms and alternative expressions
- Restructure sentences for better clarity

#### Style Variation
- **Formal Style**: Professional, structured language
- **Conversational Style**: Friendly, approachable language
- **Technical Style**: Precise, domain-specific terminology
- **Instructional Style**: Step-by-step, educational approach

#### Length Variation
- **Concise Version**: Essential information only
- **Detailed Version**: Comprehensive with examples
- **Balanced Version**: Optimal information density

#### Structure Variation
- Different organizational patterns
- Varied section ordering and emphasis
- Alternative formatting and presentation

### Step 2: Evaluate Prompt Candidates
Evaluate each candidate on these criteria (0-1 scale):

${mergedConfig.evaluationCriteria.map(criterion => {
  const descriptions = {
    'task-completion': 'How well the prompt achieves the intended task outcome',
    'clarity': 'How clear, unambiguous, and easy to understand the prompt is',
    'specificity': 'How specific, actionable, and detailed the prompt is',
    'robustness': 'How well the prompt handles edge cases and variations',
    'efficiency': 'How concise yet comprehensive the prompt is',
    'context-awareness': 'How well the prompt fits the specific context and domain'
  };
  return `- **${criterion}**: ${descriptions[criterion] || 'Evaluate based on this criterion'}`;
}).join('\n')}

### Step 3: Apply Selection Strategy (${mergedConfig.selectionStrategy})
${getSelectionStrategyDescription(mergedConfig.selectionStrategy)}

### Step 4: Generate Optimization Result
Create the final optimized prompt considering:
- Highest-scoring candidates from evaluation
- Diversity requirements (weight: ${mergedConfig.diversityWeight})
- Quality threshold (minimum: ${mergedConfig.qualityThreshold})
- Original prompt objectives and constraints

## Expected Output Format
\`\`\`json
{
  "apeOptimization": {
    "optimizedPrompt": {
      "prompt": "optimized prompt text",
      "instructions": "optimized instructions",
      "context": {
        "optimization_metadata": "...",
        "original_context": "..."
      }
    },
    "optimization": {
      "candidatesGenerated": ${mergedConfig.candidateCount},
      "candidatesEvaluated": ${mergedConfig.candidateCount},
      "improvementScore": 0.85,
      "optimizationRounds": ${mergedConfig.optimizationRounds},
      "selectionStrategy": "${mergedConfig.selectionStrategy}",
      "qualityImprovement": 0.23,
      "optimizationReasoning": "explanation of improvements made",
      "evaluationScores": {
        ${mergedConfig.evaluationCriteria.map(c => `"${c}": 0.8`).join(',\n        ')}
      },
      "candidateDetails": [
        {
          "candidateId": "candidate_1",
          "strategy": "template-variation",
          "scores": { ${mergedConfig.evaluationCriteria.map(c => `"${c}": 0.8`).join(', ')} },
          "overallScore": 0.8,
          "strengths": ["clear structure", "specific instructions"],
          "weaknesses": ["could be more concise"]
        }
      ]
    },
    "metadata": {
      "apeVersion": "${APE_VERSION}",
      "optimizedAt": "${new Date().toISOString()}",
      "cacheKey": "${cacheKey}",
      "configUsed": ${JSON.stringify(mergedConfig, null, 6)},
      "performanceMetrics": {
        "totalOptimizationTime": 120000,
        "candidateGenerationTime": 45000,
        "evaluationTime": 60000,
        "selectionTime": 15000
      }
    }
  }
}
\`\`\`

## Quality Requirements
- Optimized prompt must score above ${mergedConfig.qualityThreshold} on all criteria
- Must maintain original task objectives and context requirements
- Should demonstrate clear improvement over original prompt
- Must be appropriate for the intended use case and domain
- Should provide specific reasoning for optimization choices

## Security and Validation
- Ensure optimized prompt is safe and appropriate
- Validate that optimization doesn't introduce harmful content
- Verify that core functionality is preserved
- Check for potential prompt injection vulnerabilities

The optimized prompt should be significantly better than the original while maintaining its core purpose and functionality.
`;

    const instructions = `
# APE Optimization Instructions

You must:
1. **Generate Diverse Candidates**: Create ${mergedConfig.candidateCount} varied prompt alternatives using multiple strategies
2. **Evaluate Systematically**: Score each candidate on all specified criteria objectively
3. **Select Optimally**: Choose the best prompt using the ${mergedConfig.selectionStrategy} strategy
4. **Validate Quality**: Ensure the optimized prompt meets all quality thresholds
5. **Document Improvements**: Provide clear reasoning for optimization choices
6. **Maintain Functionality**: Preserve original prompt objectives and requirements

## Success Criteria
- Optimized prompt scores higher than original on evaluation criteria
- Demonstrates measurable improvement in prompt effectiveness
- Maintains task objectives and context appropriateness
- Follows exact JSON output format
- Provides comprehensive optimization reasoning

## Performance Requirements
- Complete optimization within ${mergedConfig.maxOptimizationTime}ms time limit
- Generate exactly ${mergedConfig.candidateCount} candidates
- Evaluate all candidates on all ${mergedConfig.evaluationCriteria.length} criteria
- Apply diversity weighting of ${mergedConfig.diversityWeight}
`;

    return {
      prompt,
      instructions,
      context: {
        operation: 'ape_optimization',
        originalPrompt,
        apeConfig: mergedConfig,
        cacheKey,
        securityLevel: 'high',
        expectedFormat: 'json'
      }
    };

  } catch (error) {
    throw new McpAdrError(
      `Failed to generate APE optimization prompt: ${error instanceof Error ? error.message : String(error)}`,
      'APE_OPTIMIZATION_ERROR'
    );
  }
}

/**
 * Generate AI delegation prompt for prompt candidate generation
 * Returns prompts for AI to generate multiple prompt variations
 */
export async function generatePromptCandidates(
  basePrompt: PromptObject,
  strategies: GenerationStrategy[],
  candidateCount: number
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating prompt candidate generation request for ${candidateCount} candidates`);

    const prompt = `
# Prompt Candidate Generation Request

Please generate ${candidateCount} prompt variations using the specified strategies.

## Base Prompt to Vary
\`\`\`
${basePrompt.prompt}
\`\`\`

## Base Instructions
\`\`\`
${basePrompt.instructions}
\`\`\`

## Generation Strategies to Apply
${strategies.map((strategy, index) => `${index + 1}. **${strategy}**: ${getStrategyDescription(strategy)}`).join('\n')}

## Candidate Generation Requirements

### Strategy Distribution
Generate candidates using these strategies:
${strategies.map(strategy => `- ${Math.ceil(candidateCount / strategies.length)} candidates using ${strategy}`).join('\n')}

### Quality Standards
Each candidate must:
- Preserve the core objective of the original prompt
- Be grammatically correct and well-structured
- Provide clear, actionable instructions
- Maintain appropriate tone and style
- Be suitable for the intended context

### Variation Guidelines
- **Maintain Core Function**: All candidates must achieve the same basic objective
- **Vary Approach**: Use different methods to achieve the objective
- **Ensure Diversity**: Candidates should be meaningfully different from each other
- **Preserve Context**: Keep relevant context and requirements
- **Optimize Clarity**: Each candidate should be clear and unambiguous

## Expected Output Format
\`\`\`json
{
  "candidateGeneration": {
    "candidates": [
      {
        "candidateId": "candidate_1",
        "prompt": "candidate prompt text",
        "instructions": "candidate instructions",
        "context": { "generation_metadata": "..." },
        "generationStrategy": "${strategies[0]}",
        "metadata": {
          "generatedAt": "ISO-8601",
          "strategy": "${strategies[0]}",
          "variationApplied": ["specific changes made"],
          "estimatedQuality": 0.8,
          "complexity": 0.7,
          "tokens": 150
        }
      }
    ],
    "generation": {
      "totalCandidates": ${candidateCount},
      "strategiesUsed": ${JSON.stringify(strategies)},
      "generationTime": 30000,
      "qualityDistribution": {
        "high": 3,
        "medium": 2,
        "low": 0
      }
    }
  }
}
\`\`\`

Generate exactly ${candidateCount} high-quality prompt candidates with meaningful variations.
`;

    const instructions = `
# Candidate Generation Instructions

You must:
1. **Apply All Strategies**: Use each specified generation strategy appropriately
2. **Ensure Diversity**: Create meaningfully different candidates
3. **Maintain Quality**: All candidates must meet quality standards
4. **Preserve Function**: Keep the core objective of the original prompt
5. **Document Changes**: Clearly indicate what variations were applied

## Success Criteria
- Generate exactly ${candidateCount} candidates
- Use all ${strategies.length} specified strategies
- Ensure each candidate is functionally equivalent but stylistically different
- Provide complete metadata for each candidate
- Follow exact JSON output format
`;

    return {
      prompt,
      instructions,
      context: {
        operation: 'candidate_generation',
        basePrompt,
        strategies,
        candidateCount,
        securityLevel: 'medium',
        expectedFormat: 'json'
      }
    };

  } catch (error) {
    throw new McpAdrError(
      `Failed to generate candidate generation prompt: ${error instanceof Error ? error.message : String(error)}`,
      'CANDIDATE_GENERATION_ERROR'
    );
  }
}

/**
 * Generate AI delegation prompt for prompt performance evaluation
 * Returns prompts for AI to evaluate prompt effectiveness using multiple criteria
 */
export async function evaluatePromptPerformance(
  candidates: PromptCandidate[],
  evaluationCriteria: EvaluationCriterion[],
  context: any = {}
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating prompt evaluation request for ${candidates.length} candidates`);

    const prompt = `
# Prompt Performance Evaluation Request

Please evaluate the following prompt candidates using the specified criteria.

## Candidates to Evaluate
${candidates.map((candidate, index) => `
### Candidate ${index + 1}: ${candidate.id}
**Strategy**: ${candidate.generationStrategy}
**Prompt**:
\`\`\`
${candidate.prompt}
\`\`\`
**Instructions**:
\`\`\`
${candidate.instructions}
\`\`\`
**Metadata**: ${JSON.stringify(candidate.metadata, null, 2)}
`).join('\n')}

## Evaluation Criteria
${evaluationCriteria.map((criterion, index) => `${index + 1}. **${criterion}**: ${getCriterionDescription(criterion)}`).join('\n')}

## Evaluation Context
${JSON.stringify(context, null, 2)}

## Evaluation Requirements

### Scoring Guidelines (0-1 scale)
- **0.0-0.3**: Poor - Significant issues, major improvements needed
- **0.4-0.6**: Fair - Some issues, moderate improvements needed
- **0.7-0.8**: Good - Minor issues, small improvements possible
- **0.9-1.0**: Excellent - High quality, minimal improvements needed

### Evaluation Process
For each candidate:
1. **Analyze Content**: Review prompt text, instructions, and structure
2. **Apply Criteria**: Score against each evaluation criterion
3. **Identify Strengths**: Note what works well
4. **Identify Weaknesses**: Note areas for improvement
5. **Provide Feedback**: Give specific, actionable suggestions
6. **Calculate Overall**: Compute weighted average score

### Comparative Analysis
- Compare candidates against each other
- Identify best-performing candidates
- Note relative strengths and weaknesses
- Recommend selection priorities

## Expected Output Format
\`\`\`json
{
  "promptEvaluation": {
    "evaluationResults": [
      {
        "candidateId": "${candidates[0]?.id || 'candidate_1'}",
        "scores": {
          ${evaluationCriteria.map(c => `"${c}": 0.8`).join(',\n          ')}
        },
        "overallScore": 0.8,
        "feedback": [
          {
            "criterion": "${evaluationCriteria[0] || 'task-completion'}",
            "score": 0.8,
            "reasoning": "detailed explanation of score",
            "suggestions": ["specific improvement suggestion"],
            "examples": ["example of good practice"]
          }
        ],
        "strengths": ["strength 1", "strength 2"],
        "weaknesses": ["weakness 1", "weakness 2"],
        "improvementAreas": ["area 1", "area 2"],
        "confidence": 0.85
      }
    ],
    "comparativeAnalysis": {
      "bestCandidate": "${candidates[0]?.id || 'candidate_1'}",
      "rankingOrder": ["candidate_1", "candidate_2"],
      "keyDifferentiators": ["differentiator 1", "differentiator 2"],
      "recommendedSelection": "candidate_1",
      "selectionReasoning": "explanation of recommendation"
    },
    "evaluation": {
      "totalCandidates": ${candidates.length},
      "criteriaUsed": ${JSON.stringify(evaluationCriteria)},
      "evaluationTime": 45000,
      "averageScore": 0.75,
      "scoreDistribution": {
        "excellent": 1,
        "good": 2,
        "fair": 1,
        "poor": 0
      }
    }
  }
}
\`\`\`

Provide thorough, objective evaluation with specific feedback for improvement.
`;

    const instructions = `
# Prompt Evaluation Instructions

You must:
1. **Evaluate Objectively**: Score each candidate fairly against all criteria
2. **Provide Specific Feedback**: Give detailed, actionable suggestions
3. **Compare Systematically**: Analyze relative strengths and weaknesses
4. **Justify Scores**: Provide clear reasoning for each score
5. **Recommend Selection**: Identify the best candidate with reasoning

## Success Criteria
- Evaluate all ${candidates.length} candidates on all ${evaluationCriteria.length} criteria
- Provide scores between 0-1 with appropriate precision
- Give specific, actionable feedback for each candidate
- Include comparative analysis and selection recommendation
- Follow exact JSON output format
`;

    return {
      prompt,
      instructions,
      context: {
        operation: 'prompt_evaluation',
        candidates: candidates.map(c => c.id),
        evaluationCriteria,
        evaluationContext: context,
        securityLevel: 'medium',
        expectedFormat: 'json'
      }
    };

  } catch (error) {
    throw new McpAdrError(
      `Failed to generate evaluation prompt: ${error instanceof Error ? error.message : String(error)}`,
      'EVALUATION_ERROR'
    );
  }
}

/**
 * Generate AI delegation prompt for tool-specific prompt optimization
 * Returns prompts for AI to optimize prompts for specific MCP tools
 */
export async function optimizeToolPrompt(
  toolName: string,
  basePrompt: PromptObject,
  toolConfig: ToolOptimizationConfig
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating tool-specific optimization prompt for ${toolName}`);

    const prompt = `
# Tool-Specific Prompt Optimization Request

Please optimize the following prompt specifically for the ${toolName} MCP tool.

## Tool Information
- **Tool Name**: ${toolName}
- **Task Type**: ${toolConfig.taskType}
- **Context Requirements**: ${toolConfig.contextRequirements?.join(', ') || 'Not specified'}

## Base Prompt to Optimize
\`\`\`
${basePrompt.prompt}
\`\`\`

## Base Instructions
\`\`\`
${basePrompt.instructions}
\`\`\`

## Tool-Specific Configuration
${JSON.stringify(toolConfig, null, 2)}

## Tool-Specific Optimization Focus

### ${toolName} Optimization Priorities
${getToolOptimizationPriorities(toolName)}

### Context Requirements
${toolConfig.contextRequirements?.map((req, index) => `${index + 1}. ${req}`).join('\n') || 'No specific requirements'}

### Success Criteria
${toolConfig.successCriteria?.map((criteria, index) => `${index + 1}. ${criteria}`).join('\n') || 'Standard success criteria'}

## Optimization Process

### Step 1: Tool-Specific Analysis
- Analyze how the prompt fits the tool's specific use case
- Identify tool-specific optimization opportunities
- Consider the tool's typical input/output patterns
- Assess alignment with tool's learning objectives

### Step 2: Domain-Aware Optimization
- Apply domain-specific knowledge and terminology
- Optimize for the tool's typical user scenarios
- Enhance prompt for the tool's specific context requirements
- Improve alignment with tool's success criteria

### Step 3: Performance Enhancement
- Optimize for the tool's performance characteristics
- Enhance clarity for the tool's specific tasks
- Improve specificity for the tool's domain
- Optimize efficiency for the tool's typical workload

## Expected Output Format
\`\`\`json
{
  "toolOptimization": {
    "optimizedPrompt": {
      "prompt": "tool-optimized prompt text",
      "instructions": "tool-optimized instructions",
      "context": {
        "tool_specific_metadata": "...",
        "optimization_focus": "..."
      }
    },
    "optimization": {
      "toolName": "${toolName}",
      "optimizationFocus": ["focus area 1", "focus area 2"],
      "improvementAreas": ["improvement 1", "improvement 2"],
      "toolSpecificEnhancements": ["enhancement 1", "enhancement 2"],
      "performanceImprovements": {
        "clarity": 0.85,
        "specificity": 0.90,
        "efficiency": 0.80,
        "toolAlignment": 0.95
      },
      "optimizationReasoning": "detailed explanation of tool-specific optimizations"
    }
  }
}
\`\`\`

Focus on optimizations that specifically benefit the ${toolName} tool's use cases and performance.
`;

    const instructions = `
# Tool-Specific Optimization Instructions

You must:
1. **Understand Tool Context**: Consider the specific requirements of ${toolName}
2. **Apply Domain Knowledge**: Use relevant domain expertise for optimization
3. **Focus on Tool Benefits**: Prioritize improvements that benefit this specific tool
4. **Maintain Compatibility**: Ensure optimizations work with the tool's architecture
5. **Measure Improvement**: Quantify the benefits of tool-specific optimizations

## Success Criteria
- Optimized prompt is specifically tailored for ${toolName}
- Demonstrates clear understanding of tool requirements
- Shows measurable improvement in tool-specific metrics
- Maintains compatibility with tool architecture
- Provides detailed reasoning for tool-specific choices
`;

    return {
      prompt,
      instructions,
      context: {
        operation: 'tool_optimization',
        toolName,
        basePrompt,
        toolConfig,
        securityLevel: 'high',
        expectedFormat: 'json'
      }
    };

  } catch (error) {
    throw new McpAdrError(
      `Failed to generate tool optimization prompt: ${error instanceof Error ? error.message : String(error)}`,
      'TOOL_OPTIMIZATION_ERROR'
    );
  }
}

// ============================================================================
// Utility Functions and Helpers
// ============================================================================

/**
 * Get description for a generation strategy
 */
function getStrategyDescription(strategy: GenerationStrategy): string {
  const descriptions = {
    'template-variation': 'Use different prompt templates and structural formats',
    'semantic-variation': 'Rephrase while preserving meaning and intent',
    'style-variation': 'Adjust tone, formality, and communication style',
    'length-variation': 'Create concise, detailed, and balanced versions',
    'structure-variation': 'Reorganize content with different patterns',
    'hybrid-approach': 'Combine multiple strategies for optimal results'
  };
  return descriptions[strategy] || 'Apply the specified generation strategy';
}

/**
 * Get description for an evaluation criterion
 */
function getCriterionDescription(criterion: EvaluationCriterion): string {
  const descriptions = {
    'task-completion': 'How well the prompt achieves the intended task outcome',
    'clarity': 'How clear, unambiguous, and easy to understand the prompt is',
    'specificity': 'How specific, actionable, and detailed the prompt is',
    'robustness': 'How well the prompt handles edge cases and variations',
    'efficiency': 'How concise yet comprehensive the prompt is',
    'context-awareness': 'How well the prompt fits the specific context and domain'
  };
  return descriptions[criterion] || 'Evaluate based on this criterion';
}

/**
 * Get description for a selection strategy
 */
function getSelectionStrategyDescription(strategy: SelectionStrategy): string {
  const descriptions = {
    'highest-score': 'Select the candidate with the highest overall evaluation score',
    'multi-criteria': 'Balance multiple evaluation criteria with appropriate weights',
    'ensemble': 'Combine strengths of multiple high-performing candidates',
    'context-aware': 'Choose based on context-specific suitability and requirements',
    'balanced': 'Balance quality, diversity, and context appropriateness'
  };
  return descriptions[strategy] || 'Apply the specified selection strategy';
}

/**
 * Get tool-specific optimization priorities
 */
function getToolOptimizationPriorities(toolName: string): string {
  const priorities: Record<string, string> = {
    'generate_adrs_from_prd': `
- **Context Analysis**: Better understanding of PRD requirements and constraints
- **Decision Quality**: Clearer architectural decision rationale and justification
- **Stakeholder Alignment**: Improved ADR clarity and relevance for stakeholders
- **Technical Depth**: Appropriate level of technical detail for the context`,

    'suggest_adrs': `
- **Relevance**: Highly relevant ADR suggestions based on project context
- **Prioritization**: Clear prioritization of suggested ADRs by importance
- **Feasibility**: Realistic and implementable architectural decisions
- **Impact Assessment**: Clear understanding of decision impacts and trade-offs`,

    'analyze_project_ecosystem': `
- **Technology Detection**: Accurate identification of technologies and frameworks
- **Pattern Recognition**: Better identification of architectural patterns
- **Context Understanding**: Comprehensive project context analysis
- **Insight Generation**: Valuable and actionable architectural insights`,

    'generate_research_questions': `
- **Question Quality**: High-quality, targeted research questions
- **Relevance**: Questions directly relevant to project needs
- **Depth**: Appropriate depth and scope for research objectives
- **Actionability**: Questions that lead to actionable insights`,

    'incorporate_research': `
- **Integration Quality**: Effective integration of research findings
- **Synthesis**: Good synthesis of multiple research sources
- **Relevance**: Focus on most relevant research findings
- **Actionability**: Clear actionable recommendations from research`
  };

  return priorities[toolName] || `
- **Task Effectiveness**: Optimize for the tool's primary task objectives
- **Context Awareness**: Improve understanding of tool-specific context
- **Output Quality**: Enhance the quality and relevance of tool outputs
- **User Experience**: Improve clarity and usability of tool interactions`;
}

/**
 * Generate cache key for APE optimization requests
 */
export function generateAPECacheKey(
  promptHash: string,
  config: APEConfig
): string {
  const configHash = Buffer.from(JSON.stringify(config)).toString('base64').substring(0, 16);
  return `ape:optimization:${promptHash}-${configHash}`;
}

/**
 * Get default APE configuration
 */
export function getDefaultAPEConfig(): Required<APEConfig> {
  return { ...DEFAULT_APE_CONFIG };
}

/**
 * Validate APE configuration
 */
export function validateAPEConfig(config: Partial<APEConfig>): void {
  if (config.candidateCount && (config.candidateCount < 1 || config.candidateCount > 20)) {
    throw new McpAdrError('Candidate count must be between 1 and 20', 'INVALID_CONFIG');
  }

  if (config.optimizationRounds && (config.optimizationRounds < 1 || config.optimizationRounds > 10)) {
    throw new McpAdrError('Optimization rounds must be between 1 and 10', 'INVALID_CONFIG');
  }

  if (config.qualityThreshold && (config.qualityThreshold < 0 || config.qualityThreshold > 1)) {
    throw new McpAdrError('Quality threshold must be between 0 and 1', 'INVALID_CONFIG');
  }

  if (config.diversityWeight && (config.diversityWeight < 0 || config.diversityWeight > 1)) {
    throw new McpAdrError('Diversity weight must be between 0 and 1', 'INVALID_CONFIG');
  }
}

/**
 * Get supported generation strategies
 */
export function getSupportedGenerationStrategies(): GenerationStrategy[] {
  return [
    'template-variation',
    'semantic-variation',
    'style-variation',
    'length-variation',
    'structure-variation',
    'hybrid-approach'
  ];
}

/**
 * Get supported evaluation criteria
 */
export function getSupportedEvaluationCriteria(): EvaluationCriterion[] {
  return [
    'task-completion',
    'clarity',
    'specificity',
    'robustness',
    'efficiency',
    'context-awareness'
  ];
}

/**
 * Get supported selection strategies
 */
export function getSupportedSelectionStrategies(): SelectionStrategy[] {
  return [
    'highest-score',
    'multi-criteria',
    'ensemble',
    'context-aware',
    'balanced'
  ];
}

/**
 * Create tool-specific APE configuration
 */
export function createToolAPEConfig(
  toolName: string,
  customConfig: Partial<APEConfig> = {}
): APEConfig {
  const toolConfigs: Record<string, Partial<APEConfig>> = {
    'generate_adrs_from_prd': {
      candidateCount: 7,
      evaluationCriteria: ['task-completion', 'specificity', 'clarity', 'robustness'],
      optimizationRounds: 3,
      selectionStrategy: 'multi-criteria',
      qualityThreshold: 0.75
    },
    'suggest_adrs': {
      candidateCount: 6,
      evaluationCriteria: ['task-completion', 'context-awareness', 'clarity'],
      optimizationRounds: 2,
      selectionStrategy: 'context-aware',
      qualityThreshold: 0.7
    },
    'analyze_project_ecosystem': {
      candidateCount: 5,
      evaluationCriteria: ['task-completion', 'specificity', 'efficiency'],
      optimizationRounds: 2,
      selectionStrategy: 'balanced',
      qualityThreshold: 0.65
    }
  };

  const toolSpecificConfig = toolConfigs[toolName] || {};
  return { ...DEFAULT_APE_CONFIG, ...toolSpecificConfig, ...customConfig };
}
