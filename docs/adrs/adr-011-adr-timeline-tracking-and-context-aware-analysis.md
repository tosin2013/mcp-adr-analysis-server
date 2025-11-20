# ADR-011: ADR Timeline Tracking and Context-Aware Analysis

## Status
Accepted

## Date
2025-11-19

## Context

As our ADR analysis server matured, we identified several limitations in how we track and analyze architectural decisions:

1. **No Temporal Awareness**: The system couldn't track when decisions were made or how long they've been in various states
2. **Missing Staleness Detection**: No way to identify outdated or neglected ADRs that need attention
3. **Context-Agnostic Thresholds**: Same staleness thresholds applied to all projects (startup vs. enterprise)
4. **Manual Action Planning**: Users had to manually identify which ADRs need updates or implementation
5. **Performance Concerns**: Extracting timeline data could be expensive without smart caching

## Decision

We implemented a comprehensive ADR Timeline Tracking system with the following components:

### 1. Timeline Extraction (src/utils/adr-timeline-extractor.ts)

**Multi-Source Timeline Extraction**:
- **Git History** (preferred): Extract creation/update dates from git log
- **Content Parsing** (fallback): Parse date fields from ADR content
- **Filesystem** (last resort): Use file modification times

**Smart Conditional Logic**:
- Only extract when necessary (no timestamp in content, file modified, cache miss)
- In-memory caching to avoid repeated expensive operations
- Configurable force-extract option for manual overrides

**Timeline Data Structure**:
```typescript
interface BasicTimeline {
  created_at: string;        // ISO timestamp
  updated_at: string;        // ISO timestamp
  age_days: number;          // Days since creation
  days_since_update: number; // Days since last modification
  staleness_warnings: string[]; // Generated warnings
  extraction_method: 'git' | 'content' | 'filesystem';
}
```

### 2. Project Context Detection (src/utils/adr-context-detector.ts)

**Automatic Project Phase Detection**:
- **Startup**: High commit rate (>50/week), frequent ADRs (>3/month)
- **Growth**: Moderate commits (20-50/week), regular ADRs (>1/month)
- **Mature**: Stable commits (5-20/week), occasional ADRs
- **Maintenance**: Low commits (<5/week), rare ADRs (<0.5/month)

**Adaptive Threshold Profiles**:
```typescript
THRESHOLD_PROFILES = {
  startup: {
    staleProposedDays: 14,      // 2 weeks max
    acceptedUnimplementedDays: 21,
    outdatedAdrDays: 60,
    rapidChangeDays: 3
  },
  growth: {
    staleProposedDays: 30,      // 1 sprint cycle
    acceptedUnimplementedDays: 45,
    outdatedAdrDays: 90,
    rapidChangeDays: 7
  },
  mature: {
    staleProposedDays: 90,      // 1 quarter
    acceptedUnimplementedDays: 90,
    outdatedAdrDays: 180,
    rapidChangeDays: 14
  },
  maintenance: {
    staleProposedDays: 180,     // 6 months
    acceptedUnimplementedDays: 180,
    outdatedAdrDays: 365,
    rapidChangeDays: 30
  }
}
```

**ADR Type Modifiers**:
- Infrastructure ADRs: 1.5x longer timelines (complex deployments)
- Security ADRs: 0.8x shorter timelines (urgent)
- Refactoring ADRs: 1.2x longer timelines (low priority)
- Feature ADRs: 1.0x baseline

### 3. Action Item Analyzer (src/utils/adr-action-analyzer.ts)

**Automated Action Generation**:
- Analyzes all ADRs with timeline data
- Generates prioritized action items based on:
  - ADR status (proposed, accepted, deprecated)
  - Age and staleness
  - Implementation status
  - Project context and thresholds

**Action Urgency Levels**:
- **Critical** (P0): Blocking issues, security risks
- **High** (P1): Stale proposed ADRs, long-unimplemented decisions
- **Medium** (P2): Outdated ADRs needing review
- **Low** (P3): Minor updates, documentation improvements

**Work Queue Structure**:
```typescript
interface AdrWorkQueue {
  summary: {
    totalActions: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  actions: ActionItem[];  // Sorted by urgency
  recommendations: string[];
}
```

### 4. Integration

**Enhanced ADR Discovery**:
- `discoverAdrsInDirectory()` now accepts `includeTimeline` option
- Timeline data automatically attached to each discovered ADR
- Optional action generation with `generateActions` flag

**New MCP Tool** (src/index.ts:6800-6950):
- `analyze_adr_timeline`: Comprehensive timeline analysis with action items
- Parameters:
  - `adrDirectory`: Directory to analyze
  - `generateActions`: Enable action item generation
  - `thresholdProfile`: Manual profile override
  - `autoDetectContext`: Auto-select profile (default: true)

### 5. Cache Implementation Decision

**Problem**: The existing `cache.ts` is designed for **prompt-driven AI operations** (returns prompts for AI to execute), but timeline extraction needs **synchronous in-memory caching** for performance.

**Solution**: Implemented a simple in-memory cache directly in `adr-timeline-extractor.ts`:
- `Map<string, CacheEntry>` for O(1) lookup
- TTL-based expiration
- Automatic cleanup on retrieval
- No external dependencies

**Why Not Use cache.ts**:
- cache.ts returns `{ prompt, instructions, context }` for AI delegation
- Timeline extractor needs immediate, synchronous cache access
- In-memory cache is simpler and more appropriate for this use case

## Consequences

### Positive

1. **Temporal Awareness**: System now understands ADR lifecycles and aging
2. **Automated Action Planning**: Generates prioritized todo lists automatically
3. **Context-Aware Analysis**: Thresholds adapt to project phase and velocity
4. **Smart Performance**: Conditional extraction minimizes expensive operations
5. **Type Safety**: ADR type modifiers provide realistic timelines
6. **Better User Experience**: Users get actionable insights, not just data

### Negative

1. **Increased Complexity**: More code to maintain (4 new utility files)
2. **Git Dependency**: Git extraction requires git to be available
3. **Cache Divergence**: Two cache systems (prompt-driven and in-memory)
4. **Context Detection Accuracy**: Auto-detection may misclassify edge-case projects

### Neutral

1. **Breaking Change**: `discoverAdrsInDirectory()` signature changed from 3 params to 2 params + options object
2. **Memory Usage**: In-memory cache adds modest memory overhead
3. **Learning Curve**: Users need to understand threshold profiles

## Implementation Notes

### Files Created
- `src/utils/adr-timeline-extractor.ts` - Multi-source timeline extraction
- `src/utils/adr-context-detector.ts` - Project context detection
- `src/utils/adr-action-analyzer.ts` - Action item generation
- `src/utils/adr-timeline-types.ts` - Shared type definitions

### Files Modified
- `src/utils/adr-discovery.ts` - Added timeline integration
- `src/index.ts` - Added `analyze_adr_timeline` MCP tool
- 20+ files - Updated `discoverAdrsInDirectory()` call sites

### Testing
- Manual verification: Timeline extraction working correctly
- Git extraction: Successfully extracts from git history
- Fallback chain: Content → filesystem fallback working
- Cache: In-memory cache functioning as expected

## Future Enhancements

1. **Persistent Cache**: Move timeline cache to disk for cross-session persistence
2. **ML-Based Context Detection**: Use machine learning to improve phase detection
3. **Custom Thresholds**: Allow users to define custom threshold profiles
4. **Timeline Visualization**: Generate charts showing ADR lifecycle trends
5. **Notification Integration**: Alert users when ADRs become stale
6. **ADR Dependencies**: Track dependencies between ADRs in timeline

## Related ADRs

- ADR-003: Memory-Centric Architecture (cache system design)
- ADR-001: MCP Protocol Implementation (tool integration)

## References

- Git log extraction: `git log --follow --format="%ai" --diff-filter=A -- <file>`
- Context detection metrics: Commit frequency, ADR creation rate, team velocity
- Urgency scoring: Based on ADR status, age, and project context
