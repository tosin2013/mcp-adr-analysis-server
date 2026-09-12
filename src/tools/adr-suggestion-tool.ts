/**
 * MCP Tool for ADR suggestions and implicit decision detection
 * Enhanced with Knowledge Generation, Reflexion capabilities, and Research-Driven Architecture
 * Implements AI-powered ADR recommendation system with environment-aware research
 *
 * Following ADR-018 Atomic Tools Architecture:
 * - Dependency injection for testability
 * - No ResearchOrchestrator (deprecated) - uses static context
 * - Self-contained with minimal dependencies
 */

import { McpAdrError } from '../types/index.js';
import { ConversationContext } from '../types/conversation-context.js';
import { generateArchitecturalKnowledge } from '../utils/knowledge-generation.js';
import {
  executeWithReflexion,
  retrieveRelevantMemories,
  createToolReflexionConfig,
} from '../utils/reflexion.js';
import { TreeSitterAnalyzer } from '../utils/tree-sitter-analyzer.js';
import { findRelatedCode } from '../utils/file-system.js';
import { buildMadrDocument } from '../utils/adr-format.js';
// ResearchOrchestrator removed per ADR-018 - using static infrastructure context instead
// Server-side LLM execution removed per CE-MCP migration (#1647): ADR content is now
// emitted deterministically and suggestions return a CE-MCP directive for the agent.
import {
  getEnhancedModeDefault,
  getKnowledgeEnhancementDefault,
} from '../utils/test-aware-defaults.js';

/**
 * Suggest ADRs based on project analysis with advanced prompting techniques
 * Enhanced with Knowledge Generation and Reflexion learning capabilities
 */
export async function suggestAdrs(args: {
  projectPath?: string;
  analysisType?: 'implicit_decisions' | 'code_changes' | 'comprehensive';
  beforeCode?: string;
  afterCode?: string;
  changeDescription?: string;
  commitMessages?: string[];
  existingAdrs?: string[];
  enhancedMode?: boolean; // Enable advanced prompting features
  learningEnabled?: boolean; // Enable Reflexion learning
  knowledgeEnhancement?: boolean; // Enable Knowledge Generation
  enableTreeSitterAnalysis?: boolean; // Enable tree-sitter for enhanced code analysis
  conversationContext?: ConversationContext; // Context from calling LLM
}): Promise<any> {
  const {
    projectPath = process.cwd(),
    analysisType = 'comprehensive',
    beforeCode,
    afterCode,
    changeDescription,
    commitMessages,
    existingAdrs,
    enhancedMode = getEnhancedModeDefault(), // Environment-aware default
    learningEnabled = true, // Default to learning enabled
    knowledgeEnhancement = getKnowledgeEnhancementDefault(), // Environment-aware default
    enableTreeSitterAnalysis = true, // Default to tree-sitter enabled
    conversationContext, // Context from calling LLM
  } = args;

  try {
    const { analyzeImplicitDecisions, analyzeCodeChanges } =
      await import('../utils/adr-suggestions.js');

    switch (analysisType) {
      case 'implicit_decisions': {
        let enhancedPrompt = '';
        let enhancementInfo = '';
        let codeContext = '';

        // Smart Code Linking for implicit decisions
        if (existingAdrs && existingAdrs.length > 0) {
          try {
            const mockAdrContent = existingAdrs.join('\n\n');
            const relatedCodeResult = await findRelatedCode(
              'implicit-decisions-analysis',
              mockAdrContent,
              projectPath,
              {
                useAI: true,
                maxFiles: 10,
                includeContent: false,
              }
            );

            if (relatedCodeResult.relatedFiles.length > 0) {
              codeContext = `\n## Smart Code Linking - Implicit Decision Context\n\nAnalyzing related code for implicit architectural decisions:\n\n${relatedCodeResult.relatedFiles
                .slice(0, 5)
                .map((file, index) => `${index + 1}. **${file.path}** - ${file.extension} file`)
                .join(
                  '\n'
                )}\n\n**Code Analysis**: Found ${relatedCodeResult.relatedFiles.length} related files that may contain implicit decisions\n**Keywords Used**: ${relatedCodeResult.keywords.join(', ')}\n**Confidence**: ${(relatedCodeResult.confidence * 100).toFixed(1)}%\n`;
            }
          } catch (error) {
            console.warn('[WARNING] Smart Code Linking for implicit decisions failed:', error);
          }
        }

        // Apply enhancements if enabled
        if (enhancedMode && (knowledgeEnhancement || learningEnabled)) {
          let knowledgeContext = '';

          // Generate domain knowledge for implicit decision detection
          if (knowledgeEnhancement) {
            try {
              const knowledgeResult = await generateArchitecturalKnowledge(
                {
                  projectPath,
                  technologies: [],
                  patterns: [],
                  projectType: 'implicit-decision-detection',
                },
                {
                  domains: ['api-design', 'database-design'],
                  depth: 'basic',
                  cacheEnabled: true,
                }
              );

              knowledgeContext = `\n## Knowledge Enhancement\n${knowledgeResult.prompt}\n`;
            } catch (error) {
              console.error('[WARNING] Knowledge generation failed:', error);
            }
          }

          // Apply learning if enabled
          if (learningEnabled) {
            try {
              const reflexionConfig = createToolReflexionConfig('suggest_adrs');
              const baseResult = await analyzeImplicitDecisions(
                projectPath,
                existingAdrs,
                conversationContext
              );

              const reflexionResult = await executeWithReflexion(
                {
                  prompt: baseResult.analysisPrompt + knowledgeContext,
                  instructions: baseResult.instructions,
                  context: { projectPath, analysisType: 'implicit_decisions', existingAdrs },
                },
                reflexionConfig
              );

              enhancedPrompt = reflexionResult.prompt;
              enhancementInfo = `
## Enhancement Status
- **Knowledge Generation**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Reflexion Learning**: ✅ Applied
- **Smart Code Linking**: ${codeContext ? '✅ Applied' : '❌ No existing ADRs'}
- **Learning from**: Past implicit decision detection tasks

`;
            } catch (error) {
              console.error('[WARNING] Reflexion enhancement failed:', error);
              const result = await analyzeImplicitDecisions(
                projectPath,
                existingAdrs,
                conversationContext
              );
              enhancedPrompt = result.analysisPrompt + knowledgeContext;
            }
          } else {
            const result = await analyzeImplicitDecisions(
              projectPath,
              existingAdrs,
              conversationContext
            );
            enhancedPrompt = result.analysisPrompt + knowledgeContext;
            enhancementInfo = `
## Enhancement Status
- **Knowledge Generation**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Reflexion Learning**: ❌ Disabled
- **Smart Code Linking**: ${codeContext ? '✅ Applied' : '❌ No existing ADRs'}

`;
          }
        } else {
          const result = await analyzeImplicitDecisions(
            projectPath,
            existingAdrs,
            conversationContext
          );
          enhancedPrompt = result.analysisPrompt;
          enhancementInfo = `
## Enhancement Status
- **Enhanced Mode**: ❌ Disabled
- **Smart Code Linking**: ${codeContext ? '✅ Applied' : '❌ No existing ADRs'}
- All advanced features are disabled for this analysis

`;
        }

        const baseResult = await analyzeImplicitDecisions(
          projectPath,
          existingAdrs,
          conversationContext
        );

        return {
          content: [
            {
              type: 'text',
              text: `# ADR Suggestions: Enhanced Implicit Decisions Analysis

${enhancementInfo}
${codeContext}

${baseResult.instructions}

## Enhanced AI Analysis Prompt

${enhancedPrompt}

## Next Steps

1. **Submit the enhanced prompt** to an AI agent for comprehensive analysis
2. **Review the detected decisions** and prioritize based on impact and risk
3. **Use the \`generate_adr_from_decision\` tool** to create ADRs for high-priority decisions
4. **Integrate with existing ADR workflow** for review and approval

## Expected Output

The enhanced AI analysis will identify implicit architectural decisions and provide:
- Detailed decision analysis with evidence and domain knowledge
- Priority and risk assessments informed by past experiences
- Suggested ADR titles and content with improved quality
- Recommendations for documentation strategy based on learning
`,
            },
          ],
        };
      }

      case 'code_changes': {
        if (!beforeCode || !afterCode || !changeDescription) {
          throw new McpAdrError(
            'Code change analysis requires beforeCode, afterCode, and changeDescription',
            'INVALID_INPUT'
          );
        }

        let enhancedPrompt = '';
        let enhancementInfo = '';
        let codeContext = '';

        // Smart Code Linking for code changes
        if (existingAdrs && existingAdrs.length > 0) {
          try {
            const mockAdrContent = `${existingAdrs.join('\n\n')}\n\nCODE CHANGE:\n${changeDescription}`;
            const relatedCodeResult = await findRelatedCode(
              'code-changes-analysis',
              mockAdrContent,
              projectPath || process.cwd(),
              {
                useAI: true,
                maxFiles: 8,
                includeContent: false,
              }
            );

            if (relatedCodeResult.relatedFiles.length > 0) {
              codeContext = `\n## Smart Code Linking - Code Change Context\n\nFound related code files that may be affected by this change:\n\n${relatedCodeResult.relatedFiles
                .slice(0, 3)
                .map(
                  (file, index) =>
                    `${index + 1}. **${file.path}** - ${file.extension} file (${file.size} bytes)`
                )
                .join(
                  '\n'
                )}\n\n**Impact Analysis**: ${relatedCodeResult.relatedFiles.length} files may be affected by this architectural change\n**Keywords Used**: ${relatedCodeResult.keywords.join(', ')}\n**Confidence**: ${(relatedCodeResult.confidence * 100).toFixed(1)}%\n`;
            }
          } catch (error) {
            console.warn('[WARNING] Smart Code Linking for code changes failed:', error);
          }
        }

        // Apply enhancements if enabled
        let treeSitterAnalysis = '';
        if (enhancedMode && (knowledgeEnhancement || learningEnabled)) {
          let knowledgeContext = '';

          // Generate domain knowledge for code change analysis
          if (knowledgeEnhancement) {
            try {
              const knowledgeResult = await generateArchitecturalKnowledge(
                {
                  projectPath: projectPath || process.cwd(),
                  technologies: [],
                  patterns: [],
                  projectType: 'code-change-analysis',
                },
                {
                  domains: ['api-design', 'performance-optimization'],
                  depth: 'basic',
                  cacheEnabled: true,
                }
              );

              knowledgeContext = `\n## Knowledge Enhancement\n${knowledgeResult.prompt}\n`;
            } catch (error) {
              console.error('[WARNING] Knowledge generation failed:', error);
            }
          }

          // Perform tree-sitter analysis for enhanced code change understanding
          if (enableTreeSitterAnalysis) {
            try {
              const codeChangeAnalysis = await performTreeSitterCodeChangeAnalysis(
                beforeCode,
                afterCode,
                changeDescription
              );

              if (
                codeChangeAnalysis.architecturalChanges.length > 0 ||
                codeChangeAnalysis.securityImpacts.length > 0
              ) {
                treeSitterAnalysis = `

## 🔍 Tree-sitter Code Change Analysis

**Analysis Results:**
- **Architectural Changes**: ${codeChangeAnalysis.architecturalChanges.length}
- **Security Impacts**: ${codeChangeAnalysis.securityImpacts.length}
- **Complexity Change**: ${codeChangeAnalysis.complexityDelta > 0 ? '+' : ''}${codeChangeAnalysis.complexityDelta}
- **New Dependencies**: ${codeChangeAnalysis.newDependencies.length}

${
  codeChangeAnalysis.architecturalChanges.length > 0
    ? `
### 🏗️ Architectural Changes Detected
${codeChangeAnalysis.architecturalChanges.map(change => `- **${change.type}**: ${change.description} (impact: ${change.impact})`).join('\n')}
`
    : ''
}

${
  codeChangeAnalysis.securityImpacts.length > 0
    ? `
### 🔒 Security Impact Analysis
${codeChangeAnalysis.securityImpacts.map(impact => `- **${impact.type}**: ${impact.description} (severity: ${impact.severity})`).join('\n')}
`
    : ''
}

${
  codeChangeAnalysis.newDependencies.length > 0
    ? `
### 📦 New Dependencies
${codeChangeAnalysis.newDependencies.map(dep => `- **${dep.name}**: ${dep.reason} (risk: ${dep.riskLevel})`).join('\n')}
`
    : ''
}

---
`;
              }
            } catch (error) {
              console.warn('Tree-sitter code change analysis failed:', error);
              treeSitterAnalysis = `

## 🔍 Tree-sitter Code Change Analysis

**Status**: ⚠️ Analysis failed - continuing with standard analysis
**Error**: ${error instanceof Error ? error.message : 'Unknown error'}

---
`;
            }
          }

          // Apply learning if enabled
          if (learningEnabled) {
            try {
              const reflexionConfig = createToolReflexionConfig('suggest_adrs', {
                evaluationCriteria: ['task-success', 'accuracy', 'relevance'],
              });

              const baseResult = await analyzeCodeChanges(
                beforeCode,
                afterCode,
                changeDescription,
                commitMessages
              );

              const reflexionResult = await executeWithReflexion(
                {
                  prompt: baseResult.analysisPrompt + knowledgeContext,
                  instructions: baseResult.instructions,
                  context: {
                    analysisType: 'code_changes',
                    changeDescription,
                    hasCommitMessages: !!commitMessages?.length,
                  },
                },
                reflexionConfig
              );

              enhancedPrompt = reflexionResult.prompt;
              enhancementInfo = `
## Enhancement Status
- **Knowledge Generation**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Reflexion Learning**: ✅ Applied
- **Smart Code Linking**: ${codeContext ? '✅ Applied' : '❌ No existing ADRs'}
- **Learning from**: Past code change analysis tasks

`;
            } catch (error) {
              console.error('[WARNING] Reflexion enhancement failed:', error);
              const result = await analyzeCodeChanges(
                beforeCode,
                afterCode,
                changeDescription,
                commitMessages
              );
              enhancedPrompt = result.analysisPrompt + knowledgeContext;
            }
          } else {
            const result = await analyzeCodeChanges(
              beforeCode,
              afterCode,
              changeDescription,
              commitMessages
            );
            enhancedPrompt = result.analysisPrompt + knowledgeContext;
            enhancementInfo = `
## Enhancement Status
- **Knowledge Generation**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Reflexion Learning**: ❌ Disabled
- **Smart Code Linking**: ${codeContext ? '✅ Applied' : '❌ No existing ADRs'}

`;
          }
        } else {
          const result = await analyzeCodeChanges(
            beforeCode,
            afterCode,
            changeDescription,
            commitMessages
          );
          enhancedPrompt = result.analysisPrompt;
          enhancementInfo = `
## Enhancement Status
- **Enhanced Mode**: ❌ Disabled
- **Smart Code Linking**: ${codeContext ? '✅ Applied' : '❌ No existing ADRs'}
- All advanced features are disabled for this analysis

`;
        }

        const baseResult = await analyzeCodeChanges(
          beforeCode,
          afterCode,
          changeDescription,
          commitMessages
        );

        return {
          content: [
            {
              type: 'text',
              text: `# ADR Suggestions: Enhanced Code Change Analysis

${enhancementInfo}
${codeContext}
${treeSitterAnalysis}
${baseResult.instructions}

## Enhanced AI Analysis Prompt

${enhancedPrompt}

## Next Steps

1. **Submit the enhanced prompt** to an AI agent for change analysis
2. **Review the identified decisions** reflected in the code changes
3. **Document significant decisions** as ADRs using the generation tool
4. **Follow up with development team** for any clarification questions

## Expected Output

The enhanced AI analysis will provide:
- Architectural decisions reflected in the changes with domain context
- Change motivation and context analysis informed by past experiences
- Impact and risk assessment with improved accuracy
- Recommendations for documentation based on learning patterns
`,
            },
          ],
        };
      }

      case 'comprehensive': {
        let enhancedPrompt = '';
        let knowledgeContext = '';
        let reflexionContext = '';
        let codeContext = '';
        let researchContext = '';

        // Step 0: Static Infrastructure Context (ADR-018: replaced ResearchOrchestrator)
        // ResearchOrchestrator was removed per ADR-018 to eliminate blocking calls that caused
        // test timeouts. For detailed infrastructure research, use analyze_project_ecosystem tool.
        researchContext = `
## 🔬 Architecture Analysis Context

**Project Path**: ${projectPath}
**ADR Directory**: docs/adrs
**Existing ADRs**: ${existingAdrs?.length || 0} provided

### Analysis Approach
This analysis uses the **Atomic Tools Architecture** (ADR-018):
- Direct project file analysis via file system utilities
- Knowledge graph queries via MCP Resources (zero-cost reads)
- No blocking ResearchOrchestrator calls

### Recommended Additional Analysis
For detailed infrastructure research, use these tools in sequence:
1. \`analyze_project_ecosystem\` - Comprehensive project analysis
2. \`read_knowledge_graph\` - Query existing architectural knowledge
3. \`review_existing_adrs\` - Analyze current ADR inventory

---
`;

        // Step 1: Generate domain-specific knowledge if enabled
        if (knowledgeEnhancement) {
          try {
            const knowledgeResult = await generateArchitecturalKnowledge(
              {
                projectPath,
                technologies: [], // Will be auto-detected from project
                patterns: [],
                projectType: 'software-architecture',
                existingAdrs: existingAdrs || [],
              },
              {
                domains: ['api-design', 'database-design', 'microservices'],
                depth: 'intermediate',
                cacheEnabled: true,
              }
            );

            knowledgeContext = `
## Domain-Specific Knowledge Enhancement

The following architectural knowledge has been generated to enhance ADR suggestions:

${knowledgeResult.prompt}

---
`;
          } catch (error) {
            console.error('[WARNING] Knowledge generation failed:', error);
            knowledgeContext = '<!-- Knowledge generation unavailable -->\n';
          }
        }

        // Step 1a: Smart Code Linking - Analyze existing ADRs for related code
        if (existingAdrs && existingAdrs.length > 0) {
          try {
            // For comprehensive analysis, we'll simulate ADR content analysis
            // In a real scenario, this would read actual ADR files
            const mockAdrContent = existingAdrs.join('\n\n');
            const relatedCodeResult = await findRelatedCode(
              'comprehensive-analysis',
              mockAdrContent,
              projectPath,
              {
                useAI: true,
                maxFiles: 15,
                includeContent: false,
              }
            );

            if (relatedCodeResult.relatedFiles.length > 0) {
              codeContext = `
## Smart Code Linking Analysis

Found ${relatedCodeResult.relatedFiles.length} code files related to existing ADRs:

### Related Code Files
${relatedCodeResult.relatedFiles
  .map(
    (file, index) => `
${index + 1}. **${file.path}** (${file.extension} file)
   - Size: ${file.size} bytes
   - Directory: ${file.directory}
`
  )
  .join('')}

### Search Information
- **Keywords Used**: ${relatedCodeResult.keywords.join(', ')}
- **Search Patterns**: ${relatedCodeResult.searchPatterns.join(', ')}
- **Confidence**: ${(relatedCodeResult.confidence * 100).toFixed(1)}%

**Analysis Summary**: ${relatedCodeResult.relatedFiles.length} related files found

---
`;
            } else {
              codeContext = `
## Smart Code Linking Analysis

**Status**: No related code files found for existing ADRs
**Keywords Searched**: ${relatedCodeResult.keywords.join(', ')}
**Patterns Used**: ${relatedCodeResult.searchPatterns.join(', ')}

This suggests either:
- ADRs are high-level architectural decisions not yet implemented
- Code patterns don't match ADR terminology
- Additional implementation work may be needed

---
`;
            }
          } catch (error) {
            console.warn('[WARNING] Smart Code Linking failed:', error);
            codeContext = `
## Smart Code Linking Analysis

**Status**: ⚠️ Analysis failed - continuing without code context
**Error**: ${error instanceof Error ? error.message : 'Unknown error'}

---
`;
          }
        }

        // Step 2: Apply Reflexion learning if enabled
        if (learningEnabled) {
          try {
            // Retrieve relevant memories from past ADR suggestion tasks
            const memoryResult = await retrieveRelevantMemories(
              'adr-suggestion',
              { projectPath, analysisType: 'comprehensive', existingAdrs },
              { maxResults: 5, relevanceThreshold: 0.6 }
            );

            reflexionContext = `
## Learning from Past Experiences

The following insights from past ADR suggestion tasks will inform this analysis:

${memoryResult.prompt}

---
`;
          } catch (error) {
            console.error('[WARNING] Reflexion memory retrieval failed:', error);
            reflexionContext = '<!-- Learning context unavailable -->\n';
          }
        }

        // Step 3: Get the base analysis
        const implicitResult = await analyzeImplicitDecisions(
          projectPath,
          existingAdrs,
          conversationContext
        );

        // Step 4: Apply Reflexion execution if learning is enabled
        if (learningEnabled) {
          try {
            const reflexionConfig = createToolReflexionConfig('suggest_adrs', {
              reflectionDepth: 'detailed',
              evaluationCriteria: ['task-success', 'relevance', 'clarity'],
              learningRate: 0.7,
            });

            const reflexionResult = await executeWithReflexion(
              {
                prompt: implicitResult.analysisPrompt,
                instructions: implicitResult.instructions,
                context: {
                  projectPath,
                  analysisType: 'comprehensive',
                  existingAdrs,
                  knowledgeEnhanced: knowledgeEnhancement,
                  learningEnabled: true,
                },
              },
              reflexionConfig
            );

            enhancedPrompt = `
## Enhanced Analysis with Learning

${reflexionResult.prompt}

---
`;
          } catch (error) {
            console.error('[WARNING] Reflexion execution failed:', error);
            enhancedPrompt = implicitResult.analysisPrompt;
          }
        } else {
          enhancedPrompt = implicitResult.analysisPrompt;
        }

        // CE-MCP directive (#1647): the server no longer calls an LLM itself. It
        // deterministically assembles the research/knowledge/learning context and the
        // analysis prompt, and returns them as a directive for the calling agent to act
        // on. No server-side LLM round-trip.
        return {
          content: [
            {
              type: 'text',
              text: `# ADR Suggestions: Enhanced Comprehensive Analysis (Research-Driven)

This analysis assembles research-driven context and a structured analysis directive for the calling agent to execute. Content is generated deterministically — no server-side LLM call.

## Enhancement Features
- **Research-Driven Analysis**: ✅ Enabled (Static infrastructure context)
- **Knowledge Generation**: ${knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **Reflexion Learning**: ${learningEnabled ? '✅ Enabled' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}
- **Smart Code Linking**: ${existingAdrs && existingAdrs.length > 0 ? '✅ Enabled' : '❌ No existing ADRs'}

## Project Analysis
- **Project Path**: ${projectPath}
- **Existing ADRs**: ${existingAdrs?.length || 0} ADRs provided
- **Analysis Type**: Comprehensive (Research-driven + Enhanced prompting)

${researchContext}

${codeContext}

${knowledgeContext}

${reflexionContext}

## Analysis Instructions

${implicitResult.instructions}

## Enhanced Analysis Directive

${enhancedPrompt}

## Recommended Workflow

### 1. **Initial Analysis**
Act on the directive above to get comprehensive decision detection

### 2. **Priority Review**
- Focus on **high** and **critical** priority decisions first
- Consider **risk level** and **complexity** for planning
- Group related decisions using suggested clusters

### 3. **ADR Generation**
Use \`generate_adr_from_decision\` tool for each prioritized decision

### 4. **Integration**
- Save generated ADRs to your ADR directory
- Update ADR index/catalog
- Schedule team review sessions
- Plan implementation tasks
`,
            },
          ],
        };
      }

      default:
        throw new McpAdrError(`Unknown analysis type: ${analysisType}`, 'INVALID_INPUT');
    }
  } catch (error) {
    throw new McpAdrError(
      `Failed to suggest ADRs: ${error instanceof Error ? error.message : String(error)}`,
      'SUGGESTION_ERROR'
    );
  }
}

/**
 * Generate ADR from decision data
 */
export async function generateAdrFromDecision(args: {
  decisionData: {
    title: string;
    context: string;
    decision: string;
    consequences: string;
    alternatives?: string[];
    evidence?: string[];
  };
  templateFormat?: 'nygard' | 'madr' | 'custom';
  existingAdrs?: string[];
  adrDirectory?: string;
  autoSave?: boolean;
  projectPath?: string;
}): Promise<any> {
  const {
    decisionData,
    templateFormat = 'madr', // ADR-022: MADR is the default emitted format
    existingAdrs = [],
    adrDirectory = 'docs/adrs',
    autoSave = true,
    projectPath = process.cwd(),
  } = args;

  try {
    const { generateNextAdrNumber, suggestAdrFilename } =
      await import('../utils/adr-suggestions.js');

    if (
      !decisionData.title ||
      !decisionData.context ||
      !decisionData.decision ||
      !decisionData.consequences
    ) {
      throw new McpAdrError(
        'Decision data must include title, context, decision, and consequences',
        'INVALID_INPUT'
      );
    }

    // Generate suggested metadata
    const adrNumber = generateNextAdrNumber(existingAdrs);
    const filename = suggestAdrFilename(decisionData.title, adrNumber);
    const fullPath = `${adrDirectory}/${filename}`;

    // Deterministically emit the ADR content as a canonical ADR-022 MADR document
    // (#1647 CE-MCP migration — no server-side LLM call). The emitted content contains
    // `# <title>` and the MADR heading set built from the decision fields.
    const adrContent = buildMadrDocument({
      title: decisionData.title,
      status: 'proposed',
      context: decisionData.context,
      decision: decisionData.decision,
      consequences: decisionData.consequences,
    });

    let releaseSection = '';
    let saved = false;
    let indexed = false;

    // Auto-save path: write the real deterministic content, register in the knowledge
    // graph, and preview release linkage. Any failure falls through to the
    // manual-instructions output below without throwing.
    if (autoSave) {
      try {
        const { writeFile } = await import('../utils/file-system.js');
        const writeResult = await writeFile(fullPath, adrContent);
        if (writeResult.success) {
          saved = true;

          // Register in knowledge graph (best-effort)
          try {
            const { KnowledgeGraphManager } = await import('../utils/knowledge-graph-manager.js');
            const kg = new KnowledgeGraphManager();
            await kg.registerAdr({
              adrNumber,
              filename,
              path: fullPath,
              title: decisionData.title,
              status: 'accepted',
              createdAt: new Date().toISOString(),
            });
            indexed = true;
          } catch {
            // KG registration is best-effort; do not block user on failure
          }

          // Preview next release linkage (best-effort)
          try {
            const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
            const { detectReleases, previewNextRelease } =
              await import('../utils/release-tracker.js');
            const discovered = await discoverAdrsInDirectory(adrDirectory, projectPath, {
              includeContent: false,
              includeTimeline: false,
            });
            const releases = await detectReleases(projectPath);
            const preview = await previewNextRelease(projectPath, discovered.adrs, releases);
            const queued = preview.pendingAdrs.some(a => a.filename === filename);
            releaseSection = `## 🔗 Release Linkage

- **Next release (predicted bump)**: ${preview.suggestedVersion}
- **Queued for next release**: ${queued ? 'yes' : 'no (ADR not yet discoverable — check status is "accepted")'}
- **Pending ADRs total**: ${preview.pendingAdrs.length}
- **Unreleased commits**: ${preview.unreleaseCommits.length}

Run \`release_tracking\` with \`next_release_preview\` for full details.
`;
          } catch {
            releaseSection = '';
          }

          const savedSection = `## ✅ File Saved

- **Saved to**: \`${writeResult.filePath}\`
- **Size**: ${writeResult.metadata?.size ?? 0} bytes
- **Knowledge graph**: ${indexed ? 'registered' : 'registration skipped (non-fatal)'}
`;

          return {
            content: [
              {
                type: 'text',
                text: `# Generated ADR: ${decisionData.title}

## ADR Metadata
- **ADR Number**: ${adrNumber}
- **Filename**: ${filename}
- **Full Path**: ${fullPath}
- **Template Format**: ${templateFormat.toUpperCase()}
- **Auto-saved**: ${saved ? 'yes' : 'no'}
- **Indexed in knowledge graph**: ${indexed ? 'yes' : 'no'}

## Generated ADR Content

${adrContent}

${savedSection}

${releaseSection}

## Next Steps

1. **Review the saved ADR** at \`${fullPath}\`
2. **Share with stakeholders** for review and approval
3. **Plan implementation** of the architectural decision
4. **Run \`release_tracking next_release_preview\`** to confirm the ADR is queued for the next release

## Quality Checklist

- ✅ **Title** is clear and descriptive
- ✅ **Context** explains the problem and constraints
- ✅ **Decision** is specific and actionable
- ✅ **Consequences** cover both positive and negative impacts
- ✅ **Format** follows ${templateFormat.toUpperCase()} template standards
- ✅ **Numbering** is sequential (${adrNumber})
`,
              },
            ],
          };
        }
      } catch {
        // Fallback to manual-instructions output — do not throw
      }
    }

    // Manual-instructions output: autoSave disabled, or the write failed. No file I/O is
    // performed here (the directory is NOT created), and nothing is registered.
    return {
      content: [
        {
          type: 'text',
          text: `# ADR Generation: ${decisionData.title}

## ADR Metadata
- **ADR Number**: ${adrNumber}
- **Filename**: ${filename}
- **Full Path**: ${fullPath}
- **Template Format**: ${templateFormat.toUpperCase()}
- **Auto-saved**: ${saved ? 'yes' : 'no'}

## Generated ADR Content

${adrContent}

## File Creation Instructions

To save this ADR to your project:

1. **Create the ADR directory** (if it doesn't exist):
   \`\`\`bash
   mkdir -p ${adrDirectory}
   \`\`\`

2. **Save the ADR content** above to the file:
   \`\`\`bash
   cat > "${fullPath}" << 'EOF'
   <paste the Generated ADR Content above>
   EOF
   \`\`\`

3. **Verify the file** was created successfully:
   \`\`\`bash
   ls -la "${fullPath}"
   \`\`\`

## Next Steps

1. **Review the generated ADR** for accuracy and completeness
2. **Save the file** using the instructions above
3. **Update your ADR index** or catalog
4. **Share with stakeholders** for review and approval
5. **Plan implementation** of the architectural decision
`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate ADR: ${error instanceof Error ? error.message : String(error)}`,
      'GENERATION_ERROR'
    );
  }
}

/**
 * Discover existing ADRs in the project using internal file system tools
 *
 * IMPORTANT FOR AI ASSISTANTS: This tool performs TWO critical functions:
 * 1. PRIMARY: Scans the specified ADR directory and catalogs all existing ADRs
 * 2. SECONDARY: ALWAYS initializes the complete .mcp-adr-cache infrastructure
 *
 * The cache initialization happens REGARDLESS of whether ADRs are found, making
 * this the recommended FIRST STEP for any project workflow. All other MCP tools
 * depend on this cache infrastructure to function properly.
 *
 * Cache files created:
 * - .mcp-adr-cache/todo-data.json (TODO management backend)
 * - .mcp-adr-cache/project-health-scores.json (project health metrics)
 * - .mcp-adr-cache/knowledge-graph-snapshots.json (architectural knowledge)
 * - .mcp-adr-cache/todo-sync-state.json (synchronization state)
 *
 * Therefore, always run this tool first, even for projects without existing ADRs.
 */
export async function discoverExistingAdrs(args: {
  adrDirectory?: string;
  includeContent?: boolean;
  projectPath?: string;
}): Promise<any> {
  const { adrDirectory = 'docs/adrs', includeContent = false, projectPath = process.cwd() } = args;

  try {
    // INITIALIZE COMPLETE CACHE INFRASTRUCTURE (since this is typically the first command)
    // NOTE: All console output goes to stderr to preserve stdout for MCP JSON-RPC
    console.error('[ADR-Suggestion] Initializing complete cache infrastructure...');

    // 1. TodoJsonManager removed - use mcp-shrimp-task-manager for task management
    console.error(
      '[ADR-Suggestion] TodoJsonManager is deprecated and was removed in memory-centric transformation'
    );
    // Skip todo initialization - TodoJsonManager removed
    console.error('[ADR-Suggestion] Initialized todo-data.json and cache directory');

    // 2. ProjectHealthScoring removed - use relationship-based importance instead
    console.error(
      '[ADR-Suggestion] ProjectHealthScoring is deprecated and was removed in memory-centric transformation'
    );
    // Skip health scoring initialization - ProjectHealthScoring removed
    console.error('[ADR-Suggestion] Initialized project-health-scores.json');

    // 3. Initialize KnowledgeGraphManager (creates knowledge-graph-snapshots.json and todo-sync-state.json)
    // Set PROJECT_PATH temporarily for proper initialization
    const originalConfig = process.env['PROJECT_PATH'];
    process.env['PROJECT_PATH'] = projectPath;

    const { KnowledgeGraphManager } = await import('../utils/knowledge-graph-manager.js');
    const kgManager = new KnowledgeGraphManager();
    await kgManager.loadKnowledgeGraph(); // Creates knowledge-graph-snapshots.json and todo-sync-state.json
    console.error(
      '[ADR-Suggestion] Initialized knowledge-graph-snapshots.json and todo-sync-state.json'
    );

    // Restore original config
    if (originalConfig !== undefined) {
      process.env['PROJECT_PATH'] = originalConfig;
    } else {
      delete process.env['PROJECT_PATH'];
    }

    console.error('[ADR-Suggestion] Complete cache infrastructure ready!');

    // Use the new ADR discovery utility
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');

    const discoveryResult = await discoverAdrsInDirectory(adrDirectory, projectPath, {
      includeContent,
      includeTimeline: false,
    });

    // Format the results for MCP response
    return {
      content: [
        {
          type: 'text',
          text: `# 🎯 Complete ADR Discovery & Cache Infrastructure Initialized

## Cache Infrastructure Status
✅ **todo-data.json** - JSON-first TODO system initialized  
✅ **project-health-scores.json** - Multi-component project health scoring  
✅ **knowledge-graph-snapshots.json** - Knowledge graph system & intent tracking  
✅ **todo-sync-state.json** - TODO synchronization state  
✅ **Cache Directory** - Complete infrastructure ready at \`.mcp-adr-cache/\`

## ADR Discovery Results

### Discovery Summary
- **Directory**: ${discoveryResult.directory}
- **Total ADRs Found**: ${discoveryResult.totalAdrs}
- **Include Content**: ${includeContent ? 'Yes' : 'No (metadata only)'}

## Discovered ADRs

${
  discoveryResult.adrs.length > 0
    ? discoveryResult.adrs
        .map(
          adr => `
### ${adr.title}
- **File**: ${adr.filename}
- **Status**: ${adr.status}
- **Date**: ${adr.date || 'Not specified'}
- **Path**: ${adr.path}
${adr.metadata?.number ? `- **Number**: ${adr.metadata.number}` : ''}
${adr.metadata?.category ? `- **Category**: ${adr.metadata.category}` : ''}
${adr.metadata?.tags?.length ? `- **Tags**: ${adr.metadata.tags.join(', ')}` : ''}
${
  includeContent && adr.content
    ? `

#### Content Preview
\`\`\`markdown
${adr.content.slice(0, 500)}${adr.content.length > 500 ? '...' : ''}
\`\`\`
`
    : ''
}
`
        )
        .join('\n')
    : 'No ADRs found in the specified directory.'
}

## Summary Statistics

### By Status
${
  Object.entries(discoveryResult.summary.byStatus)
    .map(([status, count]) => `- **${status}**: ${count}`)
    .join('\n') || 'No status information available'
}

### By Category
${
  Object.entries(discoveryResult.summary.byCategory)
    .map(([category, count]) => `- **${category}**: ${count}`)
    .join('\n') || 'No category information available'
}

## Recommendations

${discoveryResult.recommendations.map(rec => `- ${rec}`).join('\n')}

## Next Steps

Based on the discovered ADRs, you can:

1. **Analyze for Missing Decisions**: Use the \`suggest_adrs\` tool with the discovered ADR titles
2. **Generate Implementation TODOs**: Use the \`generate_adr_todo\` tool
3. **Create New ADRs**: Use the \`generate_adr_from_decision\` tool for new decisions

### Example Commands

To suggest new ADRs based on discovered ones:
\`\`\`json
{
  "tool": "suggest_adrs",
  "args": {
    "existingAdrs": ${JSON.stringify(discoveryResult.adrs.map(adr => adr.title))},
    "analysisType": "comprehensive"
  }
}
\`\`\`

To generate a todo list from discovered ADRs:
\`\`\`json
{
  "tool": "generate_adr_todo",
  "args": {
    "adrDirectory": "${adrDirectory}",
    "scope": "all"
  }
}
\`\`\`

## Raw Discovery Data

For programmatic use, the raw discovery data is:

\`\`\`json
${JSON.stringify(discoveryResult, null, 2)}
\`\`\`
`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to discover ADRs: ${error instanceof Error ? error.message : String(error)}`,
      'DISCOVERY_ERROR'
    );
  }
}

/**
 * Perform tree-sitter analysis for code change architectural impact
 */
async function performTreeSitterCodeChangeAnalysis(
  beforeCode: string,
  afterCode: string,
  _changeDescription: string
): Promise<{
  architecturalChanges: Array<{
    type: string;
    description: string;
    impact: string;
  }>;
  securityImpacts: Array<{
    type: string;
    description: string;
    severity: string;
  }>;
  complexityDelta: number;
  newDependencies: Array<{
    name: string;
    reason: string;
    riskLevel: string;
  }>;
}> {
  const analyzer = new TreeSitterAnalyzer();
  const { writeFileSync, unlinkSync } = await import('fs');
  const { join } = await import('path');
  const { tmpdir } = await import('os');

  const results = {
    architecturalChanges: [] as any[],
    securityImpacts: [] as any[],
    complexityDelta: 0,
    newDependencies: [] as any[],
  };

  try {
    // Determine file extension based on content patterns
    let extension = '.txt';
    if (
      beforeCode.includes('import ') ||
      beforeCode.includes('export ') ||
      beforeCode.includes('function ')
    ) {
      extension =
        beforeCode.includes('interface ') || beforeCode.includes(': string') ? '.ts' : '.js';
    } else if (beforeCode.includes('def ') || beforeCode.includes('import ')) {
      extension = '.py';
    }

    // Create temporary files for analysis
    const beforeFile = join(tmpdir(), `before-analysis-${Date.now()}${extension}`);
    const afterFile = join(tmpdir(), `after-analysis-${Date.now()}${extension}`);

    writeFileSync(beforeFile, beforeCode);
    writeFileSync(afterFile, afterCode);

    try {
      // Analyze both versions
      const beforeAnalysis = await analyzer.analyzeFile(beforeFile);
      const afterAnalysis = await analyzer.analyzeFile(afterFile);

      // Compare complexity
      const beforeComplexity =
        beforeAnalysis.functions?.reduce((sum, func) => sum + func.complexity, 0) || 0;
      const afterComplexity =
        afterAnalysis.functions?.reduce((sum, func) => sum + func.complexity, 0) || 0;
      results.complexityDelta = afterComplexity - beforeComplexity;

      // Detect new dependencies
      const beforeImports = new Set(beforeAnalysis.imports?.map(imp => imp.module) || []);
      const afterImports = afterAnalysis.imports?.map(imp => imp.module) || [];

      for (const imp of afterImports) {
        if (!beforeImports.has(imp)) {
          const riskLevel =
            imp.includes('eval') || imp.includes('exec') || imp.includes('shell')
              ? 'high'
              : imp.includes('crypto') || imp.includes('auth')
                ? 'medium'
                : 'low';

          results.newDependencies.push({
            name: imp,
            reason: `New dependency introduced in code change`,
            riskLevel,
          });
        }
      }

      // Detect architectural changes
      const beforeFunctions = beforeAnalysis.functions?.map(f => f.name) || [];
      const afterFunctions = afterAnalysis.functions?.map(f => f.name) || [];

      // New functions
      for (const funcName of afterFunctions) {
        if (!beforeFunctions.includes(funcName)) {
          const funcType = funcName.toLowerCase().includes('controller')
            ? 'controller'
            : funcName.toLowerCase().includes('service')
              ? 'service'
              : funcName.toLowerCase().includes('repository')
                ? 'repository'
                : 'function';

          results.architecturalChanges.push({
            type: 'new_component',
            description: `New ${funcType}: ${funcName}`,
            impact: funcType === 'controller' ? 'high' : funcType === 'service' ? 'medium' : 'low',
          });
        }
      }

      // Security impact analysis
      const beforeSecrets = beforeAnalysis.secrets?.length || 0;
      const afterSecrets = afterAnalysis.secrets?.length || 0;

      if (afterSecrets > beforeSecrets) {
        results.securityImpacts.push({
          type: 'secret_introduction',
          description: `${afterSecrets - beforeSecrets} new secrets detected in code`,
          severity: 'high',
        });
      }

      // Check for security issues
      if (afterAnalysis.securityIssues && afterAnalysis.securityIssues.length > 0) {
        for (const issue of afterAnalysis.securityIssues) {
          results.securityImpacts.push({
            type: issue.type,
            description: issue.message,
            severity: issue.severity,
          });
        }
      }
    } finally {
      // Clean up temp files
      try {
        unlinkSync(beforeFile);
        unlinkSync(afterFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  } catch (error) {
    console.warn('Tree-sitter code change analysis failed:', error);
  }

  return results;
}
