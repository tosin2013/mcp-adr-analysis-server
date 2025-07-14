/**
 * Dynamic Project Health Scoring System
 * Aggregates scores from multiple MCP tools to provide real-time project health assessment
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface ProjectHealthScore {
  overall: number;                    // 0-100 weighted composite score
  taskCompletion: number;             // 0-100 from TODO.md analysis
  deploymentReadiness: number;        // 0-100 from smart_git_push
  architectureCompliance: number;     // 0-100 from compare_adr_progress
  securityPosture: number;            // 0-100 from content security tools
  codeQuality: number;                // 0-100 from rule validation
  confidence: number;                 // 0-100 confidence in overall score
  lastUpdated: string;                // ISO timestamp
  influencingTools: string[];         // Tools that contributed to scoring
  breakdown: ScoreBreakdown;          // Detailed breakdown
}

export interface ScoreBreakdown {
  taskCompletion: TaskCompletionScore;
  deploymentReadiness: DeploymentReadinessScore;
  architectureCompliance: ArchitectureComplianceScore;
  securityPosture: SecurityPostureScore;
  codeQuality: CodeQualityScore;
}

export interface TaskCompletionScore {
  completed: number;
  total: number;
  percentage: number;
  priorityWeightedScore: number;
  criticalTasksRemaining: number;
  lastUpdated: string;
}

export interface DeploymentReadinessScore {
  releaseScore: number;              // 0-1 from release-readiness-detector
  milestoneCompletion: number;       // Average milestone completion
  criticalBlockers: number;          // Count of critical blockers
  warningBlockers: number;           // Count of warning blockers
  gitHealthScore: number;            // Git repository health
  lastUpdated: string;
}

export interface ArchitectureComplianceScore {
  adrImplementationScore: number;    // How well ADRs are implemented
  mockVsProductionScore: number;     // Mock vs production code ratio
  environmentAlignmentScore: number; // Environment vs ADR alignment
  lastUpdated: string;
}

export interface SecurityPostureScore {
  secretExposureRisk: number;        // Risk of secret exposure (inverted)
  contentMaskingEffectiveness: number; // Effectiveness of masking
  vulnerabilityCount: number;        // Known vulnerabilities
  lastUpdated: string;
}

export interface CodeQualityScore {
  ruleViolations: number;            // Number of rule violations
  patternAdherence: number;          // Pattern adherence percentage
  technicalDebtScore: number;        // Technical debt assessment
  lastUpdated: string;
}

export interface ScoringWeights {
  taskCompletion: number;            // Default: 0.25
  deploymentReadiness: number;       // Default: 0.30
  architectureCompliance: number;    // Default: 0.20
  securityPosture: number;           // Default: 0.15
  codeQuality: number;               // Default: 0.10
}

export class ProjectHealthScoring {
  private scoringCachePath: string;
  private weights: ScoringWeights;

  constructor(projectPath: string, weights?: Partial<ScoringWeights>) {
    this.scoringCachePath = join(projectPath, '.mcp-adr-cache', 'project-health-scores.json');
    this.weights = {
      taskCompletion: 0.25,
      deploymentReadiness: 0.30,
      architectureCompliance: 0.20,
      securityPosture: 0.15,
      codeQuality: 0.10,
      ...weights
    };
  }

  /**
   * Get current project health score
   */
  async getProjectHealthScore(): Promise<ProjectHealthScore> {
    let currentScore = this.loadCachedScore();
    
    if (!currentScore) {
      currentScore = this.initializeScore();
    }

    // Recalculate overall score with current weights
    currentScore.overall = this.calculateOverallScore(currentScore.breakdown);
    currentScore.confidence = this.calculateConfidence(currentScore.breakdown);
    currentScore.lastUpdated = new Date().toISOString();

    this.saveCachedScore(currentScore);
    return currentScore;
  }

  /**
   * Update task completion score (called by TODO management tools)
   */
  async updateTaskCompletionScore(taskData: {
    completed: number;
    total: number;
    criticalTasksRemaining: number;
    priorityWeightedScore: number;
  }): Promise<void> {
    const currentScore = await this.getProjectHealthScore();
    
    currentScore.breakdown.taskCompletion = {
      completed: taskData.completed,
      total: taskData.total,
      percentage: taskData.total > 0 ? (taskData.completed / taskData.total) * 100 : 100,
      priorityWeightedScore: taskData.priorityWeightedScore,
      criticalTasksRemaining: taskData.criticalTasksRemaining,
      lastUpdated: new Date().toISOString()
    };

    currentScore.taskCompletion = this.calculateTaskCompletionScore(currentScore.breakdown.taskCompletion);
    this.addInfluencingTool(currentScore, 'manage_todo');
    
    await this.updateOverallScore(currentScore);
  }

  /**
   * Update deployment readiness score (called by smart_git_push)
   */
  async updateDeploymentReadinessScore(deploymentData: {
    releaseScore: number;
    milestoneCompletion: number;
    criticalBlockers: number;
    warningBlockers: number;
    gitHealthScore: number;
  }): Promise<void> {
    const currentScore = await this.getProjectHealthScore();
    
    currentScore.breakdown.deploymentReadiness = {
      releaseScore: deploymentData.releaseScore,
      milestoneCompletion: deploymentData.milestoneCompletion,
      criticalBlockers: deploymentData.criticalBlockers,
      warningBlockers: deploymentData.warningBlockers,
      gitHealthScore: deploymentData.gitHealthScore,
      lastUpdated: new Date().toISOString()
    };

    currentScore.deploymentReadiness = this.calculateDeploymentReadinessScore(currentScore.breakdown.deploymentReadiness);
    this.addInfluencingTool(currentScore, 'smart_git_push');
    
    await this.updateOverallScore(currentScore);
  }

  /**
   * Update architecture compliance score (called by compare_adr_progress)
   */
  async updateArchitectureComplianceScore(architectureData: {
    adrImplementationScore: number;
    mockVsProductionScore: number;
    environmentAlignmentScore: number;
  }): Promise<void> {
    const currentScore = await this.getProjectHealthScore();
    
    currentScore.breakdown.architectureCompliance = {
      adrImplementationScore: architectureData.adrImplementationScore,
      mockVsProductionScore: architectureData.mockVsProductionScore,
      environmentAlignmentScore: architectureData.environmentAlignmentScore,
      lastUpdated: new Date().toISOString()
    };

    currentScore.architectureCompliance = this.calculateArchitectureComplianceScore(currentScore.breakdown.architectureCompliance);
    this.addInfluencingTool(currentScore, 'compare_adr_progress');
    
    await this.updateOverallScore(currentScore);
  }

  /**
   * Update security posture score (called by content security tools)
   */
  async updateSecurityPostureScore(securityData: {
    secretExposureRisk: number;
    contentMaskingEffectiveness: number;
    vulnerabilityCount: number;
  }): Promise<void> {
    const currentScore = await this.getProjectHealthScore();
    
    currentScore.breakdown.securityPosture = {
      secretExposureRisk: securityData.secretExposureRisk,
      contentMaskingEffectiveness: securityData.contentMaskingEffectiveness,
      vulnerabilityCount: securityData.vulnerabilityCount,
      lastUpdated: new Date().toISOString()
    };

    currentScore.securityPosture = this.calculateSecurityPostureScore(currentScore.breakdown.securityPosture);
    this.addInfluencingTool(currentScore, 'analyze_content_security');
    
    await this.updateOverallScore(currentScore);
  }

  /**
   * Update code quality score (called by rule validation tools)
   */
  async updateCodeQualityScore(codeQualityData: {
    ruleViolations: number;
    patternAdherence: number;
    technicalDebtScore: number;
  }): Promise<void> {
    const currentScore = await this.getProjectHealthScore();
    
    currentScore.breakdown.codeQuality = {
      ruleViolations: codeQualityData.ruleViolations,
      patternAdherence: codeQualityData.patternAdherence,
      technicalDebtScore: codeQualityData.technicalDebtScore,
      lastUpdated: new Date().toISOString()
    };

    currentScore.codeQuality = this.calculateCodeQualityScore(currentScore.breakdown.codeQuality);
    this.addInfluencingTool(currentScore, 'validate_rules');
    
    await this.updateOverallScore(currentScore);
  }

  /**
   * Calculate overall weighted score
   */
  private calculateOverallScore(breakdown: ScoreBreakdown): number {
    const scores = {
      taskCompletion: this.calculateTaskCompletionScore(breakdown.taskCompletion),
      deploymentReadiness: this.calculateDeploymentReadinessScore(breakdown.deploymentReadiness),
      architectureCompliance: this.calculateArchitectureComplianceScore(breakdown.architectureCompliance),
      securityPosture: this.calculateSecurityPostureScore(breakdown.securityPosture),
      codeQuality: this.calculateCodeQualityScore(breakdown.codeQuality)
    };

    return Math.round(
      scores.taskCompletion * this.weights.taskCompletion +
      scores.deploymentReadiness * this.weights.deploymentReadiness +
      scores.architectureCompliance * this.weights.architectureCompliance +
      scores.securityPosture * this.weights.securityPosture +
      scores.codeQuality * this.weights.codeQuality
    );
  }

  /**
   * Calculate task completion score with priority weighting
   */
  private calculateTaskCompletionScore(taskData: TaskCompletionScore): number {
    if (taskData.total === 0) return 100;
    
    // Base completion score
    let score = taskData.percentage;
    
    // Priority weighting boost
    if (taskData.priorityWeightedScore > taskData.percentage) {
      score = Math.min(100, score + (taskData.priorityWeightedScore - taskData.percentage) * 0.3);
    }
    
    // Critical tasks penalty
    if (taskData.criticalTasksRemaining > 0) {
      score = Math.max(0, score - (taskData.criticalTasksRemaining * 15));
    }
    
    return Math.round(score);
  }

  /**
   * Calculate deployment readiness score
   */
  private calculateDeploymentReadinessScore(deploymentData: DeploymentReadinessScore): number {
    let score = deploymentData.releaseScore * 100;
    
    // Milestone completion factor
    score = (score + deploymentData.milestoneCompletion * 100) / 2;
    
    // Critical blockers are severe penalties
    score = Math.max(0, score - (deploymentData.criticalBlockers * 25));
    
    // Warning blockers are minor penalties
    score = Math.max(0, score - (deploymentData.warningBlockers * 5));
    
    // Git health factor
    score = (score + deploymentData.gitHealthScore) / 2;
    
    return Math.round(score);
  }

  /**
   * Calculate architecture compliance score
   */
  private calculateArchitectureComplianceScore(architectureData: ArchitectureComplianceScore): number {
    return Math.round(
      (architectureData.adrImplementationScore * 0.4 +
       architectureData.mockVsProductionScore * 0.3 +
       architectureData.environmentAlignmentScore * 0.3)
    );
  }

  /**
   * Calculate security posture score
   */
  private calculateSecurityPostureScore(securityData: SecurityPostureScore): number {
    let score = 100;
    
    // Secret exposure risk (inverted - higher risk = lower score)
    score -= securityData.secretExposureRisk;
    
    // Content masking effectiveness
    score = (score + securityData.contentMaskingEffectiveness) / 2;
    
    // Vulnerability penalty
    score = Math.max(0, score - (securityData.vulnerabilityCount * 10));
    
    return Math.round(Math.max(0, score));
  }

  /**
   * Calculate code quality score
   */
  private calculateCodeQualityScore(codeQualityData: CodeQualityScore): number {
    let score = codeQualityData.patternAdherence;
    
    // Rule violations penalty
    score = Math.max(0, score - (codeQualityData.ruleViolations * 5));
    
    // Technical debt factor
    score = (score + codeQualityData.technicalDebtScore) / 2;
    
    return Math.round(score);
  }

  /**
   * Calculate confidence in overall score
   */
  private calculateConfidence(breakdown: ScoreBreakdown): number {
    const now = new Date();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    
    let confidence = 100;
    
    // Reduce confidence based on data age
    Object.values(breakdown).forEach(scoreData => {
      const age = now.getTime() - new Date(scoreData.lastUpdated).getTime();
      if (age > maxAgeMs) {
        confidence -= 10;
      }
    });
    
    return Math.max(0, confidence);
  }

  /**
   * Initialize default score structure
   */
  private initializeScore(): ProjectHealthScore {
    const now = new Date().toISOString();
    
    return {
      overall: 50,
      taskCompletion: 50,
      deploymentReadiness: 50,
      architectureCompliance: 50,
      securityPosture: 50,
      codeQuality: 50,
      confidence: 0,
      lastUpdated: now,
      influencingTools: [],
      breakdown: {
        taskCompletion: {
          completed: 0,
          total: 0,
          percentage: 0,
          priorityWeightedScore: 0,
          criticalTasksRemaining: 0,
          lastUpdated: now
        },
        deploymentReadiness: {
          releaseScore: 0.5,
          milestoneCompletion: 0.5,
          criticalBlockers: 0,
          warningBlockers: 0,
          gitHealthScore: 50,
          lastUpdated: now
        },
        architectureCompliance: {
          adrImplementationScore: 50,
          mockVsProductionScore: 50,
          environmentAlignmentScore: 50,
          lastUpdated: now
        },
        securityPosture: {
          secretExposureRisk: 0,
          contentMaskingEffectiveness: 80,
          vulnerabilityCount: 0,
          lastUpdated: now
        },
        codeQuality: {
          ruleViolations: 0,
          patternAdherence: 70,
          technicalDebtScore: 60,
          lastUpdated: now
        }
      }
    };
  }

  /**
   * Update overall score and save
   */
  private async updateOverallScore(score: ProjectHealthScore): Promise<void> {
    score.overall = this.calculateOverallScore(score.breakdown);
    score.confidence = this.calculateConfidence(score.breakdown);
    score.lastUpdated = new Date().toISOString();
    
    this.saveCachedScore(score);
  }

  /**
   * Add tool to influencing tools list
   */
  private addInfluencingTool(score: ProjectHealthScore, toolName: string): void {
    if (!score.influencingTools.includes(toolName)) {
      score.influencingTools.push(toolName);
    }
  }

  /**
   * Load cached score from file
   */
  private loadCachedScore(): ProjectHealthScore | null {
    try {
      if (existsSync(this.scoringCachePath)) {
        const cached = JSON.parse(readFileSync(this.scoringCachePath, 'utf-8'));
        return cached;
      }
    } catch (error) {
      // Ignore cache errors
    }
    return null;
  }

  /**
   * Save score to cache
   */
  private saveCachedScore(score: ProjectHealthScore): void {
    try {
      // Ensure cache directory exists
      const { mkdirSync } = require('fs');
      const { dirname } = require('path');
      mkdirSync(dirname(this.scoringCachePath), { recursive: true });
      
      writeFileSync(this.scoringCachePath, JSON.stringify(score, null, 2));
    } catch (error) {
      // Ignore cache save errors
    }
  }

  /**
   * Generate formatted score display for TODO.md header
   */
  async generateScoreDisplay(): Promise<string> {
    const score = await this.getProjectHealthScore();
    
    const overallEmoji = this.getScoreEmoji(score.overall);
    const confidenceEmoji = this.getConfidenceEmoji(score.confidence);
    
    return `# Project Health Dashboard

## 🎯 Overall Project Health: ${overallEmoji} ${score.overall}% ${confidenceEmoji}

### 📊 Health Metrics
- 📋 **Task Completion**: ${this.getScoreEmoji(score.taskCompletion)} ${score.taskCompletion}%
- 🚀 **Deployment Readiness**: ${this.getScoreEmoji(score.deploymentReadiness)} ${score.deploymentReadiness}%
- 🏗️ **Architecture Compliance**: ${this.getScoreEmoji(score.architectureCompliance)} ${score.architectureCompliance}%
- 🔒 **Security Posture**: ${this.getScoreEmoji(score.securityPosture)} ${score.securityPosture}%
- 🛠️ **Code Quality**: ${this.getScoreEmoji(score.codeQuality)} ${score.codeQuality}%

### 🔄 Data Freshness
- **Last Updated**: ${new Date(score.lastUpdated).toLocaleString()}
- **Confidence**: ${score.confidence}%
- **Contributing Tools**: ${score.influencingTools.join(', ') || 'None'}

### 📈 Detailed Breakdown
- **Tasks**: ${score.breakdown.taskCompletion.completed}/${score.breakdown.taskCompletion.total} completed, ${score.breakdown.taskCompletion.criticalTasksRemaining} critical remaining
- **Deployment**: ${score.breakdown.deploymentReadiness.criticalBlockers} critical blockers, ${score.breakdown.deploymentReadiness.warningBlockers} warnings
- **Security**: ${score.breakdown.securityPosture.vulnerabilityCount} vulnerabilities, ${score.breakdown.securityPosture.contentMaskingEffectiveness}% masking effectiveness
- **Code Quality**: ${score.breakdown.codeQuality.ruleViolations} rule violations, ${score.breakdown.codeQuality.patternAdherence}% pattern adherence

---
`;
  }

  /**
   * Get emoji for score level
   */
  private getScoreEmoji(score: number): string {
    if (score >= 90) return '🟢';
    if (score >= 75) return '🟡';
    if (score >= 60) return '🟠';
    return '🔴';
  }

  /**
   * Get emoji for confidence level
   */
  private getConfidenceEmoji(confidence: number): string {
    if (confidence >= 90) return '💎';
    if (confidence >= 75) return '✨';
    if (confidence >= 60) return '⚡';
    return '⚠️';
  }
}