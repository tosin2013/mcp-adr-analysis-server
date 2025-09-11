/**
 * Enhanced Logging System
 *
 * Provides comprehensive logging with structured error reporting,
 * diagnostic context, and actionable error messages.
 */

import { EnhancedError, DiagnosticContext } from '../types/enhanced-errors.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  component: string;
  operation?: string;
  context?: Record<string, any>;
  error?: any;
  diagnostics?: DiagnosticContext;
  performanceMetrics?: {
    memoryUsage?: number;
    cpuUsage?: number;
    duration?: number;
    queueSize?: number;
    activeOperations?: number;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  enableStructuredLogging: boolean;
  enablePerformanceMetrics: boolean;
}

/**
 * Enhanced Logger with comprehensive error reporting and diagnostics
 */
export class EnhancedLogger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableFile: false,
      enableStructuredLogging: true,
      enablePerformanceMetrics: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      ...config,
    };
  }

  /**
   * Log debug information
   */
  debug(message: string, component: string, context?: Record<string, any>): void {
    this.log('debug', message, component, context ? { context } : {});
  }

  /**
   * Log informational messages
   */
  info(message: string, component: string, context?: Record<string, any>): void {
    this.log('info', message, component, context ? { context } : {});
  }

  /**
   * Log warning messages
   */
  warn(message: string, component: string, context?: Record<string, any>): void {
    this.log('warn', message, component, context ? { context } : {});
  }

  /**
   * Log error messages
   */
  error(message: string, component: string, error?: Error, context?: Record<string, any>): void {
    const options: any = {};
    if (error) options.error = error;
    if (context) options.context = context;
    this.log('error', message, component, options);
  }

  /**
   * Log critical errors
   */
  critical(message: string, component: string, error?: Error, context?: Record<string, any>): void {
    const options: any = {};
    if (error) options.error = error;
    if (context) options.context = context;
    this.log('critical', message, component, options);
  }

  /**
   * Log enhanced errors with full diagnostic information
   */
  logEnhancedError(error: EnhancedError): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: this.mapSeverityToLogLevel(error.severity),
      message: error.message,
      component: error.diagnostics.component,
      ...(error.diagnostics.operation && { operation: error.diagnostics.operation }),
      context: {
        code: error.code,
        severity: error.severity,
        recoverable: error.recoverable,
        retryable: error.retryable,
        suggestions: error.suggestions,
        ...error.diagnostics.context,
      },
      error: error.toLogObject(),
      diagnostics: error.diagnostics,
      ...(error.diagnostics.performanceMetrics && {
        performanceMetrics: error.diagnostics.performanceMetrics,
      }),
    };

    this.writeLogEntry(entry);
  }

  /**
   * Log operation start with performance tracking
   */
  logOperationStart(operation: string, component: string, context?: Record<string, any>): string {
    const operationId = this.generateOperationId();
    this.log('info', `Operation started: ${operation}`, component, {
      context: { operationId, ...context },
      operation,
    });
    return operationId;
  }

  /**
   * Log operation completion with performance metrics
   */
  logOperationComplete(
    operationId: string,
    operation: string,
    component: string,
    duration: number,
    context?: Record<string, any>
  ): void {
    this.log('info', `Operation completed: ${operation}`, component, {
      context: { operationId, duration, ...context },
      operation,
      performanceMetrics: { duration },
    });
  }

  /**
   * Log operation failure with recovery suggestions
   */
  logOperationFailure(
    operationId: string,
    operation: string,
    component: string,
    error: Error,
    duration: number,
    context?: Record<string, any>
  ): void {
    this.log('error', `Operation failed: ${operation}`, component, {
      error,
      context: { operationId, duration, ...context },
      operation,
      performanceMetrics: { duration },
    });
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics(
    component: string,
    operation: string,
    metrics: {
      memoryUsage?: number;
      cpuUsage?: number;
      duration?: number;
      queueSize?: number;
      activeOperations?: number;
      throughput?: number;
    }
  ): void {
    this.log('info', `Performance metrics for ${operation}`, component, {
      operation,
      performanceMetrics: metrics,
    });
  }

  /**
   * Get recent log entries for debugging
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Get logs filtered by level and component
   */
  getFilteredLogs(filters: {
    level?: LogLevel;
    component?: string;
    operation?: string;
    since?: Date;
  }): LogEntry[] {
    return this.logBuffer.filter(entry => {
      if (filters.level && !this.levelMeetsFilter(filters.level, entry.level)) {
        return false;
      }
      if (filters.component && entry.component !== filters.component) {
        return false;
      }
      if (filters.operation && entry.operation !== filters.operation) {
        return false;
      }
      if (filters.since && entry.timestamp < filters.since) {
        return false;
      }
      return true;
    });
  }

  /**
   * Clear log buffer
   */
  clearLogs(): void {
    this.logBuffer = [];
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    component: string,
    options: {
      error?: Error;
      context?: Record<string, any>;
      operation?: string;
      performanceMetrics?: Record<string, any>;
    } = {}
  ): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      component,
      ...(options.operation && { operation: options.operation }),
      ...(options.context && { context: options.context }),
      ...(options.error && { error: this.serializeError(options.error) }),
      ...((this.config.enablePerformanceMetrics || options.performanceMetrics) && {
        performanceMetrics: this.config.enablePerformanceMetrics
          ? {
              memoryUsage: this.getMemoryUsage(),
              ...options.performanceMetrics,
            }
          : options.performanceMetrics,
      }),
    };

    this.writeLogEntry(entry);
  }

  /**
   * Write log entry to configured outputs
   */
  private writeLogEntry(entry: LogEntry): void {
    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Console output
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    // File output (if configured)
    if (this.config.enableFile && this.config.filePath) {
      this.writeToFile(entry);
    }
  }

  /**
   * Write to console with appropriate formatting
   */
  private writeToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.component}]`;

    if (this.config.enableStructuredLogging) {
      const logData = {
        ...entry,
        timestamp: timestamp,
      };

      switch (entry.level) {
        case 'critical':
        case 'error':
          console.error(prefix, entry.message, logData);
          break;
        case 'warn':
          console.warn(prefix, entry.message, logData);
          break;
        case 'debug':
          console.debug(prefix, entry.message, logData);
          break;
        default:
          console.log(prefix, entry.message, logData);
      }
    } else {
      const message = `${prefix} ${entry.message}`;

      switch (entry.level) {
        case 'critical':
        case 'error':
          console.error(message);
          if (entry.error) {
            console.error('Error details:', entry.error);
          }
          break;
        case 'warn':
          console.warn(message);
          break;
        case 'debug':
          console.debug(message);
          break;
        default:
          console.log(message);
      }
    }
  }

  /**
   * Write to file (placeholder - would need file system implementation)
   */
  private writeToFile(_entry: LogEntry): void {
    // File logging would be implemented here
    // For now, this is a placeholder as file operations depend on environment
  }

  /**
   * Check if log level is enabled
   */
  private isLevelEnabled(level: LogLevel, entryLevel?: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
    const configLevelIndex = levels.indexOf(this.config.level);
    const checkLevelIndex = levels.indexOf(entryLevel || level);
    return checkLevelIndex >= configLevelIndex;
  }

  /**
   * Check if a specific level meets the filter criteria
   */
  private levelMeetsFilter(filterLevel: LogLevel, entryLevel: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
    const filterLevelIndex = levels.indexOf(filterLevel);
    const entryLevelIndex = levels.indexOf(entryLevel);
    return entryLevelIndex >= filterLevelIndex;
  }

  /**
   * Map error severity to log level
   */
  private mapSeverityToLogLevel(severity: 'critical' | 'high' | 'medium' | 'low'): LogLevel {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  }

  /**
   * Serialize error for logging
   */
  private serializeError(error: Error): any {
    if (error instanceof EnhancedError) {
      return error.toLogObject();
    }

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause ? this.serializeError(error.cause as Error) : undefined,
    };
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024); // MB
    }
    return 0;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Global logger instance
 */
export const logger = new EnhancedLogger();

/**
 * Create component-specific logger
 */
export function createComponentLogger(
  component: string,
  config?: Partial<LoggerConfig>
): ComponentLogger {
  return new ComponentLogger(component, config);
}

/**
 * Component-specific logger wrapper
 */
export class ComponentLogger {
  private logger: EnhancedLogger;
  private component: string;

  constructor(component: string, config?: Partial<LoggerConfig>) {
    this.component = component;
    this.logger = config ? new EnhancedLogger(config) : logger; // Use global logger if no config
  }

  debug(message: string, context?: Record<string, any>): void {
    this.logger.debug(message, this.component, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.logger.info(message, this.component, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.logger.warn(message, this.component, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.logger.error(message, this.component, error, context);
  }

  critical(message: string, error?: Error, context?: Record<string, any>): void {
    this.logger.critical(message, this.component, error, context);
  }

  logEnhancedError(error: EnhancedError): void {
    this.logger.logEnhancedError(error);
  }

  logOperationStart(operation: string, context?: Record<string, any>): string {
    return this.logger.logOperationStart(operation, this.component, context);
  }

  logOperationComplete(
    operationId: string,
    operation: string,
    duration: number,
    context?: Record<string, any>
  ): void {
    this.logger.logOperationComplete(operationId, operation, this.component, duration, context);
  }

  logOperationFailure(
    operationId: string,
    operation: string,
    error: Error,
    duration: number,
    context?: Record<string, any>
  ): void {
    this.logger.logOperationFailure(
      operationId,
      operation,
      this.component,
      error,
      duration,
      context
    );
  }

  logPerformanceMetrics(operation: string, metrics: Record<string, any>): void {
    this.logger.logPerformanceMetrics(this.component, operation, metrics);
  }
}

/**
 * Error recovery utilities
 */
export class ErrorRecoveryManager {
  private logger: EnhancedLogger;
  private recoveryStrategies: Map<string, (error: EnhancedError) => Promise<boolean>> = new Map();

  constructor(logger?: EnhancedLogger) {
    this.logger = logger || new EnhancedLogger();
  }

  /**
   * Register recovery strategy for specific error codes
   */
  registerRecoveryStrategy(
    errorCode: string,
    strategy: (error: EnhancedError) => Promise<boolean>
  ): void {
    this.recoveryStrategies.set(errorCode, strategy);
  }

  /**
   * Attempt to recover from an enhanced error
   */
  async attemptRecovery(error: EnhancedError): Promise<boolean> {
    if (!error.recoverable) {
      this.logger.warn('Error is not recoverable', 'ErrorRecoveryManager', {
        errorCode: error.code,
        message: error.message,
      });
      return false;
    }

    const strategy = this.recoveryStrategies.get(error.code);
    if (!strategy) {
      this.logger.warn('No recovery strategy found', 'ErrorRecoveryManager', {
        errorCode: error.code,
        message: error.message,
      });
      return false;
    }

    try {
      this.logger.info('Attempting error recovery', 'ErrorRecoveryManager', {
        errorCode: error.code,
        message: error.message,
      });

      const recovered = await strategy(error);

      if (recovered) {
        this.logger.info('Error recovery successful', 'ErrorRecoveryManager', {
          errorCode: error.code,
          message: error.message,
        });
      } else {
        this.logger.warn('Error recovery failed', 'ErrorRecoveryManager', {
          errorCode: error.code,
          message: error.message,
        });
      }

      return recovered;
    } catch (recoveryError) {
      this.logger.error(
        'Error recovery threw exception',
        'ErrorRecoveryManager',
        recoveryError as Error,
        {
          originalErrorCode: error.code,
          originalMessage: error.message,
        }
      );
      return false;
    }
  }

  /**
   * Get recovery suggestions for an error
   */
  getRecoverySuggestions(error: EnhancedError): string[] {
    return error.suggestions.map(s => `${s.action}: ${s.description}`);
  }
}
