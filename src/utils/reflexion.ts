/**
 * Reflexion Utility Module - 100% Prompt-Driven Architecture
 * Implements Actor-Evaluator-Self-Reflection pattern for continuous learning
 * All functions return prompts for AI execution, never execute operations directly
 */

import { McpAdrError } from '../types/index.js';
import {
  ReflexionConfig,
  ReflexionMemory,
  MemoryType,
  EvaluationCriterion,
  ReflectionDepth,
  MemoryQuery
} from '../types/reflexion-framework.js';
import { PromptObject } from './prompt-composition.js';

// ============================================================================
// Configuration and Constants
// ============================================================================

const DEFAULT_REFLEXION_CONFIG: Required<ReflexionConfig> = {
  memoryEnabled: true,
  maxMemoryEntries: 100,
  reflectionDepth: 'detailed',
  evaluationCriteria: ['task-success', 'quality', 'efficiency'],
  learningRate: 0.7,
  memoryRetention: 90, // days
  feedbackIntegration: true,
  autoCleanup: true,
  relevanceThreshold: 0.6,
  confidenceThreshold: 0.7
};

const REFLEXION_VERSION = '1.0.0';

// ============================================================================
// Core Reflexion Functions - 100% Prompt-Driven
// ============================================================================

/**
 * Generate AI delegation prompt for executing a task with reflexion learning
 * Returns prompts for AI to execute tasks with memory-enhanced context
 */
export async function executeWithReflexion(
  basePrompt: PromptObject,
  config: Partial<ReflexionConfig> = {}
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    // Validate input prompt
    if (!basePrompt.prompt || basePrompt.prompt.trim() === '') {
      throw new McpAdrError('Prompt cannot be empty', 'INVALID_INPUT');
    }

    // Validate configuration
    validateReflexionConfig(config);

    const mergedConfig = { ...DEFAULT_REFLEXION_CONFIG, ...config };
    console.error(`[DEBUG] Generating reflexion execution prompt with learning enabled`);

    // Generate cache key for this reflexion request
    const contextHash = Buffer.from(JSON.stringify(basePrompt)).toString('base64').substring(0, 16);
    const configHash = Buffer.from(JSON.stringify(mergedConfig)).toString('base64').substring(0, 16);
    const cacheKey = `reflexion:execution:${contextHash}-${configHash}`;

    // Create comprehensive reflexion execution prompt
    const prompt = `
# Reflexion-Enhanced Task Execution Request

Please execute the following task using the Reflexion learning pattern with memory-enhanced context.

## Original Task
\`\`\`
${basePrompt.prompt}
\`\`\`

## Original Instructions
\`\`\`
${basePrompt.instructions}
\`\`\`

## Original Context
${JSON.stringify(basePrompt.context, null, 2)}

## Reflexion Configuration
- Memory Enabled: ${mergedConfig.memoryEnabled}
- Max Memory Entries: ${mergedConfig.maxMemoryEntries}
- Reflection Depth: ${mergedConfig.reflectionDepth}
- Evaluation Criteria: ${mergedConfig.evaluationCriteria.join(', ')}
- Learning Rate: ${mergedConfig.learningRate}
- Memory Retention: ${mergedConfig.memoryRetention} days
- Relevance Threshold: ${mergedConfig.relevanceThreshold}
- Confidence Threshold: ${mergedConfig.confidenceThreshold}

## Reflexion Learning Process

### Step 1: Memory Retrieval and Context Enhancement
1. **Retrieve Relevant Memories**: Search for past experiences related to this task type
2. **Analyze Past Lessons**: Review lessons learned from similar situations
3. **Identify Successful Patterns**: Find approaches that worked well previously
4. **Note Failure Patterns**: Identify mistakes and issues to avoid
5. **Enhance Context**: Integrate memory insights into current task context

### Step 2: Memory-Informed Task Execution
1. **Apply Past Lessons**: Use lessons learned to inform current approach
2. **Avoid Known Pitfalls**: Actively avoid previously identified mistakes
3. **Leverage Successful Strategies**: Build on approaches that worked well
4. **Adapt to Current Context**: Modify strategies based on current situation
5. **Document Execution Path**: Record detailed steps and decision rationale

### Step 3: Performance Evaluation
Evaluate the task execution on these criteria (0-1 scale):

${mergedConfig.evaluationCriteria.map(criterion => {
  const descriptions = {
    'task-success': 'Did the task achieve its intended outcome successfully?',
    'quality': 'How well was the task executed in terms of accuracy and completeness?',
    'efficiency': 'Was the approach optimal in terms of time and resource usage?',
    'accuracy': 'How accurate and correct were the results produced?',
    'completeness': 'Was the task fully completed with all requirements met?',
    'relevance': 'How relevant and appropriate was the output for the context?',
    'clarity': 'How clear and understandable was the communication and output?',
    'innovation': 'Was the approach creative or novel in addressing the task?'
  };
  return `- **${criterion}**: ${descriptions[criterion] || 'Evaluate based on this criterion'}`;
}).join('\n')}

### Step 4: Self-Reflection and Lesson Extraction
Generate ${mergedConfig.reflectionDepth} self-reflection including:

#### Success Analysis
- What worked well and why?
- Which strategies were most effective?
- What patterns led to positive outcomes?
- How did past lessons contribute to success?

#### Failure Analysis (if applicable)
- What went wrong and why?
- Which approaches were ineffective?
- What mistakes were made?
- How can similar issues be prevented?

#### Lesson Extraction
- What new lessons can be learned from this experience?
- How can successful approaches be generalized?
- What knowledge gaps were identified?
- What strategies should be refined or improved?

#### Future Strategy Development
- How can the approach be improved for next time?
- What new strategies should be considered?
- How can lessons be applied to similar tasks?
- What additional knowledge or skills are needed?

### Step 5: Memory Integration and Persistence
1. **Create New Memories**: Generate memory entries for significant lessons
2. **Update Existing Memories**: Strengthen or modify existing memories based on new evidence
3. **Link Related Memories**: Connect new memories to related existing ones
4. **Categorize Memories**: Assign appropriate memory types and categories
5. **Set Memory Persistence**: Determine memory retention and access patterns

## Expected Output Format
\`\`\`json
{
  "reflexionExecution": {
    "enhancedPrompt": {
      "prompt": "memory-enhanced task execution prompt",
      "instructions": "enhanced instructions with memory context",
      "context": {
        "memory_enhanced": true,
        "memories_used": ["memory_id_1", "memory_id_2"],
        "learning_applied": true,
        "original_context": "..."
      }
    },
    "taskAttempt": {
      "attemptId": "attempt_${Date.now()}",
      "taskType": "task_classification",
      "context": ${JSON.stringify(basePrompt.context)},
      "action": "detailed description of actions taken",
      "outcome": {
        "success": true,
        "result": "task execution result",
        "errors": [],
        "warnings": [],
        "executionTime": 5000,
        "resourcesUsed": {
          "memoryAccessed": 3,
          "memoryCreated": 1,
          "processingTime": 5000,
          "promptTokens": 1500,
          "cacheHits": 2,
          "cacheMisses": 1
        },
        "qualityMetrics": {
          "accuracy": 0.85,
          "completeness": 0.90,
          "relevance": 0.88,
          "clarity": 0.82,
          "innovation": 0.75,
          "efficiency": 0.80
        }
      },
      "evaluation": {
        "overallScore": 0.85,
        "criteriaScores": {
          ${mergedConfig.evaluationCriteria.map(c => `"${c}": 0.8`).join(',\n          ')}
        },
        "feedback": [
          {
            "criterion": "${mergedConfig.evaluationCriteria[0]}",
            "score": 0.8,
            "reasoning": "detailed explanation of score",
            "suggestions": ["specific improvement suggestion"],
            "severity": "medium"
          }
        ],
        "strengths": ["strength 1", "strength 2"],
        "weaknesses": ["weakness 1", "weakness 2"],
        "improvementAreas": ["area 1", "area 2"],
        "confidence": 0.85,
        "evaluationTime": 2000,
        "evaluatorVersion": "${REFLEXION_VERSION}"
      },
      "reflection": {
        "reflectionId": "reflection_${Date.now()}",
        "reflectionText": "comprehensive self-reflection on the task execution",
        "lessonsLearned": [
          {
            "lesson": "specific lesson learned",
            "category": "strategy",
            "importance": "high",
            "evidence": ["evidence supporting this lesson"],
            "applicableContexts": ["context where this applies"],
            "confidence": 0.9,
            "generalizability": 0.8
          }
        ],
        "actionableInsights": [
          {
            "insight": "actionable insight for improvement",
            "action": "specific action to take",
            "priority": "high",
            "timeframe": "immediate",
            "expectedImpact": 0.7,
            "riskLevel": "low"
          }
        ],
        "futureStrategies": [
          {
            "strategy": "improved strategy for future tasks",
            "description": "detailed strategy description",
            "applicableScenarios": ["scenario 1", "scenario 2"],
            "expectedOutcomes": ["outcome 1", "outcome 2"],
            "successMetrics": ["metric 1", "metric 2"]
          }
        ],
        "knowledgeGaps": [
          {
            "gap": "identified knowledge gap",
            "category": "technical",
            "impact": "medium",
            "learningPriority": 0.7,
            "suggestedResources": ["resource 1", "resource 2"]
          }
        ],
        "confidenceLevel": 0.8,
        "applicability": ["context 1", "context 2"],
        "reflectionTime": 3000
      },
      "timestamp": "${new Date().toISOString()}",
      "relatedMemories": ["memory_id_1", "memory_id_2"],
      "generatedMemories": ["new_memory_id_1"]
    },
    "learningOutcome": {
      "lessonsLearned": 2,
      "memoriesCreated": 1,
      "memoriesUpdated": 2,
      "improvementAchieved": 0.15,
      "knowledgeGapsIdentified": 1,
      "strategiesRefined": 1,
      "confidenceChange": 0.1
    },
    "memoryUpdates": [
      {
        "memoryId": "memory_id_1",
        "updateType": "strengthen",
        "changes": ["increased confidence", "added evidence"],
        "reason": "successful application in current task",
        "impact": 0.2
      }
    ],
    "metadata": {
      "reflexionVersion": "${REFLEXION_VERSION}",
      "executedAt": "${new Date().toISOString()}",
      "cacheKey": "${cacheKey}",
      "configUsed": ${JSON.stringify(mergedConfig, null, 6)},
      "performanceMetrics": {
        "totalReflexionTime": 10000,
        "memoryRetrievalTime": 2000,
        "evaluationTime": 2000,
        "reflectionTime": 3000,
        "memoryIntegrationTime": 1000,
        "memoriesAccessed": 3,
        "memoriesCreated": 1,
        "learningEfficiency": 0.8
      }
    }
  }
}
\`\`\`

## Quality Requirements
- Apply relevant lessons from past experiences
- Demonstrate clear learning from previous mistakes
- Show improvement over baseline approaches without memory
- Generate valuable new insights for future learning
- Create high-quality memories for future reference

## Security and Validation
- Ensure all generated memories are safe and appropriate
- Validate that lessons learned are accurate and beneficial
- Verify that reflection content is constructive and helpful
- Check for potential biases in learning and memory creation

Execute the task with full reflexion learning and document the complete learning process.
`;

    const instructions = `
# Reflexion Execution Instructions

You must:
1. **Retrieve Relevant Memories**: Find and apply past experiences related to this task
2. **Execute with Memory Context**: Use memory insights to inform task execution
3. **Evaluate Performance**: Score the execution against all specified criteria
4. **Generate Deep Reflection**: Create comprehensive self-reflection with lessons learned
5. **Update Memory System**: Create and update memories based on the experience
6. **Document Learning**: Provide clear evidence of learning and improvement

## Success Criteria
- Task execution shows clear application of past lessons
- Evaluation provides objective assessment of performance
- Reflection generates valuable insights and lessons
- Memory updates are appropriate and beneficial
- Overall learning outcome demonstrates improvement
- Follows exact JSON output format

## Learning Requirements
- Must demonstrate learning from past experiences
- Should show improvement over non-reflexion approaches
- Must generate actionable insights for future tasks
- Should identify and address knowledge gaps
- Must create valuable memories for future reference
`;

    return {
      prompt,
      instructions,
      context: {
        operation: 'reflexion_execution',
        originalPrompt: basePrompt,
        config: mergedConfig,
        reflexionConfig: mergedConfig, // Keep for backward compatibility
        cacheKey,
        memoriesUsed: [], // Required by validation function - empty array for prompt generation
        reflectionDepth: mergedConfig.reflectionDepth,
        evaluationCriteria: mergedConfig.evaluationCriteria,
        memoryEnabled: mergedConfig.memoryEnabled,
        maxMemoryEntries: mergedConfig.maxMemoryEntries,
        learningRate: mergedConfig.learningRate,
        relevanceThreshold: mergedConfig.relevanceThreshold,
        confidenceThreshold: mergedConfig.confidenceThreshold,
        version: REFLEXION_VERSION,
        timestamp: Date.now(),
        securityLevel: 'high',
        expectedFormat: 'json'
      }
    };

  } catch (error) {
    throw new McpAdrError(
      `Failed to generate reflexion execution prompt: ${error instanceof Error ? error.message : String(error)}`,
      'REFLEXION_EXECUTION_ERROR'
    );
  }
}

/**
 * Generate AI delegation prompt for retrieving relevant memories
 * Returns prompts for AI to search and retrieve relevant past experiences
 */
export async function retrieveRelevantMemories(
  taskType: string,
  context: any,
  query: Partial<MemoryQuery> = {}
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating memory retrieval prompt for task type: ${taskType}`);

    const prompt = `
# Memory Retrieval Request

Please search and retrieve relevant memories for the current task context.

## Task Information
- **Task Type**: ${taskType}
- **Context**: ${JSON.stringify(context, null, 2)}

## Memory Query Parameters
- Memory Types: ${query.memoryTypes?.join(', ') || 'All types'}
- Keywords: ${query.keywords?.join(', ') || 'Auto-detect from context'}
- Time Range: ${query.timeRange ? `${query.timeRange.start} to ${query.timeRange.end}` : 'All time'}
- Relevance Threshold: ${query.relevanceThreshold || 0.6}
- Max Results: ${query.maxResults || 10}

## Memory Search Process

### Step 1: Context Analysis
1. **Extract Key Concepts**: Identify important concepts, technologies, and patterns from the context
2. **Determine Task Category**: Classify the task type and domain
3. **Identify Search Terms**: Generate relevant search terms and keywords
4. **Assess Context Similarity**: Prepare criteria for matching similar contexts

### Step 2: Memory Search Strategy
1. **Keyword Matching**: Search for memories containing relevant keywords
2. **Context Similarity**: Find memories from similar task contexts
3. **Pattern Matching**: Look for memories with similar patterns or approaches
4. **Temporal Relevance**: Consider recency and temporal patterns
5. **Success Correlation**: Prioritize memories from successful past attempts

### Step 3: Relevance Scoring
Score each memory on relevance (0-1 scale) based on:
- **Context Similarity**: How similar is the memory context to current context
- **Task Type Match**: How well does the memory task type match current task
- **Keyword Overlap**: How many relevant keywords are present
- **Success Rate**: How successful were the approaches in the memory
- **Recency**: How recent and relevant is the memory

### Step 4: Memory Selection and Ranking
1. **Apply Relevance Threshold**: Filter memories below relevance threshold
2. **Rank by Relevance**: Sort memories by relevance score
3. **Diversify Selection**: Ensure variety in memory types and approaches
4. **Limit Results**: Return top memories up to max results limit

## Expected Output Format
\`\`\`json
{
  "memoryRetrieval": {
    "searchResults": [
      {
        "memoryId": "memory_001",
        "memoryType": "episodic",
        "relevanceScore": 0.85,
        "content": {
          "summary": "brief summary of the memory",
          "details": "detailed memory content",
          "context": { "task_context": "..." },
          "lessons": ["lesson 1", "lesson 2"],
          "applicableScenarios": ["scenario 1", "scenario 2"],
          "evidence": ["evidence 1", "evidence 2"],
          "outcomes": ["outcome 1", "outcome 2"],
          "strategies": ["strategy 1", "strategy 2"]
        },
        "metadata": {
          "source": "task_execution",
          "quality": 0.8,
          "reliability": 0.9,
          "generalizability": 0.7,
          "category": "strategy",
          "importance": "high"
        },
        "accessCount": 5,
        "lastAccessed": "2024-01-01T00:00:00Z",
        "createdAt": "2023-12-01T00:00:00Z"
      }
    ],
    "searchMetadata": {
      "totalFound": 15,
      "searchTime": 1500,
      "relevanceScores": {
        "memory_001": 0.85,
        "memory_002": 0.78
      },
      "searchStrategy": "hybrid_keyword_context",
      "indexesUsed": ["keyword_index", "context_index"],
      "cacheHits": 3,
      "searchQuality": 0.8
    },
    "searchSummary": {
      "taskType": "${taskType}",
      "contextAnalysis": "analysis of the provided context",
      "keyConceptsExtracted": ["concept 1", "concept 2"],
      "searchTermsUsed": ["term 1", "term 2"],
      "memoryTypesFound": ["episodic", "semantic"],
      "averageRelevance": 0.75,
      "recommendedMemories": ["memory_001", "memory_002"]
    }
  }
}
\`\`\`

## Search Quality Requirements
- Find memories with relevance score above ${query.relevanceThreshold || 0.6}
- Prioritize memories from successful past experiences
- Include diverse memory types when available
- Provide clear relevance reasoning for each memory
- Ensure memories are applicable to the current context

## Memory File Locations
Search in these directories:
- **Episodic**: docs/reflexion-memory/episodic/
- **Semantic**: docs/reflexion-memory/semantic/
- **Procedural**: docs/reflexion-memory/procedural/
- **Meta**: docs/reflexion-memory/meta/
- **Indexes**: docs/reflexion-memory/indexes/

Return the most relevant memories that can help inform the current task execution.
`;

    const instructions = `
# Memory Retrieval Instructions

You must:
1. **Analyze Context**: Understand the task context and requirements
2. **Search Systematically**: Use multiple search strategies to find relevant memories
3. **Score Relevance**: Provide accurate relevance scores for each memory
4. **Select Appropriately**: Choose the most helpful memories for the current task
5. **Document Search**: Provide clear search metadata and reasoning

## Success Criteria
- Find memories with high relevance to the current task
- Provide accurate relevance scoring and reasoning
- Include diverse memory types when available
- Return memories that can actually help with task execution
- Follow exact JSON output format

## Search Effectiveness
- Prioritize memories from successful past attempts
- Consider both exact matches and similar contexts
- Balance recency with relevance and quality
- Ensure returned memories are actionable and helpful
`;

    return {
      prompt,
      instructions,
      context: {
        operation: 'memory_retrieval',
        taskType,
        searchContext: context,
        queryParameters: query,
        memoriesUsed: [], // Required by validation function - empty for search operation
        version: REFLEXION_VERSION,
        timestamp: Date.now(),
        securityLevel: 'medium',
        expectedFormat: 'json'
      }
    };

  } catch (error) {
    throw new McpAdrError(
      `Failed to generate memory retrieval prompt: ${error instanceof Error ? error.message : String(error)}`,
      'MEMORY_RETRIEVAL_ERROR'
    );
  }
}

/**
 * Generate AI delegation prompt for persisting reflexion memories
 * Returns prompts for AI to save memories using file system operations
 */
export async function persistReflexionMemory(
  memory: ReflexionMemory
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating memory persistence prompt for memory: ${memory.memoryId}`);

    const prompt = `
# Memory Persistence Request

Please save the following Reflexion memory to the appropriate file location using the file system.

## Memory Details
- **Memory ID**: ${memory.memoryId}
- **Memory Type**: ${memory.memoryType}
- **Category**: ${memory.metadata.category}
- **Importance**: ${memory.metadata.importance}
- **Created**: ${memory.createdAt}
- **Expires**: ${memory.expiresAt || 'Never'}

## Memory Content
\`\`\`json
${JSON.stringify(memory, null, 2)}
\`\`\`

## File System Operations Required

### Step 1: Determine File Path
Based on memory type and category:
- **Episodic**: docs/reflexion-memory/episodic/{category}/{memoryId}.json
- **Semantic**: docs/reflexion-memory/semantic/{category}/{memoryId}.json
- **Procedural**: docs/reflexion-memory/procedural/{category}/{memoryId}.json
- **Meta**: docs/reflexion-memory/meta/{category}/{memoryId}.json
- **Feedback**: docs/reflexion-memory/feedback/{category}/{memoryId}.json

### Step 2: Create Directory Structure
Ensure the following directories exist:
- docs/reflexion-memory/
- docs/reflexion-memory/${memory.memoryType}/
- docs/reflexion-memory/${memory.memoryType}/${memory.metadata.category}/
- docs/reflexion-memory/indexes/

### Step 3: Save Memory File
1. **Create JSON File**: Save memory as formatted JSON
2. **Set Permissions**: Ensure appropriate file permissions
3. **Validate Content**: Verify file was saved correctly
4. **Create Backup**: Create backup if updating existing memory

### Step 4: Update Memory Indexes
Update the following index files:
1. **Memory Catalog**: docs/reflexion-memory/indexes/memory-catalog.json
2. **Type Index**: docs/reflexion-memory/indexes/${memory.memoryType}-index.json
3. **Category Index**: docs/reflexion-memory/indexes/category-index.json
4. **Temporal Index**: docs/reflexion-memory/indexes/temporal-index.json

### Step 5: Maintain Index Integrity
Ensure indexes contain:
- Memory ID and file path mapping
- Memory metadata for quick search
- Relevance and quality scores
- Access patterns and statistics
- Expiration and cleanup information

## Expected File Structure
\`\`\`
docs/reflexion-memory/
├── ${memory.memoryType}/
│   └── ${memory.metadata.category}/
│       └── ${memory.memoryId}.json
└── indexes/
    ├── memory-catalog.json
    ├── ${memory.memoryType}-index.json
    ├── category-index.json
    └── temporal-index.json
\`\`\`

## Index Entry Format
Add this entry to memory-catalog.json:
\`\`\`json
{
  "memoryId": "${memory.memoryId}",
  "filePath": "docs/reflexion-memory/${memory.memoryType}/${memory.metadata.category}/${memory.memoryId}.json",
  "memoryType": "${memory.memoryType}",
  "category": "${memory.metadata.category}",
  "importance": "${memory.metadata.importance}",
  "quality": ${memory.metadata.quality},
  "relevanceScore": ${memory.relevanceScore},
  "createdAt": "${memory.createdAt}",
  "expiresAt": "${memory.expiresAt || 'null'}",
  "tags": ${JSON.stringify(memory.tags)},
  "accessCount": ${memory.accessCount},
  "lastAccessed": "${memory.lastAccessed}"
}
\`\`\`

## Validation Requirements
- Verify file was created successfully
- Confirm JSON is valid and properly formatted
- Ensure indexes were updated correctly
- Validate directory structure is correct
- Check file permissions are appropriate

Please execute these file operations and confirm successful memory persistence.
`;

    const instructions = `
# Memory Persistence Instructions

You must:
1. **Create Directory Structure**: Ensure all required directories exist
2. **Save Memory File**: Write memory as properly formatted JSON
3. **Update All Indexes**: Maintain index integrity and searchability
4. **Validate Storage**: Confirm successful file creation and content
5. **Handle Errors**: Provide clear error messages if operations fail

## Success Criteria
- Memory file is saved in correct location with proper format
- All relevant indexes are updated with new memory entry
- Directory structure is created if it doesn't exist
- File permissions and access are set correctly
- Validation confirms successful storage

## Error Handling
- Report any file system errors clearly
- Suggest solutions for common issues
- Ensure partial failures don't corrupt indexes
- Provide rollback information if needed
`;

    return {
      prompt,
      instructions,
      context: {
        operation: 'memory_persistence',
        memoryId: memory.memoryId,
        memoryType: memory.memoryType,
        filePath: `docs/reflexion-memory/${memory.memoryType}/${memory.metadata.category}/${memory.memoryId}.json`,
        securityLevel: 'medium',
        expectedFormat: 'confirmation'
      }
    };

  } catch (error) {
    throw new McpAdrError(
      `Failed to generate memory persistence prompt: ${error instanceof Error ? error.message : String(error)}`,
      'MEMORY_PERSISTENCE_ERROR'
    );
  }
}

/**
 * Generate AI delegation prompt for tracking learning progress
 * Returns prompts for AI to analyze and report learning progress
 */
export async function getLearningProgress(
  taskType: string
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating learning progress analysis prompt for task type: ${taskType}`);

    const prompt = `
# Learning Progress Analysis Request

Please analyze the learning progress for the specified task type using available memory data.

## Task Type
**${taskType}**

## Analysis Requirements

### Step 1: Memory Collection
1. **Gather Task Memories**: Collect all memories related to ${taskType}
2. **Organize by Time**: Sort memories chronologically
3. **Categorize by Type**: Group by episodic, semantic, procedural, meta
4. **Filter by Quality**: Focus on high-quality, reliable memories

### Step 2: Performance Trend Analysis
1. **Success Rate Calculation**: Calculate success rate over time
2. **Score Progression**: Analyze evaluation score trends
3. **Improvement Detection**: Identify periods of improvement or decline
4. **Pattern Recognition**: Find recurring patterns in performance

### Step 3: Learning Effectiveness Assessment
1. **Lesson Application**: How well are lessons being applied?
2. **Knowledge Retention**: Are lessons being retained over time?
3. **Strategy Evolution**: How are strategies improving?
4. **Error Reduction**: Are similar mistakes being avoided?

### Step 4: Knowledge Gap Identification
1. **Persistent Issues**: What problems keep recurring?
2. **Missing Knowledge**: What knowledge areas need development?
3. **Skill Gaps**: What skills need improvement?
4. **Learning Opportunities**: Where can learning be enhanced?

### Step 5: Plateau Detection
1. **Performance Stagnation**: Is learning progress stagnating?
2. **Plateau Duration**: How long has performance been flat?
3. **Intervention Needs**: What interventions might help?
4. **Alternative Approaches**: What new approaches should be tried?

## Expected Output Format
\`\`\`json
{
  "learningProgress": {
    "taskType": "${taskType}",
    "totalAttempts": 25,
    "successRate": 0.84,
    "averageScore": 0.78,
    "improvementTrend": 0.15,
    "lastImprovement": "2024-01-15T10:30:00Z",
    "keyLessons": [
      "Always validate assumptions with stakeholders",
      "Use domain-specific terminology for clarity",
      "Consider scalability implications early"
    ],
    "persistentIssues": [
      "Difficulty with complex multi-stakeholder scenarios",
      "Inconsistent handling of legacy system constraints"
    ],
    "nextFocusAreas": [
      "Stakeholder communication strategies",
      "Legacy system integration patterns",
      "Performance optimization techniques"
    ],
    "learningVelocity": 0.12,
    "plateauDetection": {
      "isOnPlateau": false,
      "plateauDuration": 0,
      "plateauConfidence": 0.2,
      "suggestedInterventions": [],
      "alternativeApproaches": [
        "Try different evaluation criteria",
        "Introduce complexity variations",
        "Seek external feedback"
      ]
    },
    "metadata": {
      "trackingStarted": "2023-11-01T00:00:00Z",
      "lastUpdated": "2024-01-20T15:45:00Z",
      "dataQuality": 0.85,
      "sampleSize": 25,
      "confidenceInterval": 0.92,
      "statisticalSignificance": 0.88,
      "trendAnalysis": {
        "shortTermTrend": 0.08,
        "mediumTermTrend": 0.15,
        "longTermTrend": 0.22,
        "volatility": 0.12,
        "predictability": 0.78
      }
    },
    "performanceBreakdown": {
      "byEvaluationCriteria": {
        "task-success": 0.85,
        "quality": 0.78,
        "efficiency": 0.72,
        "accuracy": 0.82,
        "completeness": 0.80
      },
      "byTimeperiod": {
        "last7Days": 0.82,
        "last30Days": 0.78,
        "last90Days": 0.75,
        "overall": 0.78
      },
      "byComplexity": {
        "simple": 0.92,
        "moderate": 0.78,
        "complex": 0.65
      }
    },
    "recommendations": [
      "Focus on improving complex scenario handling",
      "Develop stakeholder communication templates",
      "Create decision trees for legacy system scenarios",
      "Implement regular knowledge gap assessments"
    ]
  }
}
\`\`\`

## Analysis Quality Requirements
- Use all available memory data for comprehensive analysis
- Provide accurate statistical calculations and trends
- Identify actionable insights and recommendations
- Detect learning plateaus and suggest interventions
- Ensure recommendations are specific and implementable

## Memory Data Sources
Analyze data from:
- **Episodic Memories**: docs/reflexion-memory/episodic/
- **Performance Records**: Task attempt outcomes and evaluations
- **Learning Outcomes**: Lessons learned and strategy refinements
- **Temporal Patterns**: Time-based performance trends

Provide comprehensive learning progress analysis with actionable insights.
`;

    const instructions = `
# Learning Progress Analysis Instructions

You must:
1. **Collect Comprehensive Data**: Gather all relevant memory and performance data
2. **Analyze Trends**: Calculate accurate performance trends and patterns
3. **Identify Insights**: Find actionable insights and learning opportunities
4. **Detect Issues**: Identify persistent problems and learning plateaus
5. **Provide Recommendations**: Suggest specific, implementable improvements

## Success Criteria
- Analysis covers all available data comprehensively
- Trends and statistics are accurate and meaningful
- Insights are actionable and specific to the task type
- Plateau detection is accurate with helpful suggestions
- Recommendations are practical and implementable
- Follows exact JSON output format

## Analysis Quality
- Use statistical methods for trend analysis
- Consider both short-term and long-term patterns
- Balance optimism with realistic assessment
- Focus on actionable insights over general observations
`;

    return {
      prompt,
      instructions,
      context: {
        operation: 'learning_progress_analysis',
        taskType,
        analysisScope: 'comprehensive',
        securityLevel: 'low',
        expectedFormat: 'json'
      }
    };

  } catch (error) {
    throw new McpAdrError(
      `Failed to generate learning progress prompt: ${error instanceof Error ? error.message : String(error)}`,
      'LEARNING_PROGRESS_ERROR'
    );
  }
}

// ============================================================================
// Utility Functions and Helpers
// ============================================================================

/**
 * Generate cache key for reflexion requests
 */
export function generateReflexionCacheKey(
  promptHash: string,
  config: ReflexionConfig
): string {
  const configHash = Buffer.from(JSON.stringify(config)).toString('base64').substring(0, 16);
  return `reflexion:execution:${promptHash}-${configHash}`;
}

/**
 * Get default reflexion configuration
 */
export function getDefaultReflexionConfig(): Required<ReflexionConfig> {
  return { ...DEFAULT_REFLEXION_CONFIG };
}

/**
 * Validate reflexion configuration
 */
export function validateReflexionConfig(config: Partial<ReflexionConfig>): void {
  if (config.maxMemoryEntries !== undefined && (config.maxMemoryEntries < 1 || config.maxMemoryEntries > 1000)) {
    throw new McpAdrError('Max memory entries must be between 1 and 1000', 'INVALID_CONFIG');
  }

  if (config.learningRate && (config.learningRate < 0 || config.learningRate > 1)) {
    throw new McpAdrError('Learning rate must be between 0 and 1', 'INVALID_CONFIG');
  }

  if (config.memoryRetention && (config.memoryRetention < 1 || config.memoryRetention > 365)) {
    throw new McpAdrError('Memory retention must be between 1 and 365 days', 'INVALID_CONFIG');
  }

  if (config.relevanceThreshold && (config.relevanceThreshold < 0 || config.relevanceThreshold > 1)) {
    throw new McpAdrError('Relevance threshold must be between 0 and 1', 'INVALID_CONFIG');
  }

  if (config.confidenceThreshold && (config.confidenceThreshold < 0 || config.confidenceThreshold > 1)) {
    throw new McpAdrError('Confidence threshold must be between 0 and 1', 'INVALID_CONFIG');
  }
}

/**
 * Get supported memory types
 */
export function getSupportedMemoryTypes(): MemoryType[] {
  return ['episodic', 'semantic', 'procedural', 'meta', 'feedback'];
}

/**
 * Get supported evaluation criteria
 */
export function getSupportedEvaluationCriteria(): EvaluationCriterion[] {
  return [
    'task-success',
    'quality',
    'efficiency',
    'accuracy',
    'completeness',
    'relevance',
    'clarity',
    'innovation'
  ];
}

/**
 * Get supported reflection depths
 */
export function getSupportedReflectionDepths(): ReflectionDepth[] {
  return ['basic', 'detailed', 'comprehensive'];
}

/**
 * Create tool-specific reflexion configuration
 */
export function createToolReflexionConfig(
  toolName: string,
  customConfig: Partial<ReflexionConfig> = {}
): ReflexionConfig {
  const toolConfigs: Record<string, Partial<ReflexionConfig>> = {
    'generate_adrs_from_prd': {
      maxMemoryEntries: 100,
      reflectionDepth: 'comprehensive',
      evaluationCriteria: ['task-success', 'relevance', 'clarity', 'completeness'],
      learningRate: 0.8,
      memoryRetention: 90,
      relevanceThreshold: 0.7,
      confidenceThreshold: 0.75
    },
    'suggest_adrs': {
      maxMemoryEntries: 75,
      reflectionDepth: 'detailed',
      evaluationCriteria: ['task-success', 'relevance', 'efficiency'],
      learningRate: 0.7,
      memoryRetention: 60,
      relevanceThreshold: 0.6,
      confidenceThreshold: 0.7
    },
    'analyze_project_ecosystem': {
      maxMemoryEntries: 60,
      reflectionDepth: 'detailed',
      evaluationCriteria: ['accuracy', 'completeness', 'efficiency'],
      learningRate: 0.7,
      memoryRetention: 60,
      relevanceThreshold: 0.6,
      confidenceThreshold: 0.65
    },
    'generate_research_questions': {
      maxMemoryEntries: 50,
      reflectionDepth: 'detailed',
      evaluationCriteria: ['quality', 'relevance', 'innovation'],
      learningRate: 0.75,
      memoryRetention: 120,
      relevanceThreshold: 0.65,
      confidenceThreshold: 0.7
    }
  };

  const toolSpecificConfig = toolConfigs[toolName] || {};
  return { ...DEFAULT_REFLEXION_CONFIG, ...toolSpecificConfig, ...customConfig };
}

/**
 * Generate memory ID for new memories
 */
export function generateMemoryId(memoryType: MemoryType, category: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${memoryType}_${category}_${timestamp}_${randomSuffix}`;
}

/**
 * Calculate memory expiration date
 */
export function calculateMemoryExpiration(
  retentionDays: number,
  importance: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): string {
  const multipliers = {
    'low': 0.5,
    'medium': 1.0,
    'high': 2.0,
    'critical': 5.0
  };

  const adjustedDays = retentionDays * multipliers[importance];
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + adjustedDays);

  return expirationDate.toISOString();
}

/**
 * Create memory query from context
 */
export function createMemoryQuery(
  taskType: string,
  context: any,
  options: Partial<MemoryQuery> = {}
): MemoryQuery {
  // Extract keywords from context
  const keywords = extractKeywordsFromContext(context);

  return {
    taskType,
    context,
    keywords,
    memoryTypes: options.memoryTypes || ['episodic', 'semantic', 'procedural'],
    relevanceThreshold: options.relevanceThreshold || 0.6,
    maxResults: options.maxResults || 10,
    includeExpired: options.includeExpired || false,
    ...options
  };
}

/**
 * Extract keywords from context for memory search
 */
function extractKeywordsFromContext(context: any): string[] {
  const keywords: string[] = [];

  // Extract from common context fields
  if (context.technologies) {
    keywords.push(...context.technologies);
  }

  if (context.patterns) {
    keywords.push(...context.patterns);
  }

  if (context.domain) {
    keywords.push(context.domain);
  }

  if (context.projectType) {
    keywords.push(context.projectType);
  }

  // Extract from string fields
  const stringFields = ['description', 'summary', 'title', 'category'];
  for (const field of stringFields) {
    if (context[field] && typeof context[field] === 'string') {
      const words = context[field].toLowerCase().split(/\s+/);
      keywords.push(...words.filter(word => word.length > 3));
    }
  }

  // Remove duplicates and return
  return Array.from(new Set(keywords));
}

/**
 * Enhance prompt with memory context
 */
export async function enhancePromptWithMemories(
  basePrompt: PromptObject,
  memories: ReflexionMemory[]
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    const memoryContext = memories.map(memory => ({
      id: memory.memoryId,
      type: memory.memoryType,
      summary: memory.content.summary,
      lessons: memory.content.lessons,
      strategies: memory.content.strategies,
      applicableScenarios: memory.content.applicableScenarios,
      relevance: memory.relevanceScore,
      quality: memory.metadata.quality
    }));

    const enhancedPrompt = `
# Memory-Enhanced Task Execution

## Original Task
${basePrompt.prompt}

## Relevant Past Experiences
${memoryContext.map((mem, index) => `
### Memory ${index + 1}: ${mem.type} (Relevance: ${mem.relevance})
**Summary**: ${mem.summary}
**Key Lessons**: ${mem.lessons.join('; ')}
**Successful Strategies**: ${mem.strategies.join('; ')}
**Applicable to**: ${mem.applicableScenarios.join(', ')}
`).join('\n')}

## Memory-Informed Approach
Based on past experiences, please:
1. **Apply Relevant Lessons**: Use the lessons learned from similar situations
2. **Leverage Successful Strategies**: Build on approaches that have worked well
3. **Avoid Known Pitfalls**: Be aware of common mistakes and failure patterns
4. **Adapt to Current Context**: Modify strategies based on current context differences

## Enhanced Instructions
${basePrompt.instructions}

## Success Criteria
- Apply at least 2 relevant lessons from past experiences
- Demonstrate learning from previous mistakes
- Show improvement over baseline approaches
- Generate new insights for future learning

Execute the task with memory-informed decision making and document how past experiences influenced your approach.
`;

    return {
      prompt: enhancedPrompt,
      instructions: basePrompt.instructions,
      context: {
        ...basePrompt.context,
        operation: 'reflexion_execution', // Add operation for validation
        memoriesUsed: memories.map(m => m.memoryId),
        memoryEnhanced: true,
        memoryCount: memories.length,
        version: REFLEXION_VERSION,
        timestamp: Date.now()
      }
    };

  } catch (error) {
    throw new McpAdrError(
      `Failed to enhance prompt with memories: ${error instanceof Error ? error.message : String(error)}`,
      'MEMORY_ENHANCEMENT_ERROR'
    );
  }
}
