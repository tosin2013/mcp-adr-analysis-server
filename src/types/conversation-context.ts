/**
 * Conversation Context Types
 * 
 * Defines the structure for passing conversation context from calling LLMs
 * to the MCP server for context-aware analysis.
 */

export interface ConversationContext {
  /** User's primary objectives from the conversation */
  userGoals?: string[];
  
  /** Specific areas of concern or interest */
  focusAreas?: string[];
  
  /** Limitations, compliance requirements, or restrictions */
  constraints?: string[];
  
  /** Relevant context from previous conversation */
  previousContext?: string;
  
  /** Current project phase or stage */
  projectPhase?: 'planning' | 'development' | 'migration' | 'production' | 'maintenance' | string;
  
  /** User's role or expertise level */
  userRole?: 'architect' | 'developer' | 'manager' | 'ops' | 'security' | string;
  
  /** Specific requirements or preferences mentioned */
  requirements?: string[];
  
  /** Timeline or urgency information */
  timeline?: string;
  
  /** Budget or resource constraints */
  budget?: string;
}

/**
 * JSON Schema for conversation context - reusable across tools
 */
export const CONVERSATION_CONTEXT_SCHEMA = {
  type: 'object' as const,
  description: 'Rich context from the calling LLM about user goals and discussion history',
  properties: {
    userGoals: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Primary objectives the user wants to achieve (e.g., ["microservices migration", "improve security"])'
    },
    focusAreas: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Specific areas of concern or interest (e.g., ["security", "performance", "maintainability"])'
    },
    constraints: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Limitations, compliance requirements, or restrictions (e.g., ["GDPR compliance", "budget under $50k", "minimal downtime"])'
    },
    previousContext: {
      type: 'string' as const,
      description: 'Relevant context from previous conversation (e.g., "User mentioned concerns about database splitting")'
    },
    projectPhase: {
      type: 'string' as const,
      description: 'Current project phase (e.g., "planning", "development", "migration", "production")'
    },
    userRole: {
      type: 'string' as const,
      description: 'User\'s role or expertise level (e.g., "senior architect", "developer", "project manager")'
    },
    requirements: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Specific requirements or preferences mentioned'
    },
    timeline: {
      type: 'string' as const,
      description: 'Timeline or urgency information (e.g., "launch in 3 months", "urgent migration")'
    },
    budget: {
      type: 'string' as const,
      description: 'Budget or resource constraints (e.g., "limited budget", "enterprise scale")'
    }
  },
  additionalProperties: false
};

/**
 * Utility function to extract context summary for prompts
 */
export function formatContextForPrompt(context?: ConversationContext): string {
  if (!context) return '';

  const sections = [];

  if (context.userGoals?.length) {
    sections.push(`User Goals: ${context.userGoals.join(', ')}`);
  }

  if (context.focusAreas?.length) {
    sections.push(`Focus Areas: ${context.focusAreas.join(', ')}`);
  }

  if (context.constraints?.length) {
    sections.push(`Constraints: ${context.constraints.join(', ')}`);
  }

  if (context.projectPhase) {
    sections.push(`Project Phase: ${context.projectPhase}`);
  }

  if (context.userRole) {
    sections.push(`User Role: ${context.userRole}`);
  }

  if (context.timeline) {
    sections.push(`Timeline: ${context.timeline}`);
  }

  if (context.previousContext) {
    sections.push(`Previous Context: ${context.previousContext}`);
  }

  return sections.length > 0 ? `## User Context\n${sections.join('\n')}\n\n` : '';
}

/**
 * Check if context contains meaningful information
 */
export function hasMeaningfulContext(context?: ConversationContext): boolean {
  if (!context) return false;
  
  return !!(
    context.userGoals?.length ||
    context.focusAreas?.length ||
    context.constraints?.length ||
    context.previousContext ||
    context.projectPhase ||
    context.userRole ||
    context.requirements?.length
  );
}