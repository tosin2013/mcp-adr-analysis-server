# Automatic Prompt Engineer (APE) Framework Design

## Overview

The Automatic Prompt Engineer (APE) framework implements advanced prompting techniques to automatically generate, evaluate, and optimize prompts for better performance across MCP ADR Analysis Server tools. This framework maintains the 100% prompt-driven architecture while providing intelligent prompt optimization capabilities.

## Core Concept

**APE Framework** works by:

1. **Candidate Generation**: Generate multiple prompt candidates for a given task
2. **Evaluation**: Evaluate prompt effectiveness using scoring mechanisms
3. **Selection**: Select the best-performing prompts based on evaluation results
4. **Optimization**: Iteratively improve prompts through feedback loops
5. **Caching**: Cache optimized prompts for reuse and performance

## Research Foundation

Based on Zhou et al. (2022) "Large Language Models Are Human-Level Prompt Engineers":

- **Instruction Generation**: Treat prompt creation as natural language synthesis
- **Black-box Optimization**: Use LLMs to generate and search candidate solutions
- **Evaluation-Driven Selection**: Select prompts based on computed evaluation scores
- **Iterative Improvement**: Continuously refine prompts through feedback

## Architecture Integration

### Existing Components Integration

- **PromptObject Interface**: APE generates optimized PromptObject instances
- **Prompt Composition**: Uses existing `combinePrompts()` and composition utilities
- **Cache System**: Leverages prompt-driven cache for storing optimized prompts
- **MCP Tools**: Integrates with existing tool structure for prompt optimization

### Framework Components

```
APE Framework
├── Candidate Generator (Generate prompt variations)
├── Evaluation Engine (Score prompt effectiveness)
├── Selection Algorithm (Choose best prompts)
├── Optimization Loop (Iterative improvement)
├── Performance Tracker (Monitor optimization metrics)
└── Cache Manager (Store and retrieve optimized prompts)
```

## Core APE Components

### 1. Prompt Candidate Generation

**Purpose**: Generate multiple prompt variations for optimization
**Strategies**:

- **Template-based Generation**: Use predefined templates with variations
- **Semantic Variation**: Generate semantically similar but structurally different prompts
- **Style Variation**: Vary prompt style (formal, conversational, technical)
- **Length Variation**: Generate short, medium, and long prompt versions
- **Structure Variation**: Different prompt organization patterns

### 2. Prompt Evaluation Engine

**Purpose**: Score prompt effectiveness using multiple criteria
**Evaluation Criteria**:

- **Task Completion**: How well the prompt achieves the intended task
- **Clarity**: How clear and unambiguous the prompt is
- **Specificity**: How specific and actionable the prompt is
- **Robustness**: How well the prompt handles edge cases
- **Efficiency**: How concise yet comprehensive the prompt is

### 3. Selection Algorithm

**Purpose**: Choose the best prompts from candidates
**Selection Methods**:

- **Score-based Selection**: Select highest-scoring prompts
- **Multi-criteria Selection**: Balance multiple evaluation criteria
- **Ensemble Selection**: Combine multiple good prompts
- **Context-aware Selection**: Choose prompts based on specific contexts

### 4. Optimization Loop

**Purpose**: Iteratively improve prompts through feedback
**Optimization Process**:

- **Feedback Collection**: Gather performance feedback from prompt usage
- **Pattern Analysis**: Identify successful prompt patterns
- **Refinement**: Generate improved prompt candidates
- **Validation**: Test refined prompts against evaluation criteria

## APE Framework Interfaces

### Core APE Types

```typescript
export interface APEConfig {
  candidateCount: number; // Number of candidates to generate
  evaluationCriteria: EvaluationCriterion[];
  optimizationRounds: number; // Number of optimization iterations
  selectionStrategy: SelectionStrategy;
  cacheEnabled: boolean;
  performanceTracking: boolean;
}

export interface PromptCandidate {
  id: string;
  prompt: string;
  instructions: string;
  context: any;
  generationStrategy: string;
  metadata: CandidateMetadata;
}

export interface EvaluationResult {
  candidateId: string;
  scores: Record<string, number>; // Criterion -> Score mapping
  overallScore: number;
  feedback: string[];
  evaluationTime: number;
}

export interface OptimizationResult {
  optimizedPrompt: PromptObject;
  originalPrompt: PromptObject;
  improvementScore: number;
  optimizationRounds: number;
  candidatesEvaluated: number;
  cacheKey: string;
  metadata: OptimizationMetadata;
}
```

### Generation Strategies

```typescript
export type GenerationStrategy =
  | 'template-variation'
  | 'semantic-variation'
  | 'style-variation'
  | 'length-variation'
  | 'structure-variation'
  | 'hybrid-approach';

export type EvaluationCriterion =
  | 'task-completion'
  | 'clarity'
  | 'specificity'
  | 'robustness'
  | 'efficiency'
  | 'context-awareness';

export type SelectionStrategy =
  | 'highest-score'
  | 'multi-criteria'
  | 'ensemble'
  | 'context-aware'
  | 'balanced';
```

## Integration with MCP Tools

### Tool-Specific Optimization

**High-Priority Tools for APE Integration**:

1. **generate_adrs_from_prd**: Optimize PRD analysis and ADR generation prompts
2. **suggest_adrs**: Optimize ADR suggestion prompts for different contexts
3. **analyze_project_ecosystem**: Optimize analysis prompts for different tech stacks
4. **generate_research_questions**: Optimize research question generation prompts
5. **incorporate_research**: Optimize research integration prompts

### Integration Pattern

```typescript
// Example: APE-enhanced tool
export async function generateOptimizedAdrSuggestions(context: any) {
  // Step 1: Get base prompt
  const basePrompt = createAdrSuggestionPrompt(context);

  // Step 2: Apply APE optimization
  const apeResult = await optimizePromptWithAPE(basePrompt, {
    candidateCount: 5,
    evaluationCriteria: ['task-completion', 'specificity', 'clarity'],
    optimizationRounds: 3,
    selectionStrategy: 'multi-criteria',
  });

  // Step 3: Return optimized prompt
  return {
    content: [
      {
        type: 'text',
        text: apeResult.optimizedPrompt.prompt,
      },
    ],
    metadata: {
      apeOptimization: apeResult.metadata,
      improvementScore: apeResult.improvementScore,
    },
  };
}
```

## Prompt Candidate Generation Strategies

### 1. Template-based Variation

```typescript
const templateVariations = [
  'Please {action} the following {subject} by {method}...',
  'Your task is to {action} {subject} using {method}...',
  'I need you to {action} {subject}. Use {method} to...',
  'Can you {action} the {subject}? Apply {method} and...',
];
```

### 2. Semantic Variation

- **Synonym Replacement**: Replace key terms with synonyms
- **Phrase Restructuring**: Reorganize sentence structure
- **Perspective Shifting**: Change from imperative to collaborative tone
- **Detail Level Adjustment**: Add or remove detail levels

### 3. Style Variation

- **Formal Style**: Professional, structured language
- **Conversational Style**: Friendly, approachable language
- **Technical Style**: Precise, domain-specific terminology
- **Instructional Style**: Step-by-step, educational approach

## Evaluation Mechanisms

### 1. Automated Evaluation

**Metrics**:

- **Prompt Length**: Optimal length for clarity vs completeness
- **Complexity Score**: Readability and comprehension difficulty
- **Specificity Index**: How specific and actionable the prompt is
- **Keyword Density**: Presence of important domain keywords

### 2. Performance-based Evaluation

**Criteria**:

- **Task Success Rate**: How often the prompt achieves the intended outcome
- **Response Quality**: Quality of AI responses generated by the prompt
- **Consistency**: Consistency of results across multiple executions
- **Error Rate**: Frequency of errors or misunderstandings

### 3. Context-aware Evaluation

**Factors**:

- **Domain Relevance**: How well the prompt fits the architectural domain
- **Technology Alignment**: Alignment with detected technologies
- **Project Context**: Suitability for the specific project context
- **User Preferences**: Alignment with user or team preferences

## Optimization Workflow

### Phase 1: Candidate Generation (Parallel)

1. **Template-based Generation**: Generate variations using templates
2. **Semantic Generation**: Create semantically similar alternatives
3. **Style Generation**: Produce different style variations
4. **Structure Generation**: Create different organizational patterns

### Phase 2: Evaluation (Batch Processing)

1. **Automated Scoring**: Apply automated evaluation metrics
2. **Criteria Assessment**: Evaluate against specific criteria
3. **Context Matching**: Assess context-specific suitability
4. **Performance Prediction**: Predict likely performance outcomes

### Phase 3: Selection and Optimization

1. **Multi-criteria Selection**: Select best candidates using multiple criteria
2. **Ensemble Creation**: Combine strengths of multiple candidates
3. **Refinement**: Generate refined versions of top candidates
4. **Validation**: Validate optimized prompts against requirements

## Caching Strategy

### Cache Levels

1. **Candidate Cache**: Store generated prompt candidates
2. **Evaluation Cache**: Cache evaluation results for candidates
3. **Optimization Cache**: Store final optimized prompts
4. **Performance Cache**: Cache performance metrics and feedback

### Cache Keys

```typescript
// Candidate cache key
const candidateKey = `ape:candidate:${taskType}-${contextHash}-${strategy}`;

// Optimization cache key
const optimizationKey = `ape:optimized:${taskType}-${contextHash}-${configHash}`;

// Performance cache key
const performanceKey = `ape:performance:${promptHash}-${contextHash}`;
```

## Performance Tracking

### Metrics Collection

- **Optimization Time**: Time taken for prompt optimization
- **Improvement Score**: Quantified improvement over original prompt
- **Success Rate**: Rate of successful optimizations
- **Cache Hit Rate**: Efficiency of caching system
- **User Satisfaction**: Feedback on optimized prompts

### Performance Dashboard

- **Optimization Statistics**: Success rates, improvement scores
- **Tool Performance**: Per-tool optimization effectiveness
- **Trend Analysis**: Performance trends over time
- **Resource Usage**: Computational resources used for optimization

## Security and Validation

### Security Considerations

- **Prompt Injection Prevention**: Validate generated prompts for safety
- **Content Filtering**: Filter inappropriate or harmful content
- **Access Control**: Control access to optimization features
- **Audit Trail**: Maintain logs of optimization activities

### Validation Framework

- **Syntax Validation**: Ensure prompts are syntactically correct
- **Semantic Validation**: Verify prompts make semantic sense
- **Safety Validation**: Check for potential security issues
- **Performance Validation**: Verify optimized prompts perform better

## Implementation Roadmap

### Phase 1: Core Framework (Weeks 1-2)

- Implement candidate generation strategies
- Create evaluation engine
- Build selection algorithms
- Add basic caching

### Phase 2: Integration (Weeks 3-4)

- Integrate with high-priority MCP tools
- Add performance tracking
- Implement optimization loops
- Create configuration system

### Phase 3: Advanced Features (Weeks 5-6)

- Add ensemble methods
- Implement advanced evaluation criteria
- Create performance dashboard
- Add comprehensive testing

## Future Enhancements

### Advanced Optimization Techniques

1. **Multi-objective Optimization**: Balance multiple competing objectives
2. **Evolutionary Algorithms**: Use genetic algorithms for prompt evolution
3. **Reinforcement Learning**: Learn from prompt performance feedback
4. **Transfer Learning**: Apply optimizations across similar tasks

### Integration Opportunities

1. **Knowledge Generation Integration**: Combine with domain knowledge for better prompts
2. **Reflexion Integration**: Use self-reflection for prompt improvement
3. **External Feedback**: Incorporate user feedback into optimization
4. **Cross-tool Learning**: Share optimization insights across tools

This APE framework design provides a comprehensive foundation for automatic prompt optimization while maintaining the 100% prompt-driven architecture and integrating seamlessly with existing MCP tools.
