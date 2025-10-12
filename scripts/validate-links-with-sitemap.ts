#!/usr/bin/env node
/**
 * Link Validation Against Sitemap
 *
 * Validates all documentation links against the sitemap.xml to identify:
 * 1. Broken links that should exist (formatting issues)
 * 2. Genuinely missing pages
 * 3. Pages in sitemap but not linked anywhere (orphaned pages)
 */

import { readFileSync, existsSync } from 'fs';
import { join, relative, dirname, resolve } from 'path';
import { glob } from 'glob';

interface SitemapUrl {
  loc: string;
  path: string; // relative path without base URL
  htmlPath: string; // .html version
  mdPath: string; // .md version
}

interface BrokenLink {
  url: string;
  sourceFile: string;
  lineNumber: number;
  linkType: string;
  status: string;
  error?: string;
  possibleFix?: string;
}

interface ValidationReport {
  totalLinks: number;
  brokenLinks: BrokenLink[];
  validLinks: number;
  sitemapUrls: SitemapUrl[];
  orphanedPages: string[]; // In sitemap but not linked
  fixableLinks: BrokenLink[]; // Broken but exist in sitemap with different format
  genuinelyMissing: BrokenLink[]; // Not in sitemap at all
}

const DOCS_DIR = join(process.cwd(), 'docs');
const SITEMAP_PATH = join(DOCS_DIR, 'sitemap.xml');
const BASE_URL = 'https://tosin2013.github.io/mcp-adr-analysis-server';

function parseSitemap(): SitemapUrl[] {
  if (!existsSync(SITEMAP_PATH)) {
    console.error('❌ sitemap.xml not found at:', SITEMAP_PATH);
    process.exit(1);
  }

  const xml = readFileSync(SITEMAP_PATH, 'utf-8');
  const urls: SitemapUrl[] = [];

  // Simple regex-based XML parsing for <loc> tags
  const locRegex = /<loc>([^<]+)<\/loc>/g;
  let match;

  while ((match = locRegex.exec(xml)) !== null) {
    const loc = match[1];
    const path = loc.replace(BASE_URL, '').replace(/^\//, '');

    urls.push({
      loc,
      path,
      htmlPath: path,
      mdPath: path.replace(/\.html$/, '.md'),
    });
  }

  return urls;
}

function normalizePath(link: string, sourceFile: string): string[] {
  // Generate possible variations of the path
  const variations: string[] = [];

  // Remove leading ./
  let normalized = link.replace(/^\.\//, '');

  // If it starts with /, treat as absolute from docs root
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  } else {
    // Relative path - resolve relative to source file
    const sourceDir = dirname(sourceFile);
    normalized = join(sourceDir, normalized).replace(/\\/g, '/');
    // Remove 'docs/' prefix if present
    normalized = normalized.replace(/^docs\//, '');
  }

  variations.push(normalized);
  variations.push(normalized + '.md');
  variations.push(normalized + '.html');
  variations.push(normalized + '/index.md');
  variations.push(normalized + '/index.html');

  // Remove trailing slashes
  variations.push(normalized.replace(/\/$/, ''));

  return [...new Set(variations)]; // deduplicate
}

function findMatchInSitemap(
  link: string,
  sourceFile: string,
  sitemapUrls: SitemapUrl[]
): { matched: boolean; suggestion?: string } {
  const variations = normalizePath(link, sourceFile);

  for (const variation of variations) {
    for (const sitemapUrl of sitemapUrls) {
      if (
        sitemapUrl.path === variation ||
        sitemapUrl.htmlPath === variation ||
        sitemapUrl.mdPath === variation ||
        sitemapUrl.path.endsWith(variation) ||
        variation.endsWith(sitemapUrl.mdPath)
      ) {
        return {
          matched: true,
          suggestion: sitemapUrl.mdPath || sitemapUrl.path,
        };
      }
    }
  }

  return { matched: false };
}

async function extractLinksFromMarkdown(
  filePath: string
): Promise<Array<{ link: string; lineNumber: number }>> {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const links: Array<{ link: string; lineNumber: number }> = [];

  // Match markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  lines.forEach((line, index) => {
    let match;
    while ((match = markdownLinkRegex.exec(line)) !== null) {
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

      // Remove anchor fragments
      const cleanUrl = url.split('#')[0];
      if (cleanUrl) {
        links.push({
          link: cleanUrl,
          lineNumber: index + 1,
        });
      }
    }
  });

  return links;
}

async function validateAllLinks(sitemapUrls: SitemapUrl[]): Promise<ValidationReport> {
  const markdownFiles = await glob('**/*.md', {
    cwd: DOCS_DIR,
    ignore: ['node_modules/**', 'build/**', 'dist/**'],
  });

  const brokenLinks: BrokenLink[] = [];
  const linkedPages = new Set<string>();
  let totalLinks = 0;
  let validLinks = 0;

  for (const file of markdownFiles) {
    const fullPath = join(DOCS_DIR, file);
    const links = await extractLinksFromMarkdown(fullPath);

    for (const { link, lineNumber } of links) {
      totalLinks++;

      const match = findMatchInSitemap(link, file, sitemapUrls);

      if (match.matched) {
        validLinks++;
        if (match.suggestion) {
          linkedPages.add(match.suggestion);
        }
      } else {
        // Check if file actually exists
        const variations = normalizePath(link, file);
        let exists = false;

        for (const variation of variations) {
          const checkPath = join(DOCS_DIR, variation);
          if (existsSync(checkPath)) {
            exists = true;
            break;
          }
        }

        brokenLinks.push({
          url: link,
          sourceFile: file,
          lineNumber,
          linkType: 'internal',
          status: exists ? 'exists_not_in_sitemap' : 'broken',
          possibleFix: match.suggestion,
        });
      }
    }
  }

  // Find orphaned pages (in sitemap but not linked)
  const orphanedPages: string[] = [];
  for (const sitemapUrl of sitemapUrls) {
    if (!linkedPages.has(sitemapUrl.path) && !linkedPages.has(sitemapUrl.mdPath)) {
      // Exclude index pages from orphaned list
      if (!sitemapUrl.path.includes('index') && sitemapUrl.path !== '') {
        orphanedPages.push(sitemapUrl.path);
      }
    }
  }

  // Categorize broken links
  const fixableLinks = brokenLinks.filter(link => link.possibleFix);
  const genuinelyMissing = brokenLinks.filter(
    link => !link.possibleFix && link.status === 'broken'
  );

  return {
    totalLinks,
    brokenLinks,
    validLinks,
    sitemapUrls,
    orphanedPages,
    fixableLinks,
    genuinelyMissing,
  };
}

async function main() {
  console.log('🔍 Validating Documentation Links Against Sitemap\n');

  // Parse sitemap
  console.log('📋 Parsing sitemap.xml...');
  const sitemapUrls = parseSitemap();
  console.log(`✅ Found ${sitemapUrls.length} URLs in sitemap\n`);

  // Validate all links
  console.log('🔗 Validating all documentation links...');
  const report = await validateAllLinks(sitemapUrls);

  // Print summary
  console.log('\n📊 Validation Summary');
  console.log('━'.repeat(60));
  console.log(`Total Links Checked:     ${report.totalLinks}`);
  console.log(
    `Valid Links:             ${report.validLinks} (${((report.validLinks / report.totalLinks) * 100).toFixed(1)}%)`
  );
  console.log(
    `Broken Links:            ${report.brokenLinks.length} (${((report.brokenLinks.length / report.totalLinks) * 100).toFixed(1)}%)`
  );
  console.log(`  - Fixable (format):    ${report.fixableLinks.length}`);
  console.log(`  - Genuinely Missing:   ${report.genuinelyMissing.length}`);
  console.log(`Orphaned Pages:          ${report.orphanedPages.length}`);

  // Print fixable links (top 20)
  if (report.fixableLinks.length > 0) {
    console.log('\n🔧 Fixable Links (Format Issues):');
    console.log('━'.repeat(60));
    report.fixableLinks.slice(0, 20).forEach(link => {
      console.log(`\n📄 ${link.sourceFile}:${link.lineNumber}`);
      console.log(`   Current:  ${link.url}`);
      console.log(`   Fix to:   ${link.possibleFix}`);
    });

    if (report.fixableLinks.length > 20) {
      console.log(`\n   ... and ${report.fixableLinks.length - 20} more`);
    }
  }

  // Print genuinely missing (top 20)
  if (report.genuinelyMissing.length > 0) {
    console.log('\n❌ Genuinely Missing Pages:');
    console.log('━'.repeat(60));

    // Group by target URL
    const missingByUrl = new Map<string, BrokenLink[]>();
    report.genuinelyMissing.forEach(link => {
      const existing = missingByUrl.get(link.url) || [];
      existing.push(link);
      missingByUrl.set(link.url, existing);
    });

    const sortedMissing = Array.from(missingByUrl.entries()).sort(
      (a, b) => b[1].length - a[1].length
    );

    sortedMissing.slice(0, 20).forEach(([url, links]) => {
      console.log(`\n📄 ${url} (referenced ${links.length} times)`);
      links.slice(0, 3).forEach(link => {
        console.log(`   - ${link.sourceFile}:${link.lineNumber}`);
      });
      if (links.length > 3) {
        console.log(`   - ... and ${links.length - 3} more`);
      }
    });

    if (sortedMissing.length > 20) {
      console.log(`\n   ... and ${sortedMissing.length - 20} more missing pages`);
    }
  }

  // Print orphaned pages (top 20)
  if (report.orphanedPages.length > 0) {
    console.log('\n🏝️  Orphaned Pages (In Sitemap but Not Linked):');
    console.log('━'.repeat(60));
    report.orphanedPages.slice(0, 20).forEach(page => {
      console.log(`   - ${page}`);
    });

    if (report.orphanedPages.length > 20) {
      console.log(`\n   ... and ${report.orphanedPages.length - 20} more`);
    }
  }

  // Save detailed report
  const reportPath = join(process.cwd(), 'LINK_VALIDATION_REPORT.json');
  const detailedReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalLinks: report.totalLinks,
      validLinks: report.validLinks,
      brokenLinks: report.brokenLinks.length,
      fixableLinks: report.fixableLinks.length,
      genuinelyMissing: report.genuinelyMissing.length,
      orphanedPages: report.orphanedPages.length,
    },
    fixableLinks: report.fixableLinks,
    genuinelyMissing: report.genuinelyMissing,
    orphanedPages: report.orphanedPages,
  };

  const fs = await import('fs/promises');
  await fs.writeFile(reportPath, JSON.stringify(detailedReport, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);

  console.log('\n✅ Validation complete!');
}

main().catch(console.error);
