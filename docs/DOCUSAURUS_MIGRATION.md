# VitePress to Docusaurus Migration Guide

This guide documents the migration from VitePress to Docusaurus for the MCP ADR Analysis Server documentation.

## 🎯 Migration Overview

**From:** VitePress v1.0.0  
**To:** Docusaurus v3.1.0  
**Reason:** Better React ecosystem integration, enhanced plugin system, superior MDX support, and more robust documentation features

## 📋 What Changed

### 1. Configuration Files

#### Removed (VitePress)

- `.vitepress/config.js` - VitePress configuration
- `.vitepress/dist/` - VitePress build output

#### Added (Docusaurus)

- `docusaurus.config.js` - Main Docusaurus configuration
- `sidebars.js` - Sidebar navigation configuration
- `src/css/custom.css` - Custom styling
- `static/img/` - Static assets directory
- `build/` - Docusaurus build output (gitignored)
- `.docusaurus/` - Docusaurus cache (gitignored)

### 2. Package Dependencies

#### Removed

```json
{
  "vitepress": "^1.0.0",
  "vitepress-plugin-mermaid": "^2.0.17"
}
```

#### Added

```json
{
  "@docusaurus/core": "^3.1.0",
  "@docusaurus/preset-classic": "^3.1.0",
  "@docusaurus/theme-mermaid": "^3.1.0",
  "@mdx-js/react": "^3.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0"
}
```

### 3. Scripts Updated

| Old (VitePress)   | New (Docusaurus)                 | Description              |
| ----------------- | -------------------------------- | ------------------------ |
| `npm run dev`     | `npm run start` or `npm run dev` | Start development server |
| `npm run build`   | `npm run build`                  | Build for production     |
| `npm run preview` | `npm run serve`                  | Preview production build |
| N/A               | `npm run clear`                  | Clear cache              |
| N/A               | `npm run deploy`                 | Deploy to GitHub Pages   |

### 4. Directory Structure

```
docs/
├── docusaurus.config.js          # Main config (was .vitepress/config.js)
├── sidebars.js                    # Sidebar config (new)
├── src/
│   └── css/
│       └── custom.css             # Custom styles (new)
├── static/
│   └── img/                       # Static assets (was public/)
├── tutorials/                     # Same structure
├── how-to-guides/                 # Same structure
├── reference/                     # Same structure
├── explanation/                   # Same structure
├── ide-rules/                     # Same structure
└── build/                         # Build output (was .vitepress/dist)
```

## 🚀 Migration Steps

### Step 1: Install Dependencies

```bash
cd docs
npm install
```

This will install all Docusaurus dependencies specified in the updated `package.json`.

### Step 2: Copy Assets

If you have custom images or assets in `public/`, move them to `static/img/`:

```bash
# If you have a public directory
cp -r public/* static/img/
```

### Step 3: Update Markdown Files (if needed)

Most markdown files work as-is, but you may need to update:

1. **Front matter** - Docusaurus uses slightly different front matter:

   ```yaml
   ---
   id: my-doc
   title: My Document
   sidebar_label: My Doc
   sidebar_position: 1
   ---
   ```

2. **Internal links** - Should work the same, but verify:

   ```markdown
   [Link to tutorial](./tutorials/01-first-steps.md)
   ```

3. **Mermaid diagrams** - Already configured with `@docusaurus/theme-mermaid`

### Step 4: Test Locally

```bash
cd docs
npm run start
```

Visit `https://localhost:3000/mcp-adr-analysis-server/` to preview.

### Step 5: Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

### Step 6: Deploy

The GitHub Actions workflow (`.github/workflows/deploy-docusaurus.yml`) will automatically deploy to GitHub Pages when you push to `main`.

## 🔧 Configuration Details

### Docusaurus Config (`docusaurus.config.js`)

Key configurations:

- **Base URL**: `/mcp-adr-analysis-server/` (for GitHub Pages)
- **Organization**: `tosin2013`
- **Project**: `mcp-adr-analysis-server`
- **Mermaid**: Enabled via `@docusaurus/theme-mermaid`
- **Search**: Configured for Algolia (requires setup)

### Sidebars Config (`sidebars.js`)

Multiple sidebars for different sections:

- `mainSidebar` - Complete documentation tree
- `tutorialsSidebar` - Tutorials only
- `howToSidebar` - How-to guides only
- `referenceSidebar` - Reference docs only
- `explanationSidebar` - Explanation content only

## 🎨 Customization

### Theme Colors

Edit `src/css/custom.css` to customize:

```css
:root {
  --ifm-color-primary: #646cff;
  /* ... other colors */
}
```

### Logo and Favicon

Place files in `static/img/`:

- `static/img/logo.png` - Site logo
- `static/img/favicon.ico` - Favicon
- `static/img/og-image.png` - Social media preview

## 📊 Feature Comparison

| Feature           | VitePress  | Docusaurus        | Notes                            |
| ----------------- | ---------- | ----------------- | -------------------------------- |
| Mermaid Diagrams  | ✅ Plugin  | ✅ Built-in theme | Better integration in Docusaurus |
| Search            | ✅ Local   | ✅ Algolia/Local  | More options in Docusaurus       |
| MDX Support       | ⚠️ Limited | ✅ Full           | React components in docs         |
| Versioning        | ❌         | ✅                | Built-in version management      |
| i18n              | ⚠️ Basic   | ✅ Advanced       | Better internationalization      |
| Plugin System     | ⚠️ Limited | ✅ Extensive      | Rich plugin ecosystem            |
| React Integration | ❌         | ✅                | Full React component support     |

## 🔍 Troubleshooting

### Build Errors

1. **Module not found errors**: Run `npm install` in the `docs/` directory
2. **Port already in use**: Change port with `npm run start -- --port 3001`
3. **Cache issues**: Run `npm run clear` to clear Docusaurus cache

### Broken Links

Docusaurus has stricter link checking. Update broken links in:

- Internal links: Use relative paths from docs root
- External links: Ensure they're valid URLs

### Styling Issues

1. Check `src/css/custom.css` for custom styles
2. Use browser DevTools to inspect and debug
3. Refer to [Infima CSS framework](https://infima.dev/) docs

## 📚 Resources

- [Docusaurus Documentation](https://docusaurus.io/docs)
- [Docusaurus Migration Guide](https://docusaurus.io/docs/migration)
- [Mermaid Plugin](https://docusaurus.io/docs/markdown-features/diagrams)
- [MDX Documentation](https://mdxjs.com/)

## ✅ Post-Migration Checklist

- [ ] Install dependencies (`npm install`)
- [ ] Copy assets to `static/img/`
- [ ] Test locally (`npm run start`)
- [ ] Verify all pages load correctly
- [ ] Check internal links work
- [ ] Test Mermaid diagrams render
- [ ] Build for production (`npm run build`)
- [ ] Deploy to GitHub Pages
- [ ] Update repository settings for GitHub Pages
- [ ] Verify deployed site works
- [ ] Update README with new documentation links
- [ ] Archive or remove VitePress files

## 🎉 Benefits of Docusaurus

1. **Better React Integration**: Full MDX support for React components
2. **Versioning**: Built-in documentation versioning
3. **Plugin Ecosystem**: Rich plugin system for extended functionality
4. **Better Search**: Multiple search options including Algolia
5. **Active Community**: Large, active community and regular updates
6. **Performance**: Optimized for production with code splitting
7. **Accessibility**: Better a11y support out of the box
8. **Customization**: More flexible theming and customization options

## 📝 Notes

- The migration preserves all existing documentation structure
- All Diataxis framework organization remains intact
- Mermaid diagrams continue to work seamlessly
- GitHub Pages deployment is automated via GitHub Actions
- Search functionality can be enhanced with Algolia (requires API key setup)

---

**Migration Date**: 2025-10-04  
**Migrated By**: Sophia (AI Assistant)  
**Status**: ✅ Complete
