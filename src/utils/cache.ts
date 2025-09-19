/**
 * Caching system for MCP resources and expensive operations
 * Implements prompt-driven caching with TTL and invalidation through AI delegation
 */

import { McpAdrError, CacheEntry } from '../types/index.js';
import { loadConfig, getCacheDirectoryPath } from './config.js';

// Use configuration-based cache directory
const config = loadConfig();
const CACHE_DIR = getCacheDirectoryPath(config);

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  invalidateOnChange?: boolean; // Invalidate when source files change
  compression?: boolean; // Compress cached data
}

/**
 * Generate prompt for AI-driven cache directory initialization
 */
export async function initializeCache(): Promise<{
  prompt: string;
  instructions: string;
  context: any;
}> {
  try {
    console.error(`[DEBUG] Generating cache initialization prompt for: ${CACHE_DIR}`);

    const prompt = `
# Cache Directory Initialization Request

Please initialize the cache directory system for MCP ADR Analysis Server.

## Cache Directory Setup

1. **Create Cache Directory**: ${CACHE_DIR}
   - Create directory with recursive option (create parent directories if needed)
   - Set appropriate permissions (755 or system default)

2. **Create Metadata File**: ${CACHE_DIR}/metadata.json
   - Check if metadata.json already exists
   - If it doesn't exist, create it with the following content:

\`\`\`json
{
  "version": "1.0.0",
  "created": "${new Date().toISOString()}",
  "lastCleanup": "${new Date().toISOString()}"
}
\`\`\`

## Security Validation

The AI agent must:
1. **Validate cache directory path**: Ensure ${CACHE_DIR} is safe and within project scope
2. **Prevent system directory access**: Reject attempts to create cache in system directories
3. **Handle permissions safely**: Set appropriate directory and file permissions
4. **Validate metadata content**: Ensure metadata file contains valid JSON

## Expected Output Format

\`\`\`json
{
  "success": true,
  "cacheDirectory": "${CACHE_DIR}",
  "metadataFile": "${CACHE_DIR}/metadata.json",
  "operations": {
    "directoryCreated": boolean,
    "metadataCreated": boolean,
    "metadataExists": boolean
  },
  "metadata": {
    "version": "1.0.0",
    "created": "ISO_timestamp",
    "lastCleanup": "ISO_timestamp"
  },
  "security": {
    "pathValidated": true,
    "permissionsSet": true,
    "systemDirectoryCheck": "passed"
  }
}
\`\`\`

## Error Response Format

\`\`\`json
{
  "success": false,
  "cacheDirectory": "${CACHE_DIR}",
  "error": "detailed error message",
  "errorType": "PERMISSION_DENIED|INVALID_PATH|SECURITY_VIOLATION|METADATA_ERROR",
  "security": {
    "pathValidated": boolean,
    "systemDirectoryCheck": "passed|failed",
    "rejectionReason": "specific reason if initialization failed"
  }
}
\`\`\`
`;

    const instructions = `
## Implementation Steps

1. **Security Validation**:
   - Validate cache directory path: ${CACHE_DIR}
   - Ensure it's within project scope and not a system directory
   - Check for path traversal attempts

2. **Directory Creation**:
   - Create cache directory: ${CACHE_DIR}
   - Use recursive creation (mkdir -p equivalent)
   - Set appropriate permissions (755)

3. **Metadata File Management**:
   - Check if ${CACHE_DIR}/metadata.json exists
   - If not exists, create with initial metadata
   - Validate JSON structure and content

4. **Response Generation**:
   - Format response according to specified JSON structure
   - Include operation results and security validation
   - Provide detailed error information if initialization fails

## Safety Checks

- ✅ Path security validation delegated to AI agent
- ✅ System directory protection enabled
- ✅ Permission handling with security validation
- ✅ Metadata file validation and creation

## Context Information

- **Cache Directory**: ${CACHE_DIR}
- **Operation**: Cache system initialization
- **Security Level**: High (with path validation and permission control)
`;

    return {
      prompt,
      instructions,
      context: {
        cacheDirectory: CACHE_DIR,
        operation: 'cache_initialization',
        securityLevel: 'high',
        expectedFormat: 'json',
      },
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate cache initialization prompt: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Generate cache file path from key
 */
function getCacheFilePath(key: string): string {
  // Create safe filename from cache key
  const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${CACHE_DIR}/${safeKey}.json`;
}

/**
 * Generate prompt for AI-driven cache data storage
 */
export async function setCache<T>(
  key: string,
  data: T,
  options: CacheOptions = {}
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating cache set prompt for key: ${key}`);

    // First ensure cache is initialized
    const initPrompt = await initializeCache();

    const cacheEntry: CacheEntry<T> = {
      key,
      data,
      timestamp: new Date().toISOString(),
      ttl: options.ttl || 3600, // Default 1 hour
      metadata: {
        version: '1.0.0',
        compressed: options.compression || false,
      },
    };

    const filePath = getCacheFilePath(key);
    const cacheContent = JSON.stringify(cacheEntry, null, 2);

    const prompt = `
# Cache Data Storage Request

Please store cache data for the MCP ADR Analysis Server.

## Step 1: Cache Initialization
${initPrompt.prompt}

**Instructions**: First, execute the cache initialization above to ensure the cache directory exists.

## Step 2: Cache Data Storage

Store the following cache entry:

**Cache Key**: ${key}
**File Path**: ${filePath}
**TTL**: ${cacheEntry.ttl} seconds
**Data Size**: ${JSON.stringify(data).length} characters

### Cache Entry Content
\`\`\`json
${cacheContent}
\`\`\`

## Security Validation

The AI agent must:
1. **Validate cache file path**: Ensure ${filePath} is within cache directory scope
2. **Prevent path traversal**: Reject attempts to write outside cache directory
3. **Validate cache key**: Ensure key contains only safe characters
4. **Content validation**: Verify cache entry structure and JSON validity

## Expected Output Format

\`\`\`json
{
  "success": true,
  "cacheKey": "${key}",
  "filePath": "${filePath}",
  "operations": {
    "cacheInitialized": boolean,
    "fileWritten": true,
    "dataSize": ${JSON.stringify(data).length},
    "ttl": ${cacheEntry.ttl}
  },
  "cacheEntry": {
    "key": "${key}",
    "timestamp": "${cacheEntry.timestamp}",
    "ttl": ${cacheEntry.ttl},
    "compressed": ${cacheEntry.metadata?.['compressed'] || false}
  },
  "security": {
    "pathValidated": true,
    "keyValidated": true,
    "contentValidated": true,
    "systemDirectoryCheck": "passed"
  }
}
\`\`\`

## Error Response Format

\`\`\`json
{
  "success": false,
  "cacheKey": "${key}",
  "filePath": "${filePath}",
  "error": "detailed error message",
  "errorType": "PERMISSION_DENIED|INVALID_PATH|SECURITY_VIOLATION|CACHE_ERROR|JSON_ERROR",
  "security": {
    "pathValidated": boolean,
    "keyValidated": boolean,
    "contentValidated": boolean,
    "systemDirectoryCheck": "passed|failed",
    "rejectionReason": "specific reason if storage failed"
  }
}
\`\`\`
`;

    const instructions = `
## Implementation Steps

1. **Cache Initialization**:
   - Execute cache directory initialization from Step 1
   - Ensure cache directory exists and is accessible

2. **Security Validation**:
   - Validate cache key: ${key}
   - Validate file path: ${filePath}
   - Ensure path is within cache directory scope
   - Check for path traversal attempts

3. **Cache Entry Storage**:
   - Write cache entry to file: ${filePath}
   - Use UTF-8 encoding for JSON content
   - Set appropriate file permissions (644)
   - Ensure atomic write operations

4. **Response Generation**:
   - Format response according to specified JSON structure
   - Include operation results and cache metadata
   - Provide detailed error information if storage fails

## Safety Checks

- ✅ Path security validation delegated to AI agent
- ✅ Cache directory initialization required
- ✅ File path validation and permission handling
- ✅ JSON content validation and safe storage

## Context Information

- **Cache Key**: ${key}
- **File Path**: ${filePath}
- **Data Size**: ${JSON.stringify(data).length} characters
- **TTL**: ${cacheEntry.ttl} seconds
- **Operation**: Cache data storage
- **Security Level**: High (with path and content validation)
`;

    return {
      prompt,
      instructions,
      context: {
        cacheKey: key,
        filePath,
        dataSize: JSON.stringify(data).length,
        ttl: cacheEntry.ttl,
        operation: 'cache_set',
        securityLevel: 'high',
        expectedFormat: 'json',
      },
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate cache set prompt: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Generate prompt for AI-driven cache data retrieval
 */
export async function getCache(
  key: string
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating cache get prompt for key: ${key}`);

    const filePath = getCacheFilePath(key);
    const currentTime = new Date().toISOString();

    const prompt = `
# Cache Data Retrieval Request

Please retrieve and validate cache data for the MCP ADR Analysis Server.

## Cache Retrieval Operation

**Cache Key**: ${key}
**File Path**: ${filePath}
**Current Time**: ${currentTime}

### Required Operations

1. **File Existence Check**:
   - Check if cache file exists: ${filePath}
   - If file doesn't exist, return cache miss result

2. **Cache Content Reading**:
   - Read cache file content from: ${filePath}
   - Parse JSON content to extract cache entry
   - Validate cache entry structure

3. **TTL Validation**:
   - Extract timestamp and TTL from cache entry
   - Calculate cache age: current_time - cache_timestamp
   - Compare age with TTL to determine if cache is expired

4. **Cache Cleanup** (if expired):
   - If cache is expired, delete the cache file
   - Return cache miss result

## Security Validation

The AI agent must:
1. **Validate cache file path**: Ensure ${filePath} is within cache directory scope
2. **Prevent path traversal**: Reject attempts to read outside cache directory
3. **Validate cache key**: Ensure key contains only safe characters
4. **Content validation**: Verify cache entry JSON structure and integrity

## Expected Output Format (Cache Hit)

\`\`\`json
{
  "success": true,
  "cacheKey": "${key}",
  "filePath": "${filePath}",
  "cacheHit": true,
  "data": "[extracted cache data]",
  "cacheInfo": {
    "timestamp": "cache_entry_timestamp",
    "ttl": "cache_entry_ttl",
    "ageInSeconds": "calculated_age",
    "expired": false
  },
  "security": {
    "pathValidated": true,
    "keyValidated": true,
    "contentValidated": true,
    "systemDirectoryCheck": "passed"
  }
}
\`\`\`

## Expected Output Format (Cache Miss)

\`\`\`json
{
  "success": true,
  "cacheKey": "${key}",
  "filePath": "${filePath}",
  "cacheHit": false,
  "data": null,
  "reason": "FILE_NOT_FOUND|CACHE_EXPIRED|CORRUPTED_DATA",
  "cacheInfo": {
    "fileExists": boolean,
    "expired": boolean,
    "cleanupPerformed": boolean
  },
  "security": {
    "pathValidated": true,
    "keyValidated": true,
    "systemDirectoryCheck": "passed"
  }
}
\`\`\`

## Error Response Format

\`\`\`json
{
  "success": false,
  "cacheKey": "${key}",
  "filePath": "${filePath}",
  "error": "detailed error message",
  "errorType": "PERMISSION_DENIED|INVALID_PATH|SECURITY_VIOLATION|JSON_ERROR|READ_ERROR",
  "security": {
    "pathValidated": boolean,
    "keyValidated": boolean,
    "systemDirectoryCheck": "passed|failed",
    "rejectionReason": "specific reason if retrieval failed"
  }
}
\`\`\`
`;

    const instructions = `
## Implementation Steps

1. **Security Validation**:
   - Validate cache key: ${key}
   - Validate file path: ${filePath}
   - Ensure path is within cache directory scope
   - Check for path traversal attempts

2. **File Operations**:
   - Check if cache file exists: ${filePath}
   - If exists, read file content with UTF-8 encoding
   - Parse JSON content to extract cache entry

3. **TTL Validation**:
   - Extract timestamp and TTL from cache entry
   - Calculate cache age using current time: ${currentTime}
   - Determine if cache is expired (age > TTL)

4. **Cache Cleanup** (if needed):
   - If cache is expired, delete the cache file
   - Ensure safe file deletion with proper error handling

5. **Response Generation**:
   - Format response according to specified JSON structure
   - Include cache data if valid, null if miss/expired
   - Provide detailed cache information and security validation

## Safety Checks

- ✅ Path security validation delegated to AI agent
- ✅ Cache key validation and sanitization
- ✅ File existence and permission checking
- ✅ JSON parsing with error handling
- ✅ TTL validation and automatic cleanup

## Context Information

- **Cache Key**: ${key}
- **File Path**: ${filePath}
- **Current Time**: ${currentTime}
- **Operation**: Cache data retrieval with TTL validation
- **Security Level**: High (with path and content validation)
`;

    return {
      prompt,
      instructions,
      context: {
        cacheKey: key,
        filePath,
        currentTime,
        operation: 'cache_get',
        securityLevel: 'high',
        expectedFormat: 'json',
      },
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate cache get prompt: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Generate prompt for AI-driven cache validity check
 */
export async function hasValidCache(
  key: string
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating cache validity check prompt for key: ${key}`);

    // Use the getCache prompt to check validity
    const getCachePrompt = await getCache(key);

    const prompt = `
# Cache Validity Check Request

Please check if a cache entry exists and is valid for the MCP ADR Analysis Server.

## Cache Validity Operation

This is a simplified cache check that determines if a cache entry exists and is not expired.

${getCachePrompt.prompt}

## Expected Output Format (Valid Cache)

\`\`\`json
{
  "success": true,
  "cacheKey": "${key}",
  "isValid": true,
  "cacheHit": true,
  "reason": "CACHE_VALID"
}
\`\`\`

## Expected Output Format (Invalid/Missing Cache)

\`\`\`json
{
  "success": true,
  "cacheKey": "${key}",
  "isValid": false,
  "cacheHit": false,
  "reason": "FILE_NOT_FOUND|CACHE_EXPIRED|CORRUPTED_DATA"
}
\`\`\`

**Note**: This operation should return isValid: true only if the cache exists AND is not expired.
`;

    const instructions = `
## Implementation Steps

1. **Execute Cache Retrieval**:
   - Use the cache retrieval logic from the embedded prompt
   - Check if cache file exists and is readable
   - Validate TTL and expiration status

2. **Validity Determination**:
   - Return isValid: true only if cache exists and is not expired
   - Return isValid: false for any other condition (missing, expired, corrupted)

3. **Response Generation**:
   - Format response according to specified JSON structure
   - Include validity status and reason

## Context Information

- **Cache Key**: ${key}
- **Operation**: Cache validity check
- **Security Level**: High (inherited from cache retrieval)
`;

    return {
      prompt,
      instructions,
      context: {
        cacheKey: key,
        operation: 'cache_validity_check',
        securityLevel: 'high',
        expectedFormat: 'json',
      },
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate cache validity check prompt: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Generate prompt for AI-driven cache entry invalidation
 */
export async function invalidateCache(
  key: string
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating cache invalidation prompt for key: ${key}`);

    const filePath = getCacheFilePath(key);

    const prompt = `
# Cache Entry Invalidation Request

Please invalidate (delete) a specific cache entry for the MCP ADR Analysis Server.

## Cache Invalidation Operation

**Cache Key**: ${key}
**File Path**: ${filePath}

### Required Operations

1. **File Existence Check**:
   - Check if cache file exists: ${filePath}
   - If file doesn't exist, consider operation successful (already invalidated)

2. **Cache File Deletion**:
   - Delete the cache file: ${filePath}
   - Handle file deletion safely with proper error handling
   - Ensure file is completely removed from filesystem

## Security Validation

The AI agent must:
1. **Validate cache file path**: Ensure ${filePath} is within cache directory scope
2. **Prevent path traversal**: Reject attempts to delete files outside cache directory
3. **Validate cache key**: Ensure key contains only safe characters
4. **Safe deletion**: Ensure only cache files are deleted, not system files

## Expected Output Format (Successful Invalidation)

\`\`\`json
{
  "success": true,
  "cacheKey": "${key}",
  "filePath": "${filePath}",
  "operations": {
    "fileExists": boolean,
    "fileDeleted": boolean,
    "alreadyInvalidated": boolean
  },
  "security": {
    "pathValidated": true,
    "keyValidated": true,
    "systemDirectoryCheck": "passed"
  }
}
\`\`\`

## Error Response Format

\`\`\`json
{
  "success": false,
  "cacheKey": "${key}",
  "filePath": "${filePath}",
  "error": "detailed error message",
  "errorType": "PERMISSION_DENIED|INVALID_PATH|SECURITY_VIOLATION|DELETE_ERROR",
  "security": {
    "pathValidated": boolean,
    "keyValidated": boolean,
    "systemDirectoryCheck": "passed|failed",
    "rejectionReason": "specific reason if invalidation failed"
  }
}
\`\`\`
`;

    const instructions = `
## Implementation Steps

1. **Security Validation**:
   - Validate cache key: ${key}
   - Validate file path: ${filePath}
   - Ensure path is within cache directory scope
   - Check for path traversal attempts

2. **File Operations**:
   - Check if cache file exists: ${filePath}
   - If exists, delete the file safely
   - If doesn't exist, consider operation successful

3. **Response Generation**:
   - Format response according to specified JSON structure
   - Include operation results and security validation
   - Handle both success and error cases gracefully

## Safety Checks

- ✅ Path security validation delegated to AI agent
- ✅ Cache key validation and sanitization
- ✅ Safe file deletion with error handling
- ✅ Prevention of system file deletion

## Context Information

- **Cache Key**: ${key}
- **File Path**: ${filePath}
- **Operation**: Cache entry invalidation (deletion)
- **Security Level**: High (with path and operation validation)
`;

    return {
      prompt,
      instructions,
      context: {
        cacheKey: key,
        filePath,
        operation: 'cache_invalidate',
        securityLevel: 'high',
        expectedFormat: 'json',
      },
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate cache invalidation prompt: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Generate prompt for AI-driven cache clearing
 */
export async function clearCache(): Promise<{
  prompt: string;
  instructions: string;
  context: any;
}> {
  try {
    console.error(`[DEBUG] Generating cache clear prompt for directory: ${CACHE_DIR}`);

    const prompt = `
# Cache Clearing Request

Please clear all cache entries for the MCP ADR Analysis Server.

## Cache Clearing Operation

**Cache Directory**: ${CACHE_DIR}

### Required Operations

1. **Directory Listing**:
   - List all files in cache directory: ${CACHE_DIR}
   - Filter for JSON files (*.json)
   - Exclude metadata.json file (preserve cache metadata)

2. **Cache File Deletion**:
   - Delete all cache files except metadata.json
   - Handle file deletion safely with proper error handling
   - Ensure all cache entries are completely removed

3. **Preserve System Files**:
   - Keep metadata.json file intact
   - Do not delete non-cache files
   - Maintain cache directory structure

## Security Validation

The AI agent must:
1. **Validate cache directory**: Ensure ${CACHE_DIR} is the correct cache directory
2. **Prevent system file deletion**: Only delete cache files, preserve metadata.json
3. **Safe bulk deletion**: Handle multiple file deletions safely
4. **Path validation**: Ensure all operations stay within cache directory scope

## Expected Output Format (Successful Clearing)

\`\`\`json
{
  "success": true,
  "cacheDirectory": "${CACHE_DIR}",
  "operations": {
    "filesListed": true,
    "cacheFilesFound": "number_of_cache_files",
    "filesDeleted": "number_of_files_deleted",
    "metadataPreserved": true
  },
  "deletedFiles": [
    "list_of_deleted_cache_files"
  ],
  "preservedFiles": [
    "metadata.json"
  ],
  "security": {
    "directoryValidated": true,
    "systemFilesProtected": true,
    "bulkDeletionSafe": true
  }
}
\`\`\`

## Error Response Format

\`\`\`json
{
  "success": false,
  "cacheDirectory": "${CACHE_DIR}",
  "error": "detailed error message",
  "errorType": "PERMISSION_DENIED|DIRECTORY_NOT_FOUND|SECURITY_VIOLATION|DELETE_ERROR",
  "partialResults": {
    "filesProcessed": "number_of_files_processed",
    "filesDeleted": "number_of_files_successfully_deleted",
    "failedDeletions": ["list_of_files_that_failed_to_delete"]
  },
  "security": {
    "directoryValidated": boolean,
    "systemFilesProtected": boolean,
    "rejectionReason": "specific reason if clearing failed"
  }
}
\`\`\`
`;

    const instructions = `
## Implementation Steps

1. **Security Validation**:
   - Validate cache directory path: ${CACHE_DIR}
   - Ensure directory exists and is accessible
   - Verify this is the correct cache directory

2. **File Discovery**:
   - List all files in cache directory: ${CACHE_DIR}
   - Filter for JSON files (*.json extension)
   - Exclude metadata.json from deletion list

3. **Bulk File Deletion**:
   - Delete each cache file safely
   - Handle deletion errors gracefully
   - Track successful and failed deletions

4. **Response Generation**:
   - Format response according to specified JSON structure
   - Include detailed operation results
   - List all deleted and preserved files

## Safety Checks

- ✅ Cache directory validation delegated to AI agent
- ✅ Metadata file preservation (metadata.json)
- ✅ Safe bulk deletion with error handling
- ✅ System file protection and validation

## Context Information

- **Cache Directory**: ${CACHE_DIR}
- **Operation**: Bulk cache clearing (preserve metadata)
- **Security Level**: High (with directory and file validation)
- **Protected Files**: metadata.json
`;

    return {
      prompt,
      instructions,
      context: {
        cacheDirectory: CACHE_DIR,
        operation: 'cache_clear',
        securityLevel: 'high',
        protectedFiles: ['metadata.json'],
        expectedFormat: 'json',
      },
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate cache clear prompt: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Generate prompt for AI-driven cache statistics collection
 */
export async function getCacheStats(): Promise<{
  prompt: string;
  instructions: string;
  context: any;
}> {
  try {
    console.error(`[DEBUG] Generating cache stats prompt for directory: ${CACHE_DIR}`);

    // First ensure cache is initialized
    const initPrompt = await initializeCache();

    const prompt = `
# Cache Statistics Collection Request

Please collect comprehensive statistics for the MCP ADR Analysis Server cache system.

## Step 1: Cache Initialization
${initPrompt.prompt}

**Instructions**: First, execute the cache initialization above to ensure the cache directory exists.

## Step 2: Cache Statistics Collection

**Cache Directory**: ${CACHE_DIR}

### Required Operations

1. **Directory Analysis**:
   - List all files in cache directory: ${CACHE_DIR}
   - Filter for cache files (*.json, excluding metadata.json)
   - Count total cache entries

2. **File Size Analysis**:
   - Calculate file size for each cache file
   - Sum total cache size in bytes
   - Provide size statistics

3. **Timestamp Analysis**:
   - Read each cache file and extract timestamp
   - Identify oldest cache entry (earliest timestamp)
   - Identify newest cache entry (latest timestamp)
   - Extract cache keys for oldest and newest entries

## Security Validation

The AI agent must:
1. **Validate cache directory**: Ensure ${CACHE_DIR} is the correct cache directory
2. **Safe file reading**: Read cache files safely with proper error handling
3. **JSON validation**: Parse cache entries safely and validate structure
4. **Path validation**: Ensure all operations stay within cache directory scope

## Expected Output Format

\`\`\`json
{
  "success": true,
  "cacheDirectory": "${CACHE_DIR}",
  "statistics": {
    "totalEntries": "number_of_cache_files",
    "totalSize": "total_size_in_bytes",
    "oldestEntry": "cache_key_of_oldest_entry_or_null",
    "newestEntry": "cache_key_of_newest_entry_or_null"
  },
  "details": {
    "cacheFiles": ["list_of_cache_file_names"],
    "oldestTimestamp": "ISO_timestamp_or_null",
    "newestTimestamp": "ISO_timestamp_or_null",
    "averageFileSize": "average_size_in_bytes"
  },
  "operations": {
    "cacheInitialized": boolean,
    "filesListed": true,
    "filesAnalyzed": "number_of_files_analyzed",
    "timestampsProcessed": "number_of_timestamps_processed"
  },
  "security": {
    "directoryValidated": true,
    "filesReadSafely": true,
    "jsonValidated": true
  }
}
\`\`\`

## Error Response Format

\`\`\`json
{
  "success": false,
  "cacheDirectory": "${CACHE_DIR}",
  "error": "detailed error message",
  "errorType": "PERMISSION_DENIED|DIRECTORY_NOT_FOUND|SECURITY_VIOLATION|READ_ERROR|JSON_ERROR",
  "partialResults": {
    "filesProcessed": "number_of_files_processed",
    "partialStatistics": {
      "entriesFound": "number_found_before_error",
      "sizeCalculated": "partial_size_if_available"
    }
  },
  "security": {
    "directoryValidated": boolean,
    "rejectionReason": "specific reason if stats collection failed"
  }
}
\`\`\`
`;

    const instructions = `
## Implementation Steps

1. **Cache Initialization**:
   - Execute cache directory initialization from Step 1
   - Ensure cache directory exists and is accessible

2. **Security Validation**:
   - Validate cache directory path: ${CACHE_DIR}
   - Verify this is the correct cache directory
   - Ensure safe file access permissions

3. **File Discovery and Analysis**:
   - List all files in cache directory
   - Filter for JSON files (exclude metadata.json)
   - Calculate file sizes and count entries

4. **Timestamp Analysis**:
   - Read each cache file safely
   - Parse JSON content and extract timestamps
   - Identify oldest and newest entries by timestamp
   - Extract corresponding cache keys

5. **Statistics Compilation**:
   - Compile comprehensive statistics
   - Calculate totals and averages
   - Format response according to specified JSON structure

## Safety Checks

- ✅ Cache directory validation delegated to AI agent
- ✅ Safe file reading with error handling
- ✅ JSON parsing with validation
- ✅ Comprehensive statistics collection

## Context Information

- **Cache Directory**: ${CACHE_DIR}
- **Operation**: Cache statistics collection
- **Security Level**: High (with directory and file validation)
- **Expected Data**: Entry count, total size, oldest/newest entries
`;

    return {
      prompt,
      instructions,
      context: {
        cacheDirectory: CACHE_DIR,
        operation: 'cache_stats',
        securityLevel: 'high',
        expectedFormat: 'json',
        expectedFields: ['totalEntries', 'totalSize', 'oldestEntry', 'newestEntry'],
      },
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate cache stats prompt: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Generate prompt for AI-driven cache cleanup (remove expired entries)
 */
export async function cleanupCache(): Promise<{
  prompt: string;
  instructions: string;
  context: any;
}> {
  try {
    console.error(`[DEBUG] Generating cache cleanup prompt for directory: ${CACHE_DIR}`);

    // First ensure cache is initialized
    const initPrompt = await initializeCache();
    const currentTime = new Date().toISOString();

    const prompt = `
# Cache Cleanup Request

Please clean up expired cache entries for the MCP ADR Analysis Server.

## Step 1: Cache Initialization
${initPrompt.prompt}

**Instructions**: First, execute the cache initialization above to ensure the cache directory exists.

## Step 2: Cache Cleanup Operation

**Cache Directory**: ${CACHE_DIR}
**Current Time**: ${currentTime}

### Required Operations

1. **File Discovery**:
   - List all files in cache directory: ${CACHE_DIR}
   - Filter for cache files (*.json, excluding metadata.json)
   - Prepare for TTL validation

2. **Expiration Check and Cleanup**:
   - For each cache file:
     - Read file content and parse JSON
     - Extract timestamp and TTL from cache entry
     - Calculate age: current_time - cache_timestamp
     - If age > TTL, mark for deletion
     - If file is corrupted/invalid JSON, mark for deletion

3. **File Deletion**:
   - Delete all expired and corrupted cache files
   - Count number of files cleaned up
   - Handle deletion errors gracefully

4. **Metadata Update**:
   - Update metadata.json with lastCleanup timestamp
   - If metadata.json is corrupted, recreate it
   - Preserve cache system integrity

## Security Validation

The AI agent must:
1. **Validate cache directory**: Ensure ${CACHE_DIR} is the correct cache directory
2. **Safe file operations**: Read and delete files safely with proper error handling
3. **JSON validation**: Parse cache entries safely and handle corruption
4. **Metadata protection**: Update metadata safely, recreate if corrupted

## Expected Output Format

\`\`\`json
{
  "success": true,
  "cacheDirectory": "${CACHE_DIR}",
  "cleanup": {
    "cleanedCount": "number_of_files_cleaned",
    "totalFilesChecked": "number_of_files_checked",
    "expiredFiles": ["list_of_expired_files_deleted"],
    "corruptedFiles": ["list_of_corrupted_files_deleted"]
  },
  "operations": {
    "cacheInitialized": boolean,
    "filesListed": true,
    "ttlValidationPerformed": true,
    "metadataUpdated": true
  },
  "metadata": {
    "lastCleanup": "${currentTime}",
    "metadataRecreated": boolean
  },
  "security": {
    "directoryValidated": true,
    "filesProcessedSafely": true,
    "metadataProtected": true
  }
}
\`\`\`

## Error Response Format

\`\`\`json
{
  "success": false,
  "cacheDirectory": "${CACHE_DIR}",
  "error": "detailed error message",
  "errorType": "PERMISSION_DENIED|DIRECTORY_NOT_FOUND|SECURITY_VIOLATION|CLEANUP_ERROR",
  "partialResults": {
    "filesProcessed": "number_of_files_processed",
    "filesDeleted": "number_of_files_successfully_deleted",
    "failedDeletions": ["list_of_files_that_failed_to_delete"]
  },
  "security": {
    "directoryValidated": boolean,
    "rejectionReason": "specific reason if cleanup failed"
  }
}
\`\`\`
`;

    const instructions = `
## Implementation Steps

1. **Cache Initialization**:
   - Execute cache directory initialization from Step 1
   - Ensure cache directory exists and is accessible

2. **Security Validation**:
   - Validate cache directory path: ${CACHE_DIR}
   - Verify this is the correct cache directory
   - Ensure safe file access permissions

3. **File Discovery and Analysis**:
   - List all files in cache directory
   - Filter for JSON cache files (exclude metadata.json)
   - Prepare for TTL validation

4. **Expiration Processing**:
   - Read each cache file safely
   - Parse JSON and extract timestamp/TTL
   - Calculate age using current time: ${currentTime}
   - Identify expired and corrupted files

5. **Cleanup Operations**:
   - Delete expired cache files
   - Delete corrupted cache files
   - Count successful deletions
   - Handle deletion errors gracefully

6. **Metadata Management**:
   - Update metadata.json with lastCleanup timestamp
   - Recreate metadata if corrupted
   - Ensure cache system integrity

## Safety Checks

- ✅ Cache directory validation delegated to AI agent
- ✅ Safe file reading and deletion with error handling
- ✅ JSON parsing with corruption detection
- ✅ Metadata protection and recovery

## Context Information

- **Cache Directory**: ${CACHE_DIR}
- **Current Time**: ${currentTime}
- **Operation**: Cache cleanup (remove expired entries)
- **Security Level**: High (with directory and file validation)
- **Expected Return**: Number of cleaned files
`;

    return {
      prompt,
      instructions,
      context: {
        cacheDirectory: CACHE_DIR,
        currentTime,
        operation: 'cache_cleanup',
        securityLevel: 'high',
        expectedFormat: 'json',
        expectedReturn: 'cleanedCount',
      },
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate cache cleanup prompt: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}

/**
 * Generate prompt for AI-driven cache-or-generate operation
 * Note: This function now returns prompts for AI delegation instead of executing cache operations directly
 */
export async function getCachedOrGenerate<T>(
  key: string,
  _generator: () => Promise<T>,
  options: CacheOptions = {}
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating cache-or-generate prompt for key: ${key}`);

    // Generate cache retrieval prompt
    const getCachePrompt = await getCache(key);

    const prompt = `
# Cache-or-Generate Operation Request

Please perform a cache-or-generate operation for the MCP ADR Analysis Server.

## Cache-or-Generate Workflow

**Cache Key**: ${key}
**TTL**: ${options.ttl || 3600} seconds
**Compression**: ${options.compression || false}

### Step 1: Cache Retrieval Attempt

${getCachePrompt.prompt}

### Step 2: Data Generation (if cache miss)

If the cache retrieval in Step 1 results in a cache miss (cacheHit: false), then:

1. **Execute Data Generator**:
   - Call the provided data generator function
   - Generate fresh data for cache key: ${key}
   - Ensure data generation completes successfully

2. **Cache Storage**:
   - Store the generated data in cache using key: ${key}
   - Apply TTL: ${options.ttl || 3600} seconds
   - Apply compression: ${options.compression || false}
   - Follow cache storage security protocols

### Step 3: Return Data

Return the data from either:
- Cache retrieval (if cache hit)
- Fresh generation and storage (if cache miss)

## Security Validation

The AI agent must:
1. **Cache security**: Follow all cache operation security protocols
2. **Data validation**: Ensure generated data is valid and safe to cache
3. **Generator safety**: Execute data generator safely with proper error handling
4. **Storage validation**: Validate data before caching

## Expected Output Format (Cache Hit)

\`\`\`json
{
  "success": true,
  "cacheKey": "${key}",
  "operation": "cache_hit",
  "data": "[retrieved cache data]",
  "cacheInfo": {
    "cacheHit": true,
    "dataSource": "cache",
    "timestamp": "cache_entry_timestamp",
    "ttl": "cache_entry_ttl"
  },
  "security": {
    "cacheSecurityValidated": true,
    "dataValidated": true
  }
}
\`\`\`

## Expected Output Format (Cache Miss + Generation)

\`\`\`json
{
  "success": true,
  "cacheKey": "${key}",
  "operation": "cache_miss_generated",
  "data": "[generated and cached data]",
  "cacheInfo": {
    "cacheHit": false,
    "dataSource": "generated",
    "generatedAt": "ISO_timestamp",
    "cachedAt": "ISO_timestamp",
    "ttl": ${options.ttl || 3600}
  },
  "operations": {
    "cacheChecked": true,
    "dataGenerated": true,
    "dataCached": true
  },
  "security": {
    "cacheSecurityValidated": true,
    "generatorExecutedSafely": true,
    "dataValidated": true,
    "storageValidated": true
  }
}
\`\`\`

## Error Response Format

\`\`\`json
{
  "success": false,
  "cacheKey": "${key}",
  "error": "detailed error message",
  "errorType": "CACHE_ERROR|GENERATION_ERROR|STORAGE_ERROR|SECURITY_VIOLATION",
  "failedOperation": "cache_retrieval|data_generation|cache_storage",
  "security": {
    "cacheSecurityValidated": boolean,
    "rejectionReason": "specific reason if operation failed"
  }
}
\`\`\`
`;

    const instructions = `
## Implementation Steps

1. **Cache Retrieval**:
   - Execute cache retrieval operation from Step 1
   - Check if cache hit or miss
   - If cache hit, return cached data

2. **Data Generation** (if cache miss):
   - Execute the data generator function safely
   - Handle generation errors gracefully
   - Validate generated data

3. **Cache Storage** (if data generated):
   - Store generated data in cache
   - Apply specified TTL and compression options
   - Validate storage operation

4. **Response Generation**:
   - Format response according to specified JSON structure
   - Include data source information (cache vs generated)
   - Provide comprehensive operation details

## Safety Checks

- ✅ Cache operation security delegated to AI agent
- ✅ Data generator execution with error handling
- ✅ Generated data validation before caching
- ✅ Comprehensive operation tracking

## Context Information

- **Cache Key**: ${key}
- **TTL**: ${options.ttl || 3600} seconds
- **Compression**: ${options.compression || false}
- **Operation**: Cache-or-generate with automatic management
- **Security Level**: High (with cache and generation validation)

## Important Notes

This operation combines cache retrieval and data generation. The AI agent should:
1. Always try cache first
2. Only generate data if cache miss
3. Always cache generated data
4. Return data from appropriate source
`;

    return {
      prompt,
      instructions,
      context: {
        cacheKey: key,
        ttl: options.ttl || 3600,
        compression: options.compression || false,
        operation: 'cache_or_generate',
        securityLevel: 'high',
        expectedFormat: 'json',
      },
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate cache-or-generate prompt: ${error instanceof Error ? error.message : String(error)}`,
      'CACHE_ERROR'
    );
  }
}
