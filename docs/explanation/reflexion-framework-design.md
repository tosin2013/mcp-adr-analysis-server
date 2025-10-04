# Reflexion Framework Design

## Overview

The Reflexion framework implements the Actor-Evaluator-Self-Reflection pattern to enable MCP ADR Analysis Server tools to learn from mistakes through linguistic feedback and self-reflection. This framework maintains the 100% prompt-driven architecture while providing continuous learning and improvement capabilities.

## Core Concept

**Reflexion Framework** works by:
1. **Actor**: Executes tasks and generates outputs based on observations
2. **Evaluator**: Scores and evaluates the Actor's performance
3. **Self-Reflection**: Generates linguistic feedback for improvement
4. **Memory**: Stores lessons learned for future reference
5. **Iteration**: Continuously improves through feedback loops

## Research Foundation

Based on Shinn et al. (2023) "Reflexion: Language Agents with Verbal Reinforcement Learning":
- **Verbal Reinforcement**: Converts feedback into linguistic self-reflection
- **Episodic Memory**: Stores experiences and lessons learned
- **Iterative Improvement**: Rapidly learns from prior mistakes
- **No Fine-tuning Required**: Uses existing LLM capabilities without model updates

## Architecture Integration

### Existing Components Integration
- **PromptObject Interface**: Reflexion generates enhanced prompts with memory context
- **File System Utilities**: Uses existing prompt-driven file operations for memory persistence
- **Research Integration**: Leverages research utilities for feedback analysis
- **Cache System**: Stores reflection memories and learning outcomes

### Framework Components
```
Reflexion Framework
├── Actor (Task execution with memory context)
├── Evaluator (Performance assessment and scoring)
├── Self-Reflection (Linguistic feedback generation)
├── Memory Manager (Episodic and long-term memory)
├── Learning Tracker (Progress and improvement monitoring)
└── Integration Layer (MCP tool integration utilities)
```

## Core Reflexion Components

### 1. Actor Component
**Purpose**: Execute tasks with memory-enhanced context
**Responsibilities**:
- **Task Execution**: Perform assigned tasks using current knowledge
- **Memory Integration**: Incorporate past lessons into current actions
- **Context Awareness**: Consider previous failures and successes
- **Trajectory Generation**: Create detailed execution paths for evaluation

### 2. Evaluator Component
**Purpose**: Assess Actor performance and provide feedback
**Evaluation Criteria**:
- **Task Success**: Did the Actor achieve the intended outcome?
- **Quality Assessment**: How well was the task executed?
- **Efficiency Analysis**: Was the approach optimal?
- **Error Detection**: What mistakes were made?
- **Improvement Potential**: Where can performance be enhanced?

### 3. Self-Reflection Component
**Purpose**: Generate linguistic feedback for continuous improvement
**Reflection Types**:
- **Success Analysis**: What worked well and why?
- **Failure Analysis**: What went wrong and how to fix it?
- **Pattern Recognition**: What patterns emerge from multiple attempts?
- **Strategy Refinement**: How can approaches be improved?
- **Knowledge Gaps**: What knowledge is missing or incomplete?

### 4. Memory Manager
**Purpose**: Store and retrieve lessons learned and experiences
**Memory Types**:
- **Episodic Memory**: Specific task attempts and outcomes
- **Semantic Memory**: General lessons and principles learned
- **Procedural Memory**: Improved methods and approaches
- **Meta-Memory**: Knowledge about what has been learned

## Reflexion Framework Interfaces

### Core Reflexion Types
```typescript
export interface ReflexionConfig {
  memoryEnabled: boolean;
  maxMemoryEntries: number;
  reflectionDepth: 'basic' | 'detailed' | 'comprehensive';
  evaluationCriteria: EvaluationCriterion[];
  learningRate: number;              // How quickly to adapt (0-1)
  memoryRetention: number;           // How long to keep memories (days)
  feedbackIntegration: boolean;      // Enable external feedback
}

export interface TaskAttempt {
  attemptId: string;
  taskType: string;
  context: any;
  action: string;
  outcome: TaskOutcome;
  evaluation: EvaluationResult;
  reflection: SelfReflection;
  timestamp: string;
  metadata: AttemptMetadata;
}

export interface TaskOutcome {
  success: boolean;
  result: any;
  errors: string[];
  warnings: string[];
  executionTime: number;
  resourcesUsed: ResourceUsage;
}

export interface EvaluationResult {
  overallScore: number;             // 0-1 scale
  criteriaScores: Record<string, number>;
  feedback: string[];
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
  confidence: number;               // 0-1 scale
}

export interface SelfReflection {
  reflectionText: string;
  lessonsLearned: string[];
  actionableInsights: string[];
  futureStrategies: string[];
  knowledgeGaps: string[];
  confidenceLevel: number;          // 0-1 scale
  applicability: string[];          // Where these lessons apply
}
```

### Memory System Interfaces
```typescript
export interface ReflexionMemory {
  memoryId: string;
  memoryType: MemoryType;
  content: MemoryContent;
  relevanceScore: number;           // 0-1 scale
  accessCount: number;
  lastAccessed: string;
  createdAt: string;
  expiresAt?: string;
  tags: string[];
  metadata: MemoryMetadata;
}

export type MemoryType = 
  | 'episodic'                      // Specific experiences
  | 'semantic'                      // General knowledge
  | 'procedural'                    // Methods and approaches
  | 'meta'                          // Learning about learning
  | 'feedback';                     // External feedback

export interface MemoryContent {
  summary: string;
  details: string;
  context: any;
  lessons: string[];
  applicableScenarios: string[];
  relatedMemories: string[];
  evidence: string[];
}

export interface LearningProgress {
  taskType: string;
  totalAttempts: number;
  successRate: number;              // 0-1 scale
  averageScore: number;             // 0-1 scale
  improvementTrend: number;         // -1 to 1 (declining to improving)
  lastImprovement: string;
  keyLessons: string[];
  persistentIssues: string[];
  nextFocusAreas: string[];
}
```

## Integration with MCP Tools

### Tool-Specific Reflexion Patterns

#### 1. ADR Generation Tools
**Learning Focus**:
- **Decision Quality**: Learn from ADR adoption outcomes
- **Context Analysis**: Improve understanding of project requirements
- **Stakeholder Alignment**: Learn from feedback on ADR clarity and relevance

**Reflexion Pattern**:
```typescript
// Example: ADR suggestion with reflexion
export async function suggestAdrsWithReflexion(context: any) {
  // Step 1: Retrieve relevant memories
  const relevantMemories = await retrieveRelevantMemories('adr-suggestion', context);
  
  // Step 2: Generate memory-enhanced prompt
  const enhancedPrompt = await enhancePromptWithMemory(
    createAdrSuggestionPrompt(context),
    relevantMemories
  );
  
  // Step 3: Execute task with memory context
  const result = await executeWithReflexion(enhancedPrompt, {
    taskType: 'adr-suggestion',
    context,
    evaluationCriteria: ['relevance', 'clarity', 'feasibility']
  });
  
  return result;
}
```

#### 2. Analysis Tools
**Learning Focus**:
- **Pattern Recognition**: Learn from successful technology detection patterns
- **Context Understanding**: Improve project context analysis accuracy
- **Insight Generation**: Learn from valuable vs. superficial insights

#### 3. Research Tools
**Learning Focus**:
- **Question Quality**: Learn from research question effectiveness
- **Source Evaluation**: Improve research source quality assessment
- **Synthesis Skills**: Learn from successful research integration patterns

## Reflexion Workflow

### Phase 1: Memory-Enhanced Execution
**Duration**: Variable (based on task complexity)
**Process**:
1. **Memory Retrieval**: Find relevant past experiences and lessons
2. **Context Enhancement**: Integrate memories into current task context
3. **Strategy Selection**: Choose approach based on past learnings
4. **Execution**: Perform task with memory-informed strategy

### Phase 2: Performance Evaluation
**Duration**: 30-60 seconds
**Process**:
1. **Outcome Assessment**: Evaluate task success and quality
2. **Criteria Scoring**: Score performance against evaluation criteria
3. **Error Analysis**: Identify specific mistakes and issues
4. **Strength Recognition**: Acknowledge successful aspects

### Phase 3: Self-Reflection Generation
**Duration**: 60-120 seconds
**Process**:
1. **Experience Analysis**: Analyze what happened and why
2. **Lesson Extraction**: Extract actionable lessons learned
3. **Strategy Refinement**: Identify improved approaches
4. **Knowledge Gap Identification**: Recognize missing knowledge

### Phase 4: Memory Integration
**Duration**: 30-60 seconds
**Process**:
1. **Memory Creation**: Create new memory entries from experience
2. **Memory Linking**: Connect to related existing memories
3. **Memory Consolidation**: Strengthen important memories
4. **Memory Cleanup**: Remove outdated or irrelevant memories

## Memory Persistence Strategy

### File-Based Memory Storage
**Using Existing File System Utilities**:
```typescript
// Memory storage using prompt-driven file operations
export async function persistReflexionMemory(memory: ReflexionMemory) {
  const memoryPrompt = await generateMemoryPersistencePrompt(memory);
  
  // Delegate to AI for file system operations
  return {
    content: [{
      type: 'text',
      text: memoryPrompt.prompt
    }],
    metadata: {
      operation: 'memory_persistence',
      memoryId: memory.memoryId,
      memoryType: memory.memoryType
    }
  };
}
```

### Memory Organization
- **Directory Structure**: `./reflexion-memory/`
  - `episodic/` - Specific task attempts and outcomes
  - `semantic/` - General lessons and principles
  - `procedural/` - Improved methods and approaches
  - `meta/` - Learning about learning patterns

### Memory Formats
- **JSON Format**: Structured memory data for programmatic access
- **Markdown Format**: Human-readable memory summaries
- **Index Files**: Memory catalogs and search indices

## Performance Optimization

### Memory Management
- **Memory Limits**: Maximum number of memories per type
- **Relevance Scoring**: Prioritize most relevant memories
- **Automatic Cleanup**: Remove outdated or low-value memories
- **Memory Compression**: Consolidate similar memories

### Learning Efficiency
- **Incremental Learning**: Build on previous knowledge gradually
- **Transfer Learning**: Apply lessons across similar tasks
- **Meta-Learning**: Learn how to learn more effectively
- **Feedback Integration**: Incorporate external feedback quickly

## Security and Validation

### Memory Security
- **Content Validation**: Ensure memory content is safe and appropriate
- **Access Control**: Control access to sensitive memories
- **Privacy Protection**: Protect confidential information in memories
- **Audit Trail**: Track memory access and modifications

### Learning Validation
- **Progress Verification**: Validate that learning is actually occurring
- **Quality Assurance**: Ensure lessons learned are accurate and valuable
- **Bias Detection**: Identify and correct learning biases
- **Performance Monitoring**: Track learning effectiveness over time

## Integration Patterns

### Pattern 1: Reflexion-Enhanced Tool Execution
```typescript
// Standard reflexion pattern for any MCP tool
export async function executeWithReflexion(
  basePrompt: PromptObject,
  reflexionConfig: ReflexionConfig
): Promise<ReflexionResult>
```

### Pattern 2: Memory-Informed Decision Making
```typescript
// Use past experiences to inform current decisions
export async function makeMemoryInformedDecision(
  context: any,
  taskType: string
): Promise<DecisionResult>
```

### Pattern 3: Continuous Learning Loop
```typescript
// Implement continuous learning across multiple task executions
export async function continuousLearningLoop(
  taskSequence: TaskDefinition[]
): Promise<LearningOutcome>
```

This Reflexion framework design provides a comprehensive foundation for enabling MCP tools to learn from mistakes and continuously improve through linguistic feedback and self-reflection while maintaining the 100% prompt-driven architecture.
