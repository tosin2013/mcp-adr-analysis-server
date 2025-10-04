# 🚀 Quick Start - Documentation Website

**Get your documentation website running in under 2 minutes!**

---

## ⚡ Super Quick Start (1 minute)

```bash
cd docs
npm run setup
npm run dev
```

**→ Open https://localhost:5173 to see your website!**

---

## 📋 Two Options for Setup

### **Option A: npm Scripts (Recommended)**
```bash
cd docs

# Setup (installs dependencies)
npm run setup

# Start development server
npm run dev

# Build for production
npm run build

# Clean up
npm run clean
```

### **Option B: Bash Script (Advanced)**
```bash
cd docs

# First-time setup
./setup-website.sh setup

# Start development server
./setup-website.sh dev

# Build for production
./setup-website.sh build

# Deploy guidance
./setup-website.sh deploy

# Clean up
./setup-website.sh clean

# Help
./setup-website.sh help
```

---

## 🎯 What Each Command Does

| Command | npm Version | Script Version | Purpose |
|---------|-------------|----------------|---------|
| **Setup** | `npm run setup` | `./setup-website.sh setup` | Install dependencies & check prerequisites |
| **Development** | `npm run dev` | `./setup-website.sh dev` | Start development server with hot reload |
| **Build** | `npm run build` | `./setup-website.sh build` | Create production build |
| **Deploy** | `npm run deploy` | `./setup-website.sh deploy` | Build + deployment guidance |
| **Clean** | `npm run clean` | `./setup-website.sh clean` | Remove build artifacts |

---

## 🌐 Deployment Quick Guide

### **GitHub Pages (Automatic)**
1. **Push to main branch** - the website deploys automatically
2. **Access at**: `https://username.github.io/mcp-adr-analysis-server/`

### **Manual Deploy**
```bash
# Build the site
npm run build

# Deploy to any hosting service
# Upload contents of .vitepress/dist/ folder
```

---

## 🎨 Common Customizations

### **Change Site Colors**
Edit `./.vitepress/config.js`:
```js
themeConfig: {
  // Add your branding here
}
```

### **Add Your Logo**
1. Put logo in `./public/logo.svg`
2. It's automatically used in the config

### **Custom Domain**
Update `base` in `config.js`:
```js
base: '/', // For custom domain
// base: '/mcp-adr-analysis-server/', // For GitHub Pages
```

---

## 🆘 Troubleshooting

### **Script Permission Error**
```bash
chmod +x ./setup-website.sh
```

### **Node.js Version Error**
Ensure Node.js ≥18.0.0:
```bash
node --version  # Should be v18.0.0+
```

### **Port Already in Use**
Kill existing process:
```bash
# Find process using port 5173
lsof -ti:5173 | xargs kill -9
```

### **Build Fails**
Clear cache and reinstall:
```bash
npm run clean
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 What You Get

✅ **Professional Documentation Website**  
✅ **Instant Search** across all content  
✅ **Mobile-Responsive** design  
✅ **Auto-Deploy** via GitHub Actions  
✅ **Lightning Fast** loading  
✅ **SEO Optimized** for discoverability  

---

**Ready to launch?** → `cd docs && npm run setup && npm run dev`

**Need help?** → Check [WEBSITE_SETUP.md](WEBSITE_SETUP.md) for detailed instructions

