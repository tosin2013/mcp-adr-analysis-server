/**
 * Performance Optimizer for TodoJsonManager
 * 
 * Provides caching, efficient filtering, and pagination optimizations
 * for handling large datasets efficiently.
 */

import { TodoTask, TodoJsonData } from '../types/todo-json-schemas.js';

export interface FilterOptions {
  status?: string;
  priority?: string;
  assignee?: string;
  category?: string;
  hasDeadline?: boolean;
  overdue?: boolean;
  tags?: string[];
  archived?: boolean;
  search?: string;
}

export interface SortOptions {
  field: 'priority' | 'dueDate' | 'createdAt' | 'updatedAt' | 'title';
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TaskCache {
  tasks: TodoTask[];
  lastUpdated: number;
  filters: string; // Serialized filter key
}

export class PerformanceOptimizer {
  private static cache = new Map<string, TaskCache>();
  private static cacheTimeout = 30000; // 30 seconds
  private static maxCacheSize = 50;

  /**
   * Get tasks with optimized filtering, sorting, and pagination
   */
  static async getOptimizedTasks(
    data: TodoJsonData,
    filters?: FilterOptions,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<TodoTask>> {
    const startTime = Date.now();
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(filters, sort);
    
    // Try to get from cache first
    let tasks = this.getFromCache(cacheKey, data.metadata.lastUpdated);
    
    if (!tasks) {
      // Cache miss - perform filtering
      tasks = await this.filterTasks(Object.values(data.tasks), filters);
      
      // Cache the filtered results
      this.setCache(cacheKey, tasks, data.metadata.lastUpdated);
    }
    
    // Apply sorting (always fresh since it's fast)
    if (sort) {
      tasks = this.sortTasks(tasks, sort);
    }
    
    // Apply pagination
    const result = this.paginateTasks(tasks, pagination);
    
    const executionTime = Date.now() - startTime;
    
    // Log performance for monitoring
    if (executionTime > 100) {
      console.warn(`Slow task query: ${executionTime}ms for ${tasks.length} tasks`);
    }
    
    return result;
  }

  /**
   * Efficient task filtering with early termination
   */
  private static async filterTasks(
    tasks: TodoTask[],
    filters?: FilterOptions
  ): Promise<TodoTask[]> {
    if (!filters) return tasks;

    return tasks.filter(task => {
      // Status filter (most common, check first)
      if (filters.status && task.status !== filters.status) {
        return false;
      }

      // Archived filter (early termination for archived tasks)
      if (filters.archived !== undefined && Boolean(task.archived) !== filters.archived) {
        return false;
      }

      // Priority filter
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }

      // Assignee filter
      if (filters.assignee && task.assignee !== filters.assignee) {
        return false;
      }

      // Category filter
      if (filters.category && task.category !== filters.category) {
        return false;
      }

      // Deadline filter
      if (filters.hasDeadline !== undefined) {
        const hasDeadline = Boolean(task.dueDate);
        if (hasDeadline !== filters.hasDeadline) {
          return false;
        }
      }

      // Overdue filter
      if (filters.overdue !== undefined && filters.overdue) {
        if (!task.dueDate || new Date(task.dueDate) > new Date()) {
          return false;
        }
      }

      // Tags filter (check if task has all required tags)
      if (filters.tags && filters.tags.length > 0) {
        const taskTags = task.tags || [];
        if (!filters.tags.every(tag => taskTags.includes(tag))) {
          return false;
        }
      }

      // Search filter (most expensive, check last)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableText = [
          task.title,
          task.description || '',
          task.category || '',
          task.assignee || '',
          ...(task.tags || [])
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Efficient task sorting with optimized comparisons
   */
  private static sortTasks(tasks: TodoTask[], sort: SortOptions): TodoTask[] {
    const { field, order } = sort;
    const multiplier = order === 'asc' ? 1 : -1;

    return tasks.sort((a, b) => {
      let comparison = 0;

      switch (field) {
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;

        case 'dueDate':
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = aDate - bDate;
          break;

        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;

        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;

        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;

        default:
          comparison = 0;
      }

      return comparison * multiplier;
    });
  }

  /**
   * Efficient pagination with metadata
   */
  private static paginateTasks(
    tasks: TodoTask[],
    pagination?: PaginationOptions
  ): PaginatedResult<TodoTask> {
    const totalItems = tasks.length;

    if (!pagination) {
      return {
        items: tasks,
        totalItems,
        totalPages: 1,
        currentPage: 1,
        pageSize: totalItems,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }

    const { page, pageSize } = pagination;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    
    const items = tasks.slice(startIndex, endIndex);

    return {
      items,
      totalItems,
      totalPages,
      currentPage: page,
      pageSize,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  }

  /**
   * Generate cache key from filters and sort options
   */
  private static generateCacheKey(filters?: FilterOptions, sort?: SortOptions): string {
    const filterKey = filters ? JSON.stringify(filters) : 'no-filters';
    const sortKey = sort ? `${sort.field}-${sort.order}` : 'no-sort';
    return `${filterKey}|${sortKey}`;
  }

  /**
   * Get tasks from cache if valid
   */
  private static getFromCache(cacheKey: string, lastUpdated: string): TodoTask[] | null {
    const cached = this.cache.get(cacheKey);
    
    if (!cached) return null;
    
    const dataLastUpdated = new Date(lastUpdated).getTime();
    const cacheAge = Date.now() - cached.lastUpdated;
    
    // Check if cache is still valid
    if (cacheAge > this.cacheTimeout || cached.lastUpdated < dataLastUpdated) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached.tasks;
  }

  /**
   * Set tasks in cache
   */
  private static setCache(cacheKey: string, tasks: TodoTask[], lastUpdated: string): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(cacheKey, {
      tasks: [...tasks], // Create a copy to avoid reference issues
      lastUpdated: new Date(lastUpdated).getTime(),
      filters: cacheKey
    });
  }

  /**
   * Clear all cached data
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }

  /**
   * Optimize analytics calculation for large datasets
   */
  static async calculateOptimizedAnalytics(data: TodoJsonData): Promise<{
    totalTasks: number;
    completedTasks: number;
    completionPercentage: number;
    priorityDistribution: Record<string, number>;
    statusDistribution: Record<string, number>;
    averageTaskAge: number;
    criticalTasksRemaining: number;
  }> {
    const tasks = Object.values(data.tasks);
    const now = Date.now();
    
    // Use single pass for multiple calculations
    let completedTasks = 0;
    let totalAge = 0;
    let criticalTasksRemaining = 0;
    
    const priorityDistribution: Record<string, number> = {
      low: 0, medium: 0, high: 0, critical: 0
    };
    
    const statusDistribution: Record<string, number> = {
      pending: 0, in_progress: 0, completed: 0, blocked: 0, cancelled: 0
    };

    for (const task of tasks) {
      // Count completed tasks
      if (task.status === 'completed') {
        completedTasks++;
      }
      
      // Count critical tasks remaining
      if (task.priority === 'critical' && task.status !== 'completed') {
        criticalTasksRemaining++;
      }
      
      // Calculate age
      const taskAge = (now - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      totalAge += taskAge;
      
      // Update distributions
      if (task.priority && priorityDistribution[task.priority] !== undefined) {
        priorityDistribution[task.priority]++;
      }
      if (task.status && statusDistribution[task.status] !== undefined) {
        statusDistribution[task.status]++;
      }
    }

    const totalTasks = tasks.length;
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
    const averageTaskAge = totalTasks > 0 ? totalAge / totalTasks : 0;

    return {
      totalTasks,
      completedTasks,
      completionPercentage,
      priorityDistribution,
      statusDistribution,
      averageTaskAge,
      criticalTasksRemaining
    };
  }
}