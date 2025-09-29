/**
 * Utility modules index
 * Exports all utility functions for advanced prompting techniques
 */

// Knowledge Generation exports
export {
  generateArchitecturalKnowledge,
  enhancePromptWithKnowledge,
  generateKnowledgeCacheKey,
  getAvailableDomainsInfo,
  validateKnowledgeGenerationInputs,
  getDefaultKnowledgeConfig,
  isDomainSupported,
  getSupportedDomains,
  getSupportedDepths,
  validateKnowledgeConfig,
  createDomainKnowledgeConfig,
  generateDomainKnowledge,
} from './knowledge-generation.js';

// Automatic Prompt Engineering exports
export {
  optimizePromptWithAPE,
  generatePromptCandidates,
  evaluatePromptPerformance,
  optimizeToolPrompt,
  generateAPECacheKey,
  getDefaultAPEConfig,
  validateAPEConfig,
  getSupportedGenerationStrategies,
  getSupportedEvaluationCriteria,
  getSupportedSelectionStrategies,
  createToolAPEConfig,
} from './automatic-prompt-engineering.js';

// Reflexion exports
export {
  executeWithReflexion,
  retrieveRelevantMemories,
  persistReflexionMemory,
  getLearningProgress,
  enhancePromptWithMemories,
  generateReflexionCacheKey,
  getDefaultReflexionConfig,
  validateReflexionConfig,
  getSupportedMemoryTypes,
  getSupportedEvaluationCriteria as getSupportedReflexionEvaluationCriteria,
  getSupportedReflectionDepths,
  createToolReflexionConfig,
  generateMemoryId,
  calculateMemoryExpiration,
  createMemoryQuery,
} from './reflexion.js';

// Configuration and error handling exports
export { McpAdrError } from '../types/index.js';
