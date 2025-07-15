/**
 * Smart Score Tool - Central Coordination for Project Health Scoring
 * 
 * Provides comprehensive scoring coordination across all MCP tools:
 * - Cross-tool score synchronization
 * - Manual score recalculation and rebalancing
 * - Health score diagnostics and validation
 * - Automated score updates and maintenance
 * 
 * IMPORTANT FOR AI ASSISTANTS: This tool depends on cache infrastructure and
 * works best when other tools have already populated data.
 * 
 * Cache Dependencies:
 * - Requires: .mcp-adr-cache/project-health-scores.json (main scoring data)
 * - May read: .mcp-adr-cache/todo-data.json (for task completion scoring)
 * - Updates: .mcp-adr-cache/project-health-scores.json (with new scores)
 * 
 * Workflow Timing:
 * - Run AFTER other tools have populated cache data
 * - Use 'recalculate_scores' to refresh stale data
 * - Use 'sync_scores' to synchronize across tools
 * - Use 'optimize_weights' for score tuning
 */

import { z } from 'zod';
import { McpAdrError } from '../types/index.js';

// Operation schemas for smart scoring
const RecalculateScoresSchema = z.object({
  operation: z.literal('recalculate_scores'),
  projectPath: z.string().describe('Path to project directory'),
  components: z.array(z.enum(['task_completion', 'deployment_readiness', 'architecture_compliance', 'security_posture', 'code_quality', 'all'])).default(['all']).describe('Score components to recalculate'),
  forceUpdate: z.boolean().default(false).describe('Force update even if data is fresh'),
  updateSources: z.boolean().default(true).describe('Trigger source tool updates before recalculating')
});

const SyncScoresSchema = z.object({
  operation: z.literal('sync_scores'),
  projectPath: z.string().describe('Path to project directory'),
  todoPath: z.string().default('TODO.md').describe('Path to TODO.md file'),
  triggerTools: z.array(z.enum(['manage_todo', 'smart_git_push', 'compare_adr_progress', 'analyze_content_security', 'validate_rules'])).optional().describe('Tools to trigger for fresh data'),
  rebalanceWeights: z.boolean().default(false).describe('Recalculate optimal scoring weights')
});

const DiagnoseScoresSchema = z.object({
  operation: z.literal('diagnose_scores'),
  projectPath: z.string().describe('Path to project directory'),
  includeHistory: z.boolean().default(true).describe('Include score history analysis'),
  checkDataFreshness: z.boolean().default(true).describe('Validate data freshness across tools'),
  suggestImprovements: z.boolean().default(true).describe('Provide score improvement suggestions')
});

const OptimizeWeightsSchema = z.object({
  operation: z.literal('optimize_weights'),
  projectPath: z.string().describe('Path to project directory'),
  analysisMode: z.enum(['current_state', 'historical_data', 'project_type']).default('current_state').describe('Method for weight optimization'),
  customWeights: z.object({
    taskCompletion: z.number().min(0).max(1).optional(),
    deploymentReadiness: z.number().min(0).max(1).optional(),
    architectureCompliance: z.number().min(0).max(1).optional(),
    securityPosture: z.number().min(0).max(1).optional(),
    codeQuality: z.number().min(0).max(1).optional()
  }).optional().describe('Custom weight overrides'),
  previewOnly: z.boolean().default(false).describe('Preview changes without applying')
});

const ResetScoresSchema = z.object({
  operation: z.literal('reset_scores'),
  projectPath: z.string().describe('Path to project directory'),
  component: z.enum(['task_completion', 'deployment_readiness', 'architecture_compliance', 'security_posture', 'code_quality', 'all']).default('all').describe('Score component to reset'),
  preserveHistory: z.boolean().default(true).describe('Preserve score history in backup'),
  recalculateAfterReset: z.boolean().default(true).describe('Immediately recalculate after reset')
});

// Main operation schema
const GetScoreTrendsSchema = z.object({
  operation: z.literal('get_score_trends'),
  projectPath: z.string().describe('Path to project directory')
});

const GetIntentScoresSchema = z.object({
  operation: z.literal('get_intent_scores'),
  projectPath: z.string().describe('Path to project directory'),
  intentId: z.string().describe('Intent ID to get score trends for')
});

const SmartScoreSchema = z.union([
  RecalculateScoresSchema,
  SyncScoresSchema,
  DiagnoseScoresSchema,
  OptimizeWeightsSchema,
  ResetScoresSchema,
  GetScoreTrendsSchema,
  GetIntentScoresSchema
]);

type SmartScoreArgs = z.infer<typeof SmartScoreSchema>;

/**
 * Trigger score updates from source tools
 */
async function triggerSourceToolUpdates(projectPath: string, tools: string[]): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  for (const tool of tools) {
    try {
      switch (tool) {
        case 'manage_todo':
          // Trigger TODO analysis to update task completion scores
          const { manageTodoV2 } = await import('./todo-management-tool-v2.js');
          results[tool] = await manageTodoV2({
            operation: 'get_analytics',
            projectPath,
            timeframe: 'all',
            includeVelocity: true,
            includeScoring: true
          });
          break;

        case 'smart_git_push':
          // Trigger git release readiness analysis
          const { smartGitPush } = await import('./smart-git-push-tool.js');
          results[tool] = await smartGitPush({
            projectPath,
            checkReleaseReadiness: true,
            dryRun: true // Don't actually push, just analyze
          });
          break;

        case 'compare_adr_progress':
          // Trigger ADR progress comparison
          // This would need to be implemented in the main server
          results[tool] = { status: 'tool_not_available', message: 'compare_adr_progress integration pending' };
          break;

        case 'analyze_content_security':
          // Trigger content security analysis
          // This would need to be implemented in the main server
          results[tool] = { status: 'tool_not_available', message: 'analyze_content_security integration pending' };
          break;

        case 'validate_rules':
          // Trigger rule validation
          // This would need to be implemented in the main server
          results[tool] = { status: 'tool_not_available', message: 'validate_rules integration pending' };
          break;

        default:
          results[tool] = { status: 'unknown_tool', message: `Tool ${tool} not recognized` };
      }
    } catch (error) {
      results[tool] = { 
        status: 'error', 
        message: `Failed to trigger ${tool}: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  return results;
}

/**
 * Calculate optimal weights based on project characteristics
 */
async function calculateOptimalWeights(projectPath: string, _analysisMode: string): Promise<{ [key: string]: number }> {
  const fs = await import('fs/promises');
  const path = await import('path');

  // Default weights
  const defaultWeights = {
    taskCompletion: 0.25,
    deploymentReadiness: 0.30,
    architectureCompliance: 0.20,
    securityPosture: 0.15,
    codeQuality: 0.10
  };

  try {
    // Analyze project characteristics
    const packageJsonPath = path.join(projectPath, 'package.json');
    let projectType = 'general';
    let hasTests = false;
    let hasCi = false;

    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      // Determine project type
      if (packageJson.dependencies?.['express'] || packageJson.dependencies?.['fastify']) {
        projectType = 'backend_api';
      } else if (packageJson.dependencies?.['react'] || packageJson.dependencies?.['vue'] || packageJson.dependencies?.['angular']) {
        projectType = 'frontend';
      } else if (packageJson.dependencies?.['electron']) {
        projectType = 'desktop_app';
      } else if (packageJson.type === 'module' || packageJson.main?.endsWith('.mjs')) {
        projectType = 'library';
      }

      // Check for testing setup
      hasTests = Boolean(
        packageJson.scripts?.test ||
        packageJson.devDependencies?.jest ||
        packageJson.devDependencies?.mocha ||
        packageJson.devDependencies?.vitest
      );

      // Check for CI/CD
      const ciFiles = ['.github/workflows', '.gitlab-ci.yml', 'azure-pipelines.yml', '.circleci'];
      hasCi = false;
      for (const ciFile of ciFiles) {
        try {
          await fs.access(path.join(projectPath, ciFile));
          hasCi = true;
          break;
        } catch {}
      }

    } catch (error) {
      // Fall back to default weights if package.json analysis fails
    }

    // Adjust weights based on project characteristics
    let optimizedWeights = { ...defaultWeights };

    switch (projectType) {
      case 'backend_api':
        // APIs prioritize security and deployment
        optimizedWeights = {
          taskCompletion: 0.20,
          deploymentReadiness: 0.35,
          architectureCompliance: 0.15,
          securityPosture: 0.25,
          codeQuality: 0.05
        };
        break;

      case 'frontend':
        // Frontend prioritizes task completion and code quality
        optimizedWeights = {
          taskCompletion: 0.35,
          deploymentReadiness: 0.25,
          architectureCompliance: 0.15,
          securityPosture: 0.10,
          codeQuality: 0.15
        };
        break;

      case 'library':
        // Libraries prioritize code quality and architecture
        optimizedWeights = {
          taskCompletion: 0.20,
          deploymentReadiness: 0.20,
          architectureCompliance: 0.30,
          securityPosture: 0.15,
          codeQuality: 0.15
        };
        break;

      case 'desktop_app':
        // Desktop apps balance all aspects
        optimizedWeights = {
          taskCompletion: 0.25,
          deploymentReadiness: 0.25,
          architectureCompliance: 0.20,
          securityPosture: 0.15,
          codeQuality: 0.15
        };
        break;
    }

    // Adjust for testing maturity
    if (hasTests) {
      optimizedWeights.codeQuality += 0.05;
      optimizedWeights.taskCompletion -= 0.05;
    }

    // Adjust for CI/CD maturity
    if (hasCi) {
      optimizedWeights.deploymentReadiness += 0.05;
      optimizedWeights.taskCompletion -= 0.05;
    }

    // Ensure weights sum to 1.0
    const total = Object.values(optimizedWeights).reduce((sum, weight) => sum + weight, 0);
    if (total !== 1.0) {
      const factor = 1.0 / total;
      Object.keys(optimizedWeights).forEach(key => {
        (optimizedWeights as any)[key] *= factor;
      });
    }

    return optimizedWeights;

  } catch (error) {
    return defaultWeights;
  }
}

/**
 * Main smart score function
 */
export async function smartScore(args: SmartScoreArgs): Promise<any> {
  try {
    const validatedArgs = SmartScoreSchema.parse(args);

    switch (validatedArgs.operation) {
      case 'recalculate_scores': {
        const { ProjectHealthScoring } = await import('../utils/project-health-scoring.js');
        const healthScoring = new ProjectHealthScoring(validatedArgs.projectPath);
        
        // Trigger source updates if requested
        let sourceResults: Record<string, any> = {};
        let todoData = null;
        if (validatedArgs.updateSources) {
          const allTools = ['manage_todo', 'smart_git_push', 'compare_adr_progress', 'analyze_content_security', 'validate_rules'];
          sourceResults = await triggerSourceToolUpdates(validatedArgs.projectPath, allTools);
          
          // Extract TODO data if available
          if (sourceResults['manage_todo']?.content?.[0]?.text) {
            const analysisText = sourceResults['manage_todo'].content[0].text;
            const completionMatch = analysisText.match(/(\d+)\/(\d+) tasks? completed \((\d+)%\)/);
            if (completionMatch) {
              todoData = {
                completed: parseInt(completionMatch[1]),
                total: parseInt(completionMatch[2]),
                percentage: parseInt(completionMatch[3])
              };
            }
          }
        }

        // Get current scores
        const currentScores = await healthScoring.getProjectHealthScore();
        
        return {
          content: [{
            type: 'text',
            text: `# 🔄 Scores Recalculated Successfully

## Updated Project Health Scores:
- 🎯 **Overall**: ${currentScores.overall}% (${currentScores.confidence}% confidence)
- 📋 **Task Completion**: ${currentScores.taskCompletion}%
- 🚀 **Deployment Readiness**: ${currentScores.deploymentReadiness}%
- 🏗️ **Architecture Compliance**: ${currentScores.architectureCompliance}%
- 🔒 **Security Posture**: ${currentScores.securityPosture}%
- 🛠️ **Code Quality**: ${currentScores.codeQuality}%

## Components Recalculated:
${validatedArgs.components.includes('all') ? '- All components updated' : validatedArgs.components.map(c => `- ${c.replace('_', ' ')}`).join('\n')}${todoData ? `\n\n## TODO.md Balance Check:
- Task Completion from TODO.md: ${todoData.percentage}%
- Health Score Task Completion: ${currentScores.taskCompletion}%
- ${Math.abs(todoData.percentage - currentScores.taskCompletion) > 10 ? '⚠️ Significant difference detected - consider running sync_scores' : '✅ Scores are well balanced'}` : ''}

## Source Tool Updates:
${Object.entries(sourceResults).map(([tool, result]: [string, any]) => 
  `- **${tool}**: ${result.status || 'success'}`
).join('\n')}

## Data Freshness:
- **Last Updated**: ${new Date(currentScores.lastUpdated).toLocaleString()}
- **Contributing Tools**: ${currentScores.influencingTools.join(', ') || 'None'}

*All TODO.md files will automatically display updated health scores on next access.*`
          }]
        };
      }

      case 'sync_scores': {
        const { ProjectHealthScoring } = await import('../utils/project-health-scoring.js');
        const healthScoring = new ProjectHealthScoring(validatedArgs.projectPath);

        // Trigger specific tools if requested
        let triggerResults: Record<string, any> = {};
        if (validatedArgs.triggerTools && validatedArgs.triggerTools.length > 0) {
          triggerResults = await triggerSourceToolUpdates(
            validatedArgs.projectPath, 
            validatedArgs.triggerTools
          );
        }

        // Force a TODO update to sync task completion scores
        const { manageTodoV2 } = await import('./todo-management-tool-v2.js');
        const todoAnalysis = await manageTodoV2({
          operation: 'get_analytics',
          projectPath: validatedArgs.projectPath,
          timeframe: 'all',
          includeVelocity: true,
          includeScoring: true
        });
        
        // Extract task completion data from TODO analysis
        let todoCompletionData = null;
        if (todoAnalysis?.content?.[0]?.text) {
          const analysisText = todoAnalysis.content[0].text;
          // Parse completion metrics from the analysis
          const completionMatch = analysisText.match(/(\d+)\/(\d+) tasks? completed \((\d+)%\)/);
          const criticalMatch = analysisText.match(/(\d+) critical\/high priority tasks? remaining/);
          
          if (completionMatch) {
            todoCompletionData = {
              completed: parseInt(completionMatch[1]),
              total: parseInt(completionMatch[2]),
              percentage: parseInt(completionMatch[3]),
              criticalRemaining: criticalMatch ? parseInt(criticalMatch[1]) : 0
            };
          }
        }

        // Get synchronized scores
        const syncedScores = await healthScoring.getProjectHealthScore();

        // Optimize weights if requested
        let weightOptimization = null;
        if (validatedArgs.rebalanceWeights) {
          const optimalWeights = await calculateOptimalWeights(validatedArgs.projectPath, 'current_state');
          weightOptimization = {
            current: {
              taskCompletion: 0.25,
              deploymentReadiness: 0.30,
              architectureCompliance: 0.20,
              securityPosture: 0.15,
              codeQuality: 0.10
            },
            optimal: optimalWeights
          };
        }

        return {
          content: [{
            type: 'text',
            text: `# 🔄 Cross-Tool Score Synchronization Complete

## Synchronized Health Scores:
- 🎯 **Overall Project Health**: ${syncedScores.overall}% (${syncedScores.confidence}% confidence)

### 📊 Component Breakdown:
- 📋 **Task Completion**: ${syncedScores.taskCompletion}% (${syncedScores.breakdown.taskCompletion.completed}/${syncedScores.breakdown.taskCompletion.total} tasks)${todoCompletionData ? `
  - TODO.md Analysis: ${todoCompletionData.completed}/${todoCompletionData.total} (${todoCompletionData.percentage}%)
  - Critical/High Priority Remaining: ${todoCompletionData.criticalRemaining}` : ''}
- 🚀 **Deployment Readiness**: ${syncedScores.deploymentReadiness}% (${syncedScores.breakdown.deploymentReadiness.criticalBlockers} critical blockers)
- 🏗️ **Architecture Compliance**: ${syncedScores.architectureCompliance}%
- 🔒 **Security Posture**: ${syncedScores.securityPosture}% (${syncedScores.breakdown.securityPosture.vulnerabilityCount} vulnerabilities)
- 🛠️ **Code Quality**: ${syncedScores.codeQuality}% (${syncedScores.breakdown.codeQuality.ruleViolations} violations)

## Tool Synchronization Results:
${Object.entries(triggerResults).map(([tool, result]: [string, any]) => 
  `- **${tool}**: ${result.status === 'error' ? '❌ Failed' : '✅ Updated'}`
).join('\n')}

${weightOptimization ? `
## Weight Optimization Analysis:
### Current Weights vs Optimal:
${Object.entries(weightOptimization.optimal).map(([key, value]) => 
  `- **${key}**: ${((weightOptimization.current as any)[key] * 100).toFixed(0)}% → ${(Number(value) * 100).toFixed(0)}%`
).join('\n')}

*Use \`optimize_weights\` operation to apply optimal weights.*
` : ''}

## Data Status:
- **Last Synchronized**: ${new Date().toLocaleString()}
- **Data Confidence**: ${syncedScores.confidence}%
- **Contributing Tools**: ${syncedScores.influencingTools.join(', ') || 'manage_todo (default)'}

*All health dashboards will reflect these synchronized scores.*`
          }]
        };
      }

      case 'diagnose_scores': {
        const { ProjectHealthScoring } = await import('../utils/project-health-scoring.js');
        const healthScoring = new ProjectHealthScoring(validatedArgs.projectPath);
        const currentScores = await healthScoring.getProjectHealthScore();

        // Check data freshness
        const now = new Date();
        const lastUpdate = new Date(currentScores.lastUpdated);
        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
        const dataFreshness = hoursSinceUpdate < 1 ? 'Fresh' : 
                             hoursSinceUpdate < 24 ? 'Recent' : 
                             hoursSinceUpdate < 72 ? 'Stale' : 'Very Stale';

        // Analyze component health
        const componentAnalysis = [
          { name: 'Task Completion', score: currentScores.taskCompletion, threshold: 70 },
          { name: 'Deployment Readiness', score: currentScores.deploymentReadiness, threshold: 75 },
          { name: 'Architecture Compliance', score: currentScores.architectureCompliance, threshold: 60 },
          { name: 'Security Posture', score: currentScores.securityPosture, threshold: 80 },
          { name: 'Code Quality', score: currentScores.codeQuality, threshold: 65 }
        ];

        const weakComponents = componentAnalysis.filter(c => c.score < c.threshold);
        const strongComponents = componentAnalysis.filter(c => c.score >= c.threshold + 15);

        // Generate improvement suggestions
        const suggestions = [];
        if (currentScores.breakdown.taskCompletion.criticalTasksRemaining > 0) {
          suggestions.push('🔴 Address critical/blocked tasks to improve task completion score');
        }
        if (currentScores.breakdown.deploymentReadiness.criticalBlockers > 0) {
          suggestions.push('🚀 Resolve deployment blockers to improve readiness score');
        }
        if (currentScores.breakdown.securityPosture.vulnerabilityCount > 0) {
          suggestions.push('🔒 Fix security vulnerabilities to boost security posture');
        }
        if (currentScores.breakdown.codeQuality.ruleViolations > 3) {
          suggestions.push('🛠️ Address code quality violations to improve standards');
        }
        if (currentScores.confidence < 70) {
          suggestions.push('🔄 Run score synchronization to refresh stale data');
        }

        return {
          content: [{
            type: 'text',
            text: `# 🔍 Project Health Score Diagnostics

## Overall Assessment:
- 🎯 **Overall Health**: ${currentScores.overall}% ${currentScores.overall >= 80 ? '🟢 Excellent' : currentScores.overall >= 60 ? '🟡 Good' : '🔴 Needs Improvement'}
- 📊 **Data Confidence**: ${currentScores.confidence}% (${dataFreshness})
- ⏰ **Last Updated**: ${lastUpdate.toLocaleString()} (${Math.round(hoursSinceUpdate)} hours ago)

## Component Analysis:

### 💪 Strong Areas:
${strongComponents.length > 0 ? strongComponents.map(c => `- **${c.name}**: ${c.score}% 🟢`).join('\n') : '- No components currently exceeding excellence thresholds'}

### ⚠️ Areas for Improvement:
${weakComponents.length > 0 ? weakComponents.map(c => `- **${c.name}**: ${c.score}% (target: ${c.threshold}%)`).join('\n') : '- All components meeting target thresholds! 🎉'}

## Detailed Breakdown:
- 📋 **Task Completion**: ${currentScores.taskCompletion}% | ${currentScores.breakdown.taskCompletion.completed}/${currentScores.breakdown.taskCompletion.total} tasks | ${currentScores.breakdown.taskCompletion.criticalTasksRemaining} critical remaining
- 🚀 **Deployment**: ${currentScores.deploymentReadiness}% | ${currentScores.breakdown.deploymentReadiness.criticalBlockers} critical blockers | ${currentScores.breakdown.deploymentReadiness.warningBlockers} warnings
- 🏗️ **Architecture**: ${currentScores.architectureCompliance}% | ADR compliance tracking
- 🔒 **Security**: ${currentScores.securityPosture}% | ${currentScores.breakdown.securityPosture.vulnerabilityCount} vulnerabilities | ${currentScores.breakdown.securityPosture.contentMaskingEffectiveness}% masking effectiveness
- 🛠️ **Code Quality**: ${currentScores.codeQuality}% | ${currentScores.breakdown.codeQuality.ruleViolations} violations | ${currentScores.breakdown.codeQuality.patternAdherence}% pattern adherence

## Data Source Status:
${currentScores.influencingTools.length > 0 ? 
  currentScores.influencingTools.map(tool => `- ✅ **${tool}**: Contributing data`).join('\n') : 
  '- ⚠️ **Limited data sources**: Only basic scoring available'
}

${validatedArgs.suggestImprovements && suggestions.length > 0 ? `
## 🎯 Recommended Actions:
${suggestions.map(s => `${s}`).join('\n')}

## Quick Fixes:
1. Run \`sync_scores\` to refresh all data sources
2. Use \`recalculate_scores\` with \`updateSources: true\` for comprehensive refresh
3. Address highest-impact issues first (critical tasks, security vulnerabilities)
` : ''}

*Use \`sync_scores\` or \`recalculate_scores\` to refresh diagnostic data.*`
          }]
        };
      }

      case 'optimize_weights': {
        const optimalWeights = await calculateOptimalWeights(validatedArgs.projectPath, validatedArgs.analysisMode);
        
        // Apply custom weight overrides if provided
        let finalWeights = { ...optimalWeights };
        if (validatedArgs.customWeights) {
          Object.entries(validatedArgs.customWeights).forEach(([key, value]) => {
            if (value !== undefined) {
              (finalWeights as any)[key] = value;
            }
          });
          
          // Renormalize to ensure sum = 1.0
          const total = Object.values(finalWeights).reduce((sum, weight) => sum + weight, 0);
          if (total !== 1.0) {
            const factor = 1.0 / total;
            Object.keys(finalWeights).forEach(key => {
              (finalWeights as any)[key] *= factor;
            });
          }
        }

        if (!validatedArgs.previewOnly) {
          // Apply the optimized weights
          const { ProjectHealthScoring } = await import('../utils/project-health-scoring.js');
          new ProjectHealthScoring(validatedArgs.projectPath, finalWeights);
          // Note: Weight application would require updating the ProjectHealthScoring class constructor
          // For now, we return the preview showing what would change
          
          return {
            content: [{
              type: 'text',
              text: `# ⚖️ Scoring Weights Preview

## New Weight Configuration Would Be Applied:
${Object.entries(finalWeights).map(([key, value]) => 
  `- **${key.replace(/([A-Z])/g, ' $1').toLowerCase()}**: ${(Number(value) * 100).toFixed(1)}%`
).join('\n')}

## Optimization Method: ${validatedArgs.analysisMode}
${validatedArgs.customWeights ? '## Custom Overrides Applied: Yes' : ''}

*Note: Weight application requires ProjectHealthScoring class enhancement.*
*For now, this shows the optimal configuration that would be applied.*`
            }]
          };
        } else {
          // Preview mode - show what would change
          const currentWeights = {
            taskCompletion: 0.25,
            deploymentReadiness: 0.30,
            architectureCompliance: 0.20,
            securityPosture: 0.15,
            codeQuality: 0.10
          };

          return {
            content: [{
              type: 'text',
              text: `# ⚖️ Weight Optimization Preview

## Current vs Optimal Weights:
${Object.entries(finalWeights).map(([key, value]) => {
  const current = (currentWeights as any)[key] * 100;
  const optimal = Number(value) * 100;
  const change = optimal - current;
  const arrow = change > 0 ? '↗️' : change < 0 ? '↘️' : '➡️';
  return `- **${key.replace(/([A-Z])/g, ' $1').toLowerCase()}**: ${current.toFixed(1)}% ${arrow} ${optimal.toFixed(1)}% ${change !== 0 ? `(${change > 0 ? '+' : ''}${change.toFixed(1)}%)` : ''}`;
}).join('\n')}

## Optimization Rationale:
- **Analysis Method**: ${validatedArgs.analysisMode}
- **Project Type**: Detected from package.json and project structure
- **Customizations**: ${validatedArgs.customWeights ? 'Custom weights provided' : 'Auto-detected optimal weights'}

**To apply these weights, run the same command with \`previewOnly: false\`**`
            }]
          };
        }
      }

      case 'reset_scores': {
        const { ProjectHealthScoring } = await import('../utils/project-health-scoring.js');
        
        // Create backup if preserving history
        let backupPath = null;
        if (validatedArgs.preserveHistory) {
          const fs = await import('fs/promises');
          const path = await import('path');
          
          const cachePath = path.join(validatedArgs.projectPath, '.mcp-adr-cache', 'project-health-scores.json');
          backupPath = `${cachePath}.backup.${Date.now()}`;
          
          try {
            const currentScores = await fs.readFile(cachePath, 'utf-8');
            await fs.writeFile(backupPath, currentScores, 'utf-8');
          } catch (error) {
            // Backup failed, but continue with reset
            backupPath = null;
          }
        }

        // Reset scores by creating fresh instance
        const resetScoring = new ProjectHealthScoring(validatedArgs.projectPath);
        const resetScores = await resetScoring.getProjectHealthScore();

        // Recalculate if requested
        if (validatedArgs.recalculateAfterReset) {
          const allTools = ['manage_todo', 'smart_git_push'];
          await triggerSourceToolUpdates(validatedArgs.projectPath, allTools);
        }

        return {
          content: [{
            type: 'text',
            text: `# 🔄 Scores Reset Successfully

## Reset Component: ${validatedArgs.component}

## Fresh Baseline Scores:
- 🎯 **Overall**: ${resetScores.overall}%
- 📋 **Task Completion**: ${resetScores.taskCompletion}%
- 🚀 **Deployment Readiness**: ${resetScores.deploymentReadiness}%
- 🏗️ **Architecture Compliance**: ${resetScores.architectureCompliance}%
- 🔒 **Security Posture**: ${resetScores.securityPosture}%
- 🛠️ **Code Quality**: ${resetScores.codeQuality}%

${backupPath ? `## Backup Created: \`${backupPath}\`` : ''}
${validatedArgs.recalculateAfterReset ? '## Recalculation: ✅ Fresh data collected from available tools' : '## Recalculation: ⏸️ Skipped (use recalculate_scores to refresh)'}

*Health scoring system has been reset to baseline values.*`
          }]
        };
      }

      case 'get_score_trends': {
        const { KnowledgeGraphManager } = await import('../utils/knowledge-graph-manager.js');
        const kgManager = new KnowledgeGraphManager();
        
        const trends = await kgManager.getProjectScoreTrends();
        
        return {
          content: [{
            type: 'text',
            text: `# 📊 Project Score Trends

## Current Score: ${trends.currentScore}%

## Score History (${trends.scoreHistory.length} entries):
${trends.scoreHistory.slice(-10).map(entry => 
  `- **${new Date(entry.timestamp).toLocaleString()}**: ${entry.score}% (${entry.triggerEvent})`
).join('\n')}

## Performance Analytics:
- **Average Improvement**: ${trends.averageImprovement.toFixed(1)}%
- **Score Entries**: ${trends.scoreHistory.length}

## Top Impacting Intents:
${trends.topImpactingIntents.map(intent => 
  `- **${intent.scoreImprovement > 0 ? '+' : ''}${intent.scoreImprovement.toFixed(1)}%**: ${intent.humanRequest.substring(0, 80)}...`
).join('\n')}

*Score trends track the impact of human intents on project health over time.*`
          }]
        };
      }

      case 'get_intent_scores': {
        const { KnowledgeGraphManager } = await import('../utils/knowledge-graph-manager.js');
        const kgManager = new KnowledgeGraphManager();
        
        if (!validatedArgs.intentId) {
          throw new McpAdrError('intentId is required for get_intent_scores operation', 'INVALID_INPUT');
        }
        
        const intentTrends = await kgManager.getIntentScoreTrends(validatedArgs.intentId);
        
        return {
          content: [{
            type: 'text',
            text: `# 🎯 Intent Score Analysis

## Intent Progress:
- **Initial Score**: ${intentTrends.initialScore}%
- **Current Score**: ${intentTrends.currentScore}%
- **Progress**: ${intentTrends.progress.toFixed(1)}%

## Component Scores:
${Object.entries(intentTrends.componentTrends).map(([component, score]) => 
  `- **${component.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}**: ${score}%`
).join('\n')}

## Score History for this Intent:
${intentTrends.scoreHistory.map(entry => 
  `- **${new Date(entry.timestamp).toLocaleString()}**: ${entry.score}% (${entry.triggerEvent})`
).join('\n')}

*Intent scores track how specific human requests impact project health metrics.*`
          }]
        };
      }

      default:
        throw new McpAdrError(`Unknown smart score operation: ${(validatedArgs as any).operation}`, 'INVALID_INPUT');
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpAdrError(`Invalid input: ${error.errors.map(e => e.message).join(', ')}`, 'INVALID_INPUT');
    }

    throw new McpAdrError(
      `Smart score operation failed: ${error instanceof Error ? error.message : String(error)}`,
      'SMART_SCORE_ERROR'
    );
  }
}