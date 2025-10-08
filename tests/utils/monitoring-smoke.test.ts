/**
 * Smoke tests for monitoring.ts - quick verification of core functionality
 */

import { describe, it, expect } from '@jest/globals';
import {
  MonitoringManager,
  MetricType,
  MetricCategory,
} from '../../src/utils/monitoring.js';

describe('Monitoring Smoke Tests', () => {
  it('should create monitoring manager', () => {
    const monitor = new MonitoringManager({ enabled: true, enableHealthChecks: false });
    expect(monitor).toBeDefined();
    monitor.stop();
  });

  it('should record counter metric', () => {
    const monitor = new MonitoringManager({ enabled: true, enableHealthChecks: false });
    monitor.recordCounter('test.counter', MetricCategory.REQUEST, 1);

    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('test.counter');
    expect(metrics[0].type).toBe(MetricType.COUNTER);

    monitor.stop();
  });

  it('should track request lifecycle', () => {
    const monitor = new MonitoringManager({ enabled: true, enableHealthChecks: false });
    monitor.startRequest('req-123', 'tool', 'test-tool');
    monitor.completeRequest('req-123');

    const requests = monitor.getRecentRequests(10);
    expect(requests).toHaveLength(1);
    expect(requests[0].status).toBe('success');

    monitor.stop();
  });

  it('should generate performance snapshot', () => {
    const monitor = new MonitoringManager({ enabled: true, enableHealthChecks: false });
    monitor.startRequest('req1', 'tool', 'tool1');
    monitor.completeRequest('req1');

    const snapshot = monitor.getPerformanceSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.requests.total).toBe(1);
    expect(snapshot.requests.success).toBe(1);

    monitor.stop();
  });

  it('should export metrics', () => {
    const monitor = new MonitoringManager({ enabled: true, enableHealthChecks: false });
    monitor.recordCounter('test', MetricCategory.REQUEST, 1);

    const exported = monitor.exportMetrics();
    const data = JSON.parse(exported);

    expect(data).toHaveProperty('metrics');
    expect(data).toHaveProperty('performance');

    monitor.stop();
  });
});
