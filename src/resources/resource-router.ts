/**
 * Resource Router - URI routing infrastructure for templated resources
 * Supports parameterized URIs like adr://adr/{id} and adr://research/{topic}
 */

import { ResourceGenerationResult } from './index.js';
import { McpAdrError } from '../types/index.js';

export type ResourceHandler = (
  params: Record<string, string>,
  searchParams: URLSearchParams
) => Promise<ResourceGenerationResult>;

export interface RouteRegistration {
  pattern: string;
  handler: ResourceHandler;
  description?: string;
}

/**
 * URI Router for templated resources
 * Matches URI patterns and extracts parameters
 */
export class ResourceRouter {
  private routes: RouteRegistration[] = [];

  /**
   * Register a route pattern with its handler
   */
  register(pattern: string, handler: ResourceHandler, description?: string): void {
    // Ensure pattern starts with /
    const normalizedPattern = pattern.startsWith('/') ? pattern : `/${pattern}`;

    const registration: RouteRegistration = {
      pattern: normalizedPattern,
      handler,
    };

    if (description !== undefined) {
      registration.description = description;
    }

    this.routes.push(registration);
  }

  /**
   * Route a URI to its handler and execute
   */
  async route(uri: string): Promise<ResourceGenerationResult> {
    const url = new URL(uri);
    const path = url.pathname;

    // Try to match pattern
    for (const route of this.routes) {
      if (this.matchPattern(route.pattern, path)) {
        const params = this.extractParams(route.pattern, path);
        return await route.handler(params, url.searchParams);
      }
    }

    throw new McpAdrError(`No route found for: ${uri}`, 'RESOURCE_NOT_FOUND');
  }

  /**
   * Check if a pattern matches a path
   */
  private matchPattern(pattern: string, path: string): boolean {
    // Convert pattern to regex: /adr/{id} -> /adr/([^/]+)
    const regex = pattern.replace(/\{[^}]+\}/g, '([^/]+)');
    return new RegExp(`^${regex}$`).test(path);
  }

  /**
   * Extract parameters from path based on pattern
   */
  private extractParams(pattern: string, path: string): Record<string, string> {
    const paramNames = pattern.match(/\{([^}]+)\}/g)?.map(p => p.slice(1, -1)) || [];
    const regex = pattern.replace(/\{[^}]+\}/g, '([^/]+)');
    const matches = path.match(new RegExp(`^${regex}$`));

    const params: Record<string, string> = {};
    if (matches) {
      paramNames.forEach((name, i) => {
        const value = matches[i + 1];
        if (value !== undefined) {
          params[name] = decodeURIComponent(value);
        }
      });
    }

    return params;
  }

  /**
   * Get all registered routes
   */
  getRoutes(): RouteRegistration[] {
    return [...this.routes];
  }

  /**
   * Check if a URI can be routed
   */
  canRoute(uri: string): boolean {
    try {
      const url = new URL(uri);
      const path = url.pathname;

      for (const route of this.routes) {
        if (this.matchPattern(route.pattern, path)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const resourceRouter = new ResourceRouter();
