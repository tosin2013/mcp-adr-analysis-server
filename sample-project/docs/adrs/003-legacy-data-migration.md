# ADR-003: Legacy Data Migration Strategy

## Status
Deprecated

## Context
We initially planned to migrate legacy data using a batch processing approach, but discovered performance and consistency issues.

## Decision
~~Use nightly batch jobs to migrate legacy data incrementally over 6 months.~~

**SUPERSEDED BY**: Real-time streaming migration (ADR-004)

## Consequences
This approach was abandoned due to:
- Data consistency issues during batch windows
- Performance impact on production systems
- Complex rollback scenarios

## Lessons Learned
- [ ] Document migration performance benchmarks
- [ ] Create data validation frameworks
- [ ] Establish rollback procedures for future migrations 