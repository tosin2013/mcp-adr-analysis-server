/**
 * Release Tracking Tool
 *
 * MCP tool for tracking releases mapped to ADRs, generating changelogs,
 * managing milestones, and assessing release readiness.
 * Supports both greenfield and brownfield applications.
 *
 * IMPORTANT FOR AI ASSISTANTS: This tool provides:
 * 1. Release Detection: Discovers releases from git tags and GitHub Releases
 * 2. ADR-to-Release Mapping: Three-pass mapping with confidence scoring
 * 3. Changelog Generation: Keep a Changelog format with ADR sections
 * 4. Milestone Management: Tracks milestones linked to ADRs and tasks
 * 5. Release Comparison: Diffs ADR changes between releases
 * 6. Next Release Preview: Shows unreleased work with readiness scoring
 * 7. GitHub Integration: Creates GitHub Releases and Milestones
 * 8. Persistence: Writes CHANGELOG.md, updates TODO.md
 */

import { z } from 'zod';
import { McpAdrError } from '../types/index.js';
import { validateMcpResponse } from '../utils/mcp-response-validator.js';
import { jsonSafeError } from '../utils/json-safe.js';
import {
  detectReleases,
  detectProjectType,
  mapAdrsToReleases,
  generateChangelog,
  writeChangelog,
  compareReleases,
  buildMilestoneMap,
  createGitHubRelease,
  syncGitHubMilestone,
  updateTodoMilestones,
  previewNextRelease,
  saveTrackingState,
  type ReleaseTrackingState,
  type ChangelogOptions,
} from '../utils/release-tracker.js';

// ─── Schema ────────────────────────────────────────────────────────

const ReleaseTrackingSchema = z.object({
  operation: z
    .enum([
      'detect_releases',
      'track_release',
      'generate_changelog',
      'compare_releases',
      'release_summary',
      'next_release_preview',
      'create_milestone',
      'sync_milestones',
    ])
    .describe('Operation to perform'),

  projectPath: z.string().optional().describe('Project root path'),

  // For track_release
  version: z.string().optional().describe('Release version to track (e.g., v2.3.0)'),

  // For compare_releases
  compareFrom: z.string().optional().describe('Starting version for comparison'),
  compareTo: z.string().optional().describe('Ending version for comparison'),

  // For generate_changelog
  format: z
    .enum(['markdown', 'keep-a-changelog', 'conventional'])
    .default('keep-a-changelog')
    .describe('Changelog output format'),
  includeAdrLinks: z.boolean().default(true).describe('Include ADR references in changelog'),
  includeCommitHashes: z.boolean().default(false).describe('Include commit hashes'),
  groupByAdr: z.boolean().default(false).describe('Group changelog entries by ADR'),
  writeToFile: z.boolean().default(false).describe('Write CHANGELOG.md to repo'),

  // For release_summary and next_release_preview
  includeReadiness: z.boolean().default(true).describe('Include release readiness score'),
  includeTimeline: z.boolean().default(true).describe('Include mermaid timeline diagram'),

  // For create_milestone
  milestoneTitle: z.string().optional().describe('GitHub milestone title'),
  milestoneDescription: z.string().optional().describe('GitHub milestone description'),
  milestoneDueDate: z.string().optional().describe('Milestone due date (YYYY-MM-DD)'),

  // For GitHub integration
  createGithubRelease: z
    .boolean()
    .default(false)
    .describe('Create a GitHub Release (requires gh CLI)'),
  syncGithubMilestones: z
    .boolean()
    .default(false)
    .describe('Sync milestones to GitHub (requires gh CLI)'),
  updateTodo: z.boolean().default(false).describe('Update TODO.md with milestone status'),
});

// ─── Main Export ───────────────────────────────────────────────────

export async function releaseTracking(args: Record<string, unknown>): Promise<any> {
  try {
    const validatedArgs = ReleaseTrackingSchema.parse(args);
    const projectPath = validatedArgs.projectPath || process.cwd();

    // Discover ADRs
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
    const adrDirectory = process.env['ADR_DIRECTORY'] || 'docs/adrs';
    const discoveryResult = await discoverAdrsInDirectory(adrDirectory, projectPath, {
      includeContent: false,
      includeTimeline: false,
    });
    const adrs = discoveryResult.adrs;

    switch (validatedArgs.operation) {
      case 'detect_releases':
        return await handleDetectReleases(projectPath, adrs);

      case 'track_release':
        return await handleTrackRelease(projectPath, adrs, validatedArgs);

      case 'generate_changelog':
        return await handleGenerateChangelog(projectPath, adrs, validatedArgs);

      case 'compare_releases':
        return await handleCompareReleases(projectPath, adrs, validatedArgs);

      case 'release_summary':
        return await handleReleaseSummary(projectPath, adrs, validatedArgs);

      case 'next_release_preview':
        return await handleNextReleasePreview(projectPath, adrs, validatedArgs);

      case 'create_milestone':
        return await handleCreateMilestone(projectPath, validatedArgs);

      case 'sync_milestones':
        return await handleSyncMilestones(projectPath, adrs, validatedArgs);

      default:
        throw new McpAdrError('INVALID_ARGS', `Unknown operation: ${validatedArgs.operation}`);
    }
  } catch (error) {
    throw new McpAdrError(
      'RELEASE_TRACKING_ERROR',
      `Release tracking failed: ${jsonSafeError(error)}`
    );
  }
}

// ─── Operation Handlers ────────────────────────────────────────────

async function handleDetectReleases(projectPath: string, adrs: any[]): Promise<any> {
  const releases = await detectReleases(projectPath);
  const { projectType, phase } = await detectProjectType(projectPath, adrs.length);

  if (releases.length === 0) {
    return validateMcpResponse({
      content: [
        {
          type: 'text',
          text: `# Release Detection - ${projectType === 'greenfield' ? 'Greenfield' : 'Brownfield'} Project

## No Releases Detected

**Project Type**: ${projectType}
**Project Phase**: ${phase}
**ADRs Found**: ${adrs.length}

### Getting Started with Release Tracking

${
  projectType === 'greenfield'
    ? `This appears to be a new project. To start tracking releases:

1. **Tag your first release**: \`git tag v0.1.0\`
2. **Create ADRs** to document architectural decisions
3. **Set up TODO.md** with milestone structure
4. Re-run \`release_tracking\` with \`detect_releases\` to see your releases mapped to ADRs`
    : `This project has existing history but no semver tags. To start:

1. **Tag your current state**: \`git tag v1.0.0\`
2. **Run \`generate_changelog\`** to create a CHANGELOG.md
3. **Run \`sync_milestones\`** to map ADRs to milestones`
}

### ADR Summary
${adrs.length > 0 ? adrs.map((a: any) => `- **${a.title}**: ${a.status}`).join('\n') : 'No ADRs found. Consider creating architectural decision records.'}`,
        },
      ],
    });
  }

  // Map ADRs to releases
  const { mappedReleases, unmappedAdrs } = await mapAdrsToReleases(adrs, releases, projectPath);

  // Save state
  const state: ReleaseTrackingState = {
    projectType,
    detectedPhase: phase as any,
    releases: mappedReleases,
    unmappedAdrs,
    milestones: [],
    lastScanTimestamp: new Date().toISOString(),
  };
  saveTrackingState(projectPath, state);

  return validateMcpResponse({
    content: [
      {
        type: 'text',
        text: `# Release Detection Results

**Project Type**: ${projectType}
**Project Phase**: ${phase}
**Releases Found**: ${mappedReleases.length}
**ADRs Found**: ${adrs.length}
**Unmapped ADRs**: ${unmappedAdrs.length}

## Releases

${mappedReleases
  .map(
    r => `### ${r.version} (${r.date.split('T')[0]})
- **Features**: ${r.features.length}
- **Bug Fixes**: ${r.bugfixes.length}
- **Breaking Changes**: ${r.breakingChanges.length}
- **Linked ADRs**: ${r.adrs.length}
${r.adrs.map(a => `  - ${a.adrTitle} (${a.mappingMethod}, ${(a.confidence * 100).toFixed(0)}% confidence)`).join('\n')}`
  )
  .join('\n\n')}

${
  unmappedAdrs.length > 0
    ? `## Unmapped ADRs
These ADRs are not linked to any release:
${unmappedAdrs.map(a => `- ${a}`).join('\n')}

Consider using \`track_release\` to manually link them.`
    : ''
}`,
      },
    ],
  });
}

async function handleTrackRelease(
  projectPath: string,
  adrs: any[],
  args: z.infer<typeof ReleaseTrackingSchema>
): Promise<any> {
  if (!args.version) {
    throw new McpAdrError('INVALID_ARGS', 'Version is required for track_release operation');
  }

  const releases = await detectReleases(projectPath);
  const { mappedReleases } = await mapAdrsToReleases(adrs, releases, projectPath);
  const targetRelease = mappedReleases.find(r => r.version === args.version);

  if (!targetRelease) {
    return validateMcpResponse({
      content: [
        {
          type: 'text',
          text: `# Release Not Found: ${args.version}

Available releases: ${releases.map(r => r.version).join(', ') || 'None'}

To create this release, first tag it: \`git tag ${args.version}\``,
        },
      ],
    });
  }

  // Create GitHub Release if requested
  let githubReleaseInfo = '';
  if (args.createGithubRelease) {
    const releaseNotes = generateReleaseNotes(targetRelease);
    const result = createGitHubRelease(projectPath, args.version, releaseNotes);
    githubReleaseInfo = result.success
      ? `\n### GitHub Release\n- Created: ${result.url}`
      : `\n### GitHub Release\n- Failed: ${result.error}`;
  }

  // Update TODO.md if requested
  if (args.updateTodo) {
    const milestones = await buildMilestoneMap(adrs, projectPath);
    updateTodoMilestones(projectPath, milestones, adrs);
  }

  return validateMcpResponse({
    content: [
      {
        type: 'text',
        text: `# Release Tracked: ${args.version}

**Date**: ${targetRelease.date.split('T')[0]}
**Linked ADRs**: ${targetRelease.adrs.length}
**Features**: ${targetRelease.features.length}
**Bug Fixes**: ${targetRelease.bugfixes.length}
**Breaking Changes**: ${targetRelease.breakingChanges.length}

## ADR Mappings
${
  targetRelease.adrs.length > 0
    ? targetRelease.adrs
        .map(
          a =>
            `- **${a.adrTitle}** (${a.adrFilename})
  - Change Type: ${a.changeType}
  - Mapping Method: ${a.mappingMethod}
  - Confidence: ${(a.confidence * 100).toFixed(0)}%`
        )
        .join('\n')
    : 'No ADRs linked to this release.'
}
${githubReleaseInfo}`,
      },
    ],
  });
}

async function handleGenerateChangelog(
  projectPath: string,
  adrs: any[],
  args: z.infer<typeof ReleaseTrackingSchema>
): Promise<any> {
  const releases = await detectReleases(projectPath);
  const { mappedReleases } = await mapAdrsToReleases(adrs, releases, projectPath);

  const options: ChangelogOptions = {
    format: args.format,
    includeAdrLinks: args.includeAdrLinks,
    includeCommitHashes: args.includeCommitHashes,
    groupByAdr: args.groupByAdr,
  };

  const changelogContent = generateChangelog(mappedReleases, options);

  if (args.writeToFile) {
    writeChangelog(projectPath, changelogContent);
  }

  return validateMcpResponse({
    content: [
      {
        type: 'text',
        text: `# Changelog Generated

**Releases**: ${mappedReleases.length}
**Format**: ${args.format}
${args.writeToFile ? '**Written to**: CHANGELOG.md' : '**Preview mode** (use writeToFile: true to save)'}

---

${changelogContent}`,
      },
    ],
  });
}

async function handleCompareReleases(
  projectPath: string,
  adrs: any[],
  args: z.infer<typeof ReleaseTrackingSchema>
): Promise<any> {
  if (!args.compareFrom || !args.compareTo) {
    throw new McpAdrError(
      'INVALID_ARGS',
      'compareFrom and compareTo are required for compare_releases operation'
    );
  }

  const releases = await detectReleases(projectPath);
  const { mappedReleases } = await mapAdrsToReleases(adrs, releases, projectPath);
  const comparison = compareReleases(mappedReleases, args.compareFrom, args.compareTo);

  return validateMcpResponse({
    content: [
      {
        type: 'text',
        text: `# Release Comparison: ${args.compareFrom} -> ${args.compareTo}

## ADR Changes
- **Added**: ${comparison.addedAdrs.length}
- **Modified**: ${comparison.modifiedAdrs.length}
- **Deprecated**: ${comparison.deprecatedAdrs.length}

${
  comparison.addedAdrs.length > 0
    ? `### New ADRs
${comparison.addedAdrs.map(a => `- ${a.adrTitle} (${a.adrFilename})`).join('\n')}`
    : ''
}

${
  comparison.modifiedAdrs.length > 0
    ? `### Modified ADRs
${comparison.modifiedAdrs.map(a => `- ${a.adrTitle} (${a.adrFilename})`).join('\n')}`
    : ''
}

${
  comparison.deprecatedAdrs.length > 0
    ? `### Deprecated ADRs
${comparison.deprecatedAdrs.map(a => `- ${a.adrTitle} (${a.adrFilename})`).join('\n')}`
    : ''
}

## Code Changes
- **New Features**: ${comparison.featuresDelta.length}
- **Bug Fixes**: ${comparison.bugfixesDelta.length}
- **Breaking Changes**: ${comparison.breakingChangesDelta.length}

${comparison.featuresDelta.length > 0 ? `### Features\n${comparison.featuresDelta.map(f => `- ${f}`).join('\n')}` : ''}
${comparison.bugfixesDelta.length > 0 ? `### Bug Fixes\n${comparison.bugfixesDelta.map(f => `- ${f}`).join('\n')}` : ''}
${comparison.breakingChangesDelta.length > 0 ? `### Breaking Changes\n${comparison.breakingChangesDelta.map(c => `- ${c}`).join('\n')}` : ''}`,
      },
    ],
  });
}

async function handleReleaseSummary(
  projectPath: string,
  adrs: any[],
  args: z.infer<typeof ReleaseTrackingSchema>
): Promise<any> {
  const releases = await detectReleases(projectPath);
  const { projectType, phase } = await detectProjectType(projectPath, adrs.length);
  const { mappedReleases, unmappedAdrs } = await mapAdrsToReleases(adrs, releases, projectPath);
  const milestones = args.includeReadiness ? await buildMilestoneMap(adrs, projectPath) : [];

  let timelineDiagram = '';
  if (args.includeTimeline && mappedReleases.length > 0) {
    timelineDiagram = generateMermaidTimeline(mappedReleases);
  }

  return validateMcpResponse({
    content: [
      {
        type: 'text',
        text: `# Release Summary

**Project Type**: ${projectType}
**Project Phase**: ${phase}
**Total Releases**: ${mappedReleases.length}
**Total ADRs**: ${adrs.length}
**Unmapped ADRs**: ${unmappedAdrs.length}

## Release History
${
  mappedReleases.length > 0
    ? mappedReleases
        .map(
          r =>
            `| ${r.version} | ${r.date.split('T')[0]} | ${r.features.length} features | ${r.bugfixes.length} fixes | ${r.adrs.length} ADRs |`
        )
        .join(
          '\n| Version | Date | Features | Fixes | ADRs |\n|---------|------|----------|-------|------|\n'
        )
    : 'No releases found.'
}

${
  milestones.length > 0
    ? `## Milestone Status
${milestones
  .map(
    m =>
      `- **${m.name}**: ${(m.completionRate * 100).toFixed(0)}% complete (${m.completed}/${m.total})${m.criticalTodos > 0 ? ` - ${m.criticalTodos} blockers` : ''}`
  )
  .join('\n')}`
    : ''
}

${timelineDiagram ? `## Release Timeline\n\n${timelineDiagram}` : ''}

${
  unmappedAdrs.length > 0
    ? `## Unmapped ADRs
${unmappedAdrs.map(a => `- ${a}`).join('\n')}`
    : ''
}`,
      },
    ],
  });
}

async function handleNextReleasePreview(
  projectPath: string,
  adrs: any[],
  _args: z.infer<typeof ReleaseTrackingSchema>
): Promise<any> {
  const releases = await detectReleases(projectPath);
  const { mappedReleases } = await mapAdrsToReleases(adrs, releases, projectPath);
  const preview = await previewNextRelease(projectPath, adrs, mappedReleases);

  return validateMcpResponse({
    content: [
      {
        type: 'text',
        text: `# Next Release Preview

**Suggested Version Bump**: ${preview.suggestedVersion}
**Unreleased Commits**: ${preview.unreleaseCommits.length}
**Pending ADRs**: ${preview.pendingAdrs.length}

## Release Readiness
${preview.readiness.summary}

## Unreleased Changes
${
  preview.unreleaseCommits.length > 0
    ? preview.unreleaseCommits
        .slice(0, 20)
        .map(c => `- ${c}`)
        .join('\n')
    : 'No unreleased commits.'
}
${preview.unreleaseCommits.length > 20 ? `\n... and ${preview.unreleaseCommits.length - 20} more commits` : ''}

## Pending ADRs (Accepted, Not Yet Released)
${
  preview.pendingAdrs.length > 0
    ? preview.pendingAdrs.map(a => `- **${a.title}** (${a.filename}): ${a.status}`).join('\n')
    : 'All accepted ADRs are linked to releases.'
}

## Recommendations
${preview.readiness.recommendations.join('\n')}`,
      },
    ],
  });
}

async function handleCreateMilestone(
  projectPath: string,
  args: z.infer<typeof ReleaseTrackingSchema>
): Promise<any> {
  if (!args.milestoneTitle) {
    throw new McpAdrError(
      'INVALID_ARGS',
      'milestoneTitle is required for create_milestone operation'
    );
  }

  const result = syncGitHubMilestone(
    projectPath,
    args.milestoneTitle,
    args.milestoneDescription || '',
    args.milestoneDueDate
  );

  return validateMcpResponse({
    content: [
      {
        type: 'text',
        text: result.success
          ? `# Milestone Created/Updated

**Title**: ${args.milestoneTitle}
**Number**: #${result.number}
${args.milestoneDescription ? `**Description**: ${args.milestoneDescription}` : ''}
${args.milestoneDueDate ? `**Due Date**: ${args.milestoneDueDate}` : ''}`
          : `# Milestone Creation Failed

**Error**: ${result.error}

Make sure:
1. \`gh\` CLI is installed and authenticated
2. You have write access to the repository
3. Run \`gh auth status\` to verify`,
      },
    ],
  });
}

async function handleSyncMilestones(
  projectPath: string,
  adrs: any[],
  args: z.infer<typeof ReleaseTrackingSchema>
): Promise<any> {
  const milestones = await buildMilestoneMap(adrs, projectPath);

  // Update TODO.md
  if (args.updateTodo) {
    updateTodoMilestones(projectPath, milestones, adrs);
  }

  // Sync to GitHub
  const githubResults: string[] = [];
  if (args.syncGithubMilestones) {
    for (const milestone of milestones) {
      const adrLinks = adrs
        .filter(a => milestone.blockers.some(b => b.includes(a.filename)))
        .map(a => `- ${a.title} (${a.filename})`)
        .join('\n');

      const description = `Milestone from release tracking.\n\nLinked ADRs:\n${adrLinks || 'None'}`;
      const result = syncGitHubMilestone(projectPath, milestone.name, description);

      githubResults.push(
        result.success
          ? `- ${milestone.name}: synced (#${result.number})`
          : `- ${milestone.name}: failed (${result.error})`
      );
    }
  }

  return validateMcpResponse({
    content: [
      {
        type: 'text',
        text: `# Milestones Synced

**Total Milestones**: ${milestones.length}
${args.updateTodo ? '**TODO.md**: Updated' : ''}
${args.syncGithubMilestones ? `**GitHub**: ${githubResults.length} milestones processed` : ''}

## Milestone Status
${milestones
  .map(
    m =>
      `### ${m.name}
- Progress: ${(m.completionRate * 100).toFixed(0)}% (${m.completed}/${m.total})
- Critical Blockers: ${m.criticalTodos}
${m.blockers.length > 0 ? m.blockers.map(b => `  - ${b}`).join('\n') : '  - None'}`
  )
  .join('\n\n')}

${
  githubResults.length > 0
    ? `## GitHub Sync Results
${githubResults.join('\n')}`
    : ''
}`,
      },
    ],
  });
}

// ─── Helpers ───────────────────────────────────────────────────────

function generateReleaseNotes(release: any): string {
  const lines: string[] = [`# ${release.version}`, ''];

  if (release.adrs.length > 0) {
    lines.push('## Architecture Decisions');
    for (const adr of release.adrs) {
      lines.push(`- **${adr.adrTitle}** (${adr.changeType})`);
    }
    lines.push('');
  }

  if (release.features.length > 0) {
    lines.push('## Features');
    for (const f of release.features) {
      lines.push(`- ${f}`);
    }
    lines.push('');
  }

  if (release.bugfixes.length > 0) {
    lines.push('## Bug Fixes');
    for (const f of release.bugfixes) {
      lines.push(`- ${f}`);
    }
    lines.push('');
  }

  if (release.breakingChanges.length > 0) {
    lines.push('## Breaking Changes');
    for (const c of release.breakingChanges) {
      lines.push(`- ${c}`);
    }
  }

  return lines.join('\n');
}

function generateMermaidTimeline(releases: any[]): string {
  if (releases.length === 0) return '';

  const lines = ['```mermaid', 'gantt', '    title Release Timeline', '    dateFormat YYYY-MM-DD'];

  for (const release of releases.slice().reverse()) {
    const date = release.date.split('T')[0];
    lines.push(`    ${release.version} :milestone, ${date}, 0d`);
  }

  lines.push('```');
  return lines.join('\n');
}
