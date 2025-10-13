---
title: Tutorials
description: Learning-oriented guides for newcomers
---

# Tutorials

Learning-oriented guides for newcomers

## Available Guides

This section contains tutorials documentation following the Diataxis framework.

**Tutorials** are learning-oriented and help newcomers get started:

- Take the reader through a process step by step
- Focus on learning by doing
- Ensure the reader succeeds in accomplishing something
- Build confidence through success

## 🔍 Research-Driven Architecture

All tutorials now feature **research-driven workflows** that query your live environment instead of relying on static analysis alone:

- **Cascading Source Hierarchy**: Project Files → Knowledge Graph → Environment Resources → Web Search
- **Confidence Scoring**: Every result includes a 0-1 confidence score
- **Live Infrastructure Detection**: Automatically discovers Docker, Kubernetes, OpenShift, Podman, Ansible
- **Red Hat Ecosystem Support**: First-class support for OpenShift (`oc`), Podman, and Ansible
- **ADR Validation**: Check if documented decisions match actual implementation

## 🧠 Context File - Your Project's Memory

Every tutorial teaches you to use **`.mcp-server-context.md`** - the auto-generated file that tracks your progress, patterns, and decisions:

- 💡 **In Tutorial 1**: Learn to track your progress with `@.mcp-server-context.md`
- 🔄 **In Tutorial 2**: Resume work seamlessly by reviewing past analysis
- 🎯 **In Tutorial 3**: Master advanced decision-making with pattern analysis

Just use `@.mcp-server-context.md` in your AI assistant to access your project's living memory!

### Key Research-Driven Tools

- **`perform_research`**: Ask questions about your project and get confidence-scored answers
- **`validate_adr`**: Validate a single ADR against live infrastructure
- **`validate_all_adrs`**: Batch validate all ADRs with environment checks
- **`analyze_deployment_progress`**: Research-enhanced deployment readiness analysis
- **`generate_deployment_guidance`**: Infrastructure-aware deployment recommendations

## Contents

### Getting Started

- [Tutorial 1: Your First MCP Analysis](./01-first-steps.md) - Learn MCP basics and create your first ADR with research-driven workflows
- [Tutorial 2: Working with Existing Projects](./02-existing-projects.md) - Analyze existing codebases with live infrastructure validation
- [Tutorial 3: Advanced Analysis Techniques](./03-advanced-analysis.md) - Security scanning, deployment readiness, and performance analysis

### Specialized Workflows

- [Security-Focused Workflow](./security-focused-workflow.md) - Security analysis and content masking
- [Team Collaboration](./team-collaboration.md) - Collaborative ADR processes

### Example ADRs

- [001: Database Architecture](./001-database-architecture.md)
- [002: API Gateway Strategy](./002-api-gateway-strategy.md)
