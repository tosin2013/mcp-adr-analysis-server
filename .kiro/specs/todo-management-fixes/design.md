# Design Document

## Overview

The TODO management system currently has several critical issues that prevent reliable task management and cause test failures. The main problems are:

1. **Task Persistence Issues**: Tasks are not being properly persisted or retrieved after creation
2. **Missing Core Operations**: delete_task, archive_task, and undo operations are not implemented
3. **Partial ID Matching Problems**: The system doesn't handle partial task IDs correctly
4. **Bulk Operations Failures**: Bulk updates and deletes are not working as expected
5. **Search and Find Limitations**: Enhanced search capabilities are missing
6. **Validation and Error Handling**: Poor error messages and validation

## Architecture

The current architecture consists of:

- **manageTodoV2**: Main tool function that handles all operations
- **TodoJsonManager**: Core data management with JSON backend
- **KnowledgeGraphManager**: Integration with knowledge graph
- **ProjectHealthScoring**: Scoring and metrics integration

### Current Data Flow

```
User Request → manageTodoV2 → TodoJsonManager → JSON Backend + Markdown Sync
                    ↓
            KnowledgeGraphManager + ProjectHealthScoring
```

### Issues in Current Architecture

1. **Batching Problems**: The batching mechanism is causing data persistence issues
2. **Transaction Safety**: No proper transaction handling for bulk operations
3. **ID Resolution**: Partial ID matching logic is incomplete
4. **Operation History**: Missing undo/redo functionality

## Components and Interfaces

### Enhanced TodoJsonManager

**Current Issues:**
- Batching mechanism interferes with immediate persistence needs
- Missing delete and archive operations
- No undo history management

**Design Changes:**
```typescript
interface TodoJsonManager {
  // Enhanced persistence
  flushBatch(): Promise<void>
  enableImmediatePersistence(): void
  disableImmediatePersistence(): void
  
  // Missing operations
  deleteTask(taskId: string, options?: DeleteOptions): Promise<void>
  archiveTask(taskId: string): Promise<void>
  
  // Undo functionality
  undoLastOperation(): Promise<UndoResult>
  getUndoHistory(limit?: number): Promise<OperationHistory[]>
  
  // Enhanced search
  findTasks(query: FindTaskQuery): Promise<TodoTask[]>
  
  // Bulk operations
  bulkDelete(taskIds: string[], options?: BulkDeleteOptions): Promise<BulkResult>
}

interface DeleteOptions {
  force?: boolean
  handleDependencies?: 'block' | 'reassign' | 'delete_cascade'
}

interface FindTaskQuery {
  query: string
  searchType: 'id' | 'title' | 'description' | 'all' | 'fuzzy' | 'regex' | 'multi_field'
  searchFields?: string[]
  fuzzyThreshold?: number
}
```

### Enhanced Operation Schemas

**Missing Schemas to Add:**
```typescript
const DeleteTaskSchema = z.object({
  operation: z.literal('delete_task'),
  projectPath: z.string(),
  taskId: z.string(),
  force: z.boolean().default(false),
  handleDependencies: z.enum(['block', 'reassign', 'delete_cascade']).default('block')
});

const ArchiveTaskSchema = z.object({
  operation: z.literal('archive_task'),
  projectPath: z.string(),
  taskId: z.string()
});

const UndoLastSchema = z.object({
  operation: z.literal('undo_last'),
  projectPath: z.string()
});

const GetUndoHistorySchema = z.object({
  operation: z.literal('get_undo_history'),
  projectPath: z.string(),
  limit: z.number().default(10)
});

const BulkDeleteSchema = z.object({
  operation: z.literal('bulk_delete'),
  projectPath: z.string(),
  taskIds: z.array(z.string()),
  confirm: z.boolean(),
  force: z.boolean().default(false)
});
```

### Enhanced ID Resolution System

**Current Problem:** Partial ID matching is unreliable and causes "task not found" errors.

**Design Solution:**
```typescript
interface TaskIdResolver {
  resolveTaskId(input: string, tasks: Record<string, TodoTask>): TaskResolution
  validateTaskId(taskId: string): ValidationResult
  suggestSimilarIds(input: string, tasks: Record<string, TodoTask>): string[]
}

interface TaskResolution {
  success: boolean
  resolvedId?: string
  matches?: TodoTask[]
  suggestions?: string[]
  error?: string
}
```

### Enhanced Search Engine

**Current Problem:** Limited search capabilities, no fuzzy matching, no multi-field search.

**Design Solution:**
```typescript
interface TaskSearchEngine {
  searchById(query: string, tasks: TodoTask[]): TodoTask[]
  searchByTitle(query: string, tasks: TodoTask[]): TodoTask[]
  searchByDescription(query: string, tasks: TodoTask[]): TodoTask[]
  fuzzySearch(query: string, tasks: TodoTask[], threshold?: number): TodoTask[]
  regexSearch(pattern: string, tasks: TodoTask[]): TodoTask[]
  multiFieldSearch(query: string, fields: string[], tasks: TodoTask[]): TodoTask[]
}
```

## Data Models

### Enhanced TodoTask Model

**Add Missing Fields:**
```typescript
interface TodoTask {
  // ... existing fields ...
  
  // Enhanced metadata
  deletedAt?: string
  deletedBy?: string
  archivedAt?: string
  archivedBy?: string
  
  // Dependency management
  dependents?: string[] // Tasks that depend on this task
  
  // Search optimization
  searchableText?: string // Computed field for search
}
```

### Operation History Model

**Enhanced for Undo Support:**
```typescript
interface OperationHistoryEntry {
  id: string
  timestamp: string
  operation: OperationType
  description: string
  affectedTaskIds: string[]
  snapshotBefore: Record<string, TodoTask>
  snapshotAfter: Record<string, TodoTask>
  canUndo: boolean
  undoComplexity: 'simple' | 'complex' | 'dangerous'
}
```

### Bulk Operation Results

**New Models for Bulk Operations:**
```typescript
interface BulkOperationResult {
  success: boolean
  totalRequested: number
  successful: number
  failed: number
  results: BulkItemResult[]
  summary: string
}

interface BulkItemResult {
  taskId: string
  success: boolean
  error?: string
  action: string
}
```

## Error Handling

### Enhanced Error Types

**Current Problem:** Generic error messages that don't help users.

**Design Solution:**
```typescript
class TodoManagerError extends Error {
  code: string
  suggestions: string[]
  context?: any
  
  static taskNotFound(taskId: string, suggestions?: string[]): TodoManagerError
  static invalidTaskId(taskId: string): TodoManagerError
  static circularDependency(taskIds: string[]): TodoManagerError
  static dependencyConflict(taskId: string, dependents: string[]): TodoManagerError
  static invalidPriority(priority: string, suggestion?: string): TodoManagerError
  static invalidDateFormat(date: string): TodoManagerError
}
```

### Error Recovery Strategies

1. **Task Not Found**: Provide fuzzy search suggestions
2. **Invalid ID Format**: Suggest using find_task or get_tasks
3. **Dependency Conflicts**: Show affected tasks and resolution options
4. **Validation Errors**: Provide specific field guidance and valid values

## Testing Strategy

### Unit Tests

1. **Task Persistence Tests**
   - Test immediate persistence vs batching
   - Test data consistency across operations
   - Test concurrent operation handling

2. **ID Resolution Tests**
   - Test partial ID matching
   - Test ambiguous ID handling
   - Test invalid ID format handling

3. **Search Engine Tests**
   - Test all search types (fuzzy, regex, multi-field)
   - Test search performance with large datasets
   - Test search result ranking

4. **Bulk Operations Tests**
   - Test bulk update consistency
   - Test bulk delete with dependencies
   - Test dry-run functionality

5. **Undo System Tests**
   - Test undo for each operation type
   - Test undo history management
   - Test undo limitations and safety

### Integration Tests

1. **End-to-End Workflow Tests**
   - Create → Update → Delete → Undo workflows
   - Bulk operations with mixed success/failure
   - Search and find integration

2. **Data Consistency Tests**
   - JSON ↔ Markdown synchronization
   - Knowledge graph integration
   - Scoring system integration

3. **Error Handling Tests**
   - Test all error scenarios
   - Test error message quality
   - Test recovery suggestions

### Performance Tests

1. **Large Dataset Tests**
   - Test with 1000+ tasks
   - Test search performance
   - Test bulk operation performance

2. **Concurrent Operation Tests**
   - Test rapid successive operations
   - Test batching behavior
   - Test data corruption prevention

## Implementation Phases

### Phase 1: Core Persistence Fixes
- Fix batching mechanism issues
- Implement immediate persistence mode
- Add proper transaction handling

### Phase 2: Missing Operations
- Implement delete_task operation
- Implement archive_task operation
- Add dependency conflict handling

### Phase 3: Enhanced ID Resolution
- Implement robust partial ID matching
- Add fuzzy ID suggestions
- Improve error messages

### Phase 4: Search and Find Enhancements
- Implement fuzzy search
- Add multi-field search
- Add regex search support

### Phase 5: Undo System
- Implement operation history tracking
- Add undo_last operation
- Add undo history viewing

### Phase 6: Bulk Operations
- Fix bulk update issues
- Implement bulk delete
- Add dry-run support

### Phase 7: Enhanced Error Handling
- Implement comprehensive error types
- Add contextual suggestions
- Improve validation messages

## Security and Validation

### Input Validation
- Strict schema validation for all operations
- Sanitization of search queries (especially regex)
- Validation of task relationships and dependencies

### Data Integrity
- Atomic operations for bulk changes
- Consistency checks after operations
- Backup and recovery mechanisms

### Access Control
- Operation logging for audit trails
- Validation of project path access
- Protection against path traversal attacks