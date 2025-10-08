/**
 * Unit tests for monitoring.ts
 * Tests monitoring, analytics, and health check functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  MonitoringManager,
  MetricType,
  MetricCategory,
  monitoring,
  trackOperation,
} from '../../src/utils/monitoring.js';

describe('Monitoring and Analytics', () => {
  let monitor: MonitoringManager;

  beforeEach(() => {
    monitor = new MonitoringManager({
      enabled: true,
      metricsRetentionMs: 60000,
      aggregationIntervalMs: 10000,
      maxMetricsInMemory: 1000,
      enableHealthChecks: false, // Disable for tests
    });
  });

  afterEach(() => {
    monitor.stop();
    monitor.reset();
  });

  describe('Counter Metrics', () => {
    it('should record counter metric', () => {
      monitor.recordCounter('test.counter', MetricCategory.REQUEST, 1);

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test.counter');
      expect(metrics[0].type).toBe(MetricType.COUNTER);
      expect(metrics[0].value).toBe(1);
    });

    it('should record multiple counter increments', () => {
      monitor.recordCounter('test.counter', MetricCategory.REQUEST, 1);
      monitor.recordCounter('test.counter', MetricCategory.REQUEST, 1);
      monitor.recordCounter('test.counter', MetricCategory.REQUEST, 1);

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(3);
    });

    it('should record counter with tags', () => {
      monitor.recordCounter('test.counter', MetricCategory.REQUEST, 1, {
        endpoint: '/api/test',
        method: 'GET',
      });

      const metrics = monitor.getMetrics();
      expect(metrics[0].tags).toEqual({
        endpoint: '/api/test',
        method: 'GET',
      });
    });

    it('should record counter with metadata', () => {
      monitor.recordCounter('test.counter', MetricCategory.REQUEST, 1, undefined, {
        userId: '123',
        sessionId: 'abc',
      });

      const metrics = monitor.getMetrics();
      expect(metrics[0].metadata).toEqual({
        userId: '123',
        sessionId: 'abc',
      });
    });
  });

  describe('Gauge Metrics', () => {
    it('should record gauge metric', () => {
      monitor.recordGauge('memory.usage', MetricCategory.SYSTEM, 1024);

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('memory.usage');
      expect(metrics[0].type).toBe(MetricType.GAUGE);
      expect(metrics[0].value).toBe(1024);
    });

    it('should update gauge value', () => {
      monitor.recordGauge('cpu.usage', MetricCategory.SYSTEM, 50);
      monitor.recordGauge('cpu.usage', MetricCategory.SYSTEM, 75);

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(2);
      expect(metrics[0].value).toBe(50);
      expect(metrics[1].value).toBe(75);
    });
  });

  describe('Histogram Metrics', () => {
    it('should record histogram values', () => {
      monitor.recordHistogram('response.time', MetricCategory.PERFORMANCE, 100);
      monitor.recordHistogram('response.time', MetricCategory.PERFORMANCE, 150);
      monitor.recordHistogram('response.time', MetricCategory.PERFORMANCE, 200);

      const metrics = monitor.getMetricsByCategory(MetricCategory.PERFORMANCE);
      expect(metrics).toHaveLength(3);
    });

    it('should calculate histogram statistics', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      values.forEach(v => {
        monitor.recordHistogram('test.histogram', MetricCategory.PERFORMANCE, v);
      });

      const stats = monitor.getMetricStats('test.histogram', MetricCategory.PERFORMANCE);
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(10);
      expect(stats!.min).toBe(10);
      expect(stats!.max).toBe(100);
      expect(stats!.avg).toBe(55);
    });
  });

  describe('Request Tracking', () => {
    it('should track request lifecycle', () => {
      const requestId = 'req-123';
      monitor.startRequest(requestId, 'tool', 'test-tool');
      monitor.completeRequest(requestId);

      const requests = monitor.getRecentRequests(10);
      expect(requests).toHaveLength(1);
      expect(requests[0].requestId).toBe(requestId);
      expect(requests[0].status).toBe('success');
      expect(requests[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should track failed requests', () => {
      const requestId = 'req-456';
      monitor.startRequest(requestId, 'tool', 'test-tool');
      monitor.failRequest(requestId, 'Connection timeout');

      const requests = monitor.getRecentRequests(10);
      expect(requests[0].status).toBe('error');
      expect(requests[0].error).toBe('Connection timeout');
    });

    it('should track request metadata', () => {
      const requestId = 'req-789';
      monitor.startRequest(requestId, 'resource', 'test-resource', {
        cacheKey: 'test:key',
      });
      monitor.completeRequest(requestId, { resultSize: 1024 });

      const requests = monitor.getRecentRequests(10);
      expect(requests[0].metadata).toEqual({
        cacheKey: 'test:key',
        resultSize: 1024,
      });
    });

    it('should record request metrics', () => {
      const requestId = 'req-metrics';
      monitor.startRequest(requestId, 'tool', 'analytics-tool');
      monitor.completeRequest(requestId);

      const metrics = monitor.getMetrics();
      const startedMetrics = metrics.filter(m => m.name === 'request.started');
      const completedMetrics = metrics.filter(m => m.name === 'request.completed');
      const durationMetrics = metrics.filter(m => m.name === 'request.duration');

      expect(startedMetrics).toHaveLength(1);
      expect(completedMetrics).toHaveLength(1);
      expect(durationMetrics).toHaveLength(1);
    });
  });

  describe('Cache Metrics', () => {
    it('should record cache hits', () => {
      monitor.recordCacheHit('resource:123');
      monitor.recordCacheHit('resource:456');

      const metrics = monitor.getMetrics();
      const cacheHits = metrics.filter(m => m.name === 'cache.hit');
      expect(cacheHits).toHaveLength(2);
    });

    it('should record cache misses', () => {
      monitor.recordCacheMiss('resource:789');

      const metrics = monitor.getMetrics();
      const cacheMisses = metrics.filter(m => m.name === 'cache.miss');
      expect(cacheMisses).toHaveLength(1);
    });

    it('should include cache metrics in performance snapshot', () => {
      monitor.recordCacheHit('key1');
      monitor.recordCacheHit('key2');
      monitor.recordCacheHit('key3');
      monitor.recordCacheMiss('key4');

      const snapshot = monitor.getPerformanceSnapshot();
      expect(snapshot.cache.totalHits).toBe(3);
      expect(snapshot.cache.totalMisses).toBe(1);
      expect(snapshot.cache.hitRate).toBeCloseTo(0.75, 2);
    });
  });

  describe('Health Checks', () => {
    it('should run health check successfully', async () => {
      const healthCheck = await monitor.runHealthCheck('test-service', async () => ({
        status: 'healthy',
        message: 'Service is operational',
      }));

      expect(healthCheck.name).toBe('test-service');
      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.message).toBe('Service is operational');
      expect(healthCheck.duration).toBeGreaterThanOrEqual(0);
    });

    it('should detect unhealthy service', async () => {
      const healthCheck = await monitor.runHealthCheck('failing-service', async () => ({
        status: 'unhealthy',
        message: 'Service unavailable',
      }));

      expect(healthCheck.status).toBe('unhealthy');
      expect(healthCheck.message).toBe('Service unavailable');
    });

    it('should handle health check errors', async () => {
      const healthCheck = await monitor.runHealthCheck('error-service', async () => {
        throw new Error('Health check failed');
      });

      expect(healthCheck.status).toBe('unhealthy');
      expect(healthCheck.message).toBe('Health check failed');
    });

    it('should aggregate health status', async () => {
      await monitor.runHealthCheck('service1', async () => ({ status: 'healthy' }));
      await monitor.runHealthCheck('service2', async () => ({ status: 'healthy' }));

      const status = monitor.getHealthStatus();
      expect(status).toBe('healthy');
    });

    it('should detect degraded status', async () => {
      await monitor.runHealthCheck('service1', async () => ({ status: 'healthy' }));
      await monitor.runHealthCheck('service2', async () => ({ status: 'degraded' }));

      const status = monitor.getHealthStatus();
      expect(status).toBe('degraded');
    });

    it('should detect unhealthy status', async () => {
      await monitor.runHealthCheck('service1', async () => ({ status: 'healthy' }));
      await monitor.runHealthCheck('service2', async () => ({ status: 'unhealthy' }));

      const status = monitor.getHealthStatus();
      expect(status).toBe('unhealthy');
    });
  });

  describe('Performance Snapshot', () => {
    it('should generate performance snapshot', () => {
      monitor.startRequest('req1', 'tool', 'tool1');
      monitor.completeRequest('req1');
      monitor.startRequest('req2', 'resource', 'resource1');
      monitor.failRequest('req2', 'Error');

      const snapshot = monitor.getPerformanceSnapshot();
      expect(snapshot.requests.total).toBe(2);
      expect(snapshot.requests.success).toBe(1);
      expect(snapshot.requests.error).toBe(1);
      expect(snapshot.requests.pending).toBe(0);
    });

    it('should calculate latency percentiles', async () => {
      // Use smaller delays to speed up test (1-5ms range)
      const durations = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];

      for (let i = 0; i < durations.length; i++) {
        const duration = durations[i];
        const id = `req-${i}`;
        monitor.startRequest(id, 'tool', 'perf-tool');
        // Simulate actual duration with small delay
        await new Promise(resolve => setTimeout(resolve, duration));
        monitor.completeRequest(id);
      }

      const snapshot = monitor.getPerformanceSnapshot();
      expect(snapshot.latency.p50).toBeGreaterThan(0);
      expect(snapshot.latency.p95).toBeGreaterThan(0);
      expect(snapshot.latency.p99).toBeGreaterThan(0);
      expect(snapshot.latency.avg).toBeGreaterThan(0);
    });

    it('should calculate throughput', async () => {
      // Create some requests
      for (let i = 0; i < 10; i++) {
        const id = `req-${i}`;
        monitor.startRequest(id, 'tool', 'throughput-test');
        monitor.completeRequest(id);
      }

      const snapshot = monitor.getPerformanceSnapshot();
      expect(snapshot.throughput.requestsPerMinute).toBe(10);
      expect(snapshot.throughput.requestsPerSecond).toBeCloseTo(10 / 60, 2);
    });

    it('should track errors by type', () => {
      monitor.startRequest('req1', 'tool', 'tool1');
      monitor.failRequest('req1', 'TimeoutError');

      monitor.startRequest('req2', 'tool', 'tool2');
      monitor.failRequest('req2', 'ValidationError');

      monitor.startRequest('req3', 'tool', 'tool3');
      monitor.failRequest('req3', 'TimeoutError');

      const snapshot = monitor.getPerformanceSnapshot();
      expect(snapshot.errors.total).toBe(3);
      expect(snapshot.errors.byType.TimeoutError).toBe(2);
      expect(snapshot.errors.byType.ValidationError).toBe(1);
    });
  });

  describe('Metrics Management', () => {
    it('should get metrics by category', () => {
      monitor.recordCounter('test1', MetricCategory.REQUEST, 1);
      monitor.recordCounter('test2', MetricCategory.CACHE, 1);
      monitor.recordCounter('test3', MetricCategory.REQUEST, 1);

      const requestMetrics = monitor.getMetricsByCategory(MetricCategory.REQUEST);
      expect(requestMetrics).toHaveLength(2);

      const cacheMetrics = monitor.getMetricsByCategory(MetricCategory.CACHE);
      expect(cacheMetrics).toHaveLength(1);
    });

    it('should enforce max metrics limit', () => {
      const smallMonitor = new MonitoringManager({
        maxMetricsInMemory: 10,
      });

      for (let i = 0; i < 20; i++) {
        smallMonitor.recordCounter('test', MetricCategory.REQUEST, 1);
      }

      const metrics = smallMonitor.getMetrics();
      expect(metrics).toHaveLength(10);

      smallMonitor.stop();
    });

    it('should cleanup old metrics', async () => {
      const shortRetention = new MonitoringManager({
        metricsRetentionMs: 100, // 100ms retention
      });

      shortRetention.recordCounter('old', MetricCategory.REQUEST, 1);

      // Wait for metrics to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const removed = shortRetention.cleanup();
      expect(removed).toBeGreaterThan(0);

      const metrics = shortRetention.getMetrics();
      expect(metrics).toHaveLength(0);

      shortRetention.stop();
    });

    it('should reset all metrics', () => {
      monitor.recordCounter('test1', MetricCategory.REQUEST, 1);
      monitor.startRequest('req1', 'tool', 'tool1');

      monitor.reset();

      expect(monitor.getMetrics()).toHaveLength(0);
      expect(monitor.getRecentRequests()).toHaveLength(0);
    });
  });

  describe('Metric Statistics', () => {
    it('should calculate metric statistics', () => {
      const values = [10, 20, 30, 40, 50];
      values.forEach(v => {
        monitor.recordHistogram('test.metric', MetricCategory.PERFORMANCE, v);
      });

      const stats = monitor.getMetricStats('test.metric', MetricCategory.PERFORMANCE);
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(5);
      expect(stats!.sum).toBe(150);
      expect(stats!.min).toBe(10);
      expect(stats!.max).toBe(50);
      expect(stats!.avg).toBe(30);
    });

    it('should return null for non-existent metrics', () => {
      const stats = monitor.getMetricStats('non.existent', MetricCategory.PERFORMANCE);
      expect(stats).toBeNull();
    });

    it('should calculate percentiles correctly', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1); // 1-100
      values.forEach(v => {
        monitor.recordHistogram('percentile.test', MetricCategory.PERFORMANCE, v);
      });

      const stats = monitor.getMetricStats('percentile.test', MetricCategory.PERFORMANCE);
      expect(stats).not.toBeNull();
      expect(stats!.p50).toBeCloseTo(50, 0);
      expect(stats!.p95).toBeCloseTo(95, 0);
      expect(stats!.p99).toBeCloseTo(99, 0);
    });
  });

  describe('Recent Requests', () => {
    it('should return recent requests sorted by time', async () => {
      monitor.startRequest('req1', 'tool', 'tool1');
      await new Promise(resolve => setTimeout(resolve, 2));
      monitor.startRequest('req2', 'tool', 'tool2');
      await new Promise(resolve => setTimeout(resolve, 2));
      monitor.startRequest('req3', 'tool', 'tool3');

      const recent = monitor.getRecentRequests(10);
      expect(recent).toHaveLength(3);
      // Most recent should be first
      expect(recent[0].requestId).toBe('req3');
      expect(recent[1].requestId).toBe('req2');
      expect(recent[2].requestId).toBe('req1');
    });

    it('should limit recent requests', () => {
      for (let i = 0; i < 20; i++) {
        monitor.startRequest(`req-${i}`, 'tool', 'tool');
      }

      const recent = monitor.getRecentRequests(5);
      expect(recent).toHaveLength(5);
    });
  });

  describe('Uptime Tracking', () => {
    it('should track uptime', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      const uptime = monitor.getUptime();
      expect(uptime).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Metrics Export', () => {
    it('should export metrics to JSON', () => {
      monitor.recordCounter('test', MetricCategory.REQUEST, 1);
      monitor.startRequest('req1', 'tool', 'tool1');

      const exported = monitor.exportMetrics();
      const data = JSON.parse(exported);

      expect(data).toHaveProperty('metrics');
      expect(data).toHaveProperty('requests');
      expect(data).toHaveProperty('healthChecks');
      expect(data).toHaveProperty('performance');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('timestamp');
    });

    it('should export valid JSON structure', () => {
      monitor.recordCounter('counter', MetricCategory.REQUEST, 5);
      monitor.recordGauge('gauge', MetricCategory.SYSTEM, 100);

      const exported = monitor.exportMetrics();
      expect(() => JSON.parse(exported)).not.toThrow();

      const data = JSON.parse(exported);
      expect(Array.isArray(data.metrics)).toBe(true);
      expect(Array.isArray(data.requests)).toBe(true);
    });
  });

  describe('Disabled Monitoring', () => {
    it('should not record metrics when disabled', () => {
      const disabled = new MonitoringManager({ enabled: false });

      disabled.recordCounter('test', MetricCategory.REQUEST, 1);
      disabled.startRequest('req1', 'tool', 'tool1');

      expect(disabled.getMetrics()).toHaveLength(0);
      expect(disabled.getRecentRequests()).toHaveLength(0);

      disabled.stop();
    });
  });

  describe('Track Operation Helper', () => {
    it('should track successful operation', async () => {
      const result = await trackOperation(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'success';
        },
        'test.operation',
        MetricCategory.PERFORMANCE
      );

      expect(result).toBe('success');

      const metrics = monitoring.getMetrics();
      const successMetrics = metrics.filter(m => m.name === 'test.operation.success');
      const durationMetrics = metrics.filter(m => m.name === 'test.operation.duration');

      expect(successMetrics.length).toBeGreaterThan(0);
      expect(durationMetrics.length).toBeGreaterThan(0);
    });

    it('should track failed operation', async () => {
      await expect(
        trackOperation(
          async () => {
            throw new Error('Operation failed');
          },
          'test.failing',
          MetricCategory.PERFORMANCE
        )
      ).rejects.toThrow('Operation failed');

      const metrics = monitoring.getMetrics();
      const errorMetrics = metrics.filter(m => m.name === 'test.failing.error');
      expect(errorMetrics.length).toBeGreaterThan(0);
    });

    it('should track operation with tags', async () => {
      await trackOperation(async () => 'done', 'tagged.operation', MetricCategory.TOOL, {
        environment: 'test',
      });

      const metrics = monitoring.getMetrics();
      const taggedMetrics = metrics.filter(
        m => m.name === 'tagged.operation.success' && m.tags?.environment === 'test'
      );
      expect(taggedMetrics.length).toBeGreaterThan(0);
    });
  });
});
