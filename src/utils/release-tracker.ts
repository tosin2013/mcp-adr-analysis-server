/**
 * Release Tracker Utility
 *
 * Core engine for release tracking that maps ADRs to releases,
 * generates changelogs, manages milestones, and supports both
 * greenfield and brownfield applications.
 *
 * No AI dependency — all deterministic git/file analysis.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import * as os from 'os';
import { DiscoveredAdr } from './adr-discovery.js';
import {
  MilestoneStatus,
  ReleaseReadinessResult,
  analyzeReleaseReadiness,
} from './release-readiness-detector.js';

// ─── Data Structures ───────────────────────────────────────────────

export interface Release {
  version: string;
  date: string;
  source: 'git_tag' | 'github_release' | 'manual';
  commitRange: { from: string; to: string };
  adrs: AdrReleaseMapping[];
  features: string[];
  bugfixes: string[];
  breakingChanges: string[];
  metadata?: {
    author?: string;
    tagMessage?: string;
    githubReleaseUrl?: string;
  };
}

export interface AdrReleaseMapping {
  adrFilename: string;
  adrTitle: string;
  adrStatus: string;
  mappingMethod: 'git_history' | 'date_range' | 'content_reference' | 'manual';
  confidence: number;
  changeType: 'introduced' | 'implemented' | 'modified' | 'deprecated';
  relevantCommits?: string[];
}

export interface ReleaseTrackingState {
  projectType: 'greenfield' | 'brownfield';
  detectedPhase: 'startup' | 'growth' | 'mature' | 'maintenance';
  releases: Release[];
  unmappedAdrs: string[];
  milestones: MilestoneStatus[];
  lastScanTimestamp: string;
}

export interface ChangelogOptions {
  format: 'markdown' | 'keep-a-changelog' | 'conventional';
  includeAdrLinks: boolean;
  includeCommitHashes: boolean;
  groupByAdr: boolean;
}

export interface ReleaseComparison {
  fromVersion: string;
  toVersion: string;
  addedAdrs: AdrReleaseMapping[];
  modifiedAdrs: AdrReleaseMapping[];
  deprecatedAdrs: AdrReleaseMapping[];
  featuresDelta: string[];
  bugfixesDelta: string[];
  breakingChangesDelta: string[];
}

// ─── Release Detection ─────────────────────────────────────────────

/**
 * Detect releases from git tags and optionally GitHub Releases.
 */
export async function detectReleases(projectPath: string): Promise<Release[]> {
  const releases: Release[] = [];

  try {
    // Get all semver-like tags sorted by version
    const tagOutput = execSync(
      "git tag -l --sort=-version:refname --format='%(refname:short)|%(creatordate:iso-strict)|%(objectname:short)'",
      { cwd: projectPath, encoding: 'utf8', timeout: 10000 }
    ).trim();

    if (!tagOutput) {
      return [];
    }

    const tags = tagOutput
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.replace(/'/g, '').split('|');
        return {
          tag: parts[0] || '',
          date: parts[1] || new Date().toISOString(),
          commit: parts[2] || '',
        };
      })
      .filter(t => /^v?\d+\.\d+/.test(t.tag));

    // Build releases from tag pairs
    for (let i = 0; i < tags.length; i++) {
      const current = tags[i]!;
      const previous = tags[i + 1];

      const commitRange = {
        from: previous ? previous.commit : getFirstCommit(projectPath),
        to: current.commit,
      };

      // Get commits in this range
      const { features, bugfixes, breakingChanges } = categorizeCommits(
        projectPath,
        commitRange.from,
        commitRange.to
      );

      releases.push({
        version: current.tag,
        date: current.date,
        source: 'git_tag',
        commitRange,
        adrs: [],
        features,
        bugfixes,
        breakingChanges,
      });
    }
  } catch {
    // Not a git repo or no tags — greenfield scenario
  }

  return releases;
}

/**
 * Detect project type based on git history and ADR presence.
 */
export async function detectProjectType(
  projectPath: string,
  adrCount: number
): Promise<{ projectType: 'greenfield' | 'brownfield'; phase: string }> {
  let commitCount = 0;
  let tagCount = 0;

  try {
    commitCount = parseInt(
      execSync('git rev-list --count HEAD', {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 5000,
      }).trim(),
      10
    );
  } catch {
    commitCount = 0;
  }

  try {
    tagCount = parseInt(
      execSync("git tag -l 'v*' | wc -l", {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 5000,
      }).trim(),
      10
    );
  } catch {
    tagCount = 0;
  }

  const projectType: 'greenfield' | 'brownfield' =
    tagCount === 0 && commitCount < 50 && adrCount < 3 ? 'greenfield' : 'brownfield';

  let phase: string;
  if (commitCount < 100) phase = 'startup';
  else if (commitCount < 500) phase = 'growth';
  else if (commitCount < 2000) phase = 'mature';
  else phase = 'maintenance';

  return { projectType, phase };
}

// ─── ADR-to-Release Mapping ────────────────────────────────────────

/**
 * Three-pass mapping of ADRs to releases.
 * Pass 1: Git history — match ADR file commits to release ranges
 * Pass 2: Date range — ADR dates vs release windows
 * Pass 3: Content reference — scan commit messages for ADR number references
 */
export async function mapAdrsToReleases(
  adrs: DiscoveredAdr[],
  releases: Release[],
  projectPath: string
): Promise<{ mappedReleases: Release[]; unmappedAdrs: string[] }> {
  const mappedAdrs = new Set<string>();

  // Clone releases to avoid mutating originals
  const result = releases.map(r => ({ ...r, adrs: [...r.adrs] }));

  for (const adr of adrs) {
    let mapped = false;

    // Pass 1: Git history — find commits that touched this ADR file
    try {
      const adrCommits = execSync(`git log --follow --format='%H|%aI' -- "${adr.path}"`, {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 5000,
      })
        .trim()
        .split('\n')
        .filter(l => l.trim())
        .map(l => {
          const parts = l.replace(/'/g, '').split('|');
          return { hash: parts[0] || '', date: parts[1] || '' };
        });

      if (adrCommits.length > 0) {
        // Find which release range contains the earliest commit
        for (const release of result) {
          const isInRange = adrCommits.some(c => {
            try {
              const check = execSync(
                `git merge-base --is-ancestor ${c.hash.substring(0, 8)} ${release.commitRange.to}`,
                { cwd: projectPath, encoding: 'utf8', timeout: 5000 }
              );
              return check !== undefined || check === '';
            } catch {
              return false;
            }
          });

          if (isInRange) {
            const changeType = determineChangeType(adr, adrCommits);
            release.adrs.push({
              adrFilename: adr.filename,
              adrTitle: adr.title,
              adrStatus: adr.status,
              mappingMethod: 'git_history',
              confidence: 0.9,
              changeType,
              relevantCommits: adrCommits.map(c => c.hash.substring(0, 8)),
            });
            mappedAdrs.add(adr.filename);
            mapped = true;
            break;
          }
        }
      }
    } catch {
      // Git command failed, try next pass
    }

    // Pass 2: Date range — match ADR date to release windows
    if (!mapped && adr.date) {
      const adrDate = new Date(adr.date);
      if (!isNaN(adrDate.getTime())) {
        for (const release of result) {
          const releaseDate = new Date(release.date);
          if (adrDate <= releaseDate) {
            release.adrs.push({
              adrFilename: adr.filename,
              adrTitle: adr.title,
              adrStatus: adr.status,
              mappingMethod: 'date_range',
              confidence: 0.6,
              changeType: determineChangeTypeFromStatus(adr.status),
            });
            mappedAdrs.add(adr.filename);
            mapped = true;
            break;
          }
        }
      }
    }

    // Pass 3: Content reference — scan commit messages for ADR references
    if (!mapped && adr.metadata?.number) {
      const adrNumber = adr.metadata.number;
      for (const release of result) {
        try {
          const commitMessages = execSync(
            `git log ${release.commitRange.from}..${release.commitRange.to} --format='%s' 2>/dev/null`,
            { cwd: projectPath, encoding: 'utf8', timeout: 5000 }
          ).trim();

          const pattern = new RegExp(`ADR[-_]?0*${adrNumber}\\b`, 'i');
          if (pattern.test(commitMessages)) {
            release.adrs.push({
              adrFilename: adr.filename,
              adrTitle: adr.title,
              adrStatus: adr.status,
              mappingMethod: 'content_reference',
              confidence: 0.7,
              changeType: 'implemented',
            });
            mappedAdrs.add(adr.filename);
            mapped = true;
            break;
          }
        } catch {
          // Continue to next release
        }
      }
    }
  }

  const unmappedAdrs = adrs.filter(a => !mappedAdrs.has(a.filename)).map(a => a.filename);

  return { mappedReleases: result, unmappedAdrs };
}

// ─── Changelog Generation ──────────────────────────────────────────

/**
 * Generate CHANGELOG.md content in Keep a Changelog format.
 */
export function generateChangelog(
  releases: Release[],
  options: ChangelogOptions = {
    format: 'keep-a-changelog',
    includeAdrLinks: true,
    includeCommitHashes: false,
    groupByAdr: false,
  }
): string {
  const lines: string[] = [
    '# Changelog',
    '',
    'All notable changes to this project will be documented in this file.',
    '',
    'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),',
    'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
    '',
  ];

  for (const release of releases) {
    const dateStr = release.date ? release.date.split('T')[0] : 'Unreleased';
    lines.push(`## [${release.version}] - ${dateStr}`);
    lines.push('');

    if (options.groupByAdr && release.adrs.length > 0) {
      lines.push('### Architecture Decisions');
      for (const adr of release.adrs) {
        const confidence = options.includeAdrLinks
          ? ` (confidence: ${(adr.confidence * 100).toFixed(0)}%)`
          : '';
        lines.push(`- **${adr.adrTitle}** [${adr.changeType}]${confidence}`);
      }
      lines.push('');
    }

    if (release.features.length > 0) {
      lines.push('### Added');
      for (const feature of release.features) {
        lines.push(`- ${feature}`);
      }
      lines.push('');
    }

    if (release.bugfixes.length > 0) {
      lines.push('### Fixed');
      for (const fix of release.bugfixes) {
        lines.push(`- ${fix}`);
      }
      lines.push('');
    }

    if (release.breakingChanges.length > 0) {
      lines.push('### Breaking Changes');
      for (const change of release.breakingChanges) {
        lines.push(`- ${change}`);
      }
      lines.push('');
    }

    if (!options.groupByAdr && release.adrs.length > 0 && options.includeAdrLinks) {
      lines.push('### Related ADRs');
      for (const adr of release.adrs) {
        lines.push(`- ${adr.adrFilename}: ${adr.adrTitle} (${adr.changeType})`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Write CHANGELOG.md to the project root.
 */
export function writeChangelog(projectPath: string, content: string): void {
  const changelogPath = join(projectPath, 'CHANGELOG.md');
  writeFileSync(changelogPath, content, 'utf8');
}

// ─── Release Comparison ────────────────────────────────────────────

/**
 * Compare two releases showing ADR changes between them.
 */
export function compareReleases(
  releases: Release[],
  fromVersion: string,
  toVersion: string
): ReleaseComparison {
  const fromRelease = releases.find(r => r.version === fromVersion);
  const toRelease = releases.find(r => r.version === toVersion);

  if (!fromRelease || !toRelease) {
    return {
      fromVersion,
      toVersion,
      addedAdrs: [],
      modifiedAdrs: [],
      deprecatedAdrs: [],
      featuresDelta: [],
      bugfixesDelta: [],
      breakingChangesDelta: [],
    };
  }

  const fromAdrFiles = new Set(fromRelease.adrs.map(a => a.adrFilename));

  const addedAdrs = toRelease.adrs.filter(a => !fromAdrFiles.has(a.adrFilename));
  const modifiedAdrs = toRelease.adrs.filter(
    a => fromAdrFiles.has(a.adrFilename) && a.changeType === 'modified'
  );
  const deprecatedAdrs = toRelease.adrs.filter(a => a.changeType === 'deprecated');

  return {
    fromVersion,
    toVersion,
    addedAdrs,
    modifiedAdrs,
    deprecatedAdrs,
    featuresDelta: toRelease.features.filter(f => !fromRelease.features.includes(f)),
    bugfixesDelta: toRelease.bugfixes.filter(f => !fromRelease.bugfixes.includes(f)),
    breakingChangesDelta: toRelease.breakingChanges.filter(
      c => !fromRelease.breakingChanges.includes(c)
    ),
  };
}

// ─── Milestone Management ──────────────────────────────────────────

/**
 * Build milestone map linking ADRs to milestones and tasks.
 */
export async function buildMilestoneMap(
  adrs: DiscoveredAdr[],
  projectPath: string
): Promise<MilestoneStatus[]> {
  // Get milestones from release readiness detector (parses TODO.md)
  try {
    const readiness = await analyzeReleaseReadiness({ projectPath });
    const milestones = readiness.milestones;

    // Enrich milestones with ADR cross-references
    for (const milestone of milestones) {
      const milestoneName = milestone.name.toLowerCase();
      // Find ADRs that relate to this milestone by name matching
      for (const adr of adrs) {
        const adrTitle = adr.title.toLowerCase();
        const adrContext = (adr.context || '').toLowerCase();
        if (adrTitle.includes(milestoneName) || adrContext.includes(milestoneName)) {
          if (!milestone.blockers.includes(adr.filename)) {
            milestone.blockers.push(`[ADR] ${adr.filename}: ${adr.title}`);
          }
        }
      }
    }

    return milestones;
  } catch {
    return [];
  }
}

// ─── GitHub Integration ────────────────────────────────────────────

/**
 * Create a GitHub Release with ADR-linked release notes.
 */
export function createGitHubRelease(
  projectPath: string,
  version: string,
  releaseNotes: string
): { success: boolean; url?: string; error?: string } {
  try {
    const output = execSync(`gh release create "${version}" --title "${version}" --notes-file -`, {
      cwd: projectPath,
      encoding: 'utf8',
      input: releaseNotes,
      timeout: 30000,
    }).trim();

    return { success: true, url: output };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create or update a GitHub milestone linked to ADRs.
 */
export function syncGitHubMilestone(
  projectPath: string,
  title: string,
  description: string,
  dueDate?: string
): { success: boolean; number?: number; error?: string } {
  try {
    // Check if milestone exists
    const existing = execSync(
      `gh api repos/{owner}/{repo}/milestones --jq '.[] | select(.title == "${title}") | .number'`,
      { cwd: projectPath, encoding: 'utf8', timeout: 10000 }
    ).trim();

    if (existing) {
      // Update existing
      const dueDateParam = dueDate ? ` -f due_on="${dueDate}T00:00:00Z"` : '';
      execSync(
        `gh api repos/{owner}/{repo}/milestones/${existing} -X PATCH -f description="${description}"${dueDateParam}`,
        { cwd: projectPath, encoding: 'utf8', timeout: 10000 }
      );
      return { success: true, number: parseInt(existing, 10) };
    } else {
      // Create new
      const dueDateParam = dueDate ? ` -f due_on="${dueDate}T00:00:00Z"` : '';
      const output = execSync(
        `gh api repos/{owner}/{repo}/milestones -f title="${title}" -f description="${description}"${dueDateParam} --jq '.number'`,
        { cwd: projectPath, encoding: 'utf8', timeout: 10000 }
      ).trim();
      return { success: true, number: parseInt(output, 10) };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ─── TODO.md Milestone Update ──────────────────────────────────────

/**
 * Update milestone sections in TODO.md with ADR cross-references.
 */
export function updateTodoMilestones(
  projectPath: string,
  milestones: MilestoneStatus[],
  adrs: DiscoveredAdr[]
): void {
  const todoPath = join(projectPath, 'TODO.md');

  if (!existsSync(todoPath)) {
    // Create a new TODO.md with milestone structure
    const content = generateTodoFromMilestones(milestones, adrs);
    writeFileSync(todoPath, content, 'utf8');
    return;
  }

  // Read existing and update milestone status comments
  let content = readFileSync(todoPath, 'utf8');

  // Add/update release tracking section at the end
  const trackingSection = generateTrackingSection(milestones, adrs);
  const trackingMarker = '<!-- RELEASE TRACKING -->';
  const trackingEndMarker = '<!-- /RELEASE TRACKING -->';

  if (content.includes(trackingMarker)) {
    const startIdx = content.indexOf(trackingMarker);
    const endIdx = content.indexOf(trackingEndMarker);
    if (endIdx > startIdx) {
      content =
        content.substring(0, startIdx) +
        trackingSection +
        content.substring(endIdx + trackingEndMarker.length);
    }
  } else {
    content += '\n\n' + trackingSection;
  }

  writeFileSync(todoPath, content, 'utf8');
}

// ─── Cache Management ──────────────────────────────────────────────

/**
 * Load cached release tracking state.
 */
export function loadTrackingState(projectPath: string): ReleaseTrackingState | null {
  const cachePath = getTrackingCachePath(projectPath);
  if (!existsSync(cachePath)) return null;

  try {
    return JSON.parse(readFileSync(cachePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Save release tracking state to cache.
 */
export function saveTrackingState(projectPath: string, state: ReleaseTrackingState): void {
  const cachePath = getTrackingCachePath(projectPath);
  const cacheDir = join(cachePath, '..');
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  writeFileSync(cachePath, JSON.stringify(state, null, 2), 'utf8');
}

// ─── Next Release Preview ──────────────────────────────────────────

/**
 * Preview what the next release would contain.
 */
export async function previewNextRelease(
  projectPath: string,
  adrs: DiscoveredAdr[],
  releases: Release[]
): Promise<{
  unreleaseCommits: string[];
  pendingAdrs: DiscoveredAdr[];
  readiness: ReleaseReadinessResult;
  suggestedVersion: string;
}> {
  let unreleaseCommits: string[] = [];

  // Get commits since last tag
  try {
    const lastTag =
      releases.length > 0
        ? releases[0]!.version
        : execSync("git describe --tags --abbrev=0 2>/dev/null || echo ''", {
            cwd: projectPath,
            encoding: 'utf8',
            timeout: 5000,
          }).trim();

    if (lastTag) {
      unreleaseCommits = execSync(`git log ${lastTag}..HEAD --oneline 2>/dev/null`, {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 5000,
      })
        .trim()
        .split('\n')
        .filter(l => l.trim());
    } else {
      unreleaseCommits = execSync('git log --oneline -20 2>/dev/null', {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 5000,
      })
        .trim()
        .split('\n')
        .filter(l => l.trim());
    }
  } catch {
    unreleaseCommits = [];
  }

  // Find ADRs not in any release
  const releasedAdrFiles = new Set(releases.flatMap(r => r.adrs.map(a => a.adrFilename)));
  const pendingAdrs = adrs.filter(
    a => !releasedAdrFiles.has(a.filename) && a.status.toLowerCase() === 'accepted'
  );

  // Get release readiness
  const readiness = await analyzeReleaseReadiness({ projectPath });

  // Suggest version bump
  const hasBreaking = unreleaseCommits.some(c => c.includes('BREAKING') || c.includes('!:'));
  const hasFeatures = unreleaseCommits.some(c => c.includes('feat:') || c.includes('feat('));
  const suggestedVersion = hasBreaking ? 'major' : hasFeatures ? 'minor' : 'patch';

  return { unreleaseCommits, pendingAdrs, readiness, suggestedVersion };
}

// ─── Private Helpers ───────────────────────────────────────────────

function getFirstCommit(projectPath: string): string {
  try {
    return execSync('git rev-list --max-parents=0 HEAD', {
      cwd: projectPath,
      encoding: 'utf8',
      timeout: 5000,
    })
      .trim()
      .split('\n')[0]!
      .substring(0, 8);
  } catch {
    return '';
  }
}

function categorizeCommits(
  projectPath: string,
  from: string,
  to: string
): { features: string[]; bugfixes: string[]; breakingChanges: string[] } {
  const features: string[] = [];
  const bugfixes: string[] = [];
  const breakingChanges: string[] = [];

  try {
    const commits = execSync(`git log ${from}..${to} --format='%s' 2>/dev/null`, {
      cwd: projectPath,
      encoding: 'utf8',
      timeout: 10000,
    })
      .trim()
      .split('\n')
      .filter(l => l.trim());

    for (const msg of commits) {
      const cleaned = msg.replace(/'/g, '');
      if (/^feat[:(]/i.test(cleaned) || /add /i.test(cleaned)) {
        features.push(cleaned);
      } else if (/^fix[:(]/i.test(cleaned)) {
        bugfixes.push(cleaned);
      }
      if (/BREAKING|!:/i.test(cleaned)) {
        breakingChanges.push(cleaned);
      }
    }
  } catch {
    // Ignore git errors
  }

  return { features, bugfixes, breakingChanges };
}

function determineChangeType(
  adr: DiscoveredAdr,
  commits: { hash: string; date: string }[]
): 'introduced' | 'implemented' | 'modified' | 'deprecated' {
  if (adr.status.toLowerCase() === 'deprecated') return 'deprecated';
  if (commits.length === 1) return 'introduced';
  if (commits.length > 1) return 'modified';
  return 'implemented';
}

function determineChangeTypeFromStatus(
  status: string
): 'introduced' | 'implemented' | 'modified' | 'deprecated' {
  const s = status.toLowerCase();
  if (s === 'deprecated' || s === 'superseded') return 'deprecated';
  if (s === 'proposed' || s === 'draft') return 'introduced';
  if (s === 'accepted') return 'implemented';
  return 'modified';
}

function getTrackingCachePath(projectPath: string): string {
  const projectName = basename(projectPath);
  return join(os.tmpdir(), projectName, 'cache', 'release-tracking.json');
}

function generateTodoFromMilestones(milestones: MilestoneStatus[], adrs: DiscoveredAdr[]): string {
  const lines: string[] = ['# TODO', '', '## Release Tracking', ''];

  if (milestones.length > 0) {
    for (const milestone of milestones) {
      lines.push(`### ${milestone.name}`);
      lines.push(`<!-- Completion: ${(milestone.completionRate * 100).toFixed(1)}% -->`);
      lines.push('');
    }
  }

  if (adrs.length > 0) {
    lines.push('## ADR Implementation Status', '');
    for (const adr of adrs) {
      const isComplete = adr.status.toLowerCase() === 'accepted';
      lines.push(`- [${isComplete ? 'x' : ' '}] ${adr.title} (${adr.filename})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generateTrackingSection(milestones: MilestoneStatus[], adrs: DiscoveredAdr[]): string {
  const lines: string[] = [
    '<!-- RELEASE TRACKING -->',
    '',
    '## Release Tracking Status',
    '',
    `_Last updated: ${new Date().toISOString().split('T')[0]}_`,
    '',
  ];

  if (milestones.length > 0) {
    lines.push('### Milestone Progress');
    lines.push('| Milestone | Progress | Completion |');
    lines.push('|-----------|----------|------------|');
    for (const m of milestones) {
      const bar = `${'█'.repeat(Math.floor(m.completionRate * 10))}${'░'.repeat(10 - Math.floor(m.completionRate * 10))}`;
      lines.push(
        `| ${m.name} | ${bar} | ${(m.completionRate * 100).toFixed(0)}% (${m.completed}/${m.total}) |`
      );
    }
    lines.push('');
  }

  const unmappedAdrs = adrs.filter(
    a => a.status.toLowerCase() !== 'deprecated' && a.status.toLowerCase() !== 'superseded'
  );
  if (unmappedAdrs.length > 0) {
    lines.push('### ADR Status');
    for (const adr of unmappedAdrs) {
      lines.push(`- **${adr.title}**: ${adr.status}`);
    }
    lines.push('');
  }

  lines.push('<!-- /RELEASE TRACKING -->');
  return lines.join('\n');
}
