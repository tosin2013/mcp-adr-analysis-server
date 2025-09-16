/**
 * Unit tests for MemoryRelationshipMapper
 * Tests cross-tool memory relationship creation and validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MemoryRelationshipMapper } from '../../src/utils/memory-relationship-mapper.js';
import { MemoryEntityManager } from '../../src/utils/memory-entity-manager.js';
import {
  TroubleshootingSessionMemory,
  EnvironmentSnapshotMemory,
  DeploymentAssessmentMemory,
  SecurityPatternMemory,
  ArchitecturalDecisionMemory,
  FailurePatternMemory,
} from '../../src/types/memory-entities.js';

// Mock filesystem operations
const mockFsPromises = {
  access: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
};

jest.mock('fs', () => ({
  promises: mockFsPromises,
}));

// Mock crypto
const mockCrypto = {
  randomUUID: jest.fn(() => 'test-uuid-123'),
};

jest.mock('crypto', () => mockCrypto);

// Helper functions for creating valid test entities
function createValidDeploymentAssessmentEntity(overrides: any = {}) {
  return {
    type: 'deployment_assessment' as const,
    title: 'Test Deployment Assessment',
    description: 'A test deployment assessment',
    confidence: 0.8,
    tags: ['deployment', 'assessment'],
    context: {
      projectPhase: 'deployment',
      businessDomain: 'ecommerce',
      technicalStack: ['docker', 'kubernetes'],
      environmentalFactors: ['cloud'],
      stakeholders: ['devops-team'],
    },
    relationships: [],
    accessPattern: {
      accessCount: 1,
      lastAccessed: '2024-01-01T00:00:00.000Z',
      accessContext: ['deployment'],
    },
    evolution: {
      origin: 'created' as const,
      transformations: [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          type: 'creation',
          description: 'Initial assessment creation',
          agent: 'test-suite',
        },
      ],
    },
    validation: {
      isVerified: true,
      verificationMethod: 'automated-test',
      verificationTimestamp: '2024-01-01T00:00:00.000Z',
      conflictResolution: 'none',
    },
    assessmentData: {
      environment: 'staging',
      readinessScore: 0.9,
      validationResults: {
        testResults: {
          passed: 95,
          failed: 2,
          coverage: 0.92,
          criticalFailures: [],
        },
        securityScan: {
          vulnerabilities: {
            critical: 0,
            high: 0,
            medium: 1,
            low: 3,
          },
          overallRating: 'good',
        },
      },
      deploymentStrategy: {
        type: 'rolling',
        rollbackPlan: 'Automated rollback with health checks',
        monitoringPlan: 'Standard monitoring and alerting',
        estimatedDowntime: '< 1 minute',
      },
      complianceChecks: {
        adrCompliance: 0.9,
        regulatoryCompliance: ['GDPR', 'SOX'],
        auditTrail: ['All tests passed', 'Security scan completed'],
      },
      riskAssessment: {
        overallRisk: 'low',
        identifiedRisks: [
          {
            category: 'technical',
            description: 'Minor dependency update',
            probability: 0.1,
            impact: 'low',
            mitigation: 'Automated testing coverage',
          },
        ],
      },
      recommendations: ['Deploy during low-traffic hours', 'Monitor key metrics for 24 hours'],
    },
    ...overrides,
  };
}

function createValidADREntity(overrides: any = {}) {
  return {
    type: 'architectural_decision' as const,
    title: 'Test ADR Entity',
    description: 'A test architectural decision',
    confidence: 0.9,
    tags: ['database', 'architecture'],
    context: {
      projectPhase: 'design',
      businessDomain: 'ecommerce',
      technicalStack: ['Node.js', 'TypeScript'],
      environmentalFactors: ['cloud-native', 'high-availability'],
      stakeholders: ['engineering-team', 'devops-team'],
    },
    relationships: [],
    accessPattern: {
      accessCount: 1,
      lastAccessed: '2024-01-01T00:00:00.000Z',
      accessContext: ['test', 'integration'],
    },
    evolution: {
      origin: 'created' as const,
      transformations: [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          type: 'creation',
          description: 'Initial entity creation for testing',
          agent: 'test-suite',
        },
      ],
    },
    validation: {
      isVerified: true,
      verificationMethod: 'automated-test',
      verificationTimestamp: '2024-01-01T00:00:00.000Z',
      conflictResolution: 'none',
    },
    decisionData: {
      status: 'accepted' as const,
      context: 'We need to choose a database for our microservices architecture.',
      decision: 'We will use PostgreSQL as our primary database.',
      consequences: {
        positive: ['Strong consistency', 'Rich feature set'],
        negative: ['More complex scaling'],
        risks: ['Vendor lock-in'],
      },
      alternatives: [
        {
          name: 'MongoDB',
          description: 'Document database',
          tradeoffs: 'Flexibility vs consistency',
        },
      ],
      implementationStatus: 'completed' as const,
      implementationTasks: ['Setup cluster', 'Configure connection'],
      reviewHistory: [],
    },
    ...overrides,
  };
}

describe('MemoryRelationshipMapper', () => {
  let memoryManager: MemoryEntityManager;
  let mapper: MemoryRelationshipMapper;
  let mockDate: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock date to be consistent
    mockDate = jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2024-01-01T00:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(1704067200000); // 2024-01-01

    // Reset crypto mock
    mockCrypto.randomUUID.mockReturnValue('test-uuid-123');

    // Mock filesystem operations
    mockFsPromises.access.mockResolvedValue(undefined);
    mockFsPromises.mkdir.mockResolvedValue(undefined);
    mockFsPromises.readFile.mockRejectedValue(new Error('ENOENT'));
    mockFsPromises.writeFile.mockResolvedValue(undefined);

    memoryManager = new MemoryEntityManager();
    mapper = new MemoryRelationshipMapper(memoryManager);
  });

  afterEach(() => {
    mockDate.mockRestore();
  });

  describe('Cross-Tool Relationship Creation', () => {
    it('should link troubleshooting sessions to environment snapshots', async () => {
      // Create test entities
      const troubleshootingSession: TroubleshootingSessionMemory = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'troubleshooting_session',
        title: 'Database Connection Issue',
        description: 'Troubleshooting database connectivity problems',
        confidence: 0.8,
        relevance: 0.9,
        tags: ['database', 'connectivity'],
        created: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-01T00:00:00.000Z',
        version: 1,
        context: {
          projectPhase: 'production',
          technicalStack: ['postgresql', 'node.js'],
          environmentalFactors: ['cloud'],
          stakeholders: ['devops-team'],
        },
        relationships: [],
        accessPattern: {
          accessCount: 1,
          lastAccessed: '2024-01-01T00:00:00.000Z',
          accessContext: ['troubleshooting'],
        },
        evolution: {
          origin: 'created',
          transformations: [],
        },
        validation: {
          isVerified: true,
        },
        sessionData: {
          failurePattern: {
            failureType: 'runtime_error',
            errorSignature: 'connection timeout',
            frequency: 3,
            environments: ['production'],
          },
          failureDetails: {
            errorMessage: 'Database connection timeout after 30 seconds',
            environment: 'production',
          },
          analysisSteps: ['Check connection pool', 'Verify network connectivity'],
          solutionEffectiveness: 0.8,
          preventionMeasures: ['Monitor connection pool size'],
          relatedADRs: [],
          environmentContext: {
            environment: 'production',
          },
          followUpActions: [],
        },
      };

      const environmentSnapshot: EnvironmentSnapshotMemory = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        type: 'environment_snapshot',
        title: 'Production Environment Snapshot',
        description: 'Snapshot of production environment state',
        confidence: 0.9,
        relevance: 0.8,
        tags: ['production', 'environment'],
        created: '2024-01-01T00:30:00.000Z', // 30 minutes later
        lastModified: '2024-01-01T00:30:00.000Z',
        version: 1,
        context: {
          projectPhase: 'production',
          technicalStack: ['postgresql', 'node.js'],
          environmentalFactors: ['cloud'],
          stakeholders: ['devops-team'],
        },
        relationships: [],
        accessPattern: {
          accessCount: 1,
          lastAccessed: '2024-01-01T00:30:00.000Z',
          accessContext: ['monitoring'],
        },
        evolution: {
          origin: 'created',
          transformations: [],
        },
        validation: {
          isVerified: true,
        },
        environmentData: {
          environmentType: 'production',
          configuration: {
            database: { maxConnections: 100 },
          },
          complianceStatus: {
            adrAlignment: 0.8,
            securityPosture: 0.9,
            performanceMetrics: {
              cpu: 45,
              memory: 60,
              disk: 30,
              network: 85,
            },
            lastValidation: '2024-01-01T00:30:00.000Z',
            complianceIssues: ['Database connection pool optimization needed'],
          },
          infrastructureSpecs: {
            containerization: {
              docker: '20.10.0',
              kubernetes: '1.24.0',
            },
            dependencies: ['postgresql', 'node.js', 'nginx'],
            resourceLimits: {
              cpu: 2,
              memory: 4096,
              storage: 100,
            },
            networkConfiguration: {
              vpc: 'vpc-12345',
              subnets: ['subnet-1', 'subnet-2'],
            },
            storageConfiguration: {
              volumes: ['data-volume'],
              backup: 'enabled',
            },
          },
          changeHistory: [
            {
              timestamp: '2024-01-01T00:25:00.000Z',
              changeType: 'configuration',
              description: 'Updated database connection pool settings',
              impact: 'medium',
              author: 'devops-team',
            },
          ],
        },
      };

      // Add entities to memory manager
      await memoryManager.upsertEntity(troubleshootingSession);
      await memoryManager.upsertEntity(environmentSnapshot);

      // Create cross-tool relationships
      const result = await mapper.createCrossToolRelationships();

      // Verify relationships were suggested
      expect(result.suggestedRelationships.length).toBeGreaterThan(0);

      const troubleshootingRelation = result.suggestedRelationships.find(
        rel =>
          rel.sourceId === '550e8400-e29b-41d4-a716-446655440001' &&
          rel.targetId === '550e8400-e29b-41d4-a716-446655440002'
      );

      expect(troubleshootingRelation).toBeDefined();
      expect(troubleshootingRelation?.type).toBe('occurred_in');
      expect(troubleshootingRelation?.confidence).toBeGreaterThan(0.6);
      expect(troubleshootingRelation?.reasoning).toContain('environment snapshot timeframe');
    });

    it('should link deployment assessments to ADR compliance', async () => {
      // Create test ADR
      const adr: ArchitecturalDecisionMemory = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'architectural_decision',
        title: 'Use PostgreSQL Database',
        description: 'Decision to use PostgreSQL as primary database',
        confidence: 0.9,
        relevance: 0.9,
        tags: ['database', 'postgresql'],
        created: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-01T00:00:00.000Z',
        version: 1,
        context: {
          technicalStack: ['postgresql', 'node.js'],
          environmentalFactors: ['cloud'],
          stakeholders: ['architecture-team'],
        },
        relationships: [],
        accessPattern: {
          accessCount: 1,
          lastAccessed: '2024-01-01T00:00:00.000Z',
          accessContext: ['decision'],
        },
        evolution: {
          origin: 'created',
          transformations: [],
        },
        validation: {
          isVerified: true,
        },
        decisionData: {
          status: 'accepted',
          context: 'Need reliable ACID-compliant database for financial data',
          decision: 'Use PostgreSQL as primary database with read replicas',
          consequences: {
            positive: ['Strong consistency', 'ACID compliance'],
            negative: ['Complex scaling'],
            risks: ['Single point of failure'],
          },
          alternatives: [
            {
              name: 'MongoDB',
              description: 'Document database',
              tradeoffs: 'Easier scaling but eventual consistency',
            },
          ],
          implementationStatus: 'completed',
          implementationTasks: ['Set up cluster', 'Configure monitoring'],
          reviewHistory: [],
        },
      };

      // Create test deployment assessment
      const deployment: DeploymentAssessmentMemory = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        type: 'deployment_assessment',
        title: 'Production Deployment Assessment',
        description: 'Assessment of production deployment readiness',
        confidence: 0.8,
        relevance: 0.9,
        tags: ['deployment', 'production'],
        created: '2024-01-01T01:00:00.000Z',
        lastModified: '2024-01-01T01:00:00.000Z',
        version: 1,
        context: {
          technicalStack: ['postgresql', 'node.js'],
          environmentalFactors: ['cloud'],
          stakeholders: ['devops-team'],
        },
        relationships: [],
        accessPattern: {
          accessCount: 1,
          lastAccessed: '2024-01-01T01:00:00.000Z',
          accessContext: ['deployment'],
        },
        evolution: {
          origin: 'created',
          transformations: [],
        },
        validation: {
          isVerified: true,
        },
        assessmentData: {
          environment: 'production',
          readinessScore: 0.85,
          validationResults: {
            testResults: {
              passed: 120,
              failed: 5,
              coverage: 0.8,
              criticalFailures: ['Unit test timeout in auth module'],
            },
            securityValidation: {
              vulnerabilities: 2,
              securityScore: 0.9,
              criticalIssues: ['CVE-2023-1234 in dependency'],
            },
            performanceValidation: {
              performanceScore: 0.8,
              bottlenecks: ['Database query optimization needed'],
              resourceUtilization: {
                cpu: 75,
                memory: 80,
                network: 45,
              },
            },
          },
          blockingIssues: [
            {
              issue: 'Critical security vulnerability',
              severity: 'high',
              category: 'security',
              resolution: 'Update dependency to v2.1.0',
              estimatedEffort: '2 hours',
            },
          ],
          deploymentStrategy: {
            type: 'blue_green',
            rollbackPlan: 'Automatic rollback on health check failure',
            monitoringPlan: 'Monitor response times and error rates for 30 minutes',
            estimatedDowntime: '0 minutes',
          },
          complianceChecks: {
            adrCompliance: 0.9,
            regulatoryCompliance: ['GDPR', 'SOX'],
            auditTrail: ['Security scan passed', 'Performance tests completed'],
          },
        },
      };

      // Add entities to memory manager
      await memoryManager.upsertEntity(adr);
      await memoryManager.upsertEntity(deployment);

      // Create cross-tool relationships
      const result = await mapper.createCrossToolRelationships();

      // Verify ADR compliance relationship
      const complianceRelation = result.suggestedRelationships.find(
        rel =>
          rel.sourceId === '550e8400-e29b-41d4-a716-446655440004' &&
          rel.targetId === '550e8400-e29b-41d4-a716-446655440003'
      );

      expect(complianceRelation).toBeDefined();
      expect(complianceRelation?.type).toBe('complies_with');
      expect(complianceRelation?.confidence).toBeGreaterThan(0.6);
      expect(complianceRelation?.reasoning).toContain('compliance with architectural decision');
    });

    it('should detect and report conflicts between entities', async () => {
      // Create conflicting entities using helper functions
      const adr = createValidADREntity({
        id: '550e8400-e29b-41d4-a716-446655440005',
        type: 'architectural_decision',
        title: 'Microservices Architecture',
        description: 'Decision to use microservices architecture',
        confidence: 0.9,
        relevance: 0.9,
        tags: ['architecture', 'microservices'],
        created: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-01T00:00:00.000Z',
        version: 1,
        context: {
          technicalStack: ['docker', 'kubernetes'],
          environmentalFactors: ['cloud'],
          stakeholders: ['architecture-team'],
        },
        relationships: [],
        accessPattern: {
          accessCount: 1,
          lastAccessed: '2024-01-01T00:00:00.000Z',
          accessContext: ['decision'],
        },
        evolution: {
          origin: 'created',
          transformations: [],
        },
        validation: {
          isVerified: true,
        },
        decisionData: {
          status: 'accepted',
          context: 'Need scalable architecture for growing user base',
          decision: 'Implement microservices architecture with container orchestration',
          consequences: {
            positive: ['Better scalability', 'Technology diversity'],
            negative: ['Increased complexity', 'Network overhead'],
            risks: ['Service discovery issues', 'Data consistency challenges'],
          },
          alternatives: [
            {
              name: 'Monolith',
              description: 'Single deployable unit',
              tradeoffs: 'Simpler but less scalable',
            },
          ],
          implementationStatus: 'in_progress',
          implementationTasks: ['Set up service mesh', 'Implement API gateway'],
          reviewHistory: [],
        },
      });

      const deployment = createValidDeploymentAssessmentEntity({
        id: '550e8400-e29b-41d4-a716-446655440006',
        title: 'Failed Microservices Deployment',
        description: 'Assessment showing deployment issues',
        confidence: 0.7,
        relevance: 0.8,
        tags: ['deployment', 'failed'],
        created: '2024-01-01T02:00:00.000Z',
        lastModified: '2024-01-01T02:00:00.000Z',
        version: 1,
        context: {
          technicalStack: ['docker', 'kubernetes'],
          environmentalFactors: ['cloud'],
          stakeholders: ['devops-team'],
        },
        relationships: [],
        accessPattern: {
          accessCount: 1,
          lastAccessed: '2024-01-01T02:00:00.000Z',
          accessContext: ['deployment'],
        },
        evolution: {
          origin: 'created',
          transformations: [],
        },
        validation: {
          isVerified: true,
        },
        assessmentData: {
          environment: 'staging',
          readinessScore: 0.3, // Very low readiness score
          validationResults: {
            testResults: {
              passed: 45,
              failed: 25,
              coverage: 0.4,
              criticalFailures: [
                'Service discovery test failures',
                'Database connection timeouts',
                'Integration test failures',
              ],
            },
            securityValidation: {
              vulnerabilities: 8,
              securityScore: 0.7,
              criticalIssues: [
                'Multiple high-severity vulnerabilities',
                'Missing security headers',
              ],
            },
            performanceValidation: {
              performanceScore: 0.2,
              bottlenecks: [
                'Service mesh configuration issues',
                'Database connection pool exhaustion',
                'Memory leaks in microservices',
              ],
              resourceUtilization: {
                cpu: 90,
                memory: 95,
                network: 60,
              },
            },
          },
          blockingIssues: [
            {
              issue: 'Service discovery failures',
              severity: 'critical',
              category: 'configuration',
              resolution: 'Fix service mesh configuration',
              estimatedEffort: '1 day',
            },
            {
              issue: 'Database connection issues',
              severity: 'high',
              category: 'configuration',
              resolution: 'Increase connection pool size',
              estimatedEffort: '4 hours',
            },
            {
              issue: 'Insufficient test coverage',
              severity: 'medium',
              category: 'test',
              resolution: 'Add integration tests',
              estimatedEffort: '2 days',
            },
          ],
          deploymentStrategy: {
            type: 'rolling',
            rollbackPlan: 'Manual rollback required due to configuration issues',
            monitoringPlan: 'Extensive monitoring required for stability assessment',
            estimatedDowntime: '2-4 hours',
          },
          complianceChecks: {
            adrCompliance: 0.3,
            regulatoryCompliance: [],
            auditTrail: ['Multiple test failures', 'Security scan issues'],
          },
        },
      });

      // Add entities to memory manager
      await memoryManager.upsertEntity(adr);
      await memoryManager.upsertEntity(deployment);

      // Create cross-tool relationships
      const result = await mapper.createCrossToolRelationships();

      // Debug: Log the results to understand what's happening
      console.log('Suggested relationships:', result.suggestedRelationships.length);
      console.log('Conflicts detected:', result.conflicts.length);
      console.log('First relationship:', result.suggestedRelationships[0]);
      console.log('First conflict:', result.conflicts[0]);
      console.log('ADR status:', adr.decisionData.status);
      console.log('Deployment readiness:', deployment.assessmentData.readinessScore);

      // Verify conflicts were detected
      expect(result.conflicts.length).toBeGreaterThan(0);

      const conflict = result.conflicts.find(
        c =>
          c.entityIds.includes('550e8400-e29b-41d4-a716-446655440005') &&
          c.entityIds.includes('550e8400-e29b-41d4-a716-446655440006')
      );

      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe('high'); // Low readiness score should be high severity
      expect(conflict?.description).toContain('conflicts with architectural decision');
      expect(conflict?.recommendation).toContain('Review deployment readiness');
    });

    it('should auto-create high-confidence relationships', async () => {
      // Mock the upsertRelationship method to track calls
      const upsertRelationshipSpy = jest
        .spyOn(memoryManager, 'upsertRelationship')
        .mockResolvedValue({
          id: 'test-rel-123',
          sourceId: 'source-id',
          targetId: 'target-id',
          type: 'occurred_in',
          strength: 0.9,
          confidence: 0.9,
          created: '2024-01-01T00:00:00.000Z',
          lastValidated: '2024-01-01T00:00:00.000Z',
          evidence: [],
        });

      // Create entities with high similarity for auto-relationship creation
      const session: TroubleshootingSessionMemory = {
        id: '550e8400-e29b-41d4-a716-446655440007',
        type: 'troubleshooting_session',
        title: 'High Confidence Test',
        description: 'Test session for auto-relationship',
        confidence: 0.9,
        relevance: 0.9,
        tags: ['test'],
        created: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-01T00:00:00.000Z',
        version: 1,
        context: {
          technicalStack: ['node.js'],
          environmentalFactors: ['test'],
          stakeholders: ['test-team'],
        },
        relationships: [],
        accessPattern: {
          accessCount: 1,
          lastAccessed: '2024-01-01T00:00:00.000Z',
          accessContext: ['test'],
        },
        evolution: {
          origin: 'created',
          transformations: [],
        },
        validation: {
          isVerified: true,
        },
        sessionData: {
          failurePattern: {
            failureType: 'test_failure',
            errorSignature: 'test error',
            frequency: 1,
            environments: ['test'],
          },
          failureDetails: {
            errorMessage: 'Test error message',
            environment: 'test',
          },
          analysisSteps: ['Test step'],
          solutionEffectiveness: 0.9,
          preventionMeasures: ['Test prevention'],
          relatedADRs: [],
          environmentContext: {
            environment: 'test',
          },
          followUpActions: [],
        },
      };

      const env: EnvironmentSnapshotMemory = {
        id: '550e8400-e29b-41d4-a716-446655440008',
        type: 'environment_snapshot',
        title: 'High Confidence Environment',
        description: 'Test environment for auto-relationship',
        confidence: 0.9,
        relevance: 0.9,
        tags: ['test'],
        created: '2024-01-01T00:05:00.000Z', // 5 minutes apart - very close
        lastModified: '2024-01-01T00:05:00.000Z',
        version: 1,
        context: {
          technicalStack: ['node.js'],
          environmentalFactors: ['test'],
          stakeholders: ['test-team'],
        },
        relationships: [],
        accessPattern: {
          accessCount: 1,
          lastAccessed: '2024-01-01T00:05:00.000Z',
          accessContext: ['test'],
        },
        evolution: {
          origin: 'created',
          transformations: [],
        },
        validation: {
          isVerified: true,
        },
        environmentData: {
          environmentType: 'testing',
          configuration: {
            test: { framework: 'jest' },
          },
          complianceStatus: {
            adrAlignment: 0.9,
            securityPosture: 0.9,
            performanceMetrics: {
              cpu: 20,
              memory: 30,
              disk: 10,
              network: 40,
            },
            lastValidation: '2024-01-01T00:05:00.000Z',
            complianceIssues: [],
          },
          infrastructureSpecs: {
            containerization: {
              docker: '20.10.0',
            },
            dependencies: ['node.js', 'jest'],
            resourceLimits: {
              cpu: 1,
              memory: 2048,
              storage: 50,
            },
          },
          changeHistory: [],
        },
      };

      // Add entities to memory manager
      await memoryManager.upsertEntity(session);
      await memoryManager.upsertEntity(env);

      // Create cross-tool relationships
      const result = await mapper.createCrossToolRelationships();

      // Verify that high-confidence relationships were auto-created
      const highConfidenceCount = result.suggestedRelationships.filter(
        rel => rel.confidence >= 0.8
      ).length;
      expect(highConfidenceCount).toBeGreaterThan(0);
      expect(upsertRelationshipSpy).toHaveBeenCalled();

      // Verify the call parameters
      const lastCall =
        upsertRelationshipSpy.mock.calls[upsertRelationshipSpy.mock.calls.length - 1];
      const relationshipData = lastCall[0];

      expect(relationshipData.sourceId).toBeDefined();
      expect(relationshipData.targetId).toBeDefined();
      expect(relationshipData.confidence).toBeGreaterThanOrEqual(0.8);

      upsertRelationshipSpy.mockRestore();
    });
  });

  describe('Relationship Validation', () => {
    it('should validate relationship parameters', async () => {
      // Test that the mapper properly validates entity types and relationships
      const config = {
        temporalThreshold: 12, // 12 hours
        contextSimilarityThreshold: 0.8,
        confidenceThreshold: 0.9,
        enableInferenceLearning: true,
      };

      const customMapper = new MemoryRelationshipMapper(memoryManager, config);

      // The configuration should be applied
      expect(customMapper).toBeDefined();

      // Test with empty memory manager (no entities)
      const result = await customMapper.createCrossToolRelationships();

      expect(result.suggestedRelationships).toEqual([]);
      expect(result.conflicts).toEqual([]);
    });
  });
});
