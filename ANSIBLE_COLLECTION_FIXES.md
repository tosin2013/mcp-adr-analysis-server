# Ansible Collection Fixes Required for Connection Reuse

## Problem Summary

The `tosin2013.mcp_audit` collection fails on subsequent tool calls when running multiple modules sequentially in a playbook. The error is: "Failed to connect to MCP server via stdio: unhandled errors in a TaskGroup (1 sub-exception)"

## Root Cause Analysis

### Current Implementation Issues

1. **New Process Per Module Call**: Each Ansible module creates a **new stdio connection** which spawns a **new server process**:
   ```python
   # In mcp_test_tool.py line ~228
   async with client.connect():
       result = await client.call_tool(tool_name, tool_arguments)
   ```

2. **No Connection Reuse**: The `connect()` context manager:
   - Creates a new `stdio_client()` which spawns a new server process
   - Initializes a new `ClientSession`
   - Closes everything when the context exits
   - **No mechanism to reuse connections across module calls**

3. **Process Cleanup Race Condition**: When modules run sequentially:
   - Module 1: Spawns server process, connects, works, exits (process may still be cleaning up)
   - Module 2: Tries to spawn new server process immediately, but:
     - Previous process might still be running
     - Process cleanup might interfere
     - Resource contention on stdio streams

### Evidence from Code

**File**: `plugins/module_utils/mcp_client.py` (lines 123-152)

```python
@asynccontextmanager
async def connect(self):
    if self.transport == "stdio":
        server_params = StdioServerParameters(
            command=self.server_command,
            args=self.server_args,
        )
        async with stdio_client(server_params) as (read, write):  # NEW PROCESS EACH TIME
            async with ClientSession(read, write) as session:
                await session.initialize()
                yield self  # Connection closes when context exits
```

**File**: `plugins/modules/mcp_test_tool.py` (line ~228)

```python
async def test_tool_async(client: MCPClient, tool_name: str, ...):
    async with client.connect():  # New connection for EVERY tool call
        result = await client.call_tool(tool_name, tool_arguments)
```

## Required Fixes

### Fix 1: Connection Pooling/Reuse (Recommended)

**Problem**: Each module call creates a new server process.

**Solution**: Implement connection pooling with process reuse.

**Changes Needed**:

1. **Create Connection Manager Singleton** (`plugins/module_utils/mcp_connection_manager.py`):

```python
import asyncio
import hashlib
from typing import Dict, Optional
from ansible_collections.mcp.audit.plugins.module_utils.mcp_client import MCPClient

class MCPConnectionManager:
    """Manages connection pooling for MCP servers."""
    
    _instance: Optional['MCPConnectionManager'] = None
    _connections: Dict[str, 'MCPClient'] = {}
    _locks: Dict[str, asyncio.Lock] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def _get_connection_key(self, client: MCPClient) -> str:
        """Generate unique key for connection based on server parameters."""
        if client.transport == "stdio":
            key_data = f"{client.transport}:{client.server_command}:{':'.join(client.server_args)}"
        else:
            key_data = f"{client.transport}:{client.server_url}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def get_or_create_connection(self, client: MCPClient) -> 'MCPClient':
        """Get existing connection or create new one."""
        key = self._get_connection_key(client)
        
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()
        
        async with self._locks[key]:
            if key not in self._connections:
                # Create persistent connection
                connection = await client.connect_persistent()
                self._connections[key] = connection
            
            return self._connections[key]
    
    async def close_connection(self, client: MCPClient):
        """Close a specific connection."""
        key = self._get_connection_key(client)
        if key in self._connections:
            await self._connections[key].close()
            del self._connections[key]
    
    async def close_all(self):
        """Close all connections."""
        for connection in self._connections.values():
            await connection.close()
        self._connections.clear()
```

2. **Add Persistent Connection Method** to `MCPClient`:

```python
# In plugins/module_utils/mcp_client.py

async def connect_persistent(self):
    """Establish persistent connection (doesn't use context manager)."""
    if self.transport == "stdio":
        server_params = StdioServerParameters(
            command=self.server_command,
            args=self.server_args,
        )
        # Store streams without context manager
        self._stdio_context = stdio_client(server_params)
        read, write = await self._stdio_context.__aenter__()
        self._read_stream = read
        self._write_stream = write
        
        self._session_context = ClientSession(read, write)
        self.session = await self._session_context.__aenter__()
        await self.session.initialize()
        
        return self
    # ... handle other transports
    
async def close(self):
    """Close persistent connection."""
    if self.session:
        await self._session_context.__aexit__(None, None, None)
        self.session = None
    if self._stdio_context:
        await self._stdio_context.__aexit__(None, None, None)
        self._stdio_context = None
```

3. **Update Modules to Use Connection Manager**:

```python
# In plugins/modules/mcp_test_tool.py

from ansible_collections.mcp.audit.plugins.module_utils.mcp_connection_manager import MCPConnectionManager

async def test_tool_async(client: MCPClient, tool_name: str, ...):
    manager = MCPConnectionManager()
    persistent_client = await manager.get_or_create_connection(client)
    
    # Use persistent connection instead of creating new one
    result = await persistent_client.call_tool(tool_name, tool_arguments)
    return result
```

### Fix 2: Process Cleanup with Delays (Alternative)

**Problem**: Processes not cleaned up properly between calls.

**Solution**: Add proper cleanup and delays.

**Changes Needed**:

```python
# In plugins/module_utils/mcp_client.py

@asynccontextmanager
async def connect(self):
    try:
        if self.transport == "stdio":
            server_params = StdioServerParameters(
                command=self.server_command,
                args=self.server_args,
            )
            async with stdio_client(server_params) as (read, write):
                self._read_stream = read
                self._write_stream = write
                async with ClientSession(read, write) as session:
                    self.session = session
                    await session.initialize()
                    yield self
        finally:
            # Ensure proper cleanup
            if self.transport == "stdio":
                # Add small delay to allow process cleanup
                await asyncio.sleep(0.1)
                # Force cleanup of any remaining processes
                import gc
                gc.collect()
```

### Fix 3: Better Error Handling for TaskGroup (Workaround)

**Problem**: TaskGroup errors not properly handled.

**Solution**: Add better error handling and retry logic.

**Changes Needed**:

```python
# In plugins/modules/mcp_test_tool.py

async def test_tool_async(client: MCPClient, tool_name: str, ...):
    max_retries = 3
    retry_delay = 0.5
    
    for attempt in range(max_retries):
        try:
            async with client.connect():
                result = await client.call_tool(tool_name, tool_arguments)
                return result
        except Exception as e:
            if "TaskGroup" in str(e) and attempt < max_retries - 1:
                # Wait before retry
                await asyncio.sleep(retry_delay * (attempt + 1))
                continue
            raise
```

## Recommended Implementation Strategy

### Phase 1: Immediate Fix (Quick)
- Implement Fix 3 (better error handling + retry logic)
- Add process cleanup delays
- **Timeline**: 1-2 days

### Phase 2: Proper Fix (Long-term)
- Implement Fix 1 (connection pooling)
- Add connection lifecycle management
- Add configuration option for connection reuse
- **Timeline**: 1-2 weeks

## Configuration Options Needed

Add these options to modules:

```python
connection_reuse:
  description: Whether to reuse connections across module calls
  type: bool
  default: true
  
connection_timeout:
  description: Timeout for connection reuse
  type: int
  default: 300  # 5 minutes
  
max_connection_retries:
  description: Maximum retries for connection failures
  type: int
  default: 3
```

## Testing Requirements

1. **Sequential Module Calls**: Test multiple modules in same playbook
2. **Different Servers**: Test with different MCP server commands
3. **Connection Cleanup**: Verify processes are cleaned up properly
4. **Error Recovery**: Test retry logic and error handling
5. **Performance**: Measure connection overhead with/without pooling

## Compatibility Considerations

Since this collection needs to work with **many projects**, ensure:

1. **Backward Compatibility**: Old behavior still works (connection reuse optional)
2. **Transport Agnostic**: Fixes work for stdio, SSE, and HTTP
3. **Resource Management**: Proper cleanup prevents resource leaks
4. **Error Messages**: Clear errors when connection fails

## Example Fixed Module Usage

```yaml
# Before (fails on second call)
- name: Test tool 1
  tosin2013.mcp_audit.mcp_test_tool:
    tool_name: analyze_project_ecosystem
    # ... fails on next call

- name: Test tool 2  
  tosin2013.mcp_audit.mcp_test_tool:
    tool_name: read_file
    # Fails with connection error

# After (with connection pooling)
- name: Test tool 1
  tosin2013.mcp_audit.mcp_test_tool:
    tool_name: analyze_project_ecosystem
    connection_reuse: true  # NEW OPTION

- name: Test tool 2
  tosin2013.mcp_audit.mcp_test_tool:
    tool_name: read_file
    connection_reuse: true  # Reuses connection from tool 1
    # Works correctly!
```

## Summary

**Critical Fix**: Implement connection pooling/reuse to prevent spawning new server processes for each module call.

**Priority**: HIGH - This affects usability across all projects using the collection.

**Complexity**: Medium - Requires async connection management and lifecycle handling.

**Impact**: Fixes connection failures for sequential tool calls, enabling comprehensive test suites.








