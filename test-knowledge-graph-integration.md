# Knowledge Graph Integration Test Cases

## Test Suite: Knowledge Graph Integration Functionality

### Test Case 1: Intent Capture and Storage
**Objective**: Verify intent snapshots are created and stored correctly

**Test Steps**:
1. Use `human-override-tool` with a test request
2. Verify intent snapshot is created in knowledge graph
3. Check intent contains correct humanRequest, parsedGoals, priority
4. Verify intentId is generated and stored

**Expected Results**:
- Intent snapshot exists in `.mcp-adr-cache/knowledge-graph-snapshots.json`
- Intent has valid structure matching IntentSnapshotSchema
- Goal extraction works correctly from task descriptions

### Test Case 2: Tool Execution Tracking
**Objective**: Verify tool executions are captured and linked to intents

**Test Steps**:
1. Execute any MCP tool that modifies TODO.md
2. Check that tool execution is recorded in knowledge graph
3. Verify tool parameters, results, and success status are captured
4. Confirm tool execution is linked to correct intent

**Expected Results**:
- Tool execution snapshot exists in intent.toolChain array
- Parameters and results are stored as JSON objects
- Execution timestamp and success status are recorded
- TODO task creation/modification is tracked

### Test Case 3: TODO.md Bidirectional Sync
**Objective**: Verify TODO.md changes sync with knowledge graph

**Test Steps**:
1. Generate TODO.md using `generate_adr_todo`
2. Manually edit TODO.md file externally
3. Check if TodoFileWatcher detects changes
4. Verify sync state is updated in knowledge graph
5. Confirm active intents are notified of changes

**Expected Results**:
- File changes are detected by watcher
- Sync state shows updated hash and timestamp
- Change events are recorded in tool execution history
- Active intents receive TODO snapshot updates

### Test Case 4: Knowledge Graph Resource Exposure
**Objective**: Verify LLMs can access knowledge graph data via MCP resources

**Test Steps**:
1. Request `architectural_knowledge_graph` resource
2. Verify response contains knowledgeGraphSnapshot
3. Check intent snapshots, analytics, and sync state are included
4. Confirm data structure matches expected schema

**Expected Results**:
- Resource returns complete knowledge graph snapshot
- Intent snapshots include tool chain summaries
- Analytics show totalIntents, activeIntents, completedIntents
- TODO sync state shows current synchronization status

### Test Case 5: Analytics Generation
**Objective**: Verify analytics are computed correctly

**Test Steps**:
1. Create multiple intents with different statuses
2. Execute various tools across different intents
3. Check analytics calculations for tool usage and completion rates
4. Verify most used tools are tracked correctly

**Expected Results**:
- Analytics show correct intent counts by status
- Tool usage statistics are accurate
- Average goal completion is calculated properly
- Most used tools list is populated and sorted

### Test Case 6: Error Handling and Recovery
**Objective**: Verify system handles errors gracefully

**Test Steps**:
1. Test with corrupted knowledge graph JSON file
2. Test with missing cache directory
3. Test intent operations with invalid IDs
4. Test TODO.md operations with missing file

**Expected Results**:
- System creates default structures when files missing
- Invalid operations throw appropriate McpAdrError
- Recovery mechanisms restore functionality
- No data corruption occurs during error states

### Test Case 7: Cross-Tool Integration
**Objective**: Verify multiple tools work together with knowledge graph

**Test Steps**:
1. Use `human-override-tool` to create intent
2. Execute `generate_adr_todo` (should link to intent)
3. Use `manage_todo` to update task status
4. Check `compare_adr_progress` includes intent context
5. Verify complete workflow is tracked

**Expected Results**:
- All tool executions are linked to original intent
- TODO tasks show creation and modification history
- Progress validation includes intent-driven context
- Complete workflow history is maintained

### Test Case 8: Concurrent Operations
**Objective**: Verify system handles multiple simultaneous operations

**Test Steps**:
1. Start TODO.md file watcher
2. Simultaneously execute multiple tools
3. Manually edit TODO.md during tool execution
4. Verify all operations are tracked correctly

**Expected Results**:
- No race conditions or data corruption
- All tool executions are recorded
- TODO changes are detected and synced
- Intent snapshots remain consistent

## Performance Test Cases

### Test Case 9: Large Intent History
**Objective**: Verify performance with many intents and executions

**Test Steps**:
1. Create 100+ intents with multiple tool executions each
2. Measure knowledge graph load/save performance
3. Test resource generation with large datasets
4. Verify analytics computation efficiency

**Expected Results**:
- Operations complete within reasonable time (< 2 seconds)
- Memory usage remains stable
- Large JSON files are handled efficiently
- Analytics scale with dataset size

### Test Case 10: TODO.md Sync Performance
**Objective**: Verify file watching performance with large TODO files

**Test Steps**:
1. Create TODO.md with 1000+ tasks
2. Make frequent changes to the file
3. Monitor watcher response time and resource usage
4. Test sync operations with large content

**Expected Results**:
- File changes detected within polling interval
- Hash calculation is efficient for large files
- Sync operations don't block other functionality
- Memory usage grows linearly with file size

## Integration Test Scenarios

### Scenario 1: Complete Intent Lifecycle
1. Human request → Intent creation
2. Tool execution → Snapshot storage
3. TODO generation → File sync
4. Manual editing → Change detection
5. Progress tracking → Analytics update
6. Completion → Status update

### Scenario 2: Multi-Tool Workflow
1. `human-override-tool` → Intent capture
2. `tool-chain-orchestrator` → Execution planning
3. `generate_adr_todo` → TODO creation
4. `manage_todo` → Status updates
5. `compare_adr_progress` → Progress validation

### Scenario 3: Error Recovery Workflow
1. Simulate JSON corruption
2. Test recovery mechanisms
3. Verify data integrity maintained
4. Confirm operations resume normally

## Validation Commands

```bash
# Run all tests
npm test

# Test knowledge graph functionality specifically
npm test -- --testNamePattern="knowledge.graph"

# Test TODO sync functionality
npm test -- --testNamePattern="todo.sync"

# Test MCP resource generation
npm test -- --testNamePattern="resource"

# Integration test
npm test -- --testNamePattern="integration"
```

## Expected File Structure After Testing

```
.mcp-adr-cache/
├── knowledge-graph-snapshots.json    # Intent snapshots and analytics
├── todo-sync-state.json              # TODO synchronization metadata
└── [existing cache files]            # Other cached resources
```

## Success Criteria

✅ All intent capture and tracking functionality works
✅ Tool execution history is complete and accurate  
✅ TODO.md bidirectional sync operates correctly
✅ Knowledge graph data is accessible to LLMs via MCP resources
✅ Analytics provide meaningful insights
✅ Error handling prevents data corruption
✅ Performance is acceptable for typical usage
✅ Integration between tools maintains data consistency