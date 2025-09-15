/**
 * DEPRECATED: Project Health Scoring removed in memory-centric transformation
 * This is a stub file to prevent import errors
 */

export class ProjectHealthScoring {
  constructor() {
    console.warn(
      '⚠️ ProjectHealthScoring is deprecated and was removed in memory-centric transformation'
    );
  }

  async updateTaskCompletionScore() {
    console.warn('⚠️ Health scoring removed - use relationship-based importance instead');
  }

  async getProjectHealthScore() {
    console.warn('⚠️ Health scoring removed - use relationship-based importance instead');
    return { score: 0, message: 'Health scoring removed in memory-centric transformation' };
  }
}
