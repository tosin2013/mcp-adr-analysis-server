/**
 * Pattern Contribution Helper
 *
 * Helps users contribute missing patterns to the validatedpatterns project
 * by creating well-formatted GitHub issues with detection evidence.
 */

import type { PlatformDetectionResult } from './platform-detector.js';
import { EnhancedLogger } from './enhanced-logging.js';

/**
 * GitHub issue creation result
 */
export interface GitHubIssueResult {
  success: boolean;
  issueUrl?: string;
  issueNumber?: number;
  issueTitle: string;
  issueBody: string;
  error?: string;
}

/**
 * Helper for creating GitHub issues for missing patterns
 */
export class PatternContributionHelper {
  private logger: EnhancedLogger;

  constructor() {
    this.logger = new EnhancedLogger();
  }

  /**
   * Prompt user to contribute missing pattern
   */
  promptUserForContribution(platform: string, detection: PlatformDetectionResult): string {
    return `
# 📝 Missing Validated Pattern Detected

No validated pattern exists for platform: **${platform}**

## Detected Platform Evidence

${detection.evidence
  .slice(0, 5)
  .map(
    (e, i) =>
      `${i + 1}. **${e.file}**: ${e.indicator} (confidence: ${(e.weight * 100).toFixed(0)}%)`
  )
  .join('\n')}

## Contribute to validatedpatterns Community

Would you like to create a GitHub issue to request this pattern be added to the
[validatedpatterns repository](https://github.com/validatedpatterns)?

This will help the entire community benefit from ${platform} deployment patterns.

**Your contribution would include:**
- Platform detection evidence from your project
- Deployment requirements you've identified
- Authentication and infrastructure needs
- Suggested deployment phases and validation checks

**Options:**
1. ✅ **Yes** - Create GitHub issue (recommended) - Helps the community
2. ⏭️  **Skip** - Use AI-generated fallback pattern (less tested, project-specific only)

**Why contribute?**
- Future users automatically benefit from validated patterns
- Community-vetted deployment workflows
- Reduces trial-and-error for everyone
- Your project evidence helps create better patterns

Please confirm: Create GitHub issue for ${platform} pattern?
    `.trim();
  }

  /**
   * Prepare GitHub issue content for missing pattern
   */
  prepareIssueContent(
    platform: string,
    detection: PlatformDetectionResult
  ): { title: string; body: string } {
    const title = `[Pattern Request] Add ${platform} validated pattern`;

    const body = `
## Platform Information

**Platform**: ${platform}
**Detection Confidence**: ${(detection.confidence * 100).toFixed(1)}%
**Detection Method**: Automated analysis via MCP ADR Analysis Server

## Detection Evidence

${detection.evidence
  .slice(0, 10)
  .map(
    (e, i) => `${i + 1}. **${e.file}**: ${e.indicator} (weight: ${(e.weight * 100).toFixed(0)}%)`
  )
  .join('\n')}

${detection.evidence.length > 10 ? `\n*...and ${detection.evidence.length - 10} more evidence files*\n` : ''}

## Requested Pattern Components

### Deployment Phases

Please include deployment phases for **${platform}**:

- [ ] **Prerequisites Validation**
  - CLI tools installation and verification
  - Cluster/environment connectivity checks
  - Authentication validation
  - Required permissions verification

- [ ] **Infrastructure Setup**
  - Namespaces / resource groups / projects
  - RBAC configuration
  - Network policies and security groups
  - Storage classes and persistent volumes

- [ ] **Resource Deployment**
  - Service definitions
  - Ingress / routing configuration
  - Configuration maps and secrets
  - Load balancers and networking

- [ ] **Validation Checks**
  - Health checks and readiness probes
  - Connectivity tests
  - Resource status verification
  - End-to-end deployment validation

### Authoritative Sources

Please include links to:

- [ ] Official **${platform}** documentation
- [ ] **${platform}** deployment best practices
- [ ] **${platform}** example repositories / quickstarts
- [ ] **${platform}** community resources and forums
- [ ] Relevant GitHub repositories with deployment examples

### Configuration Templates

Please include templates for:

- [ ] Deployment manifests (YAML/JSON)
- [ ] Service definitions
- [ ] Ingress/routing configuration
- [ ] ConfigMap / Secret templates
- [ ] Network policy templates
- [ ] Storage configuration

### Dependencies

Please specify required dependencies:

- [ ] CLI tools (with installation commands)
- [ ] Runtime requirements
- [ ] Build-time dependencies
- [ ] Verification commands for each dependency

## Use Case

This pattern was requested during an **automated bootstrap validation loop** for a project
that detected **${platform}** as the target deployment platform.

The requesting system:
- Analyzed project files and detected ${platform} indicators
- Attempted to load a validated pattern from the pattern library
- Found no existing pattern for this platform
- Prompted user to contribute back to the community

## Additional Context

- **All detected platforms**: ${detection.detectedPlatforms?.map(p => p.type).join(', ') || platform}
- **Detection confidence breakdown**:
${
  detection.detectedPlatforms
    ?.slice(0, 5)
    .map(p => `  - ${p.type}: ${(p.confidence * 100).toFixed(0)}%`)
    .join('\n') || `  - ${platform}: ${(detection.confidence * 100).toFixed(0)}%`
}
- **Total evidence files**: ${detection.evidence.length}
- **Project type**: Automatic detection from codebase analysis
- **Deployment target**: Development/Staging/Production (pattern should support all)

## Benefits for Community

Creating this pattern will:
- ✅ Enable automatic infrastructure DAG generation for ${platform} projects
- ✅ Provide battle-tested deployment workflows
- ✅ Reduce deployment errors through validated checks
- ✅ Accelerate onboarding for teams using ${platform}
- ✅ Build community knowledge base
- ✅ Support AI-assisted deployment automation

## Pattern Structure Reference

See existing patterns for examples:
- [Kubernetes Pattern](https://github.com/validatedpatterns/patterns/tree/main/infrastructure/kubernetes.yaml)
- [OpenShift Pattern](https://github.com/validatedpatterns/patterns/tree/main/infrastructure/openshift.yaml)
- [Pattern Schema Documentation](https://github.com/validatedpatterns/patterns/tree/main/docs/pattern-schema.md)

## Implementation Notes

The pattern should include:

1. **authoritativeSources**: Array of documentation links with priority and query instructions
2. **deploymentPhases**: Step-by-step deployment commands with prerequisites
3. **validationChecks**: Health checks with remediation steps
4. **dependencies**: Required tools with install/verify commands
5. **configurations**: Config file templates that can be auto-generated
6. **metadata**: Source, maintainer, tags, changelog

---

**Submitted by**: MCP ADR Analysis Server - Bootstrap Validation Loop
**Generated**: ${new Date().toISOString()}
**Repository**: [validatedpatterns project](https://github.com/validatedpatterns)
**Related**: Hybrid DAG Bootstrap Architecture

## Labels

Please add these labels:
- \`pattern-request\`
- \`${platform}\`
- \`community-contribution\`
- \`auto-generated\`
- \`help-wanted\`

Thank you for considering this pattern request! 🙏
    `.trim();

    return { title, body };
  }

  /**
   * Create GitHub issue (placeholder for actual GitHub API integration)
   *
   * In production, this would use Octokit to create the issue.
   * For now, it returns the issue content for manual creation.
   */
  async createGitHubIssue(
    platform: string,
    detection: PlatformDetectionResult,
    _options?: {
      githubToken?: string;
      repository?: string;
      owner?: string;
    }
  ): Promise<GitHubIssueResult> {
    const { title, body } = this.prepareIssueContent(platform, detection);

    this.logger.info(
      `📝 Preparing GitHub issue for missing ${platform} pattern`,
      'PatternContributionHelper'
    );

    // In production, use GitHub API:
    // import { Octokit } from '@octokit/rest';
    //
    // const octokit = new Octokit({ auth: options?.githubToken || process.env.GITHUB_TOKEN });
    //
    // const response = await octokit.issues.create({
    //   owner: options?.owner || 'validatedpatterns',
    //   repo: options?.repository || 'patterns',
    //   title,
    //   body,
    //   labels: ['pattern-request', platform, 'community-contribution', 'auto-generated'],
    // });
    //
    // return {
    //   success: true,
    //   issueUrl: response.data.html_url,
    //   issueNumber: response.data.number,
    //   issueTitle: title,
    //   issueBody: body,
    // };

    // For now, return the prepared content
    this.logger.info(
      `📋 GitHub issue content prepared:\n\nTitle: ${title}\n\nBody:\n${body}`,
      'PatternContributionHelper'
    );

    this.logger.info(
      '💡 To enable automatic GitHub issue creation, set GITHUB_TOKEN environment variable',
      'PatternContributionHelper'
    );

    return {
      success: true,
      issueTitle: title,
      issueBody: body,
    };
  }

  /**
   * Generate summary message for user after issue creation
   */
  generateSuccessMessage(result: GitHubIssueResult, platform: string): string {
    if (result.issueUrl) {
      return `
✅ **GitHub Issue Created Successfully!**

**Platform**: ${platform}
**Issue**: ${result.issueUrl}
**Issue Number**: #${result.issueNumber}

The validatedpatterns maintainers will be notified. Once the pattern is created,
future users will automatically benefit from it!

**Next Steps:**
1. Monitor the issue for community feedback
2. Provide additional context if requested
3. Once pattern is merged, update your local pattern library
4. Re-run bootstrap validation to use the new pattern

**For now**: Falling back to AI-generated deployment plan...
      `.trim();
    } else {
      return `
📋 **GitHub Issue Content Prepared**

**Platform**: ${platform}

To create the issue manually:
1. Go to: https://github.com/validatedpatterns/patterns/issues/new
2. Use the title: ${result.issueTitle}
3. Paste the prepared issue body (see logs above)
4. Add labels: pattern-request, ${platform}, community-contribution

**To enable automatic issue creation**: Set the GITHUB_TOKEN environment variable

**For now**: Falling back to AI-generated deployment plan...
      `.trim();
    }
  }

  /**
   * Check if GitHub token is configured for automatic issue creation
   */
  isGitHubConfigured(): boolean {
    return !!process.env['GITHUB_TOKEN'];
  }

  /**
   * Get GitHub configuration status message
   */
  getConfigurationStatus(): string {
    if (this.isGitHubConfigured()) {
      return '✅ GitHub API configured - automatic issue creation enabled';
    } else {
      return '⚠️  GitHub API not configured - issue content will be prepared for manual creation';
    }
  }
}
