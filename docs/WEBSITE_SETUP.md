# 🌐 Documentation Website Setup

**Your Diataxis-structured documentation is now ready to become a beautiful, searchable website using VitePress!**

---

## 🚀 Quick Start

### **Super Quick (1 minute)**
```bash
cd docs
npm run setup
npm run dev
```
**→ Open http://localhost:5173 to see your website!**

### **Using Scripts (Advanced)**
```bash
cd docs
./setup-website.sh setup  # First-time setup
./setup-website.sh dev    # Start development
```

### **Manual Steps**
```bash
cd docs
npm install               # Install dependencies
npm run docs:dev         # Start development server
npm run docs:build       # Build for production
```

**Full guide**: See [QUICK_START.md](QUICK_START.md) for all options

---

## ✨ What You Get

### **🎯 Perfect Diataxis Navigation**
- **Clear user paths** based on goals (Learn/Solve/Lookup/Understand)
- **Intuitive sidebar** organized by documentation type
- **Smart search** across all 37 tools and concepts

### **📱 Professional Design**
- **Responsive layout** works perfectly on mobile and desktop
- **Fast loading** with optimized static site generation
- **Accessible** following web accessibility standards

### **🔍 Powerful Features**
- **Full-text search** with instant results
- **Syntax highlighting** for code examples
- **Cross-references** between related topics
- **Edit links** for community contributions

---

## 🎨 Customization Options

### **Theme Configuration**
Edit `./.vitepress/config.js` to customize:

```js
// Change colors, fonts, and layout
themeConfig: {
  // Your customizations here
}
```

### **Add Custom Pages**
Create new `.md` files in the docs directory and they'll automatically be included.

### **Modify Navigation**
Update the sidebar configuration in `config.js` to reorganize content.

---

## 🚀 Deployment Options

### **Option 1: GitHub Pages (Recommended)**

1. **Enable GitHub Pages** in your repository settings
2. **Push to main branch** - the website deploys automatically via GitHub Actions
3. **Access your site** at `https://username.github.io/mcp-adr-analysis-server/`

The GitHub Actions workflow is already configured in `.github/workflows/docs.yml`

### **Option 2: Vercel**

1. **Connect your GitHub repo** to Vercel
2. **Set build settings**:
   - Build Command: `cd docs && npm run docs:build`
   - Output Directory: `./.vitepress/dist`
3. **Deploy automatically** on every push

### **Option 3: Netlify**

1. **Connect your GitHub repo** to Netlify  
2. **Set build settings**:
   - Build Command: `cd docs && npm run docs:build`
   - Publish Directory: `./.vitepress/dist`
3. **Deploy automatically** on every push

### **Option 4: Self-Hosted**

```bash
# Build the site
cd docs
npm run docs:build

# Serve with any web server
npx serve .vitepress/dist
# or
python -m http.server -d .vitepress/dist
```

---

## 🔧 Advanced Configuration

### **Custom Domain**
If using a custom domain, update `base` in `config.js`:

```js
export default defineConfig({
  base: '/', // Change from '/mcp-adr-analysis-server/'
  // ... rest of config
})
```

### **Analytics Integration**
Add Google Analytics or other tracking:

```js
head: [
  // Add analytics scripts here
  ['script', { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID' }],
  ['script', {}, `window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');`]
]
```

### **Search Enhancement**
For even better search, consider integrating Algolia:

```js
search: {
  provider: 'algolia',
  options: {
    appId: 'YOUR_APP_ID',
    apiKey: 'YOUR_SEARCH_API_KEY',
    indexName: 'YOUR_INDEX_NAME'
  }
}
```

---

## 📊 Performance Features

### **Built-in Optimizations**
- ⚡ **Fast builds** with Vite's optimized bundling
- 🚀 **Lightning-fast loading** with code splitting
- 📱 **Mobile optimized** with responsive design
- 🔍 **SEO optimized** with proper meta tags

### **Performance Monitoring**
- Check Core Web Vitals in browser dev tools
- Use Lighthouse for performance audits
- Monitor bundle size with `npm run docs:build --debug`

---

## 🛠️ Development Workflow

### **Local Development**
```bash
# Start dev server (hot reload enabled)
npm run docs:dev

# Build and preview
npm run docs:build
npm run docs:preview
```

### **Content Updates**
1. **Edit markdown files** in the docs directory
2. **See changes instantly** with hot reload
3. **Commit and push** to deploy automatically

### **Testing**
```bash
# Build and test locally
npm run docs:build
npm run docs:preview

# Check for broken links
npx linkinator ./.vitepress/dist --recurse
```

---

## 🎯 SEO Optimization

Your site is pre-configured for excellent SEO:

- ✅ **Semantic HTML** structure
- ✅ **Meta descriptions** for each page
- ✅ **Open Graph** tags for social sharing
- ✅ **JSON-LD** structured data
- ✅ **XML sitemap** generation
- ✅ **Mobile-friendly** responsive design

### **Enhance Further**
- Add page-specific meta descriptions in frontmatter
- Include relevant images with alt text
- Use descriptive headings and structure
- Add internal links between related topics

---

## 🆘 Troubleshooting

### **Common Issues**

**Build fails with "Cannot resolve module"**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Images not loading**
- Ensure images are in `./public/` directory
- Reference with `/image-name.jpg` (leading slash)

**Search not working**
- Ensure all markdown files have proper frontmatter
- Check for malformed markdown syntax

**Styling issues**
- Clear browser cache
- Check for CSS conflicts in custom styles

### **Getting Help**
- **VitePress Docs**: https://vitepress.dev/
- **GitHub Issues**: Report specific problems
- **Community**: Join VitePress Discord for quick help

---

## ✅ Launch Checklist

Before going live:

- [ ] **Test all navigation** links work correctly
- [ ] **Verify search** finds relevant content
- [ ] **Check mobile** responsiveness
- [ ] **Validate links** with linkinator
- [ ] **Test build process** completes successfully
- [ ] **Configure custom domain** if needed
- [ ] **Set up analytics** tracking
- [ ] **Enable HTTPS** on your hosting platform

---

**🎉 Your documentation website is ready to launch!**

**Next Steps:**
1. Run `npm run docs:dev` to see your site locally
2. Customize the theme colors and branding in `config.js`
3. Deploy to your preferred hosting platform
4. Share the URL with your team and community!

---

*This website setup leverages your excellent Diataxis-structured documentation to create a professional, searchable, and user-friendly experience that guides users exactly where they need to go.*
