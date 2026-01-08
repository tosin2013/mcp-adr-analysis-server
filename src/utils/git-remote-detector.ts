/**
 * Git Remote Detection Utility
 * Auto-detects repository name from git remote origin for ADR Aggregator integration
 */

import { execSync } from 'node:child_process';
import { McpAdrError } from '../types/index.js';

/**
 * Git hosting provider
 */
export type GitProvider = 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'unknown';

/**
 * Git remote information
 */
export interface GitRemoteInfo {
  /** Full remote URL */
  remoteUrl: string;
  /** Extracted owner/repo format (e.g., "tosin2013/mcp-adr-analysis-server") */
  repositoryName: string;
  /** Git hosting provider */
  provider: GitProvider;
  /** Current branch name */
  currentBranch: string;
}

/**
 * Detect git remote origin and extract repository information
 *
 * @param projectPath - Path to the project directory (defaults to cwd)
 * @returns Git remote information including repository name
 * @throws McpAdrError if not a git repository or remote detection fails
 *
 * @example
 * ```typescript
 * const gitInfo = detectGitRemote('/path/to/project');
 * console.log(gitInfo.repositoryName); // "owner/repo"
 * console.log(gitInfo.provider); // "github"
 * ```
 */
export function detectGitRemote(projectPath: string = process.cwd()): GitRemoteInfo {
  try {
    // Get remote origin URL
    const remoteUrl = execSync('git config --get remote.origin.url', {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // Get current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // Extract repository name from URL
    const { repositoryName, provider } = parseRemoteUrl(remoteUrl);

    return {
      remoteUrl,
      repositoryName,
      provider,
      currentBranch,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to detect git remote: ${error instanceof Error ? error.message : String(error)}`,
      'GIT_REMOTE_DETECTION_ERROR'
    );
  }
}

/**
 * Parse remote URL to extract repository name and provider
 *
 * Supports:
 * - SSH format: git@github.com:owner/repo.git
 * - HTTPS format: https://github.com/owner/repo.git
 * - Azure DevOps: https://dev.azure.com/org/project/_git/repo
 */
function parseRemoteUrl(url: string): { repositoryName: string; provider: GitProvider } {
  let repositoryName = '';
  let provider: GitProvider = 'unknown';

  // Handle SSH format: git@github.com:owner/repo.git
  const sshMatch = url.match(/git@([^:]+):([^/]+)\/(.+?)(\.git)?$/);
  if (sshMatch && sshMatch[1] && sshMatch[2] && sshMatch[3]) {
    const host = sshMatch[1];
    const owner = sshMatch[2];
    const repo = sshMatch[3];
    repositoryName = `${owner}/${repo}`;
    provider = detectProvider(host);
    return { repositoryName, provider };
  }

  // Handle Azure DevOps: https://dev.azure.com/org/project/_git/repo
  const azureMatch = url.match(
    /https?:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/(.+?)(\.git)?$/
  );
  if (azureMatch && azureMatch[1] && azureMatch[2] && azureMatch[3]) {
    const org = azureMatch[1];
    const project = azureMatch[2];
    const repo = azureMatch[3];
    repositoryName = `${org}/${project}/${repo}`;
    provider = 'azure';
    return { repositoryName, provider };
  }

  // Handle Azure DevOps (visualstudio.com format)
  const vsMatch = url.match(/https?:\/\/([^.]+)\.visualstudio\.com\/([^/]+)\/_git\/(.+?)(\.git)?$/);
  if (vsMatch && vsMatch[1] && vsMatch[2] && vsMatch[3]) {
    const org = vsMatch[1];
    const project = vsMatch[2];
    const repo = vsMatch[3];
    repositoryName = `${org}/${project}/${repo}`;
    provider = 'azure';
    return { repositoryName, provider };
  }

  // Handle HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = url.match(/https?:\/\/([^/]+)\/([^/]+)\/(.+?)(\.git)?$/);
  if (httpsMatch && httpsMatch[1] && httpsMatch[2] && httpsMatch[3]) {
    const host = httpsMatch[1];
    const owner = httpsMatch[2];
    const repo = httpsMatch[3];
    repositoryName = `${owner}/${repo}`;
    provider = detectProvider(host);
    return { repositoryName, provider };
  }

  // Fallback: return URL as-is
  return { repositoryName: url, provider: 'unknown' };
}

/**
 * Detect git provider from hostname
 */
function detectProvider(host: string): GitProvider {
  const hostLower = host.toLowerCase();
  if (hostLower.includes('github')) return 'github';
  if (hostLower.includes('gitlab')) return 'gitlab';
  if (hostLower.includes('bitbucket')) return 'bitbucket';
  if (hostLower.includes('azure') || hostLower.includes('visualstudio')) return 'azure';
  return 'unknown';
}

/**
 * Check if current directory is a git repository
 *
 * @param projectPath - Path to check (defaults to cwd)
 * @returns true if directory is inside a git repository
 */
export function isGitRepository(projectPath: string = process.cwd()): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the git root directory
 *
 * @param projectPath - Starting path (defaults to cwd)
 * @returns Absolute path to git root directory
 * @throws McpAdrError if not in a git repository
 */
export function getGitRoot(projectPath: string = process.cwd()): string {
  try {
    return execSync('git rev-parse --show-toplevel', {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    throw new McpAdrError(
      `Not in a git repository: ${error instanceof Error ? error.message : String(error)}`,
      'NOT_GIT_REPO'
    );
  }
}

/**
 * Get the current commit hash
 *
 * @param projectPath - Path to the project (defaults to cwd)
 * @param short - Return short hash (7 chars) instead of full hash
 * @returns Current commit hash
 */
export function getCurrentCommit(
  projectPath: string = process.cwd(),
  short: boolean = false
): string {
  try {
    const format = short ? '--short' : '';
    return execSync(`git rev-parse ${format} HEAD`, {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    throw new McpAdrError(
      `Failed to get current commit: ${error instanceof Error ? error.message : String(error)}`,
      'GIT_COMMIT_ERROR'
    );
  }
}

/**
 * Check if there are uncommitted changes
 *
 * @param projectPath - Path to the project (defaults to cwd)
 * @returns true if there are uncommitted changes
 */
export function hasUncommittedChanges(projectPath: string = process.cwd()): boolean {
  try {
    const status = execSync('git status --porcelain', {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return status.length > 0;
  } catch {
    return false;
  }
}
