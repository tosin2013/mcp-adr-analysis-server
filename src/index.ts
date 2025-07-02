#!/usr/bin/env node

/**
 * MCP ADR Analysis Server
 * Main entry point for the Model Context Protocol server
 * 
 * This server provides Tools, Resources, and Prompts for analyzing
 * Architectural Decision Records and project architecture.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { McpAdrError } from './types/index.js';
import { maskMcpResponse, createMaskingConfig } from './utils/output-masking.js';
import { loadConfig, validateProjectPath, createLogger, printConfigSummary, type ServerConfig } from './utils/config.js';

/**
 * Server configuration
 */
const SERVER_INFO = {
  name: 'mcp-adr-analysis-server',
  version: '1.0.0',
  description: 'MCP server for analyzing Architectural Decision Records and project architecture'
};

/**
 * Main server class
 */
class McpAdrAnalysisServer {
  private server: Server;
  private maskingConfig: any;
  private config: ServerConfig;
  private logger: ReturnType<typeof createLogger>;

  constructor() {
    // Load and validate configuration
    this.config = loadConfig();
    this.logger = createLogger(this.config);

    // Print configuration summary
    printConfigSummary(this.config);

    // Note: Validation will be done during startup

    this.server = new Server(SERVER_INFO, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    });

    this.maskingConfig = createMaskingConfig();
    this.setupHandlers();
  }

  /**
   * Validate configuration and project setup
   */
  private async validateConfiguration(): Promise<void> {
    try {
      await validateProjectPath(this.config.projectPath);
      this.logger.info(`Project path validated: ${this.config.projectPath}`);
    } catch (error: any) {
      this.logger.error(`Configuration validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup MCP protocol handlers
   */
  private setupHandlers(): void {
    // Tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyze_project_ecosystem',
            description: 'Analyze the project ecosystem including technology stack, patterns, and architecture',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory to analyze (optional, uses configured PROJECT_PATH if not provided)'
                },
                includePatterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'File patterns to include in analysis'
                }
              },
              required: []
            }
          },
          {
            name: 'get_architectural_context',
            description: 'Get detailed architectural context for specific files or the entire project',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Specific file path to analyze (optional, analyzes entire project if not provided)'
                },
                includeCompliance: {
                  type: 'boolean',
                  description: 'Include compliance checks in the analysis',
                  default: true
                }
              }
            }
          },
          {
            name: 'generate_adrs_from_prd',
            description: 'Generate Architectural Decision Records from a Product Requirements Document',
            inputSchema: {
              type: 'object',
              properties: {
                prdPath: {
                  type: 'string',
                  description: 'Path to the PRD.md file'
                },
                outputDirectory: {
                  type: 'string',
                  description: 'Directory to output generated ADRs (optional, uses configured ADR_DIRECTORY if not provided)'
                }
              },
              required: ['prdPath']
            }
          },
          {
            name: 'generate_adr_todo',
            description: 'Generate or update todo.md from existing ADRs',
            inputSchema: {
              type: 'object',
              properties: {
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files (optional, uses configured ADR_DIRECTORY if not provided)'
                },
                scope: {
                  type: 'string',
                  enum: ['all', 'pending', 'in_progress'],
                  description: 'Scope of tasks to include',
                  default: 'all'
                }
              }
            }
          },
          {
            name: 'analyze_content_security',
            description: 'Analyze content for sensitive information using AI-powered detection',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'Content to analyze for sensitive information'
                },
                contentType: {
                  type: 'string',
                  enum: ['code', 'documentation', 'configuration', 'logs', 'general'],
                  description: 'Type of content being analyzed',
                  default: 'general'
                },
                userDefinedPatterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'User-defined sensitive patterns to detect'
                }
              },
              required: ['content']
            }
          },
          {
            name: 'generate_content_masking',
            description: 'Generate masking instructions for detected sensitive content',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'Content to mask'
                },
                detectedItems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      content: { type: 'string' },
                      startPosition: { type: 'number' },
                      endPosition: { type: 'number' },
                      severity: { type: 'string' }
                    }
                  },
                  description: 'Detected sensitive items to mask'
                },
                maskingStrategy: {
                  type: 'string',
                  enum: ['full', 'partial', 'placeholder', 'environment'],
                  description: 'Strategy for masking content',
                  default: 'full'
                }
              },
              required: ['content', 'detectedItems']
            }
          },
          {
            name: 'configure_custom_patterns',
            description: 'Configure custom sensitive patterns for a project',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory'
                },
                existingPatterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Existing patterns to consider'
                }
              },
              required: ['projectPath']
            }
          },
          {
            name: 'apply_basic_content_masking',
            description: 'Apply basic content masking (fallback when AI is not available)',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'Content to mask'
                },
                maskingStrategy: {
                  type: 'string',
                  enum: ['full', 'partial', 'placeholder'],
                  description: 'Strategy for masking content',
                  default: 'full'
                }
              },
              required: ['content']
            }
          },
          {
            name: 'validate_content_masking',
            description: 'Validate that content masking was applied correctly',
            inputSchema: {
              type: 'object',
              properties: {
                originalContent: {
                  type: 'string',
                  description: 'Original content before masking'
                },
                maskedContent: {
                  type: 'string',
                  description: 'Content after masking'
                }
              },
              required: ['originalContent', 'maskedContent']
            }
          },
          {
            name: 'manage_cache',
            description: 'Manage MCP resource cache (clear, stats, cleanup)',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['clear', 'stats', 'cleanup', 'invalidate'],
                  description: 'Cache management action to perform'
                },
                key: {
                  type: 'string',
                  description: 'Specific cache key to invalidate (for invalidate action)'
                }
              },
              required: ['action']
            }
          },
          {
            name: 'configure_output_masking',
            description: 'Configure content masking for all MCP outputs',
            inputSchema: {
              type: 'object',
              properties: {
                enabled: {
                  type: 'boolean',
                  description: 'Enable or disable output masking'
                },
                strategy: {
                  type: 'string',
                  enum: ['full', 'partial', 'placeholder', 'environment'],
                  description: 'Masking strategy to use'
                },
                customPatterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Custom patterns to mask'
                },
                action: {
                  type: 'string',
                  enum: ['get', 'set', 'reset'],
                  description: 'Configuration action',
                  default: 'get'
                }
              }
            }
          },
          {
            name: 'suggest_adrs',
            description: 'Suggest ADRs based on project analysis and implicit decisions',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory',
                  default: '.'
                },
                analysisType: {
                  type: 'string',
                  enum: ['implicit_decisions', 'code_changes', 'comprehensive'],
                  description: 'Type of analysis to perform',
                  default: 'comprehensive'
                },
                beforeCode: {
                  type: 'string',
                  description: 'Code before changes (for code_changes analysis)'
                },
                afterCode: {
                  type: 'string',
                  description: 'Code after changes (for code_changes analysis)'
                },
                changeDescription: {
                  type: 'string',
                  description: 'Description of the changes (for code_changes analysis)'
                },
                commitMessages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Related commit messages (for code_changes analysis)'
                },
                existingAdrs: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of existing ADR titles to avoid duplication'
                }
              }
            }
          },
          {
            name: 'generate_adr_from_decision',
            description: 'Generate a complete ADR from decision data',
            inputSchema: {
              type: 'object',
              properties: {
                decisionData: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Decision title' },
                    context: { type: 'string', description: 'Decision context and problem' },
                    decision: { type: 'string', description: 'The architectural decision' },
                    consequences: { type: 'string', description: 'Decision consequences' },
                    alternatives: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Alternative approaches considered'
                    },
                    evidence: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Supporting evidence for the decision'
                    }
                  },
                  required: ['title', 'context', 'decision', 'consequences']
                },
                templateFormat: {
                  type: 'string',
                  enum: ['nygard', 'madr', 'custom'],
                  description: 'ADR template format to use',
                  default: 'nygard'
                },
                existingAdrs: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of existing ADRs for numbering and references'
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory where ADRs are stored',
                  default: 'docs/adrs'
                }
              },
              required: ['decisionData']
            }
          },
          {
            name: 'discover_existing_adrs',
            description: 'Discover and catalog existing ADRs in the project',
            inputSchema: {
              type: 'object',
              properties: {
                adrDirectory: {
                  type: 'string',
                  description: 'Directory to search for ADRs',
                  default: 'docs/adrs'
                },
                includeContent: {
                  type: 'boolean',
                  description: 'Whether to include ADR content in analysis',
                  default: false
                }
              }
            }
          },
          {
            name: 'incorporate_research',
            description: 'Incorporate research findings into architectural decisions',
            inputSchema: {
              type: 'object',
              properties: {
                researchPath: {
                  type: 'string',
                  description: 'Path to research directory',
                  default: 'docs/research'
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Path to ADR directory',
                  default: 'docs/adrs'
                },
                analysisType: {
                  type: 'string',
                  enum: ['monitor', 'extract_topics', 'evaluate_impact', 'generate_updates', 'comprehensive'],
                  description: 'Type of research analysis to perform',
                  default: 'comprehensive'
                },
                existingTopics: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Previously identified research topics'
                },
                researchTopics: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      category: { type: 'string' },
                      keyFindings: { type: 'array', items: { type: 'string' } },
                      relevanceScore: { type: 'number' }
                    }
                  },
                  description: 'Research topics for impact evaluation'
                },
                adrId: {
                  type: 'string',
                  description: 'ADR ID for update generation'
                },
                updateType: {
                  type: 'string',
                  enum: ['content', 'status', 'consequences', 'alternatives', 'deprecation'],
                  description: 'Type of ADR update to generate'
                },
                researchFindings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      finding: { type: 'string' },
                      evidence: { type: 'array', items: { type: 'string' } },
                      impact: { type: 'string' }
                    }
                  },
                  description: 'Research findings for update generation'
                }
              }
            }
          },
          {
            name: 'create_research_template',
            description: 'Create a research template file for documenting findings',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Title of the research'
                },
                category: {
                  type: 'string',
                  description: 'Research category',
                  default: 'general'
                },
                researchPath: {
                  type: 'string',
                  description: 'Path to research directory',
                  default: 'docs/research'
                }
              },
              required: ['title']
            }
          },
          {
            name: 'request_action_confirmation',
            description: 'Request confirmation before applying research-based changes',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: 'Description of the action to be performed'
                },
                details: {
                  type: 'string',
                  description: 'Detailed information about the action'
                },
                impact: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'],
                  description: 'Impact level of the action',
                  default: 'medium'
                }
              },
              required: ['action', 'details']
            }
          },
          {
            name: 'generate_rules',
            description: 'Generate architectural rules from ADRs and code patterns',
            inputSchema: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  enum: ['adrs', 'patterns', 'both'],
                  description: 'Source for rule generation',
                  default: 'both'
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs'
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project for pattern analysis',
                  default: '.'
                },
                existingRules: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' }
                    }
                  },
                  description: 'Existing rules to avoid duplication'
                },
                outputFormat: {
                  type: 'string',
                  enum: ['json', 'yaml', 'both'],
                  description: 'Output format for rules',
                  default: 'json'
                }
              }
            }
          },
          {
            name: 'validate_rules',
            description: 'Validate code against architectural rules',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to file to validate'
                },
                fileContent: {
                  type: 'string',
                  description: 'Content to validate (alternative to filePath)'
                },
                fileName: {
                  type: 'string',
                  description: 'Name of file being validated (when using fileContent)'
                },
                rules: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      pattern: { type: 'string' },
                      severity: { type: 'string' },
                      message: { type: 'string' }
                    },
                    required: ['id', 'name', 'pattern', 'severity', 'message']
                  },
                  description: 'Rules to validate against'
                },
                validationType: {
                  type: 'string',
                  enum: ['file', 'function', 'component', 'module'],
                  description: 'Type of validation to perform',
                  default: 'file'
                },
                reportFormat: {
                  type: 'string',
                  enum: ['summary', 'detailed', 'json'],
                  description: 'Format for validation report',
                  default: 'detailed'
                }
              },
              required: ['rules']
            }
          },
          {
            name: 'create_rule_set',
            description: 'Create machine-readable rule set in JSON/YAML format',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the rule set'
                },
                description: {
                  type: 'string',
                  description: 'Description of the rule set',
                  default: 'Generated architectural rule set'
                },
                adrRules: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Rules extracted from ADRs'
                },
                patternRules: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Rules generated from code patterns'
                },
                rules: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Additional rules to include'
                },
                outputFormat: {
                  type: 'string',
                  enum: ['json', 'yaml', 'both'],
                  description: 'Output format for rule set',
                  default: 'json'
                },
                author: {
                  type: 'string',
                  description: 'Author of the rule set',
                  default: 'MCP ADR Analysis Server'
                }
              },
              required: ['name']
            }
          },
          {
            name: 'analyze_environment',
            description: 'Analyze environment context and provide optimization recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to project directory',
                  default: '.'
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs'
                },
                analysisType: {
                  type: 'string',
                  enum: ['specs', 'containerization', 'requirements', 'compliance', 'comprehensive'],
                  description: 'Type of environment analysis to perform',
                  default: 'comprehensive'
                },
                currentEnvironment: {
                  type: 'object',
                  description: 'Current environment specifications (for compliance analysis)'
                },
                requirements: {
                  type: 'object',
                  description: 'Environment requirements (for compliance analysis)'
                },
                industryStandards: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Industry standards to assess compliance against'
                }
              }
            }
          },
          {
            name: 'generate_research_questions',
            description: 'Generate context-aware research questions and create research tracking system',
            inputSchema: {
              type: 'object',
              properties: {
                analysisType: {
                  type: 'string',
                  enum: ['correlation', 'relevance', 'questions', 'tracking', 'comprehensive'],
                  description: 'Type of research analysis to perform',
                  default: 'comprehensive'
                },
                researchContext: {
                  type: 'object',
                  properties: {
                    topic: { type: 'string' },
                    category: { type: 'string' },
                    scope: { type: 'string' },
                    objectives: { type: 'array', items: { type: 'string' } },
                    constraints: { type: 'array', items: { type: 'string' } },
                    timeline: { type: 'string' }
                  },
                  description: 'Research context and objectives'
                },
                problems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      description: { type: 'string' },
                      category: { type: 'string' },
                      severity: { type: 'string' },
                      context: { type: 'string' }
                    }
                  },
                  description: 'Problems to correlate with knowledge graph'
                },
                knowledgeGraph: {
                  type: 'object',
                  properties: {
                    technologies: { type: 'array', items: { type: 'object' } },
                    patterns: { type: 'array', items: { type: 'object' } },
                    adrs: { type: 'array', items: { type: 'object' } },
                    relationships: { type: 'array', items: { type: 'object' } }
                  },
                  description: 'Architectural knowledge graph'
                },
                relevantKnowledge: {
                  type: 'object',
                  properties: {
                    adrs: { type: 'array', items: { type: 'object' } },
                    patterns: { type: 'array', items: { type: 'object' } },
                    gaps: { type: 'array', items: { type: 'object' } },
                    opportunities: { type: 'array', items: { type: 'object' } }
                  },
                  description: 'Relevant knowledge for question generation'
                },
                researchQuestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      question: { type: 'string' },
                      type: { type: 'string' },
                      priority: { type: 'string' },
                      timeline: { type: 'string' },
                      methodology: { type: 'string' }
                    }
                  },
                  description: 'Research questions for task tracking'
                },
                currentProgress: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      questionId: { type: 'string' },
                      status: { type: 'string' },
                      progress: { type: 'number' },
                      findings: { type: 'array', items: { type: 'string' } },
                      blockers: { type: 'array', items: { type: 'string' } }
                    }
                  },
                  description: 'Current research progress'
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project directory',
                  default: '.'
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs'
                }
              }
            }
          },
          {
            name: 'analyze_deployment_progress',
            description: 'Analyze deployment progress and verify completion with outcome rules',
            inputSchema: {
              type: 'object',
              properties: {
                analysisType: {
                  type: 'string',
                  enum: ['tasks', 'cicd', 'progress', 'completion', 'comprehensive'],
                  description: 'Type of deployment analysis to perform',
                  default: 'comprehensive'
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs'
                },
                todoPath: {
                  type: 'string',
                  description: 'Path to todo.md file for task identification'
                },
                cicdLogs: {
                  type: 'string',
                  description: 'CI/CD pipeline logs for analysis'
                },
                pipelineConfig: {
                  type: 'string',
                  description: 'CI/CD pipeline configuration'
                },
                deploymentTasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      taskId: { type: 'string' },
                      taskName: { type: 'string' },
                      status: { type: 'string' },
                      progress: { type: 'number' },
                      category: { type: 'string' },
                      priority: { type: 'string' },
                      verificationCriteria: { type: 'array', items: { type: 'string' } },
                      expectedOutcome: { type: 'string' }
                    }
                  },
                  description: 'Deployment tasks for progress calculation'
                },
                outcomeRules: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      ruleId: { type: 'string' },
                      description: { type: 'string' },
                      criteria: { type: 'array', items: { type: 'string' } },
                      verificationMethod: { type: 'string' }
                    }
                  },
                  description: 'Outcome rules for completion verification'
                },
                actualOutcomes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      taskId: { type: 'string' },
                      outcome: { type: 'string' },
                      evidence: { type: 'array', items: { type: 'string' } },
                      timestamp: { type: 'string' }
                    }
                  },
                  description: 'Actual deployment outcomes'
                },
                cicdStatus: {
                  type: 'object',
                  description: 'CI/CD pipeline status data'
                },
                environmentStatus: {
                  type: 'object',
                  description: 'Environment status data'
                }
              }
            }
          }
        ]
      };
    });

    // Tool execution handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let response: any;

        switch (name) {
          case 'analyze_project_ecosystem':
            response = await this.analyzeProjectEcosystem(args);
            break;
          case 'get_architectural_context':
            response = await this.getArchitecturalContext(args);
            break;
          case 'generate_adrs_from_prd':
            response = await this.generateAdrsFromPrd(args);
            break;
          case 'generate_adr_todo':
            response = await this.generateAdrTodo(args);
            break;
          case 'analyze_content_security':
            response = await this.analyzeContentSecurity(args);
            break;
          case 'generate_content_masking':
            response = await this.generateContentMasking(args);
            break;
          case 'configure_custom_patterns':
            response = await this.configureCustomPatterns(args);
            break;
          case 'apply_basic_content_masking':
            response = await this.applyBasicContentMasking(args);
            break;
          case 'validate_content_masking':
            response = await this.validateContentMasking(args);
            break;
          case 'manage_cache':
            response = await this.manageCache(args);
            break;
          case 'configure_output_masking':
            response = await this.configureOutputMasking(args);
            break;
          case 'suggest_adrs':
            response = await this.suggestAdrs(args);
            break;
          case 'generate_adr_from_decision':
            response = await this.generateAdrFromDecision(args);
            break;
          case 'discover_existing_adrs':
            response = await this.discoverExistingAdrs(args);
            break;
          case 'incorporate_research':
            response = await this.incorporateResearch(args);
            break;
          case 'create_research_template':
            response = await this.createResearchTemplate(args);
            break;
          case 'request_action_confirmation':
            response = await this.requestActionConfirmation(args);
            break;
          case 'generate_rules':
            response = await this.generateRules(args);
            break;
          case 'validate_rules':
            response = await this.validateRules(args);
            break;
          case 'create_rule_set':
            response = await this.createRuleSet(args);
            break;
          case 'analyze_environment':
            response = await this.analyzeEnvironment(args);
            break;
          case 'generate_research_questions':
            response = await this.generateResearchQuestions(args);
            break;
          case 'analyze_deployment_progress':
            response = await this.analyzeDeploymentProgress(args);
            break;
          default:
            throw new McpAdrError(`Unknown tool: ${name}`, 'UNKNOWN_TOOL');
        }

        // Apply content masking to response
        return await this.applyOutputMasking(response);
      } catch (error) {
        if (error instanceof McpAdrError) {
          throw error;
        }
        throw new McpAdrError(
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          'TOOL_EXECUTION_ERROR'
        );
      }
    });

    // Resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'adr://architectural_knowledge_graph',
            name: 'Architectural Knowledge Graph',
            description: 'Complete architectural knowledge graph of the project',
            mimeType: 'application/json'
          },
          {
            uri: 'adr://analysis_report',
            name: 'Analysis Report',
            description: 'Comprehensive project analysis report',
            mimeType: 'application/json'
          },
          {
            uri: 'adr://adr_list',
            name: 'ADR List',
            description: 'List of all Architectural Decision Records',
            mimeType: 'application/json'
          }
        ]
      };
    });

    // Resource reading handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        const response = await this.readResource(uri);
        return await this.applyOutputMasking(response);
      } catch (error) {
        if (error instanceof McpAdrError) {
          throw error;
        }
        throw new McpAdrError(
          `Resource reading failed: ${error instanceof Error ? error.message : String(error)}`,
          'RESOURCE_ERROR'
        );
      }
    });

    // Prompts handler
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const { allPrompts } = await import('./prompts/index.js');

      return {
        prompts: allPrompts.map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments
        }))
      };
    });

    // Prompt execution handler
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const { allPrompts } = await import('./prompts/index.js');
        const prompt = allPrompts.find(p => p.name === name);

        if (!prompt) {
          throw new McpAdrError(`Unknown prompt: ${name}`, 'UNKNOWN_PROMPT');
        }

        // Simple template rendering (replace {{variable}} with values)
        let renderedTemplate = prompt.template;
        if (args) {
          for (const [key, value] of Object.entries(args)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            renderedTemplate = renderedTemplate.replace(regex, String(value));
          }
        }

        const response = {
          description: prompt.description,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: renderedTemplate
              }
            }
          ]
        };

        return await this.applyOutputMasking(response);
      } catch (error) {
        if (error instanceof McpAdrError) {
          throw error;
        }
        throw new McpAdrError(
          `Prompt execution failed: ${error instanceof Error ? error.message : String(error)}`,
          'PROMPT_EXECUTION_ERROR'
        );
      }
    });
  }

  /**
   * Tool implementations
   */
  private async analyzeProjectEcosystem(args: any): Promise<any> {
    // Use configured project path if not provided in args
    const projectPath = args.projectPath || this.config.projectPath;

    this.logger.info(`Analyzing project ecosystem at: ${projectPath}`);

    try {
      // Import utilities dynamically to avoid circular dependencies
      const { analyzeProjectStructure, readFileContent } = await import('./utils/file-system.js');
      const { generateAnalysisContext, generateComprehensiveAnalysisPrompt } = await import('./prompts/analysis-prompts.js');

      // Analyze project structure
      const projectStructure = await analyzeProjectStructure(projectPath);

      // Read key files for context
      let packageJsonContent: string | undefined;
      try {
        packageJsonContent = await readFileContent(`${projectPath}/package.json`);
      } catch {
        // package.json might not exist
      }

      // Generate analysis context
      const analysisContext = generateAnalysisContext(projectStructure);

      // Generate comprehensive analysis prompt
      const analysisPrompt = generateComprehensiveAnalysisPrompt(
        analysisContext,
        packageJsonContent
      );

      return {
        content: [
          {
            type: 'text',
            text: `Project ecosystem analysis for: ${projectPath}\n\nPlease analyze this project using the following prompt:\n\n${analysisPrompt}`
          }
        ]
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to analyze project ecosystem: ${error instanceof Error ? error.message : String(error)}`,
        'ANALYSIS_ERROR'
      );
    }
  }

  private async getArchitecturalContext(args: any): Promise<any> {
    const { filePath } = args;

    try {
      const { analyzeProjectStructure } = await import('./utils/file-system.js');
      const { generateAnalysisContext, generatePatternDetectionPrompt } = await import('./prompts/analysis-prompts.js');

      // Determine project path
      const projectPath = filePath ? filePath.split('/').slice(0, -1).join('/') : process.cwd();

      // Analyze project structure
      const projectStructure = await analyzeProjectStructure(projectPath);
      const analysisContext = generateAnalysisContext(projectStructure);

      // Generate pattern detection prompt
      const patternPrompt = generatePatternDetectionPrompt(analysisContext);

      return {
        content: [
          {
            type: 'text',
            text: `Architectural context analysis${filePath ? ` for: ${filePath}` : ''}\n\nPlease analyze architectural patterns using the following prompt:\n\n${patternPrompt}`
          }
        ]
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to get architectural context: ${error instanceof Error ? error.message : String(error)}`,
        'ANALYSIS_ERROR'
      );
    }
  }

  private async generateAdrsFromPrd(args: any): Promise<any> {
    const { prdPath } = args;
    const outputDirectory = args.outputDirectory || this.config.adrDirectory;

    this.logger.info(`Generating ADRs from PRD: ${prdPath} to ${outputDirectory}`);

    try {
      const { readFileContent, fileExists } = await import('./utils/file-system.js');

      // Check if PRD file exists
      if (!(await fileExists(prdPath))) {
        throw new McpAdrError(`PRD file not found: ${prdPath}`, 'FILE_NOT_FOUND');
      }

      // Read PRD content
      const prdContent = await readFileContent(prdPath);

      // Generate ADR creation prompt
      const adrPrompt = `
# ADR Generation from PRD Request

Please analyze the following Product Requirements Document and generate Architectural Decision Records (ADRs).

## PRD Content
\`\`\`markdown
${prdContent}
\`\`\`

## Requirements

1. **Extract Key Decisions**: Identify all architectural decisions implied or stated in the PRD
2. **Generate ADRs**: Create individual ADR files for each significant decision
3. **Follow ADR Format**: Use standard ADR template (title, status, context, decision, consequences)
4. **Number Sequentially**: Use format 001-decision-title.md, 002-next-decision.md, etc.
5. **Output Directory**: Place ADRs in ${outputDirectory}/

## ADR Template Format

\`\`\`markdown
# [Number]. [Title]

**Status**: [Proposed/Accepted/Deprecated/Superseded]
**Date**: [YYYY-MM-DD]

## Context
[Describe the context and problem statement]

## Decision
[Describe the architectural decision]

## Consequences
[Describe the positive and negative consequences]

## Implementation Plan
[Optional: Steps to implement this decision]
\`\`\`

Please provide:
1. List of identified architectural decisions
2. Generated ADR content for each decision
3. Recommended file names and structure
4. Implementation priority order
`;

      return {
        content: [
          {
            type: 'text',
            text: `ADR generation from PRD: ${prdPath}\n\nPlease generate ADRs using the following prompt:\n\n${adrPrompt}`
          }
        ]
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to generate ADRs from PRD: ${error instanceof Error ? error.message : String(error)}`,
        'GENERATION_ERROR'
      );
    }
  }

  private async generateAdrTodo(args: any): Promise<any> {
    const { scope = 'all' } = args;
    const adrDirectory = args.adrDirectory || this.config.adrDirectory;

    this.logger.info(`Generating todo from ADRs in: ${adrDirectory}`);

    try {
      const { findFiles } = await import('./utils/file-system.js');

      // Find all ADR files
      const adrFiles = await findFiles(process.cwd(), [`${adrDirectory}/**/*.md`], { includeContent: true });

      if (adrFiles.length === 0) {
        throw new McpAdrError(`No ADR files found in ${adrDirectory}`, 'NO_ADRS_FOUND');
      }

      // Prepare ADR content for analysis
      const adrContent = adrFiles.map(file => ({
        filename: file.name,
        path: file.path,
        content: file.content || ''
      }));

      // Generate todo creation prompt
      const todoPrompt = `
# ADR Todo Generation Request

Please analyze the following Architectural Decision Records and generate a comprehensive todo.md file.

## ADR Files
${adrContent.map(adr => `
### ${adr.filename}
\`\`\`markdown
${adr.content.slice(0, 1500)}${adr.content.length > 1500 ? '\n... (truncated)' : ''}
\`\`\`
`).join('')}

## Requirements

1. **Extract Tasks**: Identify all implementation tasks from ADRs
2. **Categorize**: Group tasks by ADR and priority
3. **Status Detection**: Determine task completion status based on:
   - File existence checks
   - Code analysis hints
   - Implementation evidence
4. **Progress Tracking**: Calculate overall progress
5. **Scope Filter**: ${scope === 'all' ? 'Include all tasks' : `Focus on ${scope} tasks only`}

## Todo.md Format

\`\`\`markdown
# ADR Implementation Progress

**Last Updated**: [Date]
**Overall Progress**: [X]% Complete

## Summary
- Total ADRs: [count]
- Total Tasks: [count]
- Completed: [count]
- In Progress: [count]
- Pending: [count]

## Tasks by ADR

### ADR-001: [Title]
- [ ] Task 1 description
- [x] Task 2 description (completed)
- [/] Task 3 description (in progress)

### ADR-002: [Title]
- [ ] Task 1 description
...
\`\`\`

Please provide:
1. Comprehensive task extraction from all ADRs
2. Status assessment for each task
3. Progress calculation
4. Prioritized task list
5. Implementation recommendations
`;

      return {
        content: [
          {
            type: 'text',
            text: `ADR todo generation for: ${adrDirectory}\n\nPlease generate todo.md using the following prompt:\n\n${todoPrompt}`
          }
        ]
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to generate ADR todo: ${error instanceof Error ? error.message : String(error)}`,
        'GENERATION_ERROR'
      );
    }
  }

  /**
   * Content masking tool implementations
   */
  private async analyzeContentSecurity(args: any): Promise<any> {
    const { analyzeContentSecurity } = await import('./tools/content-masking-tool.js');
    return await analyzeContentSecurity(args);
  }

  private async generateContentMasking(args: any): Promise<any> {
    const { generateContentMasking } = await import('./tools/content-masking-tool.js');
    return await generateContentMasking(args);
  }

  private async configureCustomPatterns(args: any): Promise<any> {
    const { configureCustomPatterns } = await import('./tools/content-masking-tool.js');
    return await configureCustomPatterns(args);
  }

  private async applyBasicContentMasking(args: any): Promise<any> {
    const { applyBasicContentMasking } = await import('./tools/content-masking-tool.js');
    return await applyBasicContentMasking(args);
  }

  private async validateContentMasking(args: any): Promise<any> {
    const { validateContentMasking } = await import('./tools/content-masking-tool.js');
    return await validateContentMasking(args);
  }

  private async manageCache(args: any): Promise<any> {
    const { action, key } = args;

    try {
      const { clearCache, getCacheStats, cleanupCache, invalidateCache } = await import('./utils/cache.js');

      switch (action) {
        case 'clear': {
          await clearCache();
          return {
            content: [
              {
                type: 'text',
                text: '✅ Cache cleared successfully. All cached resources have been removed.'
              }
            ]
          };
        }

        case 'stats': {
          const stats = await getCacheStats();
          return {
            content: [
              {
                type: 'text',
                text: `# Cache Statistics

## Overview
- **Total Entries**: ${stats.totalEntries}
- **Total Size**: ${(stats.totalSize / 1024).toFixed(2)} KB
- **Oldest Entry**: ${stats.oldestEntry || 'None'}
- **Newest Entry**: ${stats.newestEntry || 'None'}

## Cache Directory
\`.mcp-adr-cache/\`

## Cache Types
- **Knowledge Graph**: Architectural analysis results (TTL: 1 hour)
- **Analysis Report**: Project analysis reports (TTL: 30 minutes)
- **ADR List**: ADR inventory and metadata (TTL: 15 minutes)

## Management
Use \`manage_cache\` tool with different actions:
- \`clear\`: Remove all cache entries
- \`cleanup\`: Remove expired entries only
- \`invalidate\`: Remove specific cache entry
`
              }
            ]
          };
        }

        case 'cleanup': {
          const cleanedCount = await cleanupCache();
          return {
            content: [
              {
                type: 'text',
                text: `✅ Cache cleanup completed. Removed ${cleanedCount} expired entries.`
              }
            ]
          };
        }

        case 'invalidate': {
          if (!key) {
            throw new McpAdrError('Cache key is required for invalidate action', 'INVALID_INPUT');
          }

          await invalidateCache(key);
          return {
            content: [
              {
                type: 'text',
                text: `✅ Cache entry invalidated: ${key}`
              }
            ]
          };
        }

        default:
          throw new McpAdrError(`Unknown cache action: ${action}`, 'INVALID_INPUT');
      }
    } catch (error) {
      throw new McpAdrError(
        `Cache management failed: ${error instanceof Error ? error.message : String(error)}`,
        'CACHE_ERROR'
      );
    }
  }

  private async configureOutputMasking(args: any): Promise<any> {
    const { action = 'get', enabled, strategy, customPatterns } = args;

    try {
      const { validateMaskingConfig } = await import('./utils/output-masking.js');

      switch (action) {
        case 'get': {
          return {
            content: [
              {
                type: 'text',
                text: `# Current Output Masking Configuration

## Settings
- **Enabled**: ${this.maskingConfig.enabled}
- **Strategy**: ${this.maskingConfig.strategy}
- **Custom Patterns**: ${this.maskingConfig.customPatterns?.length || 0} patterns
- **Skip Patterns**: ${this.maskingConfig.skipPatterns?.length || 0} patterns

## Available Strategies
- **full**: Replace entire sensitive content with [REDACTED]
- **partial**: Show safe prefix/suffix, mask middle (e.g., sk-...****)
- **placeholder**: Replace with descriptive placeholders (e.g., <YOUR_API_KEY>)
- **environment**: Replace with environment variable references (e.g., \${API_KEY})

## Configuration
Use \`configure_output_masking\` tool with:
- \`action: "set"\` to update configuration
- \`action: "reset"\` to restore defaults

## Current Status
${this.maskingConfig.enabled ? '✅ Output masking is ACTIVE' : '⚠️ Output masking is DISABLED'}
`
              }
            ]
          };
        }

        case 'set': {
          const newConfig = { ...this.maskingConfig };

          if (typeof enabled === 'boolean') {
            newConfig.enabled = enabled;
          }

          if (strategy && ['full', 'partial', 'placeholder', 'environment'].includes(strategy)) {
            newConfig.strategy = strategy;
          }

          if (Array.isArray(customPatterns)) {
            newConfig.customPatterns = customPatterns;
          }

          const validation = validateMaskingConfig(newConfig);
          if (!validation.isValid) {
            throw new McpAdrError(
              `Invalid masking configuration: ${validation.errors.join(', ')}`,
              'INVALID_CONFIG'
            );
          }

          this.maskingConfig = newConfig;

          return {
            content: [
              {
                type: 'text',
                text: `✅ Output masking configuration updated successfully!

## New Settings
- **Enabled**: ${newConfig.enabled}
- **Strategy**: ${newConfig.strategy}
- **Custom Patterns**: ${newConfig.customPatterns?.length || 0} patterns

${newConfig.enabled ?
  '🔒 All MCP tool and resource outputs will now be masked according to the new configuration.' :
  '⚠️ Output masking is disabled. Sensitive information may be exposed in responses.'
}
`
              }
            ]
          };
        }

        case 'reset': {
          const { createMaskingConfig } = await import('./utils/output-masking.js');
          this.maskingConfig = createMaskingConfig();

          return {
            content: [
              {
                type: 'text',
                text: `✅ Output masking configuration reset to defaults!

## Default Settings
- **Enabled**: ${this.maskingConfig.enabled}
- **Strategy**: ${this.maskingConfig.strategy}
- **Custom Patterns**: ${this.maskingConfig.customPatterns?.length || 0} patterns
- **Skip Patterns**: ${this.maskingConfig.skipPatterns?.length || 0} patterns

🔒 Default masking is now active for all outputs.
`
              }
            ]
          };
        }

        default:
          throw new McpAdrError(`Unknown masking action: ${action}`, 'INVALID_INPUT');
      }
    } catch (error) {
      throw new McpAdrError(
        `Output masking configuration failed: ${error instanceof Error ? error.message : String(error)}`,
        'CONFIG_ERROR'
      );
    }
  }

  /**
   * ADR suggestion tool implementations
   */
  private async suggestAdrs(args: any): Promise<any> {
    const { suggestAdrs } = await import('./tools/adr-suggestion-tool.js');
    return await suggestAdrs(args);
  }

  private async generateAdrFromDecision(args: any): Promise<any> {
    const { generateAdrFromDecision } = await import('./tools/adr-suggestion-tool.js');
    return await generateAdrFromDecision(args);
  }

  private async discoverExistingAdrs(args: any): Promise<any> {
    const { discoverExistingAdrs } = await import('./tools/adr-suggestion-tool.js');
    return await discoverExistingAdrs(args);
  }

  /**
   * Research integration tool implementations
   */
  private async incorporateResearch(args: any): Promise<any> {
    const { incorporateResearch } = await import('./tools/research-integration-tool.js');
    return await incorporateResearch(args);
  }

  private async createResearchTemplate(args: any): Promise<any> {
    const { createResearchTemplate } = await import('./tools/research-integration-tool.js');
    return await createResearchTemplate(args);
  }

  private async requestActionConfirmation(args: any): Promise<any> {
    const { requestActionConfirmation } = await import('./tools/research-integration-tool.js');
    return await requestActionConfirmation(args);
  }

  /**
   * Rule generation and validation tool implementations
   */
  private async generateRules(args: any): Promise<any> {
    const { generateRules } = await import('./tools/rule-generation-tool.js');
    return await generateRules(args);
  }

  private async validateRules(args: any): Promise<any> {
    const { validateRules } = await import('./tools/rule-generation-tool.js');
    return await validateRules(args);
  }

  private async createRuleSet(args: any): Promise<any> {
    const { createRuleSet } = await import('./tools/rule-generation-tool.js');
    return await createRuleSet(args);
  }

  /**
   * Environment analysis tool implementation
   */
  private async analyzeEnvironment(args: any): Promise<any> {
    const { analyzeEnvironment } = await import('./tools/environment-analysis-tool.js');
    return await analyzeEnvironment(args);
  }

  /**
   * Research question generation tool implementation
   */
  private async generateResearchQuestions(args: any): Promise<any> {
    const { generateResearchQuestions } = await import('./tools/research-question-tool.js');
    return await generateResearchQuestions(args);
  }

  /**
   * Deployment analysis tool implementation
   */
  private async analyzeDeploymentProgress(args: any): Promise<any> {
    const { analyzeDeploymentProgress } = await import('./tools/deployment-analysis-tool.js');
    return await analyzeDeploymentProgress(args);
  }

  /**
   * Apply content masking to MCP response
   */
  private async applyOutputMasking(response: any): Promise<any> {
    try {
      return await maskMcpResponse(response, this.maskingConfig);
    } catch (error) {
      // If masking fails, log warning and return original response
      console.warn('Output masking failed:', error);
      return response;
    }
  }

  /**
   * Read MCP resource with caching
   */
  private async readResource(uri: string): Promise<any> {
    try {
      const { getCachedOrGenerate } = await import('./utils/cache.js');

      // Parse URI to determine resource type and parameters
      const url = new globalThis.URL(uri);
      const resourceType = url.pathname.replace('/', '');
      const params = Object.fromEntries(url.searchParams.entries());

      switch (resourceType) {
        case 'architectural_knowledge_graph': {
          const { generateArchitecturalKnowledgeGraph } = await import('./resources/index.js');
          const projectPath = params['projectPath'] || process.cwd();

          const result = await getCachedOrGenerate(
            `knowledge-graph:${projectPath}`,
            () => generateArchitecturalKnowledgeGraph(projectPath),
            { ttl: 3600 }
          );

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2)
              }
            ]
          };
        }

        case 'analysis_report': {
          const { generateAnalysisReport } = await import('./resources/index.js');
          const projectPath = params['projectPath'] || process.cwd();
          const focusAreas = params['focusAreas'] ? params['focusAreas'].split(',') : undefined;

          const result = await getCachedOrGenerate(
            `analysis-report:${projectPath}:${focusAreas?.join(',') || ''}`,
            () => generateAnalysisReport(projectPath, focusAreas),
            { ttl: 1800 }
          );

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2)
              }
            ]
          };
        }

        case 'adr_list': {
          const { generateAdrList } = await import('./resources/index.js');
          const adrDirectory = params['adrDirectory'] || 'docs/adrs';

          const result = await getCachedOrGenerate(
            `adr-list:${adrDirectory}`,
            () => generateAdrList(adrDirectory),
            { ttl: 900 }
          );

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2)
              }
            ]
          };
        }

        default:
          throw new McpAdrError(`Unknown resource type: ${resourceType}`, 'UNKNOWN_RESOURCE');
      }
    } catch (error) {
      if (error instanceof McpAdrError) {
        throw error;
      }
      throw new McpAdrError(
        `Failed to read resource: ${error instanceof Error ? error.message : String(error)}`,
        'RESOURCE_ERROR'
      );
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    // Validate configuration before starting
    await this.validateConfiguration();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Keep the process alive
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const server = new McpAdrAnalysisServer();
    await server.start();
  } catch (error) {
    console.error('Failed to start MCP ADR Analysis Server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
