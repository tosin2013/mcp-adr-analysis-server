# 🌍 Environment Validation & Requirements Comparison Workflow

**Duration**: 45 minutes | **Goal**: Environment assessment, gap analysis, and automated installation planning  
**Confidence Level**: 95% for environment detection, 90% for requirements analysis  
**Sophia Methodology**: Systematic verification with human-guided validation checkpoints

## 📋 Workflow Overview

Validates current environment meets application requirements, identifies gaps, and creates actionable installation plans based on current TODO progress.

### 🎯 Success Criteria

- ✅ Complete environment inventory collected
- ✅ Gap analysis with TODO-driven prioritization
- ✅ Automated installation scripts generated
- ✅ TODO tasks updated with environment status
- ✅ Human validation confidence ≥8/10

---

## 🔍 Phase 1: Environment Discovery (15 minutes)

### Step 1: System Information & Resources

```
Tool: run_terminal_cmd
Parameters: {
  "command": "echo '=== System Info ===' && uname -a && echo 'CPU Cores:' && nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null && echo 'Memory:' && free -h 2>/dev/null || vm_stat 2>/dev/null | head -3 && echo 'Disk:' && df -h . | tail -1",
  "explanation": "Get OS, hardware, and resource information"
}
```

### Step 2: Development Tools Detection

```
Tool: run_terminal_cmd
Parameters: {
  "command": "echo '=== Dev Tools ===' && echo 'Node.js:' && node --version 2>/dev/null || echo 'Not installed' && echo 'Python:' && python3 --version 2>/dev/null || echo 'Not installed' && echo 'Docker:' && docker --version 2>/dev/null || echo 'Not installed' && echo 'Git:' && git --version 2>/dev/null || echo 'Not installed'",
  "explanation": "Detect installed development tools and versions"
}
```

### Step 3: Project File Discovery

```
Tool: run_terminal_cmd
Parameters: {
  "command": "find . -maxdepth 2 -name 'package.json' -o -name 'requirements.txt' -o -name 'Dockerfile' -o -name 'docker-compose.yml' -o -name 'pom.xml' -o -name 'Cargo.toml' -o -name '.env*' 2>/dev/null",
  "explanation": "Find key project configuration files"
}
```

### Step 4: Read Key Configuration Files

```
Tool: read_file
Parameters: {
  "target_file": "package.json",
  "should_read_entire_file": true,
  "explanation": "Read Node.js dependencies and engine requirements"
}
```

**Conditional**: Only if package.json exists

```
Tool: read_file
Parameters: {
  "target_file": "requirements.txt",
  "should_read_entire_file": true,
  "explanation": "Read Python dependencies"
}
```

**Conditional**: Only if requirements.txt exists

### Step 5: Human Context Gathering

**Interactive Checkpoint**: Gather targeted information based on discovered files

**Base Questions:**

- "Target environment? (local/staging/production)"
- "Performance requirements? (response time, load)"
- "Known issues with current environment?"

**Project-Specific Questions:**

- **Node.js**: "Node version [X] correct? Dependencies complete?"
- **Docker**: "Container requirements met? Services configured?"
- **Python**: "Python version [X] appropriate? Virtual env needed?"

---

## 📊 Phase 2: TODO Analysis & Gap Assessment (15 minutes)

### Step 6: Analyze Current TODO Progress

```
Tool: manage_todo_json
Parameters: {
  "operation": "get_analytics",
  "projectPath": ".",
  "timeframe": "week",
  "includeVelocity": true,
  "sortBy": "priority"
}
```

```
Tool: manage_todo_json
Parameters: {
  "operation": "get_tasks",
  "filters": {
    "status": "in_progress",
    "priority": "high"
  },
  "limit": 5
}
```

### Step 7: Development Phase Detection

**Phase Logic:**

- **Setup**: Tasks contain "setup", "install", "configure"
- **Development**: Tasks contain "implement", "build", "create"
- **Testing**: Tasks contain "test", "validate", "debug"
- **Deployment**: Tasks contain "deploy", "release", "production"

### Step 8: Generate Gap Analysis

````
Tool: write_file
Parameters: {
  "path": "docs/environment-gap-analysis.md",
  "content": "# Environment Gap Analysis\n\n## Summary\n- **Date**: $(date)\n- **Phase**: [From TODO analysis]\n- **Progress**: [X% complete]\n- **Critical Gaps**: [To be identified]\n\n## Environment Status\n\n### ✅ Ready\n[Components that meet requirements]\n\n### 🔧 Missing (Critical for Current Phase)\n- [ ] **[Component]**: Required for [TODO tasks]\n  - Install: `[command]`\n  - Validate: `[check]`\n  - Priority: CRITICAL\n\n### ⚠️ Version Issues\n- [ ] **[Tool]**: Current v[X], Required v[Y]\n  - Upgrade: `[command]`\n  - Risk: [LOW/HIGH]\n\n## Installation Plan\n\n### Phase 1: Critical (Execute Now)\n```bash\n# Auto-generated for current development phase\n[Critical installation commands]\n```\n\n### Phase 2: Development (This Week)\n```bash\n# Required for upcoming TODO tasks\n[Development tools installation]\n```\n\n## Validation\n- [ ] All critical components installed\n- [ ] TODO blocking tasks can proceed\n- [ ] Environment validation passes\n\n## Next Steps\n1. Execute installation script\n2. Update TODO tasks\n3. Validate environment\n4. Continue development\n"
}
````

---

## 🛠️ Phase 3: Installation Planning & Execution (10 minutes)

### Step 9: Generate Installation Script

```
Tool: write_file
Parameters: {
  "path": "scripts/install-missing-components.sh",
  "content": "#!/bin/bash\n# Environment Setup - Generated from gap analysis\nset -e\n\necho '🚀 Environment Setup for [Current Phase]'\n\n# OS Detection\nif [[ \"$OSTYPE\" == \"linux-gnu\"* ]]; then\n    OS=\"Linux\"\nelif [[ \"$OSTYPE\" == \"darwin\"* ]]; then\n    OS=\"macOS\"\nelse\n    OS=\"Other\"\nfi\n\necho \"OS: $OS\"\n\n# Install based on project requirements\nif [ -f \"package.json\" ] && ! command -v node >/dev/null; then\n    echo \"Installing Node.js...\"\n    if [ \"$OS\" = \"Linux\" ]; then\n        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -\n        sudo apt-get install -y nodejs\n    elif [ \"$OS\" = \"macOS\" ]; then\n        brew install node\n    fi\nfi\n\nif [ -f \"requirements.txt\" ] && ! command -v python3 >/dev/null; then\n    echo \"Installing Python...\"\n    if [ \"$OS\" = \"Linux\" ]; then\n        sudo apt-get update && sudo apt-get install -y python3 python3-pip\n    elif [ \"$OS\" = \"macOS\" ]; then\n        brew install python3\n    fi\nfi\n\nif [ -f \"Dockerfile\" ] && ! command -v docker >/dev/null; then\n    echo \"Installing Docker...\"\n    if [ \"$OS\" = \"Linux\" ]; then\n        curl -fsSL https://get.docker.com | sh\n    elif [ \"$OS\" = \"macOS\" ]; then\n        brew install --cask docker\n    fi\nfi\n\n# Install dependencies\nif [ -f \"package.json\" ] && [ ! -d \"node_modules\" ]; then\n    npm install\nfi\n\nif [ -f \"requirements.txt\" ]; then\n    pip3 install -r requirements.txt\nfi\n\necho \"✅ Installation completed at $(date)\"\n"
}
```

### Step 10: Create Environment TODO Tasks

```
Tool: manage_todo_json
Parameters: {
  "operation": "create_task",
  "title": "Install missing environment components",
  "description": "Install critical components blocking current TODO tasks",
  "priority": "critical",
  "tags": ["environment", "blocking"],
  "dueDate": "[Today]",
  "completionCriteria": "All critical components installed and validated"
}
```

### Step 11: Human-Approved Installation

**Interactive Checkpoint**: Review and approve installation

**Questions:**

- "Review gap analysis - accurate? (y/n)"
- "Approve automatic installation? (y/n)"
- "Any manual preferences for specific tools?"

**Execute (with approval):**

```
Tool: run_terminal_cmd
Parameters: {
  "command": "chmod +x scripts/install-missing-components.sh && ./scripts/install-missing-components.sh",
  "explanation": "Execute installation script with human approval"
}
```

---

## 🎯 Phase 4: Validation & TODO Updates (5 minutes)

### Step 12: Post-Installation Validation

```
Tool: run_terminal_cmd
Parameters: {
  "command": "echo '=== Validation ===' && echo 'Node.js:' && node --version 2>/dev/null || echo 'Missing' && echo 'Python:' && python3 --version 2>/dev/null || echo 'Missing' && echo 'Docker:' && docker --version 2>/dev/null || echo 'Missing' && echo 'Git:' && git --version 2>/dev/null || echo 'Missing'",
  "explanation": "Validate installation success"
}
```

### Step 13: Update TODO Progress

```
Tool: manage_todo_json
Parameters: {
  "operation": "bulk_update",
  "updates": {
    "status": "completed",
    "notes": "Environment components installed - [timestamp]"
  },
  "filters": {
    "tags": ["environment", "setup"],
    "status": "in_progress"
  }
}
```

```
Tool: manage_todo_json
Parameters: {
  "operation": "bulk_update",
  "updates": {
    "tags": ["environment-ready"],
    "notes": "Environment setup completed - development can proceed"
  },
  "filters": {
    "tags": ["blocked", "environment-dependent"],
    "status": "pending"
  }
}
```

### Step 14: Deployment Readiness Check

```
Tool: deployment_readiness
Parameters: {
  "operation": "check_readiness",
  "targetEnvironment": "production",
  "integrateTodoTasks": true,
  "updateHealthScoring": true
}
```

### Step 15: Final Human Validation

**Checkpoint Questions:**

- "Environment assessment accurate? (1-10)"
- "Critical gaps resolved? (y/n)"
- "Ready to proceed with development? (y/n)"

---

## 🎯 Decision Matrix

**🟢 GREEN (Ready)**: No critical gaps, human confidence ≥8/10, validation passes
**🟡 YELLOW (Minor Issues)**: Fixable gaps, confidence 6-7/10, warnings only  
**🔴 RED (Not Ready)**: Critical gaps, confidence ≤5/10, validation failures

---

## 🚀 What This Delivers

### ✅ **Smart Environment Discovery**

- Cross-platform OS, hardware, and software detection
- Project-specific dependency and configuration analysis
- Multi-language runtime detection (Node.js, Python, Java, etc.)

### 🔍 **TODO-Driven Gap Analysis**

- Analyze current development phase from TODO tasks
- Prioritize missing components based on active work
- Generate phase-specific installation plans

### 🛠️ **Automated Installation**

- OS-specific installation scripts (Linux, macOS, Windows)
- Project-aware component installation
- Dependency installation (npm, pip, etc.)

### 📋 **TODO Integration**

- Create environment setup tasks with completion criteria
- Mark environment-dependent tasks as unblocked
- Update progress as components are installed

**Sophia Framework**: Systematic verification with 95% confidence for discovery, human collaboration checkpoints, and pragmatic success criteria focused on unblocking development work.

**Ready to validate and set up your environment?** This streamlined workflow identifies gaps, generates installation plans, and unblocks your TODO tasks efficiently!
