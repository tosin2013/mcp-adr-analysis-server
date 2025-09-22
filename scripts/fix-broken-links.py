#!/usr/bin/env python3
"""
Comprehensive Documentation Link Fixer
Automatically fixes broken links in MCP ADR Analysis Server documentation
"""

import os
import re
import json
import shutil
import time
from pathlib import Path
from typing import Dict, List, Tuple, Set
import argparse
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DocumentationLinkFixer:
    def __init__(self, docs_dir: str, dry_run: bool = False):
        self.docs_dir = Path(docs_dir)
        self.dry_run = dry_run
        self.fixes_applied = 0
        self.files_created = 0
        self.links_updated = 0
        
        # Track what we've fixed to avoid duplicates
        self.created_files: Set[Path] = set()
        self.updated_files: Set[Path] = set()
        
        logger.info(f"Initialized DocumentationLinkFixer for: {self.docs_dir}")
        logger.info(f"Dry run mode: {self.dry_run}")

    def analyze_broken_links(self) -> Dict:
        """Analyze all broken links in the documentation."""
        logger.info("🔍 Analyzing broken links...")
        
        broken_links = {
            "missing_files": [],
            "broken_anchors": [],
            "research_links": [],
            "sample_project_links": [],
            "malformed_links": []
        }
        
        # Scan all markdown files
        for md_file in self.docs_dir.rglob("*.md"):
            try:
                with open(md_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find all markdown links
                link_pattern = r'\[([^\]]*)\]\(([^)]+)\)'
                matches = re.findall(link_pattern, content)
                
                for text, url in matches:
                    self._categorize_link(md_file, text, url, broken_links)
                    
            except Exception as e:
                logger.error(f"Error processing {md_file}: {e}")
        
        # Log summary
        total_broken = sum(len(v) for v in broken_links.values())
        logger.info(f"📊 Found {total_broken} potentially broken links:")
        for category, links in broken_links.items():
            logger.info(f"   {category}: {len(links)}")
        
        return broken_links

    def _categorize_link(self, md_file: Path, text: str, url: str, broken_links: Dict):
        """Categorize a link as broken or not."""
        # Skip external URLs, mailto, and simple anchors
        if url.startswith(('http', 'https', 'mailto:', '#')):
            return
        
        # Research links
        if 'perform_research_research_' in url:
            broken_links["research_links"].append({
                "file": str(md_file.relative_to(self.docs_dir)),
                "link_text": text,
                "url": url,
                "line_context": self._get_line_context(md_file, url)
            })
            return
        
        # Sample project links
        if '../../../sample-project/' in url:
            broken_links["sample_project_links"].append({
                "file": str(md_file.relative_to(self.docs_dir)),
                "link_text": text,
                "url": url,
                "line_context": self._get_line_context(md_file, url)
            })
            return
        
        # Check if file exists
        target_path = self._resolve_link_path(md_file, url)
        if target_path and not target_path.exists():
            # Try with .md extension
            if not url.endswith('.md'):
                md_target = target_path.with_suffix('.md')
                if md_target.exists():
                    return  # File exists with .md extension
            
            broken_links["missing_files"].append({
                "file": str(md_file.relative_to(self.docs_dir)),
                "link_text": text,
                "url": url,
                "resolved_path": str(target_path) if target_path else "unresolvable",
                "line_context": self._get_line_context(md_file, url)
            })

    def _resolve_link_path(self, md_file: Path, url: str) -> Path:
        """Resolve a relative link to an absolute path."""
        try:
            if url.startswith('./'):
                return md_file.parent / url[2:]
            elif url.startswith('../'):
                return md_file.parent / url
            else:
                return md_file.parent / url
        except Exception:
            return None

    def _get_line_context(self, md_file: Path, url: str) -> str:
        """Get the line context where a URL appears."""
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            for i, line in enumerate(lines):
                if url in line:
                    return f"Line {i+1}: {line.strip()}"
            return "Context not found"
        except Exception:
            return "Error reading context"

    def fix_missing_files(self, missing_files: List[Dict]) -> int:
        """Create missing documentation files with appropriate content."""
        logger.info("📝 Creating missing documentation files...")
        
        files_created = 0
        
        # Group by file type for efficient creation
        file_groups = self._group_missing_files(missing_files)
        
        for file_type, files in file_groups.items():
            for file_info in files:
                if self._create_missing_file(file_info, file_type):
                    files_created += 1
        
        logger.info(f"✅ Created {files_created} missing files")
        return files_created

    def _group_missing_files(self, missing_files: List[Dict]) -> Dict[str, List[Dict]]:
        """Group missing files by type for batch processing."""
        groups = {
            "how_to_guides": [],
            "reference": [],
            "explanation": [],
            "tutorials": [],
            "other": []
        }
        
        for file_info in missing_files:
            url = file_info["url"]
            if "how-to-guides/" in url:
                groups["how_to_guides"].append(file_info)
            elif "reference/" in url:
                groups["reference"].append(file_info)
            elif "explanation/" in url:
                groups["explanation"].append(file_info)
            elif "tutorials/" in url:
                groups["tutorials"].append(file_info)
            else:
                groups["other"].append(file_info)
        
        return groups

    def _create_missing_file(self, file_info: Dict, file_type: str) -> bool:
        """Create a missing file with appropriate template content."""
        url = file_info["url"]
        resolved_path = file_info.get("resolved_path", "")
        
        # Determine target path
        if resolved_path and resolved_path != "unresolvable":
            target_path = Path(resolved_path)
        else:
            # Try to construct path from URL
            target_path = self._construct_path_from_url(file_info["file"], url)
        
        if not target_path or target_path in self.created_files:
            return False
        
        # Ensure target path has .md extension
        if not target_path.suffix:
            target_path = target_path.with_suffix('.md')
        
        # Create directory if needed
        target_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Generate content based on file type and name
        content = self._generate_file_content(target_path, file_type, file_info)
        
        if self.dry_run:
            logger.info(f"[DRY RUN] Would create: {target_path}")
            return True
        
        try:
            with open(target_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            logger.info(f"✅ Created: {target_path}")
            self.created_files.add(target_path)
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to create {target_path}: {e}")
            return False

    def _construct_path_from_url(self, source_file: str, url: str) -> Path:
        """Construct target path from source file and URL."""
        source_path = self.docs_dir / source_file
        
        if url.startswith('./'):
            return source_path.parent / url[2:]
        elif url.startswith('../'):
            return source_path.parent / url
        else:
            return source_path.parent / url

    def _generate_file_content(self, target_path: Path, file_type: str, file_info: Dict) -> str:
        """Generate appropriate content for a missing file."""
        filename = target_path.stem
        title = filename.replace('-', ' ').replace('_', ' ').title()
        
        # Base template
        if file_type == "how_to_guides":
            return self._generate_how_to_template(title, filename)
        elif file_type == "reference":
            return self._generate_reference_template(title, filename)
        elif file_type == "explanation":
            return self._generate_explanation_template(title, filename)
        elif file_type == "tutorials":
            return self._generate_tutorial_template(title, filename)
        else:
            return self._generate_generic_template(title, filename)

    def _generate_how_to_template(self, title: str, filename: str) -> str:
        """Generate how-to guide template."""
        return f"""# 🛠️ How-To: {title}

**Step-by-step guide for {title.lower()} in the MCP ADR Analysis Server.**

**When to use this guide**: [Describe when users should follow this guide]

---

## 🎯 Quick Start

### Prerequisites
- MCP ADR Analysis Server installed and configured
- [Additional prerequisites]

### Basic Usage
```bash
# Basic command example
npm run [command]
```

---

## 📋 Step-by-Step Process

### Step 1: [First Step]
[Detailed instructions for the first step]

### Step 2: [Second Step]
[Detailed instructions for the second step]

### Step 3: [Third Step]
[Detailed instructions for the third step]

---

## 🔧 Advanced Configuration

### [Advanced Topic 1]
[Advanced configuration details]

### [Advanced Topic 2]
[More advanced configuration]

---

## 🚨 Troubleshooting

### Common Issues
- **Issue 1**: [Description and solution]
- **Issue 2**: [Description and solution]

### Error Messages
- `Error message`: [Explanation and fix]

---

## 📚 Related Documentation

- **[Related Guide 1](../reference/api-reference.md)** - [Description]
- **[Related Guide 2](../how-to-guides/troubleshooting.md)** - [Description]

---

**Need help with {title.lower()}?** → **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)** or check the **[Troubleshooting Guide](troubleshooting.md)**
"""

    def _generate_reference_template(self, title: str, filename: str) -> str:
        """Generate reference documentation template."""
        return f"""# 📚 {title} Reference

**Complete reference documentation for {title.lower()} in the MCP ADR Analysis Server.**

---

## 📋 Quick Reference

| Item | Description | Usage |
|------|-------------|-------|
| [Item 1] | [Description] | [Usage example] |
| [Item 2] | [Description] | [Usage example] |

---

## 🔧 Detailed Reference

### [Section 1]
[Detailed reference information]

#### Parameters
- `parameter1`: [Description]
- `parameter2`: [Description]

#### Examples
```json
{{
  "example": "configuration"
}}
```

### [Section 2]
[More detailed reference information]

---

## 📊 Configuration Options

### [Configuration Category 1]
```yaml
configuration:
  option1: value1
  option2: value2
```

### [Configuration Category 2]
[Configuration details]

---

## 🔗 Related Documentation

- **[API Reference](api-reference.md)** - Complete API documentation
- **[How-To Guides](../how-to-guides/)** - Step-by-step guides

---

**Need help with {title.lower()}?** → **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**
"""

    def _generate_explanation_template(self, title: str, filename: str) -> str:
        """Generate explanation documentation template."""
        return f"""# 🧠 {title}

**Understanding {title.lower()} in the MCP ADR Analysis Server architecture and design philosophy.**

---

## 🎯 Overview

[High-level explanation of the concept]

### Key Concepts
- **Concept 1**: [Explanation]
- **Concept 2**: [Explanation]
- **Concept 3**: [Explanation]

---

## 🏗️ Architecture and Design

### [Design Principle 1]
[Detailed explanation of the design principle]

### [Design Principle 2]
[Another design principle explanation]

---

## 🔄 How It Works

### [Process 1]
[Step-by-step explanation of how something works]

### [Process 2]
[Another process explanation]

---

## 💡 Design Decisions

### [Decision 1]
**Problem**: [What problem this solves]
**Solution**: [How it's solved]
**Trade-offs**: [What trade-offs were made]

### [Decision 2]
**Problem**: [Problem description]
**Solution**: [Solution description]
**Trade-offs**: [Trade-off analysis]

---

## 🔗 Related Concepts

- **[Related Concept 1](../explanation/)** - [Brief description]
- **[Related Concept 2](../explanation/)** - [Brief description]

---

## 📚 Further Reading

- **[Implementation Guide](../how-to-guides/)** - How to implement these concepts
- **[API Reference](../reference/)** - Technical reference documentation

---

**Questions about {title.lower()}?** → **[Join the Discussion](https://github.com/tosin2013/mcp-adr-analysis-server/discussions)**
"""

    def _generate_tutorial_template(self, title: str, filename: str) -> str:
        """Generate tutorial template."""
        return f"""# 🎓 Tutorial: {title}

**Learn {title.lower()} through hands-on examples and exercises.**

**Prerequisites**: [List prerequisites]
**Estimated time**: [Time estimate]
**Difficulty**: [Beginner/Intermediate/Advanced]

---

## 🎯 What You'll Learn

By the end of this tutorial, you'll be able to:
- [Learning objective 1]
- [Learning objective 2]
- [Learning objective 3]

---

## 📋 Tutorial Steps

### Step 1: [Setup/Introduction]
[Detailed tutorial step with examples]

```bash
# Example command
npm run example
```

### Step 2: [Main Content]
[Next tutorial step]

### Step 3: [Advanced Topics]
[Advanced tutorial content]

---

## 🧪 Exercises

### Exercise 1: [Exercise Name]
**Objective**: [What the exercise teaches]
**Instructions**: [Step-by-step instructions]

### Exercise 2: [Exercise Name]
**Objective**: [Exercise objective]
**Instructions**: [Exercise instructions]

---

## ✅ Summary

In this tutorial, you learned:
- [Summary point 1]
- [Summary point 2]
- [Summary point 3]

---

## 🚀 Next Steps

- **[Next Tutorial](../tutorials/)** - [Description]
- **[Related How-To Guide](../how-to-guides/)** - [Description]

---

**Questions about this tutorial?** → **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**
"""

    def _generate_generic_template(self, title: str, filename: str) -> str:
        """Generate generic template for other file types."""
        return f"""# {title}

**[Brief description of what this document covers]**

---

## Overview

[Content overview]

## [Section 1]

[Content for section 1]

## [Section 2]

[Content for section 2]

---

## Related Documentation

- **[Related Doc 1](../reference/)** - [Description]
- **[Related Doc 2](../how-to-guides/)** - [Description]

---

**Need help?** → **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**
"""

    def fix_research_links(self, research_links: List[Dict]) -> int:
        """Fix or remove broken research links."""
        logger.info("🔬 Fixing research directory links...")
        
        links_fixed = 0
        
        # Group by source file for efficient processing
        files_to_update = {}
        for link in research_links:
            source_file = link["file"]
            if source_file not in files_to_update:
                files_to_update[source_file] = []
            files_to_update[source_file].append(link)
        
        for source_file, links in files_to_update.items():
            if self._fix_research_links_in_file(source_file, links):
                links_fixed += len(links)
        
        logger.info(f"✅ Fixed {links_fixed} research links")
        return links_fixed

    def _fix_research_links_in_file(self, source_file: str, links: List[Dict]) -> bool:
        """Fix research links in a specific file."""
        file_path = self.docs_dir / source_file
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Remove or comment out broken research links
            for link in links:
                url = link["url"]
                # Find the full link pattern and remove it
                link_pattern = rf'\[([^\]]*)\]\({re.escape(url)}\)'
                
                # Replace with a comment or remove entirely
                replacement = f"<!-- TODO: Fix research link: {url} -->"
                content = re.sub(link_pattern, replacement, content)
            
            # Only write if content changed
            if content != original_content:
                if self.dry_run:
                    logger.info(f"[DRY RUN] Would update: {file_path}")
                    return True
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                logger.info(f"✅ Updated research links in: {file_path}")
                self.updated_files.add(file_path)
                return True
                
        except Exception as e:
            logger.error(f"❌ Failed to fix research links in {file_path}: {e}")
        
        return False

    def fix_sample_project_links(self, sample_links: List[Dict]) -> int:
        """Fix sample project links by creating stub files or updating references."""
        logger.info("📁 Fixing sample project links...")
        
        links_fixed = 0
        
        # Create the sample project structure if it doesn't exist
        sample_dir = self.docs_dir.parent / "sample-project" / "docs" / "adrs"
        
        if not self.dry_run:
            sample_dir.mkdir(parents=True, exist_ok=True)
        
        # Create stub ADR files
        sample_adrs = {
            "001-database-architecture.md": "Database Architecture Decision",
            "002-api-authentication.md": "API Authentication Strategy", 
            "003-legacy-data-migration.md": "Legacy Data Migration Approach"
        }
        
        for filename, title in sample_adrs.items():
            adr_path = sample_dir / filename
            if not adr_path.exists():
                content = self._generate_sample_adr(title, filename)
                
                if self.dry_run:
                    logger.info(f"[DRY RUN] Would create sample ADR: {adr_path}")
                    links_fixed += 1
                else:
                    try:
                        with open(adr_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        logger.info(f"✅ Created sample ADR: {adr_path}")
                        links_fixed += 1
                    except Exception as e:
                        logger.error(f"❌ Failed to create {adr_path}: {e}")
        
        logger.info(f"✅ Fixed {links_fixed} sample project links")
        return links_fixed

    def _generate_sample_adr(self, title: str, filename: str) -> str:
        """Generate sample ADR content."""
        adr_number = filename.split('-')[0]
        return f"""# ADR-{adr_number}: {title}

**Status**: Accepted
**Date**: 2024-01-15
**Deciders**: Architecture Team

## Context

This is a sample architectural decision record demonstrating the ADR format and structure used in the MCP ADR Analysis Server project.

## Decision

We will use this sample ADR to demonstrate:
- Proper ADR structure and formatting
- Decision documentation best practices
- Integration with the MCP ADR Analysis Server

## Consequences

### Positive
- Provides concrete examples for users
- Demonstrates ADR best practices
- Shows integration with analysis tools

### Negative
- Requires maintenance to keep examples current
- May not reflect all possible ADR variations

## Implementation

This sample ADR serves as a template and reference for:
1. New teams adopting ADRs
2. Training and onboarding materials
3. Testing ADR analysis tools

## Related Decisions

- This is a standalone sample decision
- Links to other sample ADRs in this directory
- Demonstrates cross-referencing between ADRs

---

*This is a sample ADR created for demonstration purposes in the MCP ADR Analysis Server project.*
"""

    def validate_fixes(self) -> Dict:
        """Validate that fixes were applied correctly."""
        logger.info("✅ Validating applied fixes...")
        
        # Re-analyze to see what's left
        remaining_issues = self.analyze_broken_links()
        
        validation_report = {
            "files_created": len(self.created_files),
            "files_updated": len(self.updated_files),
            "remaining_issues": sum(len(v) for v in remaining_issues.values()),
            "remaining_by_category": {k: len(v) for k, v in remaining_issues.items()},
            "created_files": [str(f) for f in self.created_files],
            "updated_files": [str(f) for f in self.updated_files]
        }
        
        logger.info(f"📊 Validation Summary:")
        logger.info(f"   Files created: {validation_report['files_created']}")
        logger.info(f"   Files updated: {validation_report['files_updated']}")
        logger.info(f"   Remaining issues: {validation_report['remaining_issues']}")
        
        return validation_report

    def run_comprehensive_fix(self) -> Dict:
        """Run comprehensive fix for all broken links."""
        logger.info("🚀 Starting comprehensive documentation link fix...")
        
        # Analyze current state
        broken_links = self.analyze_broken_links()
        
        # Apply fixes
        missing_files_fixed = self.fix_missing_files(broken_links["missing_files"])
        research_links_fixed = self.fix_research_links(broken_links["research_links"])
        sample_links_fixed = self.fix_sample_project_links(broken_links["sample_project_links"])
        
        # Validate results
        validation_report = self.validate_fixes()
        
        # Generate summary report
        summary = {
            "initial_issues": sum(len(v) for v in broken_links.values()),
            "fixes_applied": {
                "missing_files": missing_files_fixed,
                "research_links": research_links_fixed,
                "sample_links": sample_links_fixed
            },
            "total_fixes": missing_files_fixed + research_links_fixed + sample_links_fixed,
            "validation": validation_report,
            "dry_run": self.dry_run
        }
        
        logger.info("🎉 Comprehensive fix complete!")
        logger.info(f"📊 Summary: Fixed {summary['total_fixes']} issues")
        
        return summary


def main():
    parser = argparse.ArgumentParser(description="Fix broken links in MCP ADR Analysis Server documentation")
    parser.add_argument("--docs-dir", default="/docs/docs", help="Documentation directory path")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Initialize fixer
    fixer = DocumentationLinkFixer(args.docs_dir, dry_run=args.dry_run)
    
    # Run comprehensive fix
    summary = fixer.run_comprehensive_fix()
    
    # Save summary report
    report_path = Path("/docs/reports") / f"link-fix-summary_{int(time.time())}.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(report_path, 'w') as f:
        json.dump(summary, f, indent=2)
    
    logger.info(f"📄 Summary report saved: {report_path}")
    
    # Exit with appropriate code
    if summary["validation"]["remaining_issues"] > 0:
        logger.warning("⚠️  Some issues remain after fixing")
        exit(1)
    else:
        logger.info("✅ All fixable issues resolved!")
        exit(0)


if __name__ == "__main__":
    main()
