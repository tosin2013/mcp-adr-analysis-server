#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';

interface ReleaseAnalysis {
  version: string;
  commits: CommitInfo[];
  features: string[];
  bugFixes: string[];
  securityUpdates: string[];
  breakingChanges: string[];
  performance: string[];
  dependencies: string[];
  documentation: string[];
  tests: string[];
  infrastructure: string[];
  contributors: string[];
  pullRequests: PRInfo[];
  filesChanged: FileChange[];
}

interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: string[];
  additions: number;
  deletions: number;
  prNumber?: number;
}

interface PRInfo {
  number: number;
  title: string;
  body: string;
  labels: string[];
}

interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  changeType: 'added' | 'modified' | 'deleted';
}

/**
 * Enhanced AI Release Notes Generator with proper OpenAI integration
 */
export class EnhancedAIReleaseNotesGenerator {
  private readonly openaiApiKey: string;
  private readonly model: string;
  private readonly projectRoot: string;
  private openai: OpenAI | null = null;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.RELEASE_NOTES_MODEL || 'gpt-4o-mini';
    this.projectRoot = process.cwd();
    
    if (this.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.openaiApiKey
      });
      console.log('✅ OpenAI API configured for AI enhancement');
    } else {
      console.warn('⚠️  OPENAI_API_KEY not set. Using enhanced template-based generation.');
    }
  }

  /**
   * Generate release notes for the latest tag or version
   */
  async generateReleaseNotes(): Promise<string> {
    try {
      const analysis = await this.analyzeChanges();
      let releaseNotes = await this.generateMarkdown(analysis);
      
      // Apply AI enhancement if available
      if (this.openai) {
        releaseNotes = await this.enhanceWithAI(releaseNotes, analysis);
      }
      
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
   * Analyze git commits and changes since last release with enhanced detection
   */
  private async analyzeChanges(): Promise<ReleaseAnalysis> {
    const latestTag = this.getLatestTag();
    const commits = this.getCommitsSinceTag(latestTag);
    const version = this.getNextVersion(latestTag);
    const filesChanged = this.getFilesChanged(latestTag);
    const pullRequests = this.extractPullRequests(commits);

    const analysis: ReleaseAnalysis = {
      version,
      commits,
      features: [],
      bugFixes: [],
      securityUpdates: [],
      breakingChanges: [],
      performance: [],
      dependencies: [],
      documentation: [],
      tests: [],
      infrastructure: [],
      contributors: [],
      pullRequests,
      filesChanged
    };

    // Enhanced categorization with file analysis
    for (const commit of commits) {
      await this.categorizeCommitEnhanced(commit, analysis);
    }

    // Analyze file changes for additional insights
    this.analyzeFileChanges(filesChanged, analysis);

    // Extract unique contributors
    analysis.contributors = [...new Set(commits.map(c => c.author))];

    // Sort and deduplicate categories
    Object.keys(analysis).forEach(key => {
      if (Array.isArray(analysis[key as keyof ReleaseAnalysis]) && key !== 'commits' && key !== 'pullRequests' && key !== 'filesChanged') {
        const array = analysis[key as keyof ReleaseAnalysis] as string[];
        analysis[key as keyof ReleaseAnalysis] = [...new Set(array)] as any;
      }
    });

    return analysis;
  }

  /**
   * Get detailed file changes since tag
   */
  private getFilesChanged(tag: string): FileChange[] {
    try {
      const diffStat = execSync(
        `git diff ${tag}..HEAD --numstat`,
        { encoding: 'utf8' }
      );

      const files: FileChange[] = [];
      const lines = diffStat.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const [additions, deletions, path] = line.split('\t');
        if (path) {
          const changeType = this.detectChangeType(tag, path);
          files.push({
            path,
            additions: parseInt(additions) || 0,
            deletions: parseInt(deletions) || 0,
            changeType
          });
        }
      }

      return files;
    } catch {
      return [];
    }
  }

  /**
   * Detect if file was added, modified, or deleted
   */
  private detectChangeType(tag: string, path: string): 'added' | 'modified' | 'deleted' {
    try {
      execSync(`git cat-file -e ${tag}:${path} 2>/dev/null`);
      // File existed in previous tag
      try {
        execSync(`git cat-file -e HEAD:${path} 2>/dev/null`);
        return 'modified';
      } catch {
        return 'deleted';
      }
    } catch {
      // File didn't exist in previous tag
      return 'added';
    }
  }

  /**
   * Extract PR numbers from commit messages
   */
  private extractPullRequests(commits: CommitInfo[]): PRInfo[] {
    const prs: PRInfo[] = [];
    const prNumbers = new Set<number>();

    for (const commit of commits) {
      const prMatch = commit.message.match(/#(\d+)/);
      if (prMatch) {
        const prNumber = parseInt(prMatch[1]);
        if (!prNumbers.has(prNumber)) {
          prNumbers.add(prNumber);
          // In a real implementation, fetch PR details from GitHub API
          prs.push({
            number: prNumber,
            title: commit.message,
            body: '',
            labels: []
          });
        }
      }
    }

    return prs;
  }

  /**
   * Analyze file changes to detect patterns
   */
  private analyzeFileChanges(files: FileChange[], analysis: ReleaseAnalysis): void {
    for (const file of files) {
      const path = file.path.toLowerCase();

      // Dependency changes
      if (path.includes('package.json') || path.includes('package-lock.json') || 
          path.includes('yarn.lock') || path.includes('requirements.txt')) {
        analysis.dependencies.push(`Updated dependencies in ${file.path}`);
      }

      // Documentation changes
      if (path.endsWith('.md') || path.includes('docs/')) {
        analysis.documentation.push(`Updated documentation: ${file.path}`);
      }

      // Test changes
      if (path.includes('test') || path.includes('spec') || path.endsWith('.test.ts') || path.endsWith('.spec.ts')) {
        analysis.tests.push(`Test updates in ${file.path}`);
      }

      // Infrastructure/CI changes
      if (path.includes('.github/') || path.includes('dockerfile') || 
          path.includes('docker-compose') || path.includes('.yml') || path.includes('.yaml')) {
        analysis.infrastructure.push(`Infrastructure update: ${file.path}`);
      }

      // Security-related files
      if (path.includes('security') || path.includes('auth') || path.includes('crypto') || 
          path.includes('permission') || path.includes('sanitiz')) {
        analysis.securityUpdates.push(`Security-related change in ${file.path}`);
      }

      // Performance-related files
      if (path.includes('cache') || path.includes('optimi') || path.includes('performance') || 
          path.includes('index') || path.includes('worker')) {
        analysis.performance.push(`Performance optimization in ${file.path}`);
      }
    }
  }

  /**
   * Enhanced commit categorization with intelligent detection
   */
  private async categorizeCommitEnhanced(commit: CommitInfo, analysis: ReleaseAnalysis): Promise<void> {
    const message = commit.message.toLowerCase();
    const originalMessage = commit.message;

    // Conventional commit parsing with extended types
    const conventionalCommitRegex = /^(\w+)(\(.+\))?(!)?:\s*(.+)/;
    const match = originalMessage.match(conventionalCommitRegex);

    if (match) {
      const [, type, scope, breaking, description] = match;
      
      // Breaking changes
      if (breaking || message.includes('breaking change')) {
        analysis.breakingChanges.push(originalMessage);
      }

      // Categorize by type
      switch (type) {
        case 'feat':
        case 'feature':
          analysis.features.push(originalMessage);
          break;
        case 'fix':
        case 'bugfix':
          analysis.bugFixes.push(originalMessage);
          break;
        case 'perf':
        case 'performance':
          analysis.performance.push(originalMessage);
          break;
        case 'security':
        case 'sec':
          analysis.securityUpdates.push(originalMessage);
          break;
        case 'docs':
        case 'documentation':
          analysis.documentation.push(originalMessage);
          break;
        case 'test':
        case 'tests':
          analysis.tests.push(originalMessage);
          break;
        case 'build':
        case 'ci':
        case 'chore':
          analysis.infrastructure.push(originalMessage);
          break;
        case 'deps':
        case 'dependencies':
          analysis.dependencies.push(originalMessage);
          break;
        case 'refactor':
          // Refactors might be features or performance improvements
          if (message.includes('optimi') || message.includes('performance')) {
            analysis.performance.push(originalMessage);
          } else {
            analysis.features.push(originalMessage);
          }
          break;
      }
    } else {
      // Fallback to keyword-based detection for non-conventional commits
      if (message.includes('breaking')) {
        analysis.breakingChanges.push(originalMessage);
      }
      if (message.includes('feature') || message.includes('add') || message.includes('implement')) {
        analysis.features.push(originalMessage);
      }
      if (message.includes('fix') || message.includes('bug') || message.includes('issue')) {
        analysis.bugFixes.push(originalMessage);
      }
      if (message.includes('security') || message.includes('vulnerability') || message.includes('cve')) {
        analysis.securityUpdates.push(originalMessage);
      }
      if (message.includes('performance') || message.includes('optimi') || message.includes('speed')) {
        analysis.performance.push(originalMessage);
      }
      if (message.includes('depend') || message.includes('upgrade') || message.includes('bump')) {
        analysis.dependencies.push(originalMessage);
      }
      if (message.includes('doc') || message.includes('readme')) {
        analysis.documentation.push(originalMessage);
      }
      if (message.includes('test') || message.includes('spec')) {
        analysis.tests.push(originalMessage);
      }
    }
  }

  /**
   * Get commits with detailed information
   */
  private getCommitsSinceTag(tag: string): CommitInfo[] {
    try {
      const gitLog = execSync(
        `git log ${tag}..HEAD --pretty=format:"%H|%s|%an|%ad" --date=short --numstat`,
        { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
      );

      if (!gitLog.trim()) {
        console.log(`No commits found since ${tag}`);
        return [];
      }

      const commits: CommitInfo[] = [];
      const sections = gitLog.split('\n\n').filter(s => s.trim());

      for (const section of sections) {
        const lines = section.split('\n');
        const [commitLine] = lines;
        
        if (commitLine && commitLine.includes('|')) {
          const [hash, message, author, date] = commitLine.split('|');
          
          let additions = 0;
          let deletions = 0;
          const files: string[] = [];

          // Parse numstat data
          for (let i = 1; i < lines.length; i++) {
            const statLine = lines[i].trim();
            if (statLine) {
              const [add, del, file] = statLine.split(/\s+/);
              if (file) {
                additions += parseInt(add) || 0;
                deletions += parseInt(del) || 0;
                files.push(file);
              }
            }
          }

          // Extract PR number if present
          const prMatch = message.match(/#(\d+)/);

          commits.push({
            hash: hash.substring(0, 7),
            message: message.trim(),
            author: author.trim(),
            date: date.trim(),
            files,
            additions,
            deletions,
            prNumber: prMatch ? parseInt(prMatch[1]) : undefined
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
   * Get the latest git tag
   */
  private getLatestTag(): string {
    try {
      return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    } catch {
      // Try to find any tag
      try {
        const tags = execSync('git tag -l --sort=-version:refname', { encoding: 'utf8' }).trim();
        if (tags) {
          return tags.split('\n')[0];
        }
      } catch {}
      return 'HEAD~10'; // Fallback to last 10 commits if no tags
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
    
    // Check commit types for versioning
    const commits = this.getCommitsSinceTag(currentTag);
    const hasBreaking = commits.some(c => 
      c.message.includes('BREAKING CHANGE') || 
      c.message.includes('!:') ||
      c.message.toLowerCase().includes('breaking')
    );
    const hasFeatures = commits.some(c => 
      c.message.toLowerCase().startsWith('feat') || 
      c.message.toLowerCase().includes('feature')
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
      // Fallback to a more reasonable version
      try {
        const lastTag = this.getLatestTag();
        if (lastTag && lastTag.match(/^v?\d+\.\d+\.\d+/)) {
          return lastTag;
        }
      } catch {}
      return 'v0.1.0'; // More reasonable fallback for new projects
    }
  }

  /**
   * Generate markdown release notes with enhanced formatting
   */
  private async generateMarkdown(analysis: ReleaseAnalysis): Promise<string> {
    const template = this.getEnhancedTemplate();
    
    // Calculate statistics
    const stats = {
      totalCommits: analysis.commits.length,
      filesChanged: analysis.filesChanged.length,
      additions: analysis.filesChanged.reduce((sum, f) => sum + f.additions, 0),
      deletions: analysis.filesChanged.reduce((sum, f) => sum + f.deletions, 0),
      contributors: analysis.contributors.length
    };

    let markdown = template
      .replace(/{{VERSION}}/g, analysis.version)
      .replace('{{DATE}}', new Date().toISOString().split('T')[0])
      .replace('{{STATS}}', this.formatStats(stats))
      .replace('{{HIGHLIGHTS}}', this.generateHighlights(analysis))
      .replace('{{FEATURES}}', this.formatSection(analysis.features, '✨'))
      .replace('{{BUG_FIXES}}', this.formatSection(analysis.bugFixes, '🐛'))
      .replace('{{PERFORMANCE}}', this.formatSection(analysis.performance, '⚡'))
      .replace('{{SECURITY}}', this.formatSection(analysis.securityUpdates, '🔒'))
      .replace('{{BREAKING}}', this.formatSection(analysis.breakingChanges, '💥'))
      .replace('{{DEPENDENCIES}}', this.formatSection(analysis.dependencies, '📦'))
      .replace('{{DOCUMENTATION}}', this.formatSection(analysis.documentation, '📚'))
      .replace('{{TESTS}}', this.formatSection(analysis.tests, '🧪'))
      .replace('{{INFRASTRUCTURE}}', this.formatSection(analysis.infrastructure, '🔧'))
      .replace('{{CONTRIBUTORS}}', this.formatContributors(analysis.contributors))
      .replace('{{COMMIT_DETAILS}}', this.formatCommitDetails(analysis.commits));

    return markdown;
  }

  /**
   * Get enhanced release notes template
   */
  private getEnhancedTemplate(): string {
    return `# Release {{VERSION}} ({{DATE}})

## 📊 Release Statistics

{{STATS}}

## 🎯 Release Highlights

{{HIGHLIGHTS}}

## 🚀 What's New

### Features
{{FEATURES}}

### Performance Improvements
{{PERFORMANCE}}

## 🐛 Bug Fixes

{{BUG_FIXES}}

## 🔒 Security Updates

{{SECURITY}}

## 💥 Breaking Changes

{{BREAKING}}

## 📦 Dependencies

{{DEPENDENCIES}}

## 📚 Documentation

{{DOCUMENTATION}}

## 🧪 Tests

{{TESTS}}

## 🔧 Infrastructure & Build

{{INFRASTRUCTURE}}

## 👥 Contributors

{{CONTRIBUTORS}}

## 📦 Installation

\`\`\`bash
npm install @modelcontextprotocol/mcp-adr-analysis-server@{{VERSION}}
\`\`\`

## 🔄 Upgrading

If you're upgrading from a previous version, please review the breaking changes section above.

---

<details>
<summary>📝 Commit Details</summary>

{{COMMIT_DETAILS}}

</details>

**Full Changelog**: https://github.com/tosin2013/mcp-adr-analysis-server/compare/v2.0.7...{{VERSION}}
`;
  }

  /**
   * Format statistics section
   */
  private formatStats(stats: any): string {
    return `- **${stats.totalCommits}** commits
- **${stats.filesChanged}** files changed
- **${stats.additions}** additions, **${stats.deletions}** deletions
- **${stats.contributors}** contributors`;
  }

  /**
   * Generate highlights section using AI or heuristics
   */
  private generateHighlights(analysis: ReleaseAnalysis): string {
    const highlights: string[] = [];

    // Major features
    if (analysis.features.length > 0) {
      highlights.push(`🎉 ${analysis.features.length} new features added`);
    }

    // Critical fixes
    if (analysis.securityUpdates.length > 0) {
      highlights.push(`🛡️ ${analysis.securityUpdates.length} security improvements`);
    }

    // Performance
    if (analysis.performance.length > 0) {
      highlights.push(`⚡ ${analysis.performance.length} performance optimizations`);
    }

    // Breaking changes warning
    if (analysis.breakingChanges.length > 0) {
      highlights.push(`⚠️ ${analysis.breakingChanges.length} breaking changes - please review before upgrading`);
    }

    return highlights.join('\n');
  }

  /**
   * Format a section with items
   */
  private formatSection(items: string[], emoji: string): string {
    if (items.length === 0) {
      return '_No changes in this category._';
    }

    // Group similar items and format
    const formatted = items
      .filter((item, index, self) => self.indexOf(item) === index) // Remove duplicates
      .map(item => {
        // Clean up commit messages
        const cleaned = item
          .replace(/^(feat|fix|perf|docs|test|build|ci|chore|refactor|style)(\(.+\))?(!)?:\s*/i, '')
          .replace(/^\w/, c => c.toUpperCase());
        
        return `- ${emoji} ${cleaned}`;
      })
      .sort()
      .join('\n');

    return formatted;
  }

  /**
   * Format contributors list with links
   */
  private formatContributors(contributors: string[]): string {
    if (contributors.length === 0) {
      return '_No contributors in this release._';
    }

    return contributors
      .map(contributor => {
        // Remove email if present
        const name = contributor.replace(/<.*>/, '').trim();
        return `- @${name}`;
      })
      .join('\n');
  }

  /**
   * Format commit details for collapsible section
   */
  private formatCommitDetails(commits: CommitInfo[]): string {
    return commits
      .map(commit => {
        const prRef = commit.prNumber ? ` (#${commit.prNumber})` : '';
        return `- \`${commit.hash}\` ${commit.message}${prRef} - @${commit.author} (${commit.date})`;
      })
      .join('\n');
  }

  /**
   * Enhance release notes with AI using OpenAI API
   */
  private async enhanceWithAI(markdown: string, analysis: ReleaseAnalysis): Promise<string> {
    if (!this.openai) {
      return markdown;
    }

    try {
      console.log('🤖 Enhancing release notes with AI...');

      const prompt = this.buildAIPrompt(analysis, markdown);
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert technical writer specializing in software release notes. 
Your task is to enhance release notes by:
1. Making them more clear, concise, and professional
2. Grouping related changes intelligently
3. Highlighting the most important changes for users
4. Adding context about the impact of changes
5. Ensuring consistent formatting and tone
6. Making technical changes understandable to various audiences
7. Identifying patterns and themes in the changes
8. Suggesting upgrade paths for breaking changes

Maintain the markdown structure and all existing sections. 
Focus on clarity, impact, and user value.
Do not invent or add information that isn't in the source data.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      const enhancedContent = completion.choices[0]?.message?.content;
      
      if (enhancedContent) {
        console.log('✅ AI enhancement completed');
        return enhancedContent;
      }
      
      return markdown;
    } catch (error) {
      console.error('⚠️ AI enhancement failed, using template version:', error);
      return markdown;
    }
  }

  /**
   * Build AI prompt with context
   */
  private buildAIPrompt(analysis: ReleaseAnalysis, markdown: string): string {
    return `Please enhance the following release notes for version ${analysis.version}.

Context:
- Total commits: ${analysis.commits.length}
- Key areas changed: ${this.identifyKeyAreas(analysis)}
- Breaking changes: ${analysis.breakingChanges.length > 0 ? 'Yes' : 'No'}
- Security updates: ${analysis.securityUpdates.length > 0 ? 'Yes' : 'No'}

Raw commit data summary:
- Features: ${analysis.features.length} items
- Bug fixes: ${analysis.bugFixes.length} items
- Performance: ${analysis.performance.length} items
- Dependencies: ${analysis.dependencies.length} items

Current release notes to enhance:

${markdown}

Please enhance these release notes by:
1. Improving the highlights section with the most impactful changes
2. Grouping related changes together
3. Adding brief context about why changes matter
4. Ensuring clear, consistent language
5. Making technical changes accessible
6. Highlighting any upgrade considerations

Return the enhanced markdown maintaining the same structure.`;
  }

  /**
   * Identify key areas of change for AI context
   */
  private identifyKeyAreas(analysis: ReleaseAnalysis): string {
    const areas: string[] = [];
    
    if (analysis.features.length > 0) areas.push('New Features');
    if (analysis.bugFixes.length > 0) areas.push('Bug Fixes');
    if (analysis.performance.length > 0) areas.push('Performance');
    if (analysis.securityUpdates.length > 0) areas.push('Security');
    if (analysis.breakingChanges.length > 0) areas.push('Breaking Changes');
    if (analysis.dependencies.length > 0) areas.push('Dependencies');
    if (analysis.documentation.length > 0) areas.push('Documentation');
    if (analysis.tests.length > 0) areas.push('Testing');
    if (analysis.infrastructure.length > 0) areas.push('Infrastructure');
    
    return areas.join(', ');
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
      existingChangelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
    }

    // Check if this version already exists to avoid duplicates
    const versionMatch = releaseNotes.match(/# Release (v[\d.\-\w]+)/);
    if (versionMatch) {
      // Use regex to match exact version line (not substring)
      const versionPattern = new RegExp(`^# Release ${versionMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|\\(|$)`, 'm');
      if (versionPattern.test(existingChangelog)) {
        console.log(`📝 Version ${versionMatch[1]} already exists in CHANGELOG.md, skipping to preserve history`);
        return;
      }
    }

    // Find where to insert the new release notes
    const lines = existingChangelog.split('\n');
    let insertIndex = -1;
    let foundHeader = false;
    
    // Look for the right place to insert
    for (let i = 0; i < lines.length; i++) {
      // Skip the main "# Changelog" header
      if (lines[i].startsWith('# Changelog')) {
        foundHeader = true;
        continue;
      }
      
      // Skip description lines after main header
      if (foundHeader && !lines[i].startsWith('# Release ') && lines[i].trim() !== '') {
        continue;
      }
      
      // Found first release section - insert before it to maintain chronological order
      if (lines[i].startsWith('# Release ')) {
        insertIndex = i;
        break;
      }
      
      // Found empty line after header section - good place to insert if no releases yet
      if (foundHeader && lines[i].trim() === '' && (i + 1 >= lines.length || !lines[i + 1].startsWith('# Release '))) {
        insertIndex = i + 1;
        break;
      }
    }
    
    // If no good position found, append at the end
    if (insertIndex === -1) {
      // Make sure there's a blank line before appending
      if (lines[lines.length - 1]?.trim() !== '') {
        lines.push('');
      }
      insertIndex = lines.length;
    }
    
    // Insert the new release notes (newest first)
    lines.splice(insertIndex, 0, releaseNotes, '');
    
    // Clean up any excessive blank lines
    const cleanedContent = lines.join('\n').replace(/\n{3,}/g, '\n\n');
    
    writeFileSync(changelogPath, cleanedContent);
    console.log(`📝 Added version ${versionMatch?.[1] || 'unknown'} to CHANGELOG.md (preserving all previous versions)`);
  }
}

// CLI execution
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const generator = new EnhancedAIReleaseNotesGenerator();
  generator.generateReleaseNotes()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}