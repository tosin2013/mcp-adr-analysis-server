/**
 * Tests for Enhanced Error Handling and Logging
 *
 * Verifies that comprehensive error handling, logging, and recovery
 * mechanisms work correctly across all components.
 */

import {
  OperationQueueError,
  DataConsistencyError,
  EnhancedError,
} from '../../src/types/enhanced-errors.js';
import {
  EnhancedLogger,
  createComponentLogger,
  ErrorRecoveryManager,
} from '../../src/utils/enhanced-logging.js';
import { OperationQueue } from '../../src/utils/operation-queue.js';

describe('Enhanced Error Handling and Logging', () => {
  let logger: EnhancedLogger;
  let recoveryManager: ErrorRecoveryManager;

  beforeEach(() => {
    logger = new EnhancedLogger({
      level: 'debug',
      enableConsole: false, // Disable console output for tests
      enableStructuredLogging: true,
      enablePerformanceMetrics: true,
    });
    recoveryManager = new ErrorRecoveryManager(logger);
  });

  afterEach(() => {
    logger.clearLogs();
  });

  describe('Enhanced Error Classes', () => {
    it('should create OperationQueueError with diagnostic context', () => {
      const diagnostics = {
        component: 'OperationQueue',
        operation: 'test_operation',
        timestamp: new Date(),
        context: { queueSize: 10, maxSize: 5 },
        performanceMetrics: { queueSize: 10, activeOperations: 3 },
      };

      const error = OperationQueueError.queueOverflow(10, 5, diagnostics);

      expect(error).toBeInstanceOf(OperationQueueError);
      expect(error).toBeInstanceOf(EnhancedError);
      expect(error.code).toBe('QUEUE_OVERFLOW');
      expect(error.severity).toBe('high');
      expect(error.retryable).toBe(true);
      expect(error.diagnostics.component).toBe('OperationQueue');
      expect(error.suggestions.length).toBeGreaterThan(0);
      expect(error.suggestions[0].action).toContain('Reduce operation frequency');
    });

    it('should create DataConsistencyError with validation details', () => {
      const diagnostics = {
        component: 'DataValidation',
        operation: 'validate_data',
        timestamp: new Date(),
        context: { validationType: 'task_validation' },
      };

      const error = DataConsistencyError.validationFailure(
        'task_validation',
        ['task1', 'task2'],
        diagnostics
      );

      expect(error).toBeInstanceOf(DataConsistencyError);
      expect(error.code).toBe('VALIDATION_FAILURE');
      expect(error.severity).toBe('high');
      expect(error.recoverable).toBe(true);
      expect(error.suggestions.length).toBeGreaterThan(0);
    });

    it('should provide detailed error messages', () => {
      const diagnostics = {
        component: 'TestComponent',
        operation: 'test_operation',
        timestamp: new Date(),
        context: { testData: 'value' },
        performanceMetrics: { memoryUsage: 100 },
      };

      const error = OperationQueueError.operationTimeout('op123', 5000, diagnostics);
      const detailedMessage = error.getDetailedMessage();

      expect(detailedMessage).toContain('OperationQueueError');
      expect(detailedMessage).toContain('OPERATION_TIMEOUT');
      expect(detailedMessage).toContain('TestComponent');
      expect(detailedMessage).toContain('test_operation');
      expect(detailedMessage).toContain('Suggestions:');
      expect(detailedMessage).toContain('memoryUsage');
    });

    it('should convert errors to structured log objects', () => {
      const diagnostics = {
        component: 'TestComponent',
        operation: 'test_operation',
        timestamp: new Date(),
        context: { testData: 'value' },
      };

      const error = OperationQueueError.operationTimeout('op123', 5000, diagnostics);
      const logObject = error.toLogObject();

      expect(logObject).toHaveProperty('name', 'OperationQueueError');
      expect(logObject).toHaveProperty('code', 'OPERATION_TIMEOUT');
      expect(logObject).toHaveProperty('severity', 'medium');
      expect(logObject).toHaveProperty('diagnostics');
      expect(logObject).toHaveProperty('suggestions');
      expect(logObject.diagnostics.component).toBe('TestComponent');
    });
  });

  describe('Enhanced Logger', () => {
    it('should log enhanced errors with full context', () => {
      const diagnostics = {
        component: 'TestComponent',
        operation: 'test_operation',
        timestamp: new Date(),
        context: { testData: 'value' },
      };

      const error = OperationQueueError.queueOverflow(10, 5, diagnostics);
      logger.logEnhancedError(error);

      const logs = logger.getRecentLogs(1);
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('error');
      expect(logs[0].component).toBe('TestComponent');
      expect(logs[0].error).toBeDefined();
      expect(logs[0].error.code).toBe('QUEUE_OVERFLOW');
    });

    it('should track operation lifecycle with performance metrics', () => {
      const operationId = logger.logOperationStart('test_operation', 'TestComponent', {
        inputSize: 100,
      });

      expect(operationId).toMatch(/^op_\d+_[a-z0-9]+$/);

      logger.logOperationComplete(operationId, 'test_operation', 'TestComponent', 150, {
        outputSize: 50,
        success: true,
      });

      const logs = logger.getRecentLogs(2);
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toContain('Operation started');
      expect(logs[1].message).toContain('Operation completed');
      expect(logs[1].performanceMetrics?.duration).toBe(150);
    });

    it('should filter logs by level and component', () => {
      logger.debug('Debug message', 'TestComponent');
      logger.info('Info message', 'TestComponent');
      logger.warn('Warning message', 'TestComponent');
      logger.error('Error message', 'TestComponent');

      const errorLogs = logger.getFilteredLogs({ level: 'error' });
      const componentLogs = logger.getFilteredLogs({ component: 'TestComponent' });

      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe('Error message');
      expect(componentLogs).toHaveLength(4);
    });

    it('should handle log buffer overflow', () => {
      const smallLogger = new EnhancedLogger({ level: 'debug' });
      smallLogger['maxBufferSize'] = 3; // Set small buffer for testing

      for (let i = 0; i < 5; i++) {
        smallLogger.info(`Message ${i}`, 'TestComponent');
      }

      const logs = smallLogger.getRecentLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('Message 2'); // Oldest kept
      expect(logs[2].message).toBe('Message 4'); // Newest
    });
  });

  describe('Error Recovery Manager', () => {
    it('should register and execute recovery strategies', async () => {
      let recoveryExecuted = false;

      recoveryManager.registerRecoveryStrategy('QUEUE_OVERFLOW', async error => {
        recoveryExecuted = true;
        return true;
      });

      const diagnostics = {
        component: 'TestComponent',
        operation: 'test_operation',
        timestamp: new Date(),
      };

      const error = OperationQueueError.queueOverflow(10, 5, diagnostics);
      const recovered = await recoveryManager.attemptRecovery(error);

      expect(recovered).toBe(true);
      expect(recoveryExecuted).toBe(true);
    });

    it('should handle recovery strategy failures', async () => {
      recoveryManager.registerRecoveryStrategy('QUEUE_OVERFLOW', async () => {
        throw new Error('Recovery failed');
      });

      const diagnostics = {
        component: 'TestComponent',
        operation: 'test_operation',
        timestamp: new Date(),
      };

      const error = OperationQueueError.queueOverflow(10, 5, diagnostics);
      const recovered = await recoveryManager.attemptRecovery(error);

      expect(recovered).toBe(false);
    });

    it('should not attempt recovery for non-recoverable errors', async () => {
      const diagnostics = {
        component: 'TestComponent',
        operation: 'test_operation',
        timestamp: new Date(),
      };

      const error = OperationQueueError.concurrencyViolation(5, 3, diagnostics);
      const recovered = await recoveryManager.attemptRecovery(error);

      expect(recovered).toBe(false);
    });

    it('should provide recovery suggestions', () => {
      const diagnostics = {
        component: 'TestComponent',
        operation: 'test_operation',
        timestamp: new Date(),
      };

      const error = OperationQueueError.queueOverflow(10, 5, diagnostics);
      const suggestions = recoveryManager.getRecoverySuggestions(error);

      expect(suggestions).toHaveLength(error.suggestions.length);
      expect(suggestions[0]).toContain('Reduce operation frequency');
    });
  });

  describe('Integration with Components', () => {
    it('should handle OperationQueue errors with enhanced logging', async () => {
      const queue = new OperationQueue({ maxQueueSize: 2 });

      // Fill the queue to capacity
      const promise1 = queue.enqueue(() => new Promise(resolve => setTimeout(resolve, 100)));
      const promise2 = queue.enqueue(() => new Promise(resolve => setTimeout(resolve, 100)));

      // This should trigger queue overflow error
      await expect(queue.enqueue(() => Promise.resolve('should fail'))).rejects.toThrow(
        OperationQueueError
      );

      // Clean up
      await Promise.all([promise1, promise2]);
      await queue.shutdown();
    });
  });

  describe('Performance Metrics and Monitoring', () => {
    it('should collect performance metrics during operations', () => {
      logger.logPerformanceMetrics('TestComponent', 'test_operation', {
        memoryUsage: 100,
        cpuUsage: 50,
        duration: 200,
        throughput: 10,
      });

      const logs = logger.getRecentLogs(1);
      expect(logs[0].performanceMetrics).toBeDefined();
      expect(logs[0].performanceMetrics?.memoryUsage).toBeGreaterThan(0); // Will include actual memory usage
      expect(logs[0].performanceMetrics?.duration).toBe(200);
    });

    it('should track memory usage in error diagnostics', () => {
      const diagnostics = {
        component: 'TestComponent',
        operation: 'test_operation',
        timestamp: new Date(),
        performanceMetrics: {
          memoryUsage: 150,
          queueSize: 10,
          activeOperations: 3,
        },
      };

      const error = OperationQueueError.queueOverflow(10, 5, diagnostics);

      expect(error.diagnostics.performanceMetrics?.memoryUsage).toBe(150);
      expect(error.diagnostics.performanceMetrics?.queueSize).toBe(10);
    });
  });

  describe('Error Context and Diagnostics', () => {
    it('should provide comprehensive diagnostic context', () => {
      const diagnostics = {
        component: 'TestComponent',
        operation: 'complex_operation',
        timestamp: new Date(),
        context: {
          userId: 'user123',
          operationId: 'op456',
          batchSize: 100,
          retryCount: 2,
        },
        performanceMetrics: {
          memoryUsage: 200,
          cpuUsage: 75,
          queueSize: 15,
        },
        stackTrace: 'Error\n    at TestComponent.complexOperation',
      };

      const error = OperationQueueError.operationTimeout('op456', 10000, diagnostics);

      expect(error.diagnostics.context?.userId).toBe('user123');
      expect(error.diagnostics.context?.batchSize).toBe(100);
      expect(error.diagnostics.performanceMetrics?.cpuUsage).toBe(75);
      expect(error.diagnostics.stackTrace).toContain('TestComponent.complexOperation');
    });

    it('should handle nested error causes', () => {
      const originalError = new Error('Original cause');
      const diagnostics = {
        component: 'TestComponent',
        operation: 'test_operation',
        timestamp: new Date(),
      };

      const enhancedError = new OperationQueueError(
        'Enhanced error with cause',
        'TEST_ERROR',
        diagnostics,
        { cause: originalError }
      );

      const logObject = enhancedError.toLogObject();
      expect(logObject.cause).toBeDefined();
      expect(logObject.cause.message).toBe('Original cause');
    });
  });
});
