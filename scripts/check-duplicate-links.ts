#!/usr/bin/env node
/**
 * Duplicate Link Analyzer
 *
 * Identifies:
 * 1. Links that appear multiple times in the same file
 * 2. Same target linked from many different files
 * 3. Potential over-linking issues
 * 4. Circular reference patterns
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

interface LinkOccurrence {
  target: string;
  sourceFile: string;
  lineNumber: number;
  linkText: string;
}

interface DuplicateAnalysis {
  target: string;
  occurrences: LinkOccurrence[];
  totalCount: number;
  uniqueFiles: number;
  sameFileCount: number;
}

const DOCS_DIR = join(process.cwd(), 'docs');

async function extractAllLinks(filePath: string): Promise<LinkOccurrence[]> {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const links: LinkOccurrence[] = [];

  // Match markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  lines.forEach((line, index) => {
    let match;
    while ((match = markdownLinkRegex.exec(line)) !== null) {
      const linkText = match[1];
      const url = match[2];

      // Skip external links, anchors only, and mailto
      if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('mailto:') ||
        url.startsWith('#')
      ) {
        continue;
      }

      // Remove anchor fragments for grouping
      const cleanUrl = url.split('#')[0];
      if (cleanUrl) {
        links.push({
          target: cleanUrl,
          sourceFile: filePath,
          lineNumber: index + 1,
          linkText,
        });
      }
    }
  });

  return links;
}

function normalizePath(path: string): string {
  // Normalize paths for comparison
  return path.replace(/^\.\//, '').replace(/^\//, '').replace(/\\/g, '/').toLowerCase();
}

async function analyzeDuplicates(): Promise<Map<string, DuplicateAnalysis>> {
  const markdownFiles = await glob('**/*.md', {
    cwd: DOCS_DIR,
    ignore: ['node_modules/**', 'build/**', 'dist/**'],
  });

  // Collect all links
  const allLinks: LinkOccurrence[] = [];
  for (const file of markdownFiles) {
    const fullPath = join(DOCS_DIR, file);
    const links = await extractAllLinks(fullPath);
    // Store relative path for reporting
    allLinks.push(
      ...links.map(link => ({
        ...link,
        sourceFile: file,
      }))
    );
  }

  // Group by target
  const linksByTarget = new Map<string, LinkOccurrence[]>();

  for (const link of allLinks) {
    const normalizedTarget = normalizePath(link.target);
    const existing = linksByTarget.get(normalizedTarget) || [];
    existing.push(link);
    linksByTarget.set(normalizedTarget, existing);
  }

  // Analyze duplicates
  const duplicates = new Map<string, DuplicateAnalysis>();

  for (const [target, occurrences] of linksByTarget.entries()) {
    if (occurrences.length > 1) {
      const uniqueFiles = new Set(occurrences.map(o => o.sourceFile)).size;
      const fileOccurrences = new Map<string, number>();

      occurrences.forEach(occ => {
        fileOccurrences.set(occ.sourceFile, (fileOccurrences.get(occ.sourceFile) || 0) + 1);
      });

      const sameFileCount = Array.from(fileOccurrences.values())
        .filter(count => count > 1)
        .reduce((sum, count) => sum + count, 0);

      duplicates.set(target, {
        target,
        occurrences,
        totalCount: occurrences.length,
        uniqueFiles,
        sameFileCount,
      });
    }
  }

  return duplicates;
}

function generateReport(duplicates: Map<string, DuplicateAnalysis>) {
  const sortedDuplicates = Array.from(duplicates.values()).sort(
    (a, b) => b.totalCount - a.totalCount
  );

  console.log('🔍 Duplicate Link Analysis\n');
  console.log('━'.repeat(70));

  // Summary statistics
  const totalDuplicateLinks = sortedDuplicates.reduce((sum, d) => sum + d.totalCount, 0);
  const totalUniqueDuplicates = sortedDuplicates.length;
  const highlyDuplicated = sortedDuplicates.filter(d => d.totalCount >= 10);
  const sameFileDuplicates = sortedDuplicates.filter(d => d.sameFileCount > 0);

  console.log(`\n📊 Summary:`);
  console.log(`   Unique targets with duplicates: ${totalUniqueDuplicates}`);
  console.log(`   Total duplicate link instances:  ${totalDuplicateLinks}`);
  console.log(`   Highly duplicated (≥10 refs):    ${highlyDuplicated.length}`);
  console.log(`   Same-file duplicates:            ${sameFileDuplicates.length}`);

  // Top duplicated links
  console.log('\n\n🔝 Most Frequently Linked Targets (Top 30):');
  console.log('━'.repeat(70));

  sortedDuplicates.slice(0, 30).forEach((dup, index) => {
    console.log(`\n${index + 1}. ${dup.target}`);
    console.log(`   Total References: ${dup.totalCount} from ${dup.uniqueFiles} file(s)`);

    if (dup.sameFileCount > 0) {
      console.log(`   ⚠️  Same-file duplicates: ${dup.sameFileCount}`);
    }

    // Show source files (top 5)
    const fileCounts = new Map<string, number>();
    dup.occurrences.forEach(occ => {
      fileCounts.set(occ.sourceFile, (fileCounts.get(occ.sourceFile) || 0) + 1);
    });

    const sortedFiles = Array.from(fileCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    sortedFiles.forEach(([file, count]) => {
      if (count > 1) {
        console.log(`   - ${file} (${count}× in same file)`);
      } else {
        console.log(`   - ${file}`);
      }
    });

    if (fileCounts.size > 5) {
      console.log(`   - ... and ${fileCounts.size - 5} more file(s)`);
    }
  });

  // Same-file duplicates
  if (sameFileDuplicates.length > 0) {
    console.log('\n\n⚠️  Same-File Duplicates (Potential Redundancy):');
    console.log('━'.repeat(70));

    sameFileDuplicates
      .filter(d => d.sameFileCount >= 3)
      .slice(0, 20)
      .forEach(dup => {
        console.log(`\n📄 ${dup.target} (${dup.sameFileCount} duplicates in same file)`);

        const fileCounts = new Map<string, LinkOccurrence[]>();
        dup.occurrences.forEach(occ => {
          const existing = fileCounts.get(occ.sourceFile) || [];
          existing.push(occ);
          fileCounts.set(occ.sourceFile, existing);
        });

        Array.from(fileCounts.entries())
          .filter(([_, occs]) => occs.length > 1)
          .forEach(([file, occs]) => {
            console.log(`   File: ${file}`);
            occs.forEach(occ => {
              console.log(`     Line ${occ.lineNumber}: "${occ.linkText}"`);
            });
          });
      });
  }

  // Circular references detection
  console.log('\n\n🔄 Potential Circular References:');
  console.log('━'.repeat(70));

  const circularPairs: Array<[string, string]> = [];

  for (const [target, dup] of duplicates.entries()) {
    // Check if any source files also appear as targets
    dup.occurrences.forEach(occ => {
      const sourceNormalized = normalizePath(occ.sourceFile);
      if (duplicates.has(sourceNormalized)) {
        const reverseLink = duplicates.get(sourceNormalized);
        if (reverseLink?.occurrences.some(ro => normalizePath(ro.sourceFile) === target)) {
          circularPairs.push([occ.sourceFile, target]);
        }
      }
    });
  }

  if (circularPairs.length > 0) {
    const uniqueCircular = new Set(circularPairs.map(p => p.sort().join(' ↔ ')));
    console.log(`\nFound ${uniqueCircular.size} circular reference pair(s):\n`);

    Array.from(uniqueCircular)
      .slice(0, 10)
      .forEach(pair => {
        console.log(`   ${pair}`);
      });
  } else {
    console.log('\n✅ No circular references detected');
  }

  return {
    totalDuplicates: totalUniqueDuplicates,
    totalInstances: totalDuplicateLinks,
    highlyDuplicated: highlyDuplicated.length,
    sameFileDuplicates: sameFileDuplicates.length,
    circularReferences: circularPairs.length,
  };
}

async function main() {
  console.log('🔍 Analyzing documentation for duplicate links...\n');

  const duplicates = await analyzeDuplicates();
  const stats = generateReport(duplicates);

  // Save detailed report
  const reportPath = join(process.cwd(), 'DUPLICATE_LINKS_REPORT.json');
  const detailedReport = {
    timestamp: new Date().toISOString(),
    summary: stats,
    duplicates: Array.from(duplicates.values()).map(dup => ({
      target: dup.target,
      totalCount: dup.totalCount,
      uniqueFiles: dup.uniqueFiles,
      sameFileCount: dup.sameFileCount,
      occurrences: dup.occurrences,
    })),
  };

  const fs = await import('fs/promises');
  await fs.writeFile(reportPath, JSON.stringify(detailedReport, null, 2));

  console.log(`\n\n💾 Detailed report saved to: ${reportPath}`);
  console.log('\n✅ Analysis complete!');
}

main().catch(console.error);
