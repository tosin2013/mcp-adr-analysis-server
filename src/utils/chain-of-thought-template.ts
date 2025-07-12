/**
 * Chain-of-Thought prompting template for MCP ADR Analysis Server
 * Provides structured thinking patterns to reduce LLM confusion and improve accuracy
 */

export interface ChainOfThoughtConfig {
  taskName: string;
  steps: string[];
  reasoningPattern?: 'sequential' | 'conditional' | 'exploratory' | 'analytical';
  validationChecks?: string[];
  errorHandling?: string[];
  outputFormat?: string;
}

/**
 * Generate Chain-of-Thought prompt section
 */
export function generateChainOfThoughtSection(config: ChainOfThoughtConfig): string {
  const { taskName, steps, reasoningPattern = 'sequential', validationChecks = [], errorHandling = [] } = config;

  return `
## 🧠 Chain-of-Thought Reasoning

Before proceeding with ${taskName}, please think through this systematically:

### Step-by-Step Process
${steps.map((step, index) => `
**Step ${index + 1}**: ${step}
- Think: What do I need to accomplish in this step?
- Consider: What could go wrong or be misunderstood?
- Decide: What is the best approach for this specific situation?
- Validate: Does this step make sense given the context?
`).join('')}

### Reasoning Pattern: ${reasoningPattern.toUpperCase()}
${getReasoningPatternInstructions(reasoningPattern)}

${validationChecks.length > 0 ? `
### ✅ Validation Checklist
Before finalizing your response, verify:
${validationChecks.map(check => `- [ ] ${check}`).join('\n')}
` : ''}

${errorHandling.length > 0 ? `
### 🚨 Error Prevention
Watch out for these common issues:
${errorHandling.map(error => `- ⚠️ ${error}`).join('\n')}
` : ''}

### Meta-Thinking
- Am I making any assumptions that should be explicitly stated?
- Have I considered alternative approaches?
- Is my reasoning clear and logical?
- Would another person be able to follow my thought process?

---
`;
}

/**
 * Directory scanning specific Chain-of-Thought template
 */
export function generateDirectoryScanningCoT(): string {
  return generateChainOfThoughtSection({
    taskName: 'directory scanning and analysis',
    steps: [
      'Understand the target directory path and validate it is safe to access',
      'Plan the scanning approach based on the file patterns and requirements', 
      'Execute the directory traversal systematically, level by level',
      'Analyze each file/directory encountered for relevance to the task',
      'Organize findings into the requested output format',
      'Double-check results for completeness and accuracy'
    ],
    reasoningPattern: 'sequential',
    validationChecks: [
      'Path is valid and accessible',
      'No system directories are being scanned inappropriately', 
      'File patterns are applied correctly',
      'All relevant files have been identified',
      'Output format matches requirements',
      'No sensitive information is exposed'
    ],
    errorHandling: [
      'Attempting to scan system directories like /, /usr, /bin',
      'Missing file access permissions',
      'Scanning node_modules or other large irrelevant directories',
      'Confusing relative vs absolute paths',
      'Including sensitive files in output'
    ]
  });
}

/**
 * Get reasoning pattern specific instructions
 */
function getReasoningPatternInstructions(pattern: string): string {
  switch (pattern) {
    case 'sequential':
      return `
Follow steps in order, completing each before moving to the next.
Build understanding progressively from simple to complex concepts.
Ensure each step's output becomes input for the next step.`;

    case 'conditional':
      return `
Evaluate conditions at each decision point before proceeding.
Consider multiple paths and choose the most appropriate one.
Document why specific branches were chosen over alternatives.`;

    case 'exploratory':
      return `
Start with broad analysis, then narrow focus to specific areas.
Consider multiple perspectives and approaches simultaneously.
Be open to discovering unexpected patterns or insights.`;

    case 'analytical':
      return `
Break down complex problems into smaller, manageable components.
Analyze relationships and dependencies between elements.
Synthesize findings into comprehensive conclusions.`;

    default:
      return `Follow a logical, step-by-step approach appropriate for the task.`;
  }
}

/**
 * Add Chain-of-Thought wrapper to existing prompts
 */
export function enhancePromptWithCoT(
  originalPrompt: string, 
  config: ChainOfThoughtConfig
): string {
  const cotSection = generateChainOfThoughtSection(config);
  
  return `${cotSection}

## Original Task Instructions

${originalPrompt}

## 📝 Your Response Format

Please structure your response as follows:

1. **Thinking Process**: Show your step-by-step reasoning
2. **Decision Points**: Explain key decisions and why you made them  
3. **Validation**: Confirm you've checked against the validation criteria
4. **Final Output**: Provide the requested analysis/results

Remember: Think out loud, show your work, and be explicit about your reasoning process.`;
}

/**
 * Specific CoT patterns for different prompt types
 */
export const COT_PATTERNS = {
  PROJECT_ANALYSIS: {
    taskName: 'project structure analysis',
    steps: [
      'Validate and resolve the project path safely',
      'Plan the directory scanning approach with appropriate file patterns',
      'Systematically traverse directories to gather file information',
      'Analyze technologies and patterns found in the codebase',
      'Synthesize findings into structured architectural insights',
      'Format results according to the specified output schema'
    ] as string[],
    reasoningPattern: 'analytical' as const,
    validationChecks: [
      'Project path is valid and accessible',
      'File scanning covers all relevant areas without including noise',
      'Technology detection is evidence-based and accurate',
      'Patterns identified have clear supporting evidence',
      'Output format is complete and properly structured'
    ] as string[]
  },

  ADR_SUGGESTION: {
    taskName: 'architectural decision recommendation',
    steps: [
      'Analyze the current architectural context and constraints',
      'Identify implicit decisions or decision points in the codebase',
      'Evaluate the significance and impact of each potential decision',
      'Research best practices and alternatives for each decision area',
      'Formulate specific, actionable ADR recommendations',
      'Prioritize recommendations based on impact and urgency'
    ] as string[],
    reasoningPattern: 'exploratory' as const,
    validationChecks: [
      'Recommendations are based on actual evidence from the codebase',
      'Each suggested ADR addresses a real architectural concern',
      'Alternatives have been considered for major decisions',
      'Priority assignments are justified and reasonable'
    ] as string[]
  },

  RULE_GENERATION: {
    taskName: 'architectural rule extraction',
    steps: [
      'Systematically review each ADR for explicit and implicit rules',
      'Identify patterns that could be formalized as enforceable rules',
      'Determine the scope and applicability of each potential rule',
      'Design validation mechanisms for each rule',
      'Group related rules into logical categories',
      'Prioritize rules based on impact and enforceability'
    ] as string[],
    reasoningPattern: 'analytical' as const,
    validationChecks: [
      'Rules are actionable and enforceable',
      'Each rule has clear violation detection criteria',
      'Rules are specific enough to avoid ambiguity',
      'Rule categories are logical and non-overlapping'
    ] as string[]
  }
} as const;