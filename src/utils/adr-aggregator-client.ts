/**
 * ADR Aggregator API Client
 * HTTP client for bidirectional sync with https://adraggregator.com
 *
 * @see NEW_FEATURE.md for API documentation
 */

import { McpAdrError } from '../types/index.js';
import { loadConfig } from './config.js';
import { detectGitRemote, isGitRepository, type GitRemoteInfo } from './git-remote-detector.js';
import type {
  SyncAdrRequest,
  SyncAdrResponse,
  GetContextRequest,
  GetContextResponse,
  GetStalenessReportRequest,
  GetStalenessReportResponse,
  GetTemplatesRequest,
  GetTemplatesResponse,
  GetDiagramsRequest,
  GetDiagramsResponse,
  ValidateComplianceRequest,
  ValidateComplianceResponse,
  GetKnowledgeGraphRequest,
  GetKnowledgeGraphResponse,
  ReportCodeGapsRequest,
  ReportCodeGapsResponse,
  GetCodeGapsRequest,
  GetCodeGapsResponse,
  AggregatorError,
} from '../types/adr-aggregator.js';

/**
 * Configuration for the ADR Aggregator client
 */
export interface AggregatorClientConfig {
  /** Base URL for the ADR Aggregator API */
  baseUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * ADR Aggregator API Client
 *
 * Provides methods for all ADR Aggregator API endpoints:
 * - sync_to_aggregator (POST /mcp-sync-adr)
 * - get_adr_context (GET /mcp-get-context)
 * - get_staleness_report (GET /mcp-staleness-report)
 * - get_adr_templates (GET /mcp-get-templates)
 * - get_adr_diagrams (GET /mcp-get-diagrams) - Pro+ tier
 * - validate_adr_compliance (POST /mcp-validate-compliance) - Pro+ tier
 * - get_knowledge_graph (GET /mcp-get-knowledge-graph) - Team tier
 */
export class AdrAggregatorClient {
  private baseUrl: string;
  private apiKey: string | undefined;
  private timeout: number;

  constructor(config?: Partial<AggregatorClientConfig>) {
    const serverConfig = loadConfig();
    this.baseUrl =
      config?.baseUrl ||
      serverConfig.adrAggregatorUrl ||
      'https://jvgdaquuggzbkenxnkja.supabase.co';
    this.apiKey = config?.apiKey || serverConfig.adrAggregatorApiKey;
    this.timeout = config?.timeout || 30000;

    // Ensure baseUrl doesn't end with slash
    if (this.baseUrl.endsWith('/')) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  // ============================================================================
  // Public Helper Methods
  // ============================================================================

  /**
   * Auto-detect repository name from git remote
   *
   * @param projectPath - Path to the project (defaults to config.projectPath)
   * @returns Repository name in "owner/repo" format
   * @throws McpAdrError if not a git repository
   */
  public getRepositoryName(projectPath?: string): string {
    const path = projectPath || loadConfig().projectPath;
    if (!isGitRepository(path)) {
      throw new McpAdrError('Not a git repository. Cannot detect repository name.', 'NOT_GIT_REPO');
    }
    const gitInfo = detectGitRemote(path);
    return gitInfo.repositoryName;
  }

  /**
   * Get full git remote info
   *
   * @param projectPath - Path to the project (defaults to config.projectPath)
   * @returns Git remote information
   */
  public getGitInfo(projectPath?: string): GitRemoteInfo {
    const path = projectPath || loadConfig().projectPath;
    return detectGitRemote(path);
  }

  /**
   * Check if API key is configured
   *
   * @returns true if API key is set
   */
  public isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get the current base URL
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  // ============================================================================
  // API Methods
  // ============================================================================

  /**
   * Sync ADRs to ADR Aggregator platform
   *
   * @param request - Sync request with ADRs and options
   * @returns Sync response with results
   */
  public async syncAdrs(request: SyncAdrRequest): Promise<SyncAdrResponse> {
    return this.post<SyncAdrRequest, SyncAdrResponse>('/functions/v1/mcp-sync-adr', request);
  }

  /**
   * Get ADR context from aggregator
   *
   * @param request - Context request with filters
   * @returns ADR context response
   */
  public async getContext(request: GetContextRequest): Promise<GetContextResponse> {
    const params = this.buildQueryParams(request as unknown as Record<string, unknown>);
    return this.get<GetContextResponse>(`/functions/v1/mcp-get-context?${params}`);
  }

  /**
   * Get staleness report
   *
   * @param request - Staleness report request
   * @returns Staleness report response
   */
  public async getStalenessReport(
    request: GetStalenessReportRequest
  ): Promise<GetStalenessReportResponse> {
    const params = this.buildQueryParams(request as unknown as Record<string, unknown>);
    return this.get<GetStalenessReportResponse>(`/functions/v1/mcp-staleness-report?${params}`);
  }

  /**
   * Get ADR templates
   *
   * @param request - Templates request with optional domain filter
   * @returns Templates response
   */
  public async getTemplates(request: GetTemplatesRequest): Promise<GetTemplatesResponse> {
    const params = this.buildQueryParams(request as unknown as Record<string, unknown>);
    const endpoint = params
      ? `/functions/v1/mcp-get-templates?${params}`
      : '/functions/v1/mcp-get-templates';
    return this.get<GetTemplatesResponse>(endpoint);
  }

  /**
   * Get Mermaid diagrams (Pro+ tier)
   *
   * @param request - Diagrams request
   * @returns Diagrams response
   */
  public async getDiagrams(request: GetDiagramsRequest): Promise<GetDiagramsResponse> {
    const params = this.buildQueryParams(request as unknown as Record<string, unknown>);
    return this.get<GetDiagramsResponse>(`/functions/v1/mcp-get-diagrams?${params}`);
  }

  /**
   * Validate ADR compliance (Pro+ tier)
   *
   * @param request - Compliance validation request
   * @returns Compliance validation response
   */
  public async validateCompliance(
    request: ValidateComplianceRequest
  ): Promise<ValidateComplianceResponse> {
    return this.post<ValidateComplianceRequest, ValidateComplianceResponse>(
      '/functions/v1/mcp-validate-compliance',
      request
    );
  }

  /**
   * Get knowledge graph (Team tier)
   *
   * @param request - Knowledge graph request
   * @returns Knowledge graph response
   */
  public async getKnowledgeGraph(
    request: GetKnowledgeGraphRequest
  ): Promise<GetKnowledgeGraphResponse> {
    const params = this.buildQueryParams(request as unknown as Record<string, unknown>);
    return this.get<GetKnowledgeGraphResponse>(`/functions/v1/mcp-get-knowledge-graph?${params}`);
  }

  /**
   * Report code gaps to ADR Aggregator
   *
   * @param request - Code gaps report request
   * @returns Report response with gap counts
   */
  public async reportCodeGaps(request: ReportCodeGapsRequest): Promise<ReportCodeGapsResponse> {
    // Gap endpoints use Bearer token authentication
    return this.postWithBearerAuth<ReportCodeGapsRequest, ReportCodeGapsResponse>(
      '/functions/v1/mcp-report-code-gaps',
      request
    );
  }

  /**
   * Get current code gaps from ADR Aggregator
   *
   * @param request - Get gaps request with optional filters
   * @returns Current gaps with status information
   */
  public async getCodeGaps(request: GetCodeGapsRequest): Promise<GetCodeGapsResponse> {
    const params = this.buildQueryParams(request as unknown as Record<string, unknown>);
    // Gap endpoints use Bearer token authentication
    return this.getWithBearerAuth<GetCodeGapsResponse>(`/functions/v1/mcp-get-gaps?${params}`);
  }

  // ============================================================================
  // Private HTTP Methods
  // ============================================================================

  private async get<R>(endpoint: string): Promise<R> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.buildHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return this.handleResponse<R>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleError(error);
    }
  }

  private async post<T, R>(endpoint: string, body: T): Promise<R> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.buildHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return this.handleResponse<R>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleError(error);
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'mcp-adr-analysis-server/2.1.22',
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    return headers;
  }

  /**
   * Build headers with Bearer token authentication
   * Used for gap analysis endpoints
   */
  private buildBearerHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'mcp-adr-analysis-server/2.1.22',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * GET request with Bearer token authentication
   */
  private async getWithBearerAuth<R>(endpoint: string): Promise<R> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.buildBearerHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return this.handleResponse<R>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleError(error);
    }
  }

  /**
   * POST request with Bearer token authentication
   */
  private async postWithBearerAuth<T, R>(endpoint: string, body: T): Promise<R> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.buildBearerHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return this.handleResponse<R>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleError(error);
    }
  }

  private buildQueryParams(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          // Handle array parameters
          for (const item of value) {
            searchParams.append(key, String(item));
          }
        } else if (typeof value === 'boolean') {
          searchParams.append(key, value ? 'true' : 'false');
        } else {
          searchParams.append(key, String(value));
        }
      }
    }
    return searchParams.toString();
  }

  private async handleResponse<R>(response: Response): Promise<R> {
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      let errorData: AggregatorError | undefined;

      if (contentType.includes('application/json')) {
        try {
          errorData = (await response.json()) as AggregatorError;
        } catch {
          // Ignore JSON parse errors for error responses
        }
      }

      const errorMessage = errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
      const errorCode = errorData?.code || `HTTP_${response.status}`;

      throw new McpAdrError(errorMessage, errorCode, {
        status: response.status,
        tier_required: errorData?.tier_required,
      });
    }

    if (contentType.includes('application/json')) {
      return (await response.json()) as R;
    }

    throw new McpAdrError('Unexpected response content type', 'INVALID_RESPONSE');
  }

  private handleError(error: unknown): McpAdrError {
    if (error instanceof McpAdrError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new McpAdrError('Request timed out', 'TIMEOUT_ERROR');
      }
      return new McpAdrError(`API request failed: ${error.message}`, 'API_REQUEST_ERROR');
    }

    return new McpAdrError('Unknown API error', 'UNKNOWN_ERROR');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: AdrAggregatorClient | null = null;

/**
 * Get the singleton ADR Aggregator client instance
 *
 * @returns Configured ADR Aggregator client
 */
export function getAdrAggregatorClient(): AdrAggregatorClient {
  if (!clientInstance) {
    clientInstance = new AdrAggregatorClient();
  }
  return clientInstance;
}

/**
 * Reset the singleton client instance
 * Useful for testing or when configuration changes
 */
export function resetAdrAggregatorClient(): void {
  clientInstance = null;
}

/**
 * Create a new client with custom configuration
 *
 * @param config - Custom configuration
 * @returns New ADR Aggregator client instance
 */
export function createAdrAggregatorClient(
  config: Partial<AggregatorClientConfig>
): AdrAggregatorClient {
  return new AdrAggregatorClient(config);
}
