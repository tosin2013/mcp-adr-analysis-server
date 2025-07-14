/**
 * Interactive approval workflow for smart git push
 * 
 * Handles user interaction for approving/rejecting files with issues
 */

import { createInterface } from 'readline';

export interface ApprovalItem {
  filePath: string;
  issues: ApprovalIssue[];
  suggestions: string[];
  severity: 'error' | 'warning' | 'info';
  allowedInLocation: boolean;
  confidence: number;
}

export interface ApprovalIssue {
  type: 'sensitive-content' | 'llm-artifact' | 'location-violation' | 'temporary-file' | 'wrong-location';
  message: string;
  severity: 'error' | 'warning' | 'info';
  pattern?: string;
  line?: number;
  context?: string;
}

export interface ApprovalResult {
  approved: string[];
  rejected: string[];
  moved: Array<{ from: string; to: string }>;
  ignored: string[];
  actions: ApprovalAction[];
  proceed: boolean;
}

export interface ApprovalAction {
  type: 'approve' | 'reject' | 'move' | 'ignore' | 'edit';
  filePath: string;
  target?: string | undefined;
  reason?: string;
}

export interface ApprovalOptions {
  interactiveMode: boolean;
  autoApproveInfo: boolean;
  autoRejectErrors: boolean;
  dryRun: boolean;
  batchMode: boolean;
  timeout?: number; // seconds
}

/**
 * Main interactive approval function
 */
export async function handleInteractiveApproval(
  items: ApprovalItem[],
  options: ApprovalOptions
): Promise<ApprovalResult> {
  const result: ApprovalResult = {
    approved: [],
    rejected: [],
    moved: [],
    ignored: [],
    actions: [],
    proceed: false
  };
  
  if (items.length === 0) {
    result.proceed = true;
    return result;
  }
  
  // Handle non-interactive mode
  if (!options.interactiveMode) {
    return handleNonInteractiveApproval(items, options);
  }
  
  // Display summary
  displayApprovalSummary(items);
  
  // Group items by severity for better UX
  const errorItems = items.filter(item => item.severity === 'error');
  const warningItems = items.filter(item => item.severity === 'warning');
  const infoItems = items.filter(item => item.severity === 'info');
  
  // Handle errors first (these are most critical)
  if (errorItems.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES (Must be resolved before proceeding)');
    for (const item of errorItems) {
      const action = await handleItemApproval(item, options, true);
      result.actions.push(action);
      applyAction(action, result);
    }
  }
  
  // Handle warnings
  if (warningItems.length > 0) {
    console.log('\n⚠️  WARNING ISSUES (Review recommended)');
    for (const item of warningItems) {
      const action = await handleItemApproval(item, options, false);
      result.actions.push(action);
      applyAction(action, result);
    }
  }
  
  // Handle info items (auto-approve if option set)
  if (infoItems.length > 0) {
    if (options.autoApproveInfo) {
      console.log(`\n✅ Auto-approving ${infoItems.length} info-level items`);
      for (const item of infoItems) {
        const action: ApprovalAction = { type: 'approve', filePath: item.filePath };
        result.actions.push(action);
        applyAction(action, result);
      }
    } else {
      console.log('\n💡 INFO ITEMS (Low priority)');
      for (const item of infoItems) {
        const action = await handleItemApproval(item, options, false);
        result.actions.push(action);
        applyAction(action, result);
      }
    }
  }
  
  // Final confirmation
  result.proceed = await getFinalConfirmation(result, options);
  
  return result;
}

/**
 * Handle non-interactive approval
 */
function handleNonInteractiveApproval(
  items: ApprovalItem[],
  options: ApprovalOptions
): ApprovalResult {
  const result: ApprovalResult = {
    approved: [],
    rejected: [],
    moved: [],
    ignored: [],
    actions: [],
    proceed: false
  };
  
  for (const item of items) {
    let action: ApprovalAction;
    
    if (item.severity === 'error' && options.autoRejectErrors) {
      action = { type: 'reject', filePath: item.filePath, reason: 'Auto-rejected due to errors' };
    } else if (item.severity === 'info' && options.autoApproveInfo) {
      action = { type: 'approve', filePath: item.filePath };
    } else {
      // Default behavior based on severity
      switch (item.severity) {
        case 'error':
          action = { type: 'reject', filePath: item.filePath, reason: 'Automatic rejection due to errors' };
          break;
        case 'warning':
          action = item.allowedInLocation 
            ? { type: 'approve', filePath: item.filePath }
            : { type: 'reject', filePath: item.filePath, reason: 'Location violation' };
          break;
        case 'info':
          action = { type: 'approve', filePath: item.filePath };
          break;
      }
    }
    
    result.actions.push(action);
    applyAction(action, result);
  }
  
  // In non-interactive mode, proceed if no errors were rejected
  result.proceed = result.rejected.length === 0;
  
  return result;
}

/**
 * Handle approval for a single item
 */
async function handleItemApproval(
  item: ApprovalItem,
  options: ApprovalOptions,
  isError: boolean
): Promise<ApprovalAction> {
  console.log(`\n📄 ${item.filePath}`);
  console.log(`   Severity: ${item.severity.toUpperCase()}`);
  console.log(`   Confidence: ${(item.confidence * 100).toFixed(1)}%`);
  console.log(`   Location Valid: ${item.allowedInLocation ? '✅' : '❌'}`);
  
  // Display issues
  console.log('\n   Issues:');
  for (const issue of item.issues) {
    console.log(`   - ${issue.severity.toUpperCase()}: ${issue.message}`);
    if (issue.line) {
      console.log(`     Line ${issue.line}`);
    }
    if (issue.context) {
      const contextLines = issue.context.split('\n').slice(0, 3);
      console.log(`     Context: ${contextLines.join(' | ')}`);
    }
  }
  
  // Display suggestions
  if (item.suggestions.length > 0) {
    console.log('\n   Suggestions:');
    for (let i = 0; i < item.suggestions.length; i++) {
      console.log(`   ${i + 1}. ${item.suggestions[i]}`);
    }
  }
  
  // Get user choice
  const choices = buildChoices(item, isError);
  const choice = await getUserChoice(choices, options);
  
  return processChoice(choice, item, options);
}

/**
 * Build available choices for user
 */
function buildChoices(item: ApprovalItem, isError: boolean): Array<{ key: string; description: string; available: boolean }> {
  const choices = [
    { key: 'a', description: 'Approve (include in commit)', available: !isError },
    { key: 'r', description: 'Reject (exclude from commit)', available: true },
    { key: 'i', description: 'Ignore (add to .gitignore)', available: true },
    { key: 'm', description: 'Move to different location', available: !item.allowedInLocation },
    { key: 'v', description: 'View file content', available: true },
    { key: 'e', description: 'Edit file', available: true },
    { key: 's', description: 'Skip for now', available: false }, // Not implemented yet
    { key: 'h', description: 'Show help', available: true }
  ];
  
  return choices;
}

/**
 * Get user choice
 */
async function getUserChoice(
  choices: Array<{ key: string; description: string; available: boolean }>,
  options: ApprovalOptions
): Promise<string> {
  const availableChoices = choices.filter(c => c.available);
  
  console.log('\n   Available actions:');
  for (const choice of availableChoices) {
    console.log(`   [${choice.key}] ${choice.description}`);
  }
  
  if (options.batchMode) {
    console.log('   [all] Apply to all similar files');
  }
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    const askQuestion = () => {
      rl.question('\n   Your choice: ', (answer) => {
        const choice = answer.trim().toLowerCase();
        
        if (choice === 'h') {
          displayHelp();
          askQuestion();
        } else if (availableChoices.some(c => c.key === choice) || choice === 'all') {
          rl.close();
          resolve(choice);
        } else {
          console.log('   Invalid choice. Please try again.');
          askQuestion();
        }
      });
    };
    
    askQuestion();
  });
}

/**
 * Process user choice into action
 */
function processChoice(choice: string, item: ApprovalItem, options: ApprovalOptions): ApprovalAction {
  switch (choice) {
    case 'a':
      return { type: 'approve', filePath: item.filePath };
      
    case 'r':
      return { type: 'reject', filePath: item.filePath, reason: 'User rejected' };
      
    case 'i':
      return { type: 'ignore', filePath: item.filePath };
      
    case 'm':
      const targetDir = getMoveTarget(item);
      return { type: 'move', filePath: item.filePath, target: targetDir };
      
    case 'v':
      viewFileContent(item.filePath);
      return processChoice(choice, item, options); // Re-prompt after viewing
      
    case 'e':
      editFile(item.filePath);
      return processChoice(choice, item, options); // Re-prompt after editing
      
    default:
      return { type: 'reject', filePath: item.filePath, reason: 'Invalid choice' };
  }
}

/**
 * Get move target from suggestions
 */
function getMoveTarget(item: ApprovalItem): string {
  const moveSuggestions = item.suggestions.filter(s => s.includes('Move') || s.includes('move'));
  
  if (moveSuggestions.length > 0) {
    console.log('\n   Suggested locations:');
    for (let i = 0; i < moveSuggestions.length; i++) {
      console.log(`   ${i + 1}. ${moveSuggestions[i]}`);
    }
    
    // For now, extract first suggested directory
    const firstSuggestion = moveSuggestions[0];
    if (firstSuggestion) {
      const dirMatch = firstSuggestion.match(/(?:to|in)\s+(\w+\/)/);
      return dirMatch ? dirMatch[1]! : 'scripts/';
    }
  }
  
  return 'scripts/'; // Default fallback
}

/**
 * View file content
 */
function viewFileContent(filePath: string): void {
  try {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    console.log(`\n   Content of ${filePath}:`);
    console.log('   ' + '='.repeat(50));
    
    // Show first 20 lines
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      console.log(`   ${(i + 1).toString().padStart(3)}: ${lines[i]}`);
    }
    
    if (lines.length > 20) {
      console.log(`   ... (${lines.length - 20} more lines)`);
    }
    
    console.log('   ' + '='.repeat(50));
  } catch (error) {
    console.log(`   Error reading file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Edit file (placeholder - would open in editor)
 */
function editFile(filePath: string): void {
  console.log(`\n   Opening ${filePath} in editor...`);
  console.log('   (This would open your default editor in a real implementation)');
  console.log('   Press Enter to continue after editing...');
  
  // In a real implementation, this would:
  // 1. Open the file in the user's default editor
  // 2. Wait for the editor to close
  // 3. Re-analyze the file for issues
}

/**
 * Apply action to result
 */
function applyAction(action: ApprovalAction, result: ApprovalResult): void {
  switch (action.type) {
    case 'approve':
      result.approved.push(action.filePath);
      break;
      
    case 'reject':
      result.rejected.push(action.filePath);
      break;
      
    case 'move':
      if (action.target) {
        result.moved.push({ from: action.filePath, to: action.target });
      }
      break;
      
    case 'ignore':
      result.ignored.push(action.filePath);
      break;
  }
}

/**
 * Display approval summary
 */
function displayApprovalSummary(items: ApprovalItem[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 SMART GIT PUSH - VALIDATION RESULTS');
  console.log('='.repeat(60));
  
  const errorCount = items.filter(item => item.severity === 'error').length;
  const warningCount = items.filter(item => item.severity === 'warning').length;
  const infoCount = items.filter(item => item.severity === 'info').length;
  
  console.log(`📊 Summary: ${items.length} files with issues`);
  console.log(`   🚨 Errors: ${errorCount}`);
  console.log(`   ⚠️  Warnings: ${warningCount}`);
  console.log(`   💡 Info: ${infoCount}`);
  
  if (errorCount > 0) {
    console.log('\n❌ Files with errors must be resolved before proceeding');
  }
  
  console.log('\n📋 Review each file and choose an action:');
}

/**
 * Get final confirmation
 */
async function getFinalConfirmation(result: ApprovalResult, options: ApprovalOptions): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('📋 FINAL SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`✅ Approved: ${result.approved.length} files`);
  console.log(`❌ Rejected: ${result.rejected.length} files`);
  console.log(`📁 To Move: ${result.moved.length} files`);
  console.log(`🙈 To Ignore: ${result.ignored.length} files`);
  
  if (result.approved.length > 0) {
    console.log('\n✅ Files to be committed:');
    for (const file of result.approved) {
      console.log(`   - ${file}`);
    }
  }
  
  if (result.rejected.length > 0) {
    console.log('\n❌ Files excluded from commit:');
    for (const file of result.rejected) {
      console.log(`   - ${file}`);
    }
  }
  
  if (result.moved.length > 0) {
    console.log('\n📁 Files to be moved:');
    for (const move of result.moved) {
      console.log(`   - ${move.from} → ${move.to}`);
    }
  }
  
  if (options.dryRun) {
    console.log('\n🔍 DRY RUN - No actual changes will be made');
    return true;
  }
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('\n🚀 Proceed with git push? (y/N): ', (answer) => {
      rl.close();
      const proceed = answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
      resolve(proceed);
    });
  });
}

/**
 * Display help
 */
function displayHelp(): void {
  console.log('\n' + '='.repeat(40));
  console.log('📖 HELP');
  console.log('='.repeat(40));
  console.log('Actions:');
  console.log('  [a] Approve    - Include file in commit');
  console.log('  [r] Reject     - Exclude file from commit');
  console.log('  [i] Ignore     - Add file to .gitignore');
  console.log('  [m] Move       - Move file to appropriate location');
  console.log('  [v] View       - Show file content');
  console.log('  [e] Edit       - Open file in editor');
  console.log('  [h] Help       - Show this help');
  console.log('');
  console.log('Tips:');
  console.log('  - Files with errors must be resolved before proceeding');
  console.log('  - Use [m] to move files to proper directories');
  console.log('  - Use [i] to permanently ignore temporary files');
  console.log('  - Use [v] to examine file content before deciding');
  console.log('='.repeat(40));
}

/**
 * Batch approval for similar files
 */
export function batchApproval(
  items: ApprovalItem[],
  action: ApprovalAction,
  criteria: {
    sameSeverity?: boolean;
    sameIssueType?: boolean;
    samePattern?: boolean;
  }
): ApprovalAction[] {
  const actions: ApprovalAction[] = [];
  const referenceItem = items.find(item => item.filePath === action.filePath);
  
  if (!referenceItem) {
    return [action];
  }
  
  for (const item of items) {
    let matches = true;
    
    if (criteria.sameSeverity && item.severity !== referenceItem.severity) {
      matches = false;
    }
    
    if (criteria.sameIssueType) {
      const itemTypes = item.issues.map(i => i.type);
      const refTypes = referenceItem.issues.map(i => i.type);
      if (!itemTypes.some(type => refTypes.includes(type))) {
        matches = false;
      }
    }
    
    if (matches) {
      actions.push({
        type: action.type,
        filePath: item.filePath,
        target: action.target,
        reason: `Batch ${action.type} - similar to ${action.filePath}`
      });
    }
  }
  
  return actions;
}

/**
 * Save approval preferences for future use
 */
export function saveApprovalPreferences(
  actions: ApprovalAction[],
  configPath: string = '.smartgit-approvals.json'
): void {
  try {
    const fs = require('fs');
    const preferences = {
      timestamp: new Date().toISOString(),
      actions: actions.map(action => ({
        pattern: action.filePath.replace(/[^/]+$/, '*'), // Replace filename with wildcard
        type: action.type,
        reason: action.reason
      }))
    };
    
    fs.writeFileSync(configPath, JSON.stringify(preferences, null, 2));
    console.log(`\n💾 Approval preferences saved to ${configPath}`);
  } catch (error) {
    console.log(`\n⚠️  Could not save preferences: ${error instanceof Error ? error.message : String(error)}`);
  }
}