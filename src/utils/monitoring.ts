/**
 * Monitoring and Analytics Framework
 *
 * Provides comprehensive monitoring and analytics for MCP server:
 * - Request/response tracking
 * - Performance metrics (latency, throughput)
 * - Error tracking and reporting
 * - Resource usage analytics
 * - Cache performance metrics
 * - Tool execution metrics
 * - Health checks
 * - Metrics aggregation and reporting
 */

/**
 * Metric types for categorization
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
}

/**
 * Metric category for organization
 */
export enum MetricCategory {
  REQUEST = 'request',
  RESOURCE = 'resource',
  TOOL = 'tool',
  CACHE = 'cache',
  ERROR = 'error',
  PERFORMANCE = 'performance',
  SYSTEM = 'system',
}

/**
 * Individual metric data point
 */
export interface Metric {
  name: string;
  type: MetricType;
  category: MetricCategory;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * Aggregated metric statistics
 */
export interface MetricStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Health check result
 */
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  timestamp: string;
  duration: number;
  metadata?: Record<string, any>;
}

/**
 * Request tracking data
 */
export interface RequestMetrics {
  requestId: string;
  type: 'tool' | 'resource' | 'prompt';
  name: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Performance snapshot
 */
export interface PerformanceSnapshot {
  timestamp: string;
  requests: {
    total: number;
    success: number;
    error: number;
    pending: number;
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  cache: {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  metricsRetentionMs: number;
  aggregationIntervalMs: number;
  maxMetricsInMemory: number;
  enableHealthChecks: boolean;
  healthCheckIntervalMs: number;
}

/**
 * Default monitoring configuration
 */
const DEFAULT_CONFIG: MonitoringConfig = {
  enabled: true,
  metricsRetentionMs: 3600000, // 1 hour
  aggregationIntervalMs: 60000, // 1 minute
  maxMetricsInMemory: 10000,
  enableHealthChecks: true,
  healthCheckIntervalMs: 30000, // 30 seconds
};

/**
 * Monitoring manager class
 */
export class MonitoringManager {
  private config: MonitoringConfig;
  private metrics: Metric[] = [];
  private requests: Map<string, RequestMetrics> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private aggregationTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private startTime: string;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = new Date().toISOString();

    if (this.config.enabled) {
      this.startAggregation();
      if (this.config.enableHealthChecks) {
        this.startHealthChecks();
      }
    }
  }

  /**
   * Record a counter metric (incrementing value)
   */
  recordCounter(
    name: string,
    category: MetricCategory,
    value: number = 1,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled) return;

    const metric: Metric = {
      name,
      type: MetricType.COUNTER,
      category,
      value,
      timestamp: new Date().toISOString(),
    };

    if (tags) {
      metric.tags = tags;
    }
    if (metadata) {
      metric.metadata = metadata;
    }

    this.addMetric(metric);
  }

  /**
   * Record a gauge metric (point-in-time value)
   */
  recordGauge(
    name: string,
    category: MetricCategory,
    value: number,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled) return;

    const metric: Metric = {
      name,
      type: MetricType.GAUGE,
      category,
      value,
      timestamp: new Date().toISOString(),
    };

    if (tags) {
      metric.tags = tags;
    }
    if (metadata) {
      metric.metadata = metadata;
    }

    this.addMetric(metric);
  }

  /**
   * Record a histogram value (for distribution analysis)
   */
  recordHistogram(
    name: string,
    category: MetricCategory,
    value: number,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled) return;

    const metric: Metric = {
      name,
      type: MetricType.HISTOGRAM,
      category,
      value,
      timestamp: new Date().toISOString(),
    };

    if (tags) {
      metric.tags = tags;
    }
    if (metadata) {
      metric.metadata = metadata;
    }

    this.addMetric(metric);
  }

  /**
   * Start tracking a request
   */
  startRequest(
    requestId: string,
    type: 'tool' | 'resource' | 'prompt',
    name: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled) return;

    const request: RequestMetrics = {
      requestId,
      type,
      name,
      startTime: new Date().toISOString(),
      status: 'pending',
    };

    if (metadata) {
      request.metadata = metadata;
    }

    this.requests.set(requestId, request);

    this.recordCounter('request.started', MetricCategory.REQUEST, 1, { type, name });
  }

  /**
   * Complete a request successfully
   */
  completeRequest(requestId: string, metadata?: Record<string, any>): void {
    if (!this.config.enabled) return;

    const request = this.requests.get(requestId);
    if (!request) return;

    const endTime = new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(request.startTime).getTime();

    request.endTime = endTime;
    request.duration = duration;
    request.status = 'success';
    if (metadata) {
      request.metadata = { ...request.metadata, ...metadata };
    }

    this.recordCounter('request.completed', MetricCategory.REQUEST, 1, {
      type: request.type,
      name: request.name,
    });

    this.recordHistogram('request.duration', MetricCategory.PERFORMANCE, duration, {
      type: request.type,
      name: request.name,
    });
  }

  /**
   * Mark a request as failed
   */
  failRequest(requestId: string, error: string, metadata?: Record<string, any>): void {
    if (!this.config.enabled) return;

    const request = this.requests.get(requestId);
    if (!request) return;

    const endTime = new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(request.startTime).getTime();

    request.endTime = endTime;
    request.duration = duration;
    request.status = 'error';
    request.error = error;
    if (metadata) {
      request.metadata = { ...request.metadata, ...metadata };
    }

    this.recordCounter('request.failed', MetricCategory.REQUEST, 1, {
      type: request.type,
      name: request.name,
    });

    this.recordCounter('error.total', MetricCategory.ERROR, 1, {
      type: request.type,
      name: request.name,
      error,
    });
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheKey: string): void {
    if (!this.config.enabled) return;

    this.recordCounter('cache.hit', MetricCategory.CACHE, 1, { key: cacheKey });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheKey: string): void {
    if (!this.config.enabled) return;

    this.recordCounter('cache.miss', MetricCategory.CACHE, 1, { key: cacheKey });
  }

  /**
   * Register a health check
   */
  registerHealthCheck(
    _name: string,
    _check: () => Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; message?: string }>
  ): void {
    // Store health check function for periodic execution
    // Implementation would store the check function and run it periodically
    // For now, we'll just track the results when manually called
  }

  /**
   * Run a health check
   */
  async runHealthCheck(
    name: string,
    check: () => Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; message?: string }>
  ): Promise<HealthCheck> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const result = await check();
      const duration = Date.now() - startTime;

      const healthCheck: HealthCheck = {
        name,
        status: result.status,
        timestamp,
        duration,
      };

      if (result.message) {
        healthCheck.message = result.message;
      }

      this.healthChecks.set(name, healthCheck);
      return healthCheck;
    } catch (error) {
      const duration = Date.now() - startTime;
      const healthCheck: HealthCheck = {
        name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
        duration,
      };

      this.healthChecks.set(name, healthCheck);
      return healthCheck;
    }
  }

  /**
   * Get all health checks
   */
  getHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Get overall health status
   */
  getHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const checks = this.getHealthChecks();
    if (checks.length === 0) return 'healthy';

    const unhealthy = checks.filter(c => c.status === 'unhealthy');
    const degraded = checks.filter(c => c.status === 'degraded');

    if (unhealthy.length > 0) return 'unhealthy';
    if (degraded.length > 0) return 'degraded';
    return 'healthy';
  }

  /**
   * Get performance snapshot
   */
  getPerformanceSnapshot(): PerformanceSnapshot {
    const now = new Date().toISOString();
    const requests = Array.from(this.requests.values());

    const total = requests.length;
    const success = requests.filter(r => r.status === 'success').length;
    const error = requests.filter(r => r.status === 'error').length;
    const pending = requests.filter(r => r.status === 'pending').length;

    // Calculate latency percentiles
    const durations = requests
      .filter(r => r.duration !== undefined)
      .map(r => r.duration!)
      .sort((a, b) => a - b);

    const latency = this.calculatePercentiles(durations);

    // Calculate throughput
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = requests.filter(
      r => r.startTime && new Date(r.startTime).getTime() > oneMinuteAgo
    );

    const throughput = {
      requestsPerSecond: recentRequests.length / 60,
      requestsPerMinute: recentRequests.length,
    };

    // Cache metrics
    const cacheHits = this.getMetricSum('cache.hit', MetricCategory.CACHE);
    const cacheMisses = this.getMetricSum('cache.miss', MetricCategory.CACHE);
    const cacheTotal = cacheHits + cacheMisses;
    const hitRate = cacheTotal > 0 ? cacheHits / cacheTotal : 0;

    // Error metrics
    const errorMetrics = this.metrics.filter(m => m.category === MetricCategory.ERROR);
    const errorsByType: Record<string, number> = {};
    for (const metric of errorMetrics) {
      const errorType = metric.tags?.['error'] || 'unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + metric.value;
    }

    return {
      timestamp: now,
      requests: { total, success, error, pending },
      latency,
      throughput,
      cache: {
        hitRate,
        totalHits: cacheHits,
        totalMisses: cacheMisses,
      },
      errors: {
        total: error,
        byType: errorsByType,
      },
    };
  }

  /**
   * Get metric statistics by name and category
   */
  getMetricStats(name: string, category: MetricCategory): MetricStats | null {
    const metricValues = this.metrics
      .filter(m => m.name === name && m.category === category)
      .map(m => m.value)
      .sort((a, b) => a - b);

    if (metricValues.length === 0) return null;

    return this.calculateStats(metricValues);
  }

  /**
   * Get all metrics
   */
  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: MetricCategory): Metric[] {
    return this.metrics.filter(m => m.category === category);
  }

  /**
   * Get recent requests
   */
  getRecentRequests(limit: number = 100): RequestMetrics[] {
    return Array.from(this.requests.values())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);
  }

  /**
   * Clear old metrics based on retention policy
   */
  cleanup(): number {
    const cutoff = Date.now() - this.config.metricsRetentionMs;
    const initialCount = this.metrics.length;

    this.metrics = this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);

    // Also clean up old requests
    const requestsToDelete: string[] = [];
    for (const [id, request] of this.requests.entries()) {
      if (request.endTime && new Date(request.endTime).getTime() < cutoff) {
        requestsToDelete.push(id);
      }
    }
    requestsToDelete.forEach(id => this.requests.delete(id));

    return initialCount - this.metrics.length;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = [];
    this.requests.clear();
    this.healthChecks.clear();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - new Date(this.startTime).getTime();
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      requests: Array.from(this.requests.values()),
      healthChecks: Array.from(this.healthChecks.values()),
      performance: this.getPerformanceSnapshot(),
      uptime: this.getUptime(),
      timestamp: new Date().toISOString(),
    }, null, 2);
  }

  // Private methods

  private addMetric(metric: Metric): void {
    this.metrics.push(metric);

    // Enforce max metrics limit
    if (this.metrics.length > this.config.maxMetricsInMemory) {
      const toRemove = this.metrics.length - this.config.maxMetricsInMemory;
      this.metrics.splice(0, toRemove);
    }
  }

  private getMetricSum(name: string, category: MetricCategory): number {
    return this.metrics
      .filter(m => m.name === name && m.category === category)
      .reduce((sum, m) => sum + m.value, 0);
  }

  private calculatePercentiles(values: number[]): {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  } {
    if (values.length === 0) {
      return { p50: 0, p95: 0, p99: 0, avg: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;

    return {
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      avg,
    };
  }

  private calculateStats(values: number[]): MetricStats {
    if (values.length === 0) {
      return { count: 0, sum: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((s, v) => s + v, 0);
    const avg = sum / sorted.length;

    return {
      count: sorted.length,
      sum,
      min: sorted[0]!,
      max: sorted[sorted.length - 1]!,
      avg,
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
    };
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  private startAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      this.cleanup();
    }, this.config.aggregationIntervalMs);
  }

  private startHealthChecks(): void {
    // Placeholder for periodic health check execution
    this.healthCheckTimer = setInterval(() => {
      // Would run registered health checks here
    }, this.config.healthCheckIntervalMs);
  }
}

/**
 * Singleton monitoring instance
 */
export const monitoring = new MonitoringManager();

/**
 * Helper to track async operations
 */
export async function trackOperation<T>(
  operation: () => Promise<T>,
  name: string,
  category: MetricCategory,
  tags?: Record<string, string>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    monitoring.recordHistogram(`${name}.duration`, category, duration, tags);
    monitoring.recordCounter(`${name}.success`, category, 1, tags);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    monitoring.recordHistogram(`${name}.duration`, category, duration, tags);
    monitoring.recordCounter(`${name}.error`, category, 1, {
      ...tags,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}
