/**
 * Test suite for LLM artifact detector
 */

import { describe, it, expect } from 'vitest';

describe('LLM Artifact Detector', () => {
  describe('Debug Script Detection', () => {
    it('should detect debug scripts by filename', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('debug_analysis.py', 'print("Debug info")');

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'debug-script')).toBe(true);
      expect(result.severity).toBe('warning');
    });

    it('should detect debug scripts by content', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const debugContent = `
        import logging
        
        def analyze_data():
            print("Debug: Processing data")
            logging.debug("Debug information")
            debugger;
      `;

      const result = detectLLMArtifacts('analyzer.py', debugContent);

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'debug-script')).toBe(true);
    });

    it('should allow debug scripts in appropriate locations', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('scripts/debug_helper.py', 'print("Debug info")');

      expect(result.isLLMArtifact).toBe(true);
      expect(result.allowedInCurrentLocation).toBe(true);
    });
  });

  describe('Test File Detection', () => {
    it('should detect test files in wrong location', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('src/test_user_auth.py', 'def test_login(): pass');

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'misplaced-test')).toBe(true);
      expect(result.severity).toBe('error');
      expect(result.allowedInCurrentLocation).toBe(false);
    });

    it('should allow test files in test directories', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('tests/test_user_auth.py', 'def test_login(): pass');

      expect(result.isLLMArtifact).toBe(true);
      expect(result.allowedInCurrentLocation).toBe(true);
    });

    it('should detect various test file patterns', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const testFiles = ['test_auth.py', 'user.test.js', 'api.spec.ts'];

      for (const file of testFiles) {
        const result = detectLLMArtifacts(`src/${file}`, 'test content');
        expect(result.isLLMArtifact).toBe(true);
        expect(result.matches.some(m => m.pattern.name === 'misplaced-test')).toBe(true);
      }
    });
  });

  describe('Mock Data Detection', () => {
    it('should detect mock data files by filename', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('mock_users.json', '{"users": []}');

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'mock-data')).toBe(true);
    });

    it('should detect mock data by content', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const mockContent = `
        {
          "users": [
            {"id": 1, "name": "Mock User", "email": "mock@example.com"},
            {"id": 2, "name": "Fake User", "email": "fake@test.com"}
          ]
        }
      `;

      const result = detectLLMArtifacts('users.json', mockContent);

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'mock-data')).toBe(true);
    });

    it('should allow mock data in appropriate locations', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('tests/fixtures/mock_users.json', '{"mock": "data"}');

      expect(result.isLLMArtifact).toBe(true);
      expect(result.allowedInCurrentLocation).toBe(true);
    });
  });

  describe('Temporary File Detection', () => {
    it('should detect temporary files by filename patterns', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const tempFiles = [
        'temp_analysis.txt',
        'scratch_notes.md',
        'playground_code.py',
        'test.tmp',
        'backup.bak',
      ];

      for (const file of tempFiles) {
        const result = detectLLMArtifacts(file, 'temporary content');
        expect(result.isLLMArtifact).toBe(true);
        expect(result.matches.some(m => m.pattern.name === 'temporary-file')).toBe(true);
        expect(result.severity).toBe('error');
      }
    });

    it('should allow temporary files in temp directories', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('tmp/temp_analysis.txt', 'temporary content');

      expect(result.isLLMArtifact).toBe(true);
      expect(result.allowedInCurrentLocation).toBe(true);
    });
  });

  describe('Experimental Code Detection', () => {
    it('should detect experimental code by filename', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const expFiles = [
        'experiment_new_feature.py',
        'poc_microservice.js',
        'prototype_ui.tsx',
        'try_optimization.go',
      ];

      for (const file of expFiles) {
        const result = detectLLMArtifacts(file, 'experimental code');
        expect(result.isLLMArtifact).toBe(true);
        expect(result.matches.some(m => m.pattern.name === 'experimental-code')).toBe(true);
      }
    });

    it('should detect experimental code by content', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const expContent = `
        /* This is an experiment to test new approach */
        // TODO: experiment with different algorithm
        function experimentalFeature() {
          // Experimental implementation
        }
      `;

      const result = detectLLMArtifacts('feature.js', expContent);

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'experimental-code')).toBe(true);
    });

    it('should allow experimental code in appropriate locations', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('experiments/poc_feature.py', 'experimental code');

      expect(result.isLLMArtifact).toBe(true);
      expect(result.allowedInCurrentLocation).toBe(true);
    });
  });

  describe('Tutorial File Detection', () => {
    it('should detect tutorial files by filename', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const tutorialFiles = [
        'tutorial_getting_started.md',
        'learn_react.js',
        'example_usage.py',
        'demo_application.html',
      ];

      for (const file of tutorialFiles) {
        const result = detectLLMArtifacts(file, 'tutorial content');
        expect(result.isLLMArtifact).toBe(true);
        expect(result.matches.some(m => m.pattern.name === 'tutorial-file')).toBe(true);
      }
    });

    it('should detect tutorial content', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const tutorialContent = `
        # Step 1: Install dependencies
        This tutorial shows how to set up the project.
        
        # Step 2: Configure the application
        Follow along with these instructions.
        
        This example demonstrates the basic usage.
      `;

      const result = detectLLMArtifacts('guide.md', tutorialContent);

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'tutorial-file')).toBe(true);
    });
  });

  describe('Documentation Draft Detection', () => {
    it('should detect documentation drafts', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const draftFiles = [
        'draft_api_docs.md',
        'notes_meeting.md',
        'wip_architecture.md',
        'todo_documentation.md',
      ];

      for (const file of draftFiles) {
        const result = detectLLMArtifacts(file, 'draft content');
        expect(result.isLLMArtifact).toBe(true);
        expect(result.matches.some(m => m.pattern.name === 'documentation-draft')).toBe(true);
      }
    });

    it('should detect draft content markers', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const draftContent = `
        # API Documentation [DRAFT]
        
        This is work in progress and needs to be updated.
        
        [WIP] Adding more sections later.
        [TODO] Complete the examples section.
      `;

      const result = detectLLMArtifacts('api.md', draftContent);

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'documentation-draft')).toBe(true);
    });
  });

  describe('LLM Conversation Detection', () => {
    it('should detect LLM conversation logs', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const conversationFiles = [
        'llm_session.txt',
        'claude_conversation.md',
        'gpt_chat.txt',
        'ai_discussion.log',
      ];

      for (const file of conversationFiles) {
        const result = detectLLMArtifacts(file, 'Human: Hello');
        expect(result.isLLMArtifact).toBe(true);
        expect(result.matches.some(m => m.pattern.name === 'llm-conversation')).toBe(true);
      }
    });

    it('should detect conversation content patterns', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const conversationContent = `
        Human: Can you help me with this code?
        
        Assistant: I'll help you with that code. Here's what I suggest:
        
        1. First, let's look at the structure
        2. Then we'll optimize the performance
        
        Human: Thanks, that works perfectly!
        
        Claude: You're welcome! Is there anything else you'd like me to help with?
      `;

      const result = detectLLMArtifacts('conversation.txt', conversationContent);

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'llm-conversation')).toBe(true);
      expect(result.severity).toBe('warning');
    });
  });

  describe('Analysis Report Detection', () => {
    it('should detect analysis and report files', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const reportFiles = [
        'analysis_results.txt',
        'report_summary.md',
        'output_data.json',
        'results_processing.csv',
      ];

      for (const file of reportFiles) {
        const result = detectLLMArtifacts(file, 'analysis content');
        expect(result.isLLMArtifact).toBe(true);
        expect(result.matches.some(m => m.pattern.name === 'analysis-report')).toBe(true);
      }
    });

    it('should detect report content patterns', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const reportContent = `
        # Analysis Results
        
        Generated on: 2024-01-15
        
        ## Report Summary
        The analysis shows the following findings:
        
        Output from the processing pipeline:
        - Total processed: 1,234 items
        - Success rate: 98.5%
      `;

      const result = detectLLMArtifacts('report.md', reportContent);

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'analysis-report')).toBe(true);
    });
  });

  describe('Utility Script Detection', () => {
    it('should detect utility scripts', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const utilityFiles = ['util_data_processor.py', 'helper_functions.js', 'tool_converter.rb'];

      for (const file of utilityFiles) {
        const result = detectLLMArtifacts(file, 'utility content');
        expect(result.isLLMArtifact).toBe(true);
        expect(result.matches.some(m => m.pattern.name === 'utility-script')).toBe(true);
      }
    });

    it('should detect utility content patterns', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const utilityContent = `
        # Quick script for data processing
        
        def helper_function():
            # This is a utility tool for one-time use
            pass
      `;

      const result = detectLLMArtifacts('processor.py', utilityContent);

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'utility-script')).toBe(true);
    });
  });

  describe('Verbose Comments Detection', () => {
    it('should detect excessive commenting', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const verboseContent = `
        // This function processes user data
        // It takes a user object as input
        // First, it validates the user data
        // Then it processes the information
        // Finally, it returns the processed result
        function processUser(user) {
          // Check if user exists
          if (!user) {
            // Return null if no user
            return null;
          }
          
          // Process the user data
          const processed = {
            // Set the user ID
            id: user.id,
            // Set the user name
            name: user.name,
            // Set the user email
            email: user.email
          };
          
          // Return the processed user
          return processed;
        }
        
        // Export the function for use
        module.exports = processUser;
      `;

      const result = detectLLMArtifacts('user-processor.js', verboseContent);

      expect(result.isLLMArtifact).toBe(true);
      expect(result.matches.some(m => m.pattern.name === 'verbose-comments')).toBe(true);
    });

    it('should not flag normal commenting levels', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const normalContent = `
        // Process user data
        function processUser(user) {
          if (!user) {
            return null;
          }
          
          // Transform user object
          return {
            id: user.id,
            name: user.name,
            email: user.email
          };
        }
        
        module.exports = processUser;
      `;

      const result = detectLLMArtifacts('user-processor.js', normalContent);

      expect(result.matches.some(m => m.pattern.name === 'verbose-comments')).toBe(false);
    });
  });

  describe('Overall Confidence Scoring', () => {
    it('should calculate overall confidence correctly', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('debug_analysis.py', 'print("debug")');

      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(1);
    });

    it('should determine appropriate severity levels', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      // Error level - temporary file
      const errorResult = detectLLMArtifacts('temp_file.tmp', 'temporary');
      expect(errorResult.severity).toBe('error');

      // Warning level - debug script
      const warningResult = detectLLMArtifacts('debug_script.py', 'debug');
      expect(warningResult.severity).toBe('warning');

      // Info level - documentation draft
      const infoResult = detectLLMArtifacts('draft_docs.md', '[draft]');
      expect(infoResult.severity).toBe('info');
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple files efficiently', async () => {
      const { batchDetectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const files = [
        { path: 'debug_script.py', content: 'print("debug")' },
        { path: 'temp_file.tmp', content: 'temporary' },
        { path: 'src/main.py', content: 'def main(): pass' },
      ];

      const results = batchDetectLLMArtifacts(files);

      expect(results).toHaveLength(3);
      expect(results[0]?.isLLMArtifact).toBe(true); // debug_script.py
      expect(results[1]?.isLLMArtifact).toBe(true); // temp_file.tmp
      expect(results[2]?.isLLMArtifact).toBe(false); // src/main.py
    });
  });

  describe('Summary Statistics', () => {
    it('should generate accurate summary statistics', async () => {
      const { detectLLMArtifacts, getLLMArtifactSummary } =
        await import('../../src/utils/llm-artifact-detector.js');

      const results = [
        detectLLMArtifacts('debug_script.py', 'print("debug")'),
        detectLLMArtifacts('temp_file.tmp', 'temporary'),
        detectLLMArtifacts('src/main.py', 'def main(): pass'),
      ];

      const summary = getLLMArtifactSummary(results);

      expect(summary.totalFiles).toBe(3);
      expect(summary.artifactFiles).toBe(2);
      expect(summary.errorCount).toBeGreaterThan(0);
      expect(summary.topPatterns).toBeDefined();
      expect(summary.categorySummary).toBeDefined();
    });
  });

  describe('Custom Pattern Creation', () => {
    it('should create custom LLM artifact patterns', async () => {
      const { createLLMPattern } = await import('../../src/utils/llm-artifact-detector.js');

      const customPattern = createLLMPattern(
        'custom-test',
        'Custom test pattern',
        'testing',
        'warning',
        {
          filePattern: '^custom_.*\\.test\\.js$',
          contentPattern: 'custom test content',
          locationExceptions: ['custom-tests/'],
          confidence: 0.9,
        }
      );

      expect(customPattern.name).toBe('custom-test');
      expect(customPattern.category).toBe('testing');
      expect(customPattern.severity).toBe('warning');
      expect(customPattern.confidence).toBe(0.9);
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate appropriate recommendations', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('debug_script.py', 'print("debug")');

      expect(result.recommendations).toContain(
        '❌ File should be moved to an appropriate directory'
      );
      expect(result.recommendations.some(r => r.includes('scripts/'))).toBe(true);
    });

    it('should acknowledge correct file placement', async () => {
      const { detectLLMArtifacts } = await import('../../src/utils/llm-artifact-detector.js');

      const result = detectLLMArtifacts('scripts/debug_helper.py', 'print("debug")');

      expect(result.recommendations).toContain(
        '✅ File is in an appropriate location for its type'
      );
    });
  });
});
