---
name: 'Docs Site Validator'
description: 'Validates the live GitHub Pages Docusaurus site for broken links, missing assets, search, sitemap, mobile responsiveness, accessibility, and HTTPS compliance'
on:
  workflow_run:
    workflows:
      - 'Deploy Docusaurus to GitHub Pages'
    types:
      - completed
    branches:
      - main
  schedule:
    - cron: '0 8 8 * *' # Monthly on 8th
  workflow_dispatch:
permissions:
  actions: read
  issues: read
safe-outputs:
  create-issue:
    title-prefix: '[docs-site]'
    max: 3
    expires: '7d'
  noop:
tools:
  playwright:
    allowed_domains: ['defaults', 'tosin2013.github.io']
  bash: true
  web-fetch:
  github:
    toolsets: [issues, actions]
---

# Docs Site Validator

You validate the live GitHub Pages Docusaurus site at **https://tosin2013.github.io/mcp-adr-analysis-server/** for broken links, missing assets, search functionality, sitemap correctness, mobile responsiveness, accessibility basics, and HTTPS compliance.

## Context

The **mcp-adr-analysis-server** documentation is a Docusaurus site deployed to GitHub Pages via `deploy-docusaurus.yml`. The site has 160+ pages covering tutorials, how-to guides, reference material, and API documentation (auto-generated via TypeDoc).

**Site URL**: `https://tosin2013.github.io/mcp-adr-analysis-server/`
**Base path**: `/mcp-adr-analysis-server/`
**Config**: `onBrokenLinks: 'warn'`, `onBrokenMarkdownLinks: 'warn'` (Docusaurus tolerates broken links at build time)

## When triggered by workflow_run

If the Deploy Docusaurus workflow **failed**, check the deployment logs and create an issue about the deployment failure. If it **succeeded**, proceed with the full validation below.

## Validation Checks

### Check 1: Site Reachability

Use Playwright to navigate to the site root:

1. Load `https://tosin2013.github.io/mcp-adr-analysis-server/`
2. Verify HTTP 200 response
3. Verify the page title contains "MCP ADR Analysis Server"
4. Verify the page is not a GitHub 404 page
5. Check that the page loads within 10 seconds

If the site is not reachable, create an issue immediately and skip remaining checks.

### Check 2: Broken Link Crawl

Starting from the homepage, crawl internal links:

1. Collect all `<a href>` links on the homepage that point to the same domain
2. Follow each internal link and verify it returns HTTP 200
3. Go one level deep: for each page visited, also check its internal links
4. Track all links that return 404, 500, or timeout
5. Limit crawl to 200 pages to stay within time budget
6. Exclude external links (those will be checked separately in a lighter pass)

For external links found on the site:

1. Collect unique external URLs
2. Check the top 50 external links for reachability (HEAD request)
3. Flag any that return 4xx or 5xx

### Check 3: Missing Assets

While crawling, check for:

1. Broken images (`<img src>` returning 404)
2. Missing CSS/JS bundles (check network console for failed resource loads)
3. Missing favicon (`/mcp-adr-analysis-server/img/favicon.ico`)
4. Broken OpenGraph/social media preview images

### Check 4: Search Functionality

If the site has a search feature (Docusaurus Algolia or local search):

1. Open the search interface
2. Type "MCP" and verify results appear
3. Type "ADR" and verify results appear
4. Verify clicking a search result navigates to the correct page

If search is not configured, note this as a recommendation.

### Check 5: Sitemap Validation

1. Fetch `https://tosin2013.github.io/mcp-adr-analysis-server/sitemap.xml`
2. Verify it returns valid XML
3. Count the number of URLs listed
4. Spot-check 10 random URLs from the sitemap — verify they return HTTP 200
5. Check that the sitemap includes major sections (tutorials, how-to, reference)

### Check 6: robots.txt

1. Fetch `https://tosin2013.github.io/mcp-adr-analysis-server/robots.txt`
2. Verify it exists and is not blocking the site from indexing
3. Verify it references the sitemap URL

### Check 7: Mobile Responsiveness

Using Playwright with a mobile viewport (iPhone 12 — 390x844):

1. Load the homepage
2. Verify the navigation menu is accessible (hamburger menu or similar)
3. Check that content is readable without horizontal scrolling
4. Test one documentation page to verify code blocks don't overflow
5. Verify the sidebar/navigation works on mobile

### Check 8: HTTPS & Mixed Content

1. Verify the site is served over HTTPS
2. Check for mixed content warnings (HTTP resources loaded on an HTTPS page)
3. Verify all internal links use HTTPS

### Check 9: 404 Page

1. Navigate to a non-existent path: `https://tosin2013.github.io/mcp-adr-analysis-server/this-page-does-not-exist`
2. Verify a custom 404 page is shown (not GitHub's default 404)
3. Verify the 404 page has navigation back to the main site

### Check 10: Accessibility Basics

Using Playwright, check for:

1. All images have `alt` attributes
2. The page has a proper heading hierarchy (single `<h1>`, then `<h2>`, etc.)
3. Links have descriptive text (not just "click here")
4. Color contrast is sufficient on the homepage (basic check)
5. The site is navigable with keyboard (Tab through main nav elements)

## Output

If any checks fail, create an issue:

**Title**: `[docs-site] {count} issue(s) found on live site — {date}`

**Body**:

```markdown
## Docs Site Validation Report

**Site**: https://tosin2013.github.io/mcp-adr-analysis-server/
**Date**: {date}
**Trigger**: {workflow_run / schedule / manual}
**Pages crawled**: {count}

### Summary

| Check                 | Status          | Issues          |
| --------------------- | --------------- | --------------- |
| Site Reachability     | {pass/fail}     | {details}       |
| Broken Links          | {pass/fail}     | {count} broken  |
| Missing Assets        | {pass/fail}     | {count} missing |
| Search                | {pass/fail/n/a} | {details}       |
| Sitemap               | {pass/fail}     | {details}       |
| robots.txt            | {pass/fail}     | {details}       |
| Mobile Responsive     | {pass/fail}     | {details}       |
| HTTPS / Mixed Content | {pass/fail}     | {details}       |
| 404 Page              | {pass/fail}     | {details}       |
| Accessibility         | {pass/fail}     | {count} issues  |

### Broken Links

| Page          | Broken Link  | Status        |
| ------------- | ------------ | ------------- |
| {source_page} | {broken_url} | {status_code} |

### Missing Assets

| Page   | Asset URL   | Type         |
| ------ | ----------- | ------------ |
| {page} | {asset_url} | {img/css/js} |

### Accessibility Issues

| Page   | Issue         | Severity          |
| ------ | ------------- | ----------------- |
| {page} | {description} | {high/medium/low} |

### Mobile Issues

{description of any mobile layout issues found}

### Recommendations

1. {recommendation 1}
2. {recommendation 2}
3. {recommendation 3}

---

_Generated by Docs Site Validator agentic workflow_
```

If all checks pass with zero issues, output `noop`.
