# APE Framework Implementation Strategy

## Overview

This document outlines the detailed implementation strategy for the Automatic Prompt Engineer (APE) framework, including prompt candidate generation algorithms, evaluation mechanisms, and optimization workflows.

## Implementation Architecture

### Core Components Implementation

#### 1. Prompt Candidate Generator
**Purpose**: Generate diverse, high-quality prompt candidates using multiple strategies

**Implementation Approach**:
```typescript
// Pseudo-implementation structure
class PromptCandidateGenerator {
  async generateCandidates(
    basePrompt: PromptObject,
    strategies: GenerationStrategy[],
    count: number
  ): Promise<PromptCandidate[]>
}
```

**Generation Strategies**:

##### Template-based Variation
- **Strategy**: Use predefined templates with variable substitution
- **Templates**: 
  - Imperative: "Please {action} the {subject} by {method}..."
  - Collaborative: "Let's work together to {action} {subject}..."
  - Instructional: "To {action} {subject}, follow these steps..."
  - Question-based: "How can we {action} {subject} using {method}?"

##### Semantic Variation
- **Synonym Replacement**: Replace key terms with domain-appropriate synonyms
- **Phrase Restructuring**: Reorganize sentence structure while preserving meaning
- **Perspective Shifting**: Change from different viewpoints (user, system, expert)
- **Abstraction Level**: Adjust between high-level and detailed instructions

##### Style Variation
- **Formal Style**: "Please conduct a comprehensive analysis..."
- **Conversational Style**: "Let's take a look at this project and see..."
- **Technical Style**: "Execute architectural analysis using established patterns..."
- **Instructional Style**: "Step 1: Analyze the codebase. Step 2: Identify patterns..."

#### 2. Evaluation Engine
**Purpose**: Score prompt candidates using multiple evaluation criteria

**Evaluation Criteria Implementation**:

##### Task Completion (Weight: 30%)
- **Metric**: How well the prompt achieves the intended task
- **Evaluation**: Compare expected vs actual outcomes
- **Scoring**: 0-1 scale based on task success rate

##### Clarity (Weight: 25%)
- **Metric**: How clear and unambiguous the prompt is
- **Evaluation**: Analyze sentence structure, word choice, organization
- **Scoring**: Readability scores, ambiguity detection

##### Specificity (Weight: 20%)
- **Metric**: How specific and actionable the prompt is
- **Evaluation**: Count specific instructions, concrete examples
- **Scoring**: Ratio of specific to general statements

##### Robustness (Weight: 15%)
- **Metric**: How well the prompt handles edge cases
- **Evaluation**: Test with various input scenarios
- **Scoring**: Success rate across different contexts

##### Efficiency (Weight: 10%)
- **Metric**: How concise yet comprehensive the prompt is
- **Evaluation**: Information density, redundancy analysis
- **Scoring**: Information per token ratio

#### 3. Selection Algorithm
**Purpose**: Choose optimal prompts from evaluated candidates

**Selection Strategies**:

##### Multi-criteria Selection (Recommended)
```typescript
function selectOptimalPrompts(
  candidates: EvaluationResult[],
  criteria: EvaluationCriterion[],
  weights: Record<EvaluationCriterion, number>
): PromptCandidate[]
```

**Algorithm**:
1. **Weighted Scoring**: Calculate weighted average of all criteria
2. **Pareto Optimization**: Find candidates that are not dominated by others
3. **Diversity Filtering**: Ensure selected prompts are sufficiently different
4. **Quality Threshold**: Filter candidates below minimum quality threshold

## Optimization Workflow

### Phase 1: Initial Candidate Generation
**Duration**: 30-60 seconds
**Process**:
1. **Strategy Selection**: Choose appropriate generation strategies based on task type
2. **Parallel Generation**: Generate candidates using multiple strategies simultaneously
3. **Quality Filtering**: Remove obviously poor candidates early
4. **Diversity Checking**: Ensure sufficient diversity in candidate pool

### Phase 2: Comprehensive Evaluation
**Duration**: 60-120 seconds
**Process**:
1. **Automated Evaluation**: Apply all evaluation criteria to each candidate
2. **Context Matching**: Assess how well candidates fit the specific context
3. **Performance Prediction**: Estimate likely performance of each candidate
4. **Bias Detection**: Check for potential biases in prompts

### Phase 3: Selection and Refinement
**Duration**: 30-60 seconds
**Process**:
1. **Multi-criteria Selection**: Select top candidates using weighted criteria
2. **Ensemble Creation**: Combine strengths of multiple good candidates
3. **Refinement Generation**: Create refined versions of top candidates
4. **Final Validation**: Validate selected prompts against requirements

### Phase 4: Optimization Loop (Optional)
**Duration**: Variable (1-3 iterations)
**Process**:
1. **Performance Feedback**: Collect feedback from initial prompt usage
2. **Pattern Analysis**: Identify successful patterns in top-performing prompts
3. **Targeted Generation**: Generate new candidates based on successful patterns
4. **Convergence Check**: Determine if further optimization is beneficial

## Integration with MCP Tools

### High-Priority Tool Optimizations

#### 1. ADR Generation Tools
**Target Tools**: `generate_adrs_from_prd`, `suggest_adrs`
**Optimization Focus**:
- **Context Analysis**: Better understanding of PRD requirements
- **ADR Structure**: Optimal ADR format and content organization
- **Decision Rationale**: Clearer explanation of architectural decisions

**APE Configuration**:
```typescript
const adrOptimizationConfig: APEConfig = {
  candidateCount: 7,
  evaluationCriteria: ['task-completion', 'specificity', 'clarity', 'robustness'],
  optimizationRounds: 3,
  selectionStrategy: 'multi-criteria',
  cacheEnabled: true,
  performanceTracking: true,
  maxOptimizationTime: 180000, // 3 minutes
  qualityThreshold: 0.7,
  diversityWeight: 0.3
};
```

#### 2. Analysis Tools
**Target Tools**: `analyze_project_ecosystem`, `get_architectural_context`
**Optimization Focus**:
- **Technology Detection**: Better identification of technologies and patterns
- **Context Extraction**: More comprehensive context analysis
- **Insight Generation**: Deeper architectural insights

#### 3. Research Tools
**Target Tools**: `generate_research_questions`, `incorporate_research`
**Optimization Focus**:
- **Question Quality**: More targeted and valuable research questions
- **Research Integration**: Better integration of research findings
- **Knowledge Synthesis**: Improved synthesis of multiple research sources

### Tool Integration Pattern

```typescript
// Example: APE-enhanced tool implementation
export async function generateOptimizedPrompt(
  toolName: string,
  basePrompt: PromptObject,
  context: any,
  config?: Partial<APEConfig>
): Promise<{ prompt: string; instructions: string; context: any }> {
  
  // Step 1: Get tool-specific APE configuration
  const apeConfig = getToolAPEConfig(toolName, config);
  
  // Step 2: Generate optimization prompt for AI delegation
  const optimizationPrompt = `
# Automatic Prompt Engineering Request

Please optimize the following prompt using APE techniques for the ${toolName} tool.

## Original Prompt
\`\`\`
${basePrompt.prompt}
\`\`\`

## Original Instructions
\`\`\`
${basePrompt.instructions}
\`\`\`

## Context
${JSON.stringify(context, null, 2)}

## APE Configuration
- **Candidate Count**: ${apeConfig.candidateCount}
- **Evaluation Criteria**: ${apeConfig.evaluationCriteria.join(', ')}
- **Selection Strategy**: ${apeConfig.selectionStrategy}
- **Quality Threshold**: ${apeConfig.qualityThreshold}

## Optimization Tasks

### Step 1: Generate Prompt Candidates
Create ${apeConfig.candidateCount} prompt variations using these strategies:
1. **Template Variation**: Use different prompt templates
2. **Semantic Variation**: Rephrase while preserving meaning
3. **Style Variation**: Adjust tone and style
4. **Structure Variation**: Reorganize prompt structure
5. **Specificity Variation**: Adjust detail level

### Step 2: Evaluate Candidates
Evaluate each candidate on:
${apeConfig.evaluationCriteria.map(criterion => `- **${criterion}**: Score 0-1 based on ${getEvaluationDescription(criterion)}`).join('\n')}

### Step 3: Select Optimal Prompt
Use ${apeConfig.selectionStrategy} strategy to select the best prompt considering:
- Weighted evaluation scores
- Diversity requirements
- Quality threshold (${apeConfig.qualityThreshold})
- Context appropriateness

## Expected Output Format
\`\`\`json
{
  "optimizedPrompt": {
    "prompt": "optimized prompt text",
    "instructions": "optimized instructions",
    "context": { "optimization_metadata": "..." }
  },
  "optimization": {
    "candidatesGenerated": number,
    "candidatesEvaluated": number,
    "improvementScore": number,
    "optimizationReasoning": "explanation of improvements",
    "evaluationScores": {
      "task-completion": number,
      "clarity": number,
      "specificity": number
    }
  }
}
\`\`\`

## Quality Requirements
- Optimized prompt must score above ${apeConfig.qualityThreshold} on all criteria
- Must maintain original task objectives
- Should improve clarity and effectiveness
- Must be appropriate for the ${toolName} context
`;

  const instructions = `
# APE Optimization Instructions

You must:
1. **Generate Diverse Candidates**: Create varied prompt alternatives using multiple strategies
2. **Evaluate Systematically**: Score each candidate on all specified criteria
3. **Select Optimally**: Choose the best prompt using the specified selection strategy
4. **Validate Quality**: Ensure the optimized prompt meets quality thresholds
5. **Document Improvements**: Explain how the optimized prompt is better

## Success Criteria
- Optimized prompt scores higher than original on evaluation criteria
- Maintains task objectives and context appropriateness
- Provides clear improvement reasoning
- Follows exact JSON output format
`;

  return {
    prompt: optimizationPrompt,
    instructions,
    context: {
      operation: 'ape_optimization',
      toolName,
      originalPrompt: basePrompt,
      apeConfig,
      securityLevel: 'high',
      expectedFormat: 'json'
    }
  };
}
```

## Performance Optimization

### Caching Strategy
1. **Candidate Cache**: Cache generated candidates by strategy and context
2. **Evaluation Cache**: Cache evaluation results for reuse
3. **Optimization Cache**: Cache final optimized prompts
4. **Performance Cache**: Cache performance metrics and feedback

### Resource Management
- **Parallel Processing**: Generate and evaluate candidates in parallel
- **Memory Limits**: Implement memory usage limits for large optimization tasks
- **Time Limits**: Set maximum optimization time to prevent runaway processes
- **Quality Gates**: Stop optimization early if quality threshold is met

### Monitoring and Metrics
- **Optimization Success Rate**: Track percentage of successful optimizations
- **Performance Improvement**: Measure average improvement scores
- **Resource Usage**: Monitor CPU, memory, and time usage
- **User Satisfaction**: Collect feedback on optimized prompts

This implementation strategy provides a comprehensive roadmap for building the APE framework while maintaining the 100% prompt-driven architecture and ensuring optimal performance across MCP tools.
