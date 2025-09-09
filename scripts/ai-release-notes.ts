#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ReleaseAnalysis {
  version: string;
  commits: CommitInfo[];
  features: string[];
  bugFixes: string[];
  securityUpdates: string[];
  breakingChanges: string[];
  contributors: string[];
}

interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: string[];
}

/**
 * AI-Enhanced Release Notes Generator
 * Generates comprehensive release notes using commit analysis and AI enhancement
 */
export class AIReleaseNotesGenerator {
  private readonly openaiApiKey: string;
  private readonly model: string;
  private readonly projectRoot: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.RELEASE_NOTES_MODEL || 'gpt-4';
    this.projectRoot = process.cwd();
    
    if (!this.openaiApiKey) {
      console.warn('⚠️  OPENAI_API_KEY not set. Using template-based generation.');
    }
  }

  /**
   * Generate release notes for the latest tag or version
   */
  async generateReleaseNotes(): Promise<string> {
    try {
      const analysis = await this.analyzeChanges();
      const releaseNotes = await this.generateMarkdown(analysis);
      
      // Write to CHANGELOG.md
      this.updateChangelog(releaseNotes);
      
      console.log('✅ Release notes generated successfully!');
      return releaseNotes;
    } catch (error) {
      console.error('❌ Failed to generate release notes:', error);
      throw error;
    }
  }

  /**
   * Analyze git commits and changes since last release
   */
  private async analyzeChanges(): Promise<ReleaseAnalysis> {
    const latestTag = this.getLatestTag();
    const commits = this.getCommitsSinceTag(latestTag);
    const version = this.getNextVersion(latestTag);

    const analysis: ReleaseAnalysis = {
      version,
      commits,
      features: [],
      bugFixes: [],
      securityUpdates: [],
      breakingChanges: [],
      contributors: []
    };

    // Categorize commits
    for (const commit of commits) {
      this.categorizeCommit(commit, analysis);
    }

    // Extract unique contributors
    analysis.contributors = [...new Set(commits.map(c => c.author))];

    return analysis;
  }

  /**
   * Get the latest git tag
   */
  private getLatestTag(): string {
    try {
      return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    } catch {
      return 'HEAD~10'; // Fallback to last 10 commits if no tags
    }
  }

  /**
   * Get commits since the specified tag/reference
   */
  private getCommitsSinceTag(tag: string): CommitInfo[] {
    try {
      const gitLog = execSync(
        `git log ${tag}..HEAD --pretty=format:"%H|%s|%an|%ad" --date=short`,
        { encoding: 'utf8' }
      );

      if (!gitLog.trim()) {
        console.log(`No commits found since ${tag}`);
        return [];
      }

      const commits: CommitInfo[] = [];
      const lines = gitLog.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const [hash, message, author, date] = line.split('|');
        if (hash && message && author && date) {
          commits.push({
            hash: hash.substring(0, 7),
            message: message.trim(),
            author: author.trim(),
            date: date.trim(),
            files: [] // Simplified for now
          });
        }
      }

      console.log(`Found ${commits.length} commits since ${tag}`);
      return commits;
    } catch (error) {
      console.error(`Error getting commits since ${tag}:`, error);
      return [];
    }
  }

  /**
   * Generate next version number based on change analysis
   */
  private getNextVersion(currentTag: string): string {
    // For manual releases, use package.json version as the target
    const packageVersion = this.getVersionFromPackageJson();
    
    if (!currentTag.match(/^v?\d+\.\d+\.\d+/)) {
      // If no valid tag exists, get version from package.json
      return packageVersion;
    }

    // Check if package.json has been manually updated to a specific version
    const currentVersion = currentTag.replace(/^v/, '');
    const targetVersion = packageVersion.replace(/^v/, '');
    
    if (targetVersion !== currentVersion) {
      console.log(`Using package.json version ${packageVersion} instead of auto-generated version`);
      return packageVersion;
    }

    // Auto-generate version based on commits
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    // Check if there are breaking changes, features, or just fixes
    const commits = this.getCommitsSinceTag(currentTag);
    const hasBreaking = commits.some(c => 
      c.message.includes('BREAKING CHANGE') || c.message.startsWith('feat!:')
    );
    const hasFeatures = commits.some(c => 
      c.message.startsWith('feat:') && !c.message.startsWith('feat!:')
    );
    
    if (hasBreaking) {
      return `v${major + 1}.0.0`;
    } else if (hasFeatures) {
      return `v${major}.${minor + 1}.0`;
    } else {
      return `v${major}.${minor}.${patch + 1}`;
    }
  }

  /**
   * Get version from package.json as fallback
   */
  private getVersionFromPackageJson(): string {
    try {
      const packageJson = JSON.parse(
        readFileSync(join(this.projectRoot, 'package.json'), 'utf8')
      );
      return `v${packageJson.version}`;
    } catch {
      return 'v2.1.0'; // Ultimate fallback
    }
  }

  /**
   * Categorize commit based on conventional commit format and content
   */
  private categorizeCommit(commit: CommitInfo, analysis: ReleaseAnalysis): void {
    const message = commit.message.toLowerCase();
    const originalMessage = commit.message;

    if (message.includes('breaking change') || message.startsWith('feat!:')) {
      analysis.breakingChanges.push(originalMessage);
    } else if (message.startsWith('feat:') || message.includes('feature')) {
      analysis.features.push(originalMessage);
    } else if (message.startsWith('fix:') || message.includes('bug')) {
      analysis.bugFixes.push(originalMessage);
    } else if (message.includes('security') || message.includes('vulnerability')) {
      analysis.securityUpdates.push(originalMessage);
    } else if (message.startsWith('chore:') || message.startsWith('docs:') || message.startsWith('style:') || message.startsWith('refactor:')) {
      // Include maintenance commits as features for completeness
      analysis.features.push(originalMessage);
    }
  }

  /**
   * Generate markdown release notes
   */
  private async generateMarkdown(analysis: ReleaseAnalysis): Promise<string> {
    const template = this.getTemplate();
    
    let markdown = template
      .replace(/{{VERSION}}/g, analysis.version)
      .replace('{{DATE}}', new Date().toISOString().split('T')[0])
      .replace('{{FEATURES}}', this.formatSection(analysis.features, '✨'))
      .replace('{{BUG_FIXES}}', this.formatSection(analysis.bugFixes, '🐛'))
      .replace('{{SECURITY}}', this.formatSection(analysis.securityUpdates, '🔒'))
      .replace('{{BREAKING}}', this.formatSection(analysis.breakingChanges, '💥'))
      .replace('{{CONTRIBUTORS}}', this.formatContributors(analysis.contributors));

    // AI Enhancement (if API key available)
    if (this.openaiApiKey) {
      markdown = await this.enhanceWithAI(markdown, analysis);
    }

    return markdown;
  }

  /**
   * Get release notes template
   */
  private getTemplate(): string {
    return `# Release {{VERSION}} ({{DATE}})

## 🚀 What's New

{{FEATURES}}

## 🐛 Bug Fixes

{{BUG_FIXES}}

## 🔒 Security Updates

{{SECURITY}}

## 💥 Breaking Changes

{{BREAKING}}

## 👥 Contributors

{{CONTRIBUTORS}}

## 📦 Installation

\`\`\`bash
npm install @modelcontextprotocol/mcp-adr-analysis-server@{{VERSION}}
\`\`\`

---

**Full Changelog**: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.0.7...{{VERSION}}
`;
  }

  /**
   * Format a section with items
   */
  private formatSection(items: string[], emoji: string): string {
    if (items.length === 0) {
      return '_No changes in this category._';
    }

    return items
      .map(item => `- ${emoji} ${item}`)
      .join('\n');
  }

  /**
   * Format contributors list
   */
  private formatContributors(contributors: string[]): string {
    return contributors
      .map(contributor => `- @${contributor}`)
      .join('\n');
  }

  /**
   * Enhance release notes with AI (placeholder for OpenAI integration)
   */
  private async enhanceWithAI(markdown: string, analysis: ReleaseAnalysis): Promise<string> {
    // This would integrate with OpenAI API to enhance the release notes
    // For now, return the template-based version
    console.log('🤖 AI enhancement would be applied here with OpenAI API');
    return markdown;
  }

  /**
   * Update CHANGELOG.md with new release notes
   */
  private updateChangelog(releaseNotes: string): void {
    const changelogPath = join(this.projectRoot, 'CHANGELOG.md');
    let existingChangelog = '';

    if (existsSync(changelogPath)) {
      existingChangelog = readFileSync(changelogPath, 'utf8');
    } else {
      existingChangelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
    }

    // Check if this version already exists to avoid duplicates
    const versionMatch = releaseNotes.match(/# Release (v[\d.]+)/);
    if (versionMatch && existingChangelog.includes(versionMatch[1])) {
      console.log(`📝 Version ${versionMatch[1]} already exists in CHANGELOG.md, skipping update`);
      return;
    }

    // Insert new release notes after the header
    const lines = existingChangelog.split('\n');
    let headerEndIndex = lines.findIndex(line => line.startsWith('# Release '));
    
    // If no existing release section found, insert after main header
    if (headerEndIndex === -1) {
      headerEndIndex = Math.max(4, lines.findIndex(line => line.trim() === '') + 1);
    }
    
    lines.splice(headerEndIndex, 0, releaseNotes, '');
    
    writeFileSync(changelogPath, lines.join('\n'));
    console.log('📝 Updated CHANGELOG.md');
  }
}

// CLI execution
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const generator = new AIReleaseNotesGenerator();
  generator.generateReleaseNotes()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
