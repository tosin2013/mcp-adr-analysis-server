# 📜 Documentation Scripts Guide

**Automated setup and management for your documentation website**

---

## 🎯 Available Scripts

### **🚀 setup-website.sh** (Advanced Bash Script)

**Full-featured script with error checking, colored output, and deployment guidance**

```bash
./setup-website.sh [command]
```

**Commands:**

- `setup` - Install dependencies and check prerequisites
- `dev` - Start development server with hot reload
- `build` - Build static site for production
- `preview` - Preview built site locally
- `deploy` - Deployment guidance for GitHub Pages
- `clean` - Clean build artifacts and cache
- `help` - Show detailed help

### **📦 npm Scripts** (Simple & Cross-Platform)

**Quick npm-based commands for common tasks**

```bash
npm run [command]
```

**Commands:**

- `setup` - Quick dependency installation
- `dev` - Start development server
- `build` - Build for production
- `deploy` - Build + deployment info
- `clean` - Clean build artifacts

---

## 🔄 When to Use Which

### **Use npm Scripts When:**

✅ You want simple, cross-platform commands  
✅ You're familiar with npm workflow  
✅ You don't need detailed progress feedback  
✅ You're on Windows or prefer npm

### **Use Bash Script When:**

✅ You want detailed progress information  
✅ You need comprehensive error checking  
✅ You want deployment guidance  
✅ You prefer rich terminal output  
✅ You're on macOS/Linux

---

## ⚡ Quick Reference

### **First Time Setup**

```bash
# Option A: npm (simple)
cd docs
npm run setup

# Option B: script (detailed)
cd docs
./setup-website.sh setup
```

### **Development**

```bash
# Option A: npm
npm run dev

# Option B: script
./setup-website.sh dev
```

### **Production Build**

```bash
# Option A: npm
npm run build

# Option B: script
./setup-website.sh build
```

### **Deployment**

```bash
# Option A: npm (just builds)
npm run deploy

# Option B: script (guidance + git integration)
./setup-website.sh deploy
```

---

## 🎨 Script Features

### **setup-website.sh Features:**

- 🎨 **Colored output** with emojis for better UX
- ✅ **Prerequisites checking** (Node.js version, location)
- 📊 **Build statistics** (file count, size)
- 🚀 **Git integration** for deployment
- 🧹 **Interactive cleanup** with confirmations
- ❌ **Error handling** with helpful messages

### **npm Scripts Features:**

- ⚡ **Fast execution** with minimal overhead
- 🌐 **Cross-platform** compatibility
- 📝 **Simple output** with status emojis
- 🔄 **Standard npm workflow** integration

---

## 🛠️ Customization

### **Adding New Commands**

**To npm scripts** (edit `package.json`):

```json
"scripts": {
  "your-command": "echo '🎯 Your command' && your-actual-command"
}
```

**To bash script** (edit `setup-website.sh`):

```bash
# Add to the case statement
"your-command")
    your_function
    ;;
```

### **Modifying Existing Commands**

- **npm scripts**: Edit the `scripts` section in `package.json`
- **bash script**: Edit the corresponding function in `setup-website.sh`

---

## 🔧 Troubleshooting Scripts

### **Script Permission Issues**

```bash
chmod +x setup-website.sh
```

### **npm Scripts Not Working**

```bash
# Verify package.json exists
ls -la package.json

# Reinstall if needed
rm -rf node_modules package-lock.json
npm install
```

### **Script Path Issues**

```bash
# Ensure you're in the docs directory
pwd  # Should end with /docs
cd docs  # If not
```

---

## 📊 Performance Comparison

| Task                | npm Scripts | Bash Script        | Winner |
| ------------------- | ----------- | ------------------ | ------ |
| **Speed**           | ⚡ Fast     | 🐌 Slower (checks) | npm    |
| **Feedback**        | 📝 Basic    | 🎨 Rich            | Script |
| **Error Handling**  | ❌ Basic    | ✅ Comprehensive   | Script |
| **Cross-Platform**  | ✅ Yes      | ⚠️ Unix only       | npm    |
| **Deployment Help** | 📝 Basic    | 🚀 Guided          | Script |

---

## 🎯 Recommended Workflow

### **For Developers:**

```bash
# Daily development
npm run dev

# Building for production
./setup-website.sh build  # Better feedback

# Deploying
./setup-website.sh deploy  # Guided process
```

### **For CI/CD:**

```bash
# Automated builds (use npm for consistency)
npm run setup
npm run build
```

### **For New Contributors:**

```bash
# First time (use script for guidance)
./setup-website.sh setup
./setup-website.sh help
```

---

## 📚 Related Documentation

- **[QUICK_START.md](QUICK_START.md)** - Fastest way to get started
- **[WEBSITE_SETUP.md](WEBSITE_SETUP.md)** - Complete setup documentation
- **[package.json](package.json)** - npm scripts configuration
- **[setup-website.sh](setup-website.sh)** - Bash script source code

---

**🎉 Both approaches get you to the same amazing documentation website - choose the one that fits your workflow best!**
