/**
 * Domain Knowledge Templates for Knowledge Generation Framework
 * Provides structured architectural knowledge for different domains
 */

import {
  DomainTemplate,
  ArchitecturalDomain,
  KnowledgeCategory,
} from '../types/knowledge-generation.js';

// ============================================================================
// Web Applications Domain Template
// ============================================================================

export const webApplicationsTemplate: DomainTemplate = {
  domain: 'web-applications',
  categories: [
    {
      category: 'best-practices',
      items: [
        'Component-based architecture with clear separation of concerns',
        'State management patterns (Redux, Zustand, Context API)',
        'Performance optimization through code splitting and lazy loading',
        'Accessibility (a11y) compliance with WCAG guidelines',
        'SEO optimization with meta tags and structured data',
        'Progressive Web App (PWA) capabilities for offline functionality',
        'Responsive design principles for multi-device support',
        'Security best practices including CSP and XSS prevention',
      ],
      priority: 9,
      applicability: ['React', 'Vue', 'Angular', 'Svelte', 'web-framework'],
    },
    {
      category: 'design-patterns',
      items: [
        'Model-View-Controller (MVC) architecture',
        'Component composition over inheritance',
        'Higher-Order Components (HOCs) for cross-cutting concerns',
        'Render props pattern for flexible component APIs',
        'Custom hooks pattern for reusable stateful logic',
        'Observer pattern for reactive state management',
        'Factory pattern for component creation',
        'Singleton pattern for global state management',
      ],
      priority: 8,
      applicability: ['component-based', 'state-management'],
    },
    {
      category: 'anti-patterns',
      items: [
        'Prop drilling through multiple component layers',
        'Massive components with too many responsibilities',
        'Direct DOM manipulation in React/Vue components',
        'Inline styles without CSS-in-JS or CSS modules',
        'Uncontrolled state mutations in Redux',
        'Memory leaks from unremoved event listeners',
        'Blocking the main thread with heavy computations',
      ],
      priority: 7,
      applicability: ['React', 'Vue', 'Angular'],
    },
    {
      category: 'performance-considerations',
      items: [
        'Bundle size optimization with tree shaking',
        'Image optimization and lazy loading strategies',
        'Critical rendering path optimization',
        'Service worker implementation for caching',
        'Database query optimization for API endpoints',
        'CDN usage for static asset delivery',
        'Compression (gzip/brotli) for reduced payload sizes',
      ],
      priority: 8,
      applicability: ['performance', 'optimization'],
    },
  ],
  metadata: {
    version: '1.0.0',
    author: 'MCP ADR Analysis Server',
    lastUpdated: '2024-01-01',
    description: 'Comprehensive web application architectural knowledge',
    tags: ['web', 'frontend', 'spa', 'pwa'],
  },
};

// ============================================================================
// Microservices Domain Template
// ============================================================================

export const microservicesTemplate: DomainTemplate = {
  domain: 'microservices',
  categories: [
    {
      category: 'best-practices',
      items: [
        'Domain-driven design for service boundaries',
        'API-first design with OpenAPI specifications',
        'Event-driven architecture for loose coupling',
        'Circuit breaker pattern for fault tolerance',
        'Distributed tracing for observability',
        'Service mesh for inter-service communication',
        'Database per service pattern',
        'Saga pattern for distributed transactions',
      ],
      priority: 10,
      applicability: ['distributed-systems', 'microservices'],
    },
    {
      category: 'design-patterns',
      items: [
        'API Gateway pattern for unified entry point',
        'Service registry and discovery patterns',
        'Bulkhead pattern for resource isolation',
        'Strangler Fig pattern for legacy migration',
        'Event sourcing for audit trails',
        'CQRS for read/write separation',
        'Sidecar pattern for cross-cutting concerns',
      ],
      priority: 9,
      applicability: ['microservices', 'distributed-patterns'],
    },
    {
      category: 'anti-patterns',
      items: [
        'Distributed monolith with tight coupling',
        'Chatty interfaces with excessive API calls',
        'Shared databases between services',
        'Synchronous communication for all interactions',
        'Lack of proper service boundaries',
        'Missing distributed tracing and monitoring',
        'Inadequate error handling and retries',
      ],
      priority: 8,
      applicability: ['microservices', 'distributed-systems'],
    },
    {
      category: 'security-guidelines',
      items: [
        'Zero-trust security model implementation',
        'Service-to-service authentication with mTLS',
        'API rate limiting and throttling',
        'Input validation at service boundaries',
        'Secrets management with dedicated tools',
        'Network segmentation and firewalls',
        'Regular security audits and penetration testing',
      ],
      priority: 9,
      applicability: ['security', 'microservices'],
    },
  ],
  metadata: {
    version: '1.0.0',
    author: 'MCP ADR Analysis Server',
    lastUpdated: '2024-01-01',
    description: 'Microservices architecture patterns and practices',
    tags: ['microservices', 'distributed-systems', 'scalability'],
  },
};

// ============================================================================
// Database Design Domain Template
// ============================================================================

export const databaseDesignTemplate: DomainTemplate = {
  domain: 'database-design',
  categories: [
    {
      category: 'best-practices',
      items: [
        'Normalization to reduce data redundancy',
        'Proper indexing strategy for query performance',
        'ACID properties for transaction integrity',
        'Connection pooling for resource management',
        'Database sharding for horizontal scaling',
        'Read replicas for improved read performance',
        'Regular backup and disaster recovery planning',
        'Data encryption at rest and in transit',
      ],
      priority: 9,
      applicability: ['relational-database', 'sql'],
    },
    {
      category: 'design-patterns',
      items: [
        'Repository pattern for data access abstraction',
        'Unit of Work pattern for transaction management',
        'Active Record pattern for ORM integration',
        'Data Mapper pattern for domain isolation',
        'Command Query Responsibility Segregation (CQRS)',
        'Event sourcing for audit and replay capabilities',
        'Polyglot persistence for different data needs',
      ],
      priority: 8,
      applicability: ['data-access', 'orm'],
    },
    {
      category: 'performance-considerations',
      items: [
        'Query optimization and execution plan analysis',
        'Proper use of database indexes',
        'Partitioning strategies for large tables',
        'Caching layers (Redis, Memcached)',
        'Database connection optimization',
        'Batch processing for bulk operations',
        'Monitoring and alerting for performance metrics',
      ],
      priority: 9,
      applicability: ['performance', 'optimization'],
    },
  ],
  metadata: {
    version: '1.0.0',
    author: 'MCP ADR Analysis Server',
    lastUpdated: '2024-01-01',
    description: 'Database design patterns and optimization strategies',
    tags: ['database', 'sql', 'nosql', 'performance'],
  },
};

// ============================================================================
// API Design Domain Template
// ============================================================================

export const apiDesignTemplate: DomainTemplate = {
  domain: 'api-design',
  categories: [
    {
      category: 'best-practices',
      items: [
        'RESTful API design principles and conventions',
        'Consistent naming conventions for endpoints',
        'Proper HTTP status code usage',
        'API versioning strategies (URL, header, content)',
        'Comprehensive API documentation with OpenAPI',
        'Input validation and sanitization',
        'Rate limiting and throttling mechanisms',
        'CORS configuration for cross-origin requests',
      ],
      priority: 10,
      applicability: ['rest-api', 'web-api'],
    },
    {
      category: 'design-patterns',
      items: [
        'Resource-based URL design',
        'HATEOAS for hypermedia-driven APIs',
        'Pagination patterns for large datasets',
        'Filtering and sorting query parameters',
        'Bulk operations for efficiency',
        'Webhook patterns for event notifications',
        'GraphQL for flexible data fetching',
        'API Gateway pattern for centralized management',
      ],
      priority: 9,
      applicability: ['api-design', 'rest', 'graphql'],
    },
    {
      category: 'security-guidelines',
      items: [
        'OAuth 2.0 and JWT for authentication',
        'API key management and rotation',
        'Input validation and SQL injection prevention',
        'HTTPS enforcement for all endpoints',
        'CORS policy configuration',
        'Rate limiting to prevent abuse',
        'API security testing and vulnerability scanning',
      ],
      priority: 9,
      applicability: ['api-security', 'authentication'],
    },
  ],
  metadata: {
    version: '1.0.0',
    author: 'MCP ADR Analysis Server',
    lastUpdated: '2024-01-01',
    description: 'API design patterns and security best practices',
    tags: ['api', 'rest', 'graphql', 'security'],
  },
};

// ============================================================================
// Cloud Infrastructure Domain Template
// ============================================================================

export const cloudInfrastructureTemplate: DomainTemplate = {
  domain: 'cloud-infrastructure',
  categories: [
    {
      category: 'best-practices',
      items: [
        'Infrastructure as Code (IaC) with Terraform/CloudFormation',
        'Multi-region deployment for high availability',
        'Auto-scaling based on metrics and demand',
        'Cost optimization through resource right-sizing',
        'Security groups and network access controls',
        'Regular backup and disaster recovery testing',
        'Monitoring and alerting for all resources',
        'Tagging strategy for resource management',
      ],
      priority: 9,
      applicability: ['aws', 'azure', 'gcp', 'cloud'],
    },
    {
      category: 'design-patterns',
      items: [
        'Twelve-Factor App methodology',
        'Blue-green deployment for zero downtime',
        'Canary releases for gradual rollouts',
        'Circuit breaker for fault tolerance',
        'Load balancing for traffic distribution',
        'Content Delivery Network (CDN) usage',
        'Serverless architecture with Functions as a Service',
        'Container orchestration with Kubernetes',
      ],
      priority: 8,
      applicability: ['deployment', 'scalability'],
    },
    {
      category: 'security-guidelines',
      items: [
        'Identity and Access Management (IAM) policies',
        'Network security with VPCs and subnets',
        'Encryption at rest and in transit',
        'Security scanning and compliance monitoring',
        'Secrets management with dedicated services',
        'Regular security audits and penetration testing',
        'Incident response and security playbooks',
      ],
      priority: 10,
      applicability: ['cloud-security', 'compliance'],
    },
  ],
  metadata: {
    version: '1.0.0',
    author: 'MCP ADR Analysis Server',
    lastUpdated: '2024-01-01',
    description: 'Cloud infrastructure patterns and security practices',
    tags: ['cloud', 'infrastructure', 'aws', 'azure', 'gcp'],
  },
};

// ============================================================================
// Template Registry and Utilities
// ============================================================================

export const domainTemplateRegistry: Map<ArchitecturalDomain, DomainTemplate> = new Map([
  ['web-applications', webApplicationsTemplate],
  ['microservices', microservicesTemplate],
  ['database-design', databaseDesignTemplate],
  ['api-design', apiDesignTemplate],
  ['cloud-infrastructure', cloudInfrastructureTemplate],
]);

/**
 * Get domain template by domain name
 */
export function getDomainTemplate(domain: ArchitecturalDomain): DomainTemplate | undefined {
  return domainTemplateRegistry.get(domain);
}

/**
 * Get all available domain templates
 */
export function getAllDomainTemplates(): DomainTemplate[] {
  return Array.from(domainTemplateRegistry.values());
}

/**
 * Get templates for multiple domains
 */
export function getDomainTemplates(domains: ArchitecturalDomain[]): DomainTemplate[] {
  return domains
    .map(domain => getDomainTemplate(domain))
    .filter((template): template is DomainTemplate => template !== undefined);
}

/**
 * Get knowledge categories for a specific domain
 */
export function getDomainCategories(domain: ArchitecturalDomain): KnowledgeCategory[] {
  const template = getDomainTemplate(domain);
  return template ? template.categories.map(cat => cat.category) : [];
}

/**
 * Check if a domain template exists
 */
export function hasDomainTemplate(domain: ArchitecturalDomain): boolean {
  return domainTemplateRegistry.has(domain);
}

/**
 * Get template metadata for a domain
 */
export function getDomainTemplateMetadata(domain: ArchitecturalDomain) {
  const template = getDomainTemplate(domain);
  return template?.metadata;
}
