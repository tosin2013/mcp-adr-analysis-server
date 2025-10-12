# 🚀 Docusaurus Deployment Guide

## Overview

This guide covers deploying the MCP ADR Analysis Server documentation to GitHub Pages using Docusaurus.

## Automatic Deployment

### GitHub Actions Workflow

The documentation automatically deploys to GitHub Pages when:

- ✅ Changes are pushed to `main` branch in `docs/**`
- ✅ Workflow file is modified
- ✅ Manual trigger via `workflow_dispatch`

**Workflow File:** `.github/workflows/deploy-docusaurus.yml`

### Deployment Process

1. **Build Phase:**
   - Checks out repository with full history
   - Sets up Node.js 20 with npm caching
   - Installs dependencies with `npm ci`
   - Builds Docusaurus with `npm run build`
   - Verifies build output integrity
   - Uploads build artifact

2. **Deploy Phase** (main branch only):
   - Deploys to GitHub Pages
   - Provides deployment URL
   - Shows deployment summary

### Build Verification

The workflow includes automatic verification:

- ✅ Build directory exists
- ✅ `index.html` is generated
- ✅ Build size reporting

## Manual Deployment

### Prerequisites

```bash
cd docs
npm install
```

### Local Build Test

```bash
# Build for production
npm run build

# Serve locally to test
npm run serve
```

### Manual Trigger

1. Go to GitHub Actions
2. Select "Deploy Docusaurus to GitHub Pages"
3. Click "Run workflow"
4. Select `main` branch
5. Click "Run workflow"

## Docker Deployment (Local Testing)

### Development Server

```bash
cd docs
docker-compose --profile dev up
```

Access at: https://localhost:3000/mcp-adr-analysis-server/

### Production Build

```bash
cd docs
docker-compose --profile prod up --build
```

Access at: https://localhost:8080/mcp-adr-analysis-server/

## GitHub Pages Configuration

### Repository Settings

1. Go to **Settings** → **Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `gh-pages` (auto-created by workflow)
4. **Folder:** `/ (root)`

### Custom Domain (Optional)

Add `CNAME` file to `docs/static/`:

```bash
echo "docs.yourdomain.com" > docs/static/CNAME
```

Update `docusaurus.config.js`:

```javascript
url: 'https://docs.yourdomain.com',
baseUrl: '/',
```

## Troubleshooting

### Build Failures

**Issue:** Build fails with MDX errors

```bash
# Check for invalid MDX syntax
grep -r "<[0-9]" docs/**/*.md
# Replace with HTML entities: &lt; &gt;
```

**Issue:** Missing dependencies

```bash
cd docs
rm -rf node_modules package-lock.json
npm install
```

### Deployment Failures

**Issue:** 404 errors on deployed site

- Check `baseUrl` in `docusaurus.config.js`
- Verify GitHub Pages is enabled
- Check branch is `gh-pages`

**Issue:** Old content showing

- Clear browser cache
- Wait 5-10 minutes for CDN propagation
- Check deployment timestamp in Actions

### Permission Issues

**Issue:** Workflow fails with permission errors

Ensure workflow has correct permissions:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

## Monitoring Deployments

### GitHub Actions

View deployment status:

1. Go to **Actions** tab
2. Select "Deploy Docusaurus to GitHub Pages"
3. View recent runs

### Deployment URL

After successful deployment:

- **Production:** https://tosin2013.github.io/mcp-adr-analysis-server/
- **Staging:** Use PR preview (if configured)

## Best Practices

### Before Committing

1. **Test locally:**

   ```bash
   npm run build
   npm run serve
   ```

2. **Check for broken links:**
   - Use Docusaurus link checker
   - Test navigation manually

3. **Verify MDX syntax:**
   - No `<number>` patterns
   - Proper HTML entity encoding

### Content Updates

1. **Small changes:** Direct commit to `main`
2. **Large changes:** Use PR with preview
3. **Breaking changes:** Test in Docker first

### Performance

- ✅ Optimize images before adding
- ✅ Use lazy loading for heavy content
- ✅ Minimize external dependencies
- ✅ Enable caching in config

## Rollback Procedure

If deployment breaks:

1. **Revert commit:**

   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Manual rollback:**
   - Go to Actions
   - Find last successful deployment
   - Re-run that workflow

3. **Emergency fix:**
   ```bash
   # Fix locally
   npm run build
   npm run serve  # Test
   git commit -am "fix: emergency deployment fix"
   git push
   ```

## CI/CD Integration

### Pull Request Previews

The workflow builds on PRs but doesn't deploy:

- ✅ Validates build succeeds
- ✅ Catches errors before merge
- ❌ Doesn't deploy to production

### Branch Protection

Recommended settings:

- ✅ Require status checks to pass
- ✅ Require "build" job to succeed
- ✅ Require review before merge

## Deprecated Workflows

### VitePress (Old)

**File:** `.github/workflows/docs.yml`
**Status:** DEPRECATED - disabled automatic triggers
**Reason:** Migrated to Docusaurus

### TypeDoc API Docs

**File:** `.github/workflows/deploy-docs.yml`
**Status:** Active (separate from Docusaurus)
**Purpose:** API reference documentation

## Support

### Documentation Issues

- **GitHub Issues:** Report bugs or request features
- **Discussions:** Ask questions or share ideas
- **Local Testing:** Use Docker for safe experimentation

### Useful Commands

```bash
# Check build logs
docker-compose --profile dev logs -f

# Clean build
rm -rf docs/build docs/.docusaurus

# Rebuild from scratch
npm run clear && npm run build

# Check for errors
npm run build 2>&1 | grep -i error
```

## Next Steps

1. ✅ Verify deployment works
2. ✅ Set up branch protection
3. ✅ Configure custom domain (optional)
4. ✅ Enable PR previews (optional)
5. ✅ Monitor first few deployments

---

**Last Updated:** 2025-01-04
**Docusaurus Version:** 3.9.1
**Node Version:** 20.x
