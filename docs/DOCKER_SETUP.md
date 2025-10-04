# Docker Setup for Docusaurus

This guide explains how to build and run the Docusaurus documentation site using Docker.

## 🐳 Prerequisites

- Docker installed (version 20.10+)
- Docker Compose installed (version 2.0+)

Check versions:
```bash
docker --version
docker-compose --version
```

## 🚀 Quick Start

### Development Mode (Hot Reload)

```bash
cd docs
docker-compose --profile dev up
```

Visit: http://localhost:3000/mcp-adr-analysis-server/

Changes to markdown files will auto-reload! 🔥

### Production Mode (Nginx)

```bash
cd docs
docker-compose --profile prod up --build
```

Visit: http://localhost:8080/mcp-adr-analysis-server/

### Build Only (Test Build)

```bash
cd docs
docker-compose --profile build up --build
```

Output will be in `build/` directory.

## 📋 Docker Commands

### Development

```bash
# Start dev server with hot reload
docker-compose --profile dev up

# Start in background
docker-compose --profile dev up -d

# View logs
docker-compose --profile dev logs -f

# Stop
docker-compose --profile dev down
```

### Production

```bash
# Build and run production server
docker-compose --profile prod up --build

# Run in background
docker-compose --profile prod up -d

# Stop
docker-compose --profile prod down
```

### Rebuild

```bash
# Force rebuild (no cache)
docker-compose --profile dev build --no-cache

# Rebuild specific service
docker-compose build docusaurus-dev
```

## 🔧 Docker Architecture

### Multi-Stage Dockerfile

The Dockerfile uses 3 stages:

1. **Builder Stage** (`builder`)
   - Installs dependencies
   - Builds static site
   - Output: `build/` directory

2. **Production Stage** (`production`)
   - Nginx Alpine image
   - Serves built files
   - Optimized for performance

3. **Development Stage** (`development`)
   - Node.js Alpine image
   - Hot reload enabled
   - Volume mounts for live editing

### Docker Compose Profiles

- `dev` - Development server (port 3000)
- `prod` - Production server (port 8080)
- `build` - Build only (no server)

## 📁 File Structure

```
docs/
├── Dockerfile              # Multi-stage build
├── docker-compose.yml      # Service orchestration
├── nginx.conf             # Nginx configuration
├── .dockerignore          # Exclude files from build
└── DOCKER_SETUP.md        # This guide
```

## 🎯 Use Cases

### 1. Local Development

**Best for:** Writing documentation with live preview

```bash
docker-compose --profile dev up
```

**Features:**
- Hot reload on file changes
- Fast feedback loop
- No local Node.js required

### 2. Production Testing

**Best for:** Testing final build before deployment

```bash
docker-compose --profile prod up --build
```

**Features:**
- Nginx serving (production-like)
- Gzip compression
- Security headers
- Asset caching

### 3. CI/CD Integration

**Best for:** Automated builds in pipelines

```bash
docker-compose --profile build up --build
```

**Features:**
- Build verification
- Output artifacts
- No server overhead

## 🔍 Troubleshooting

### Port Already in Use

**Development (3000):**
```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead
```

**Production (8080):**
```bash
# Change port in docker-compose.yml
ports:
  - "8081:80"  # Use 8081 instead
```

### Build Errors

```bash
# Clear Docker cache
docker-compose down
docker system prune -a

# Rebuild from scratch
docker-compose --profile dev build --no-cache
```

### Volume Permission Issues

```bash
# Fix permissions (Linux/Mac)
sudo chown -R $USER:$USER .

# Or run with user flag
docker-compose --profile dev up --user $(id -u):$(id -g)
```

### Container Won't Start

```bash
# Check logs
docker-compose --profile dev logs

# Check running containers
docker ps -a

# Remove old containers
docker-compose down -v
```

## 🚢 Deployment Workflows

### Local Testing Workflow

```bash
# 1. Develop with hot reload
docker-compose --profile dev up

# 2. Test production build
docker-compose --profile prod up --build

# 3. Verify everything works
# Visit http://localhost:8080/mcp-adr-analysis-server/

# 4. Push to GitHub (triggers GitHub Actions)
git add .
git commit -m "docs: Update documentation"
git push origin main
```

### CI/CD Testing

```bash
# In GitHub Actions or CI pipeline
cd docs
docker-compose --profile build up --build

# Verify build succeeded
if [ -d "build" ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed"
  exit 1
fi
```

## 📊 Performance Optimization

### Nginx Configuration

The `nginx.conf` includes:
- ✅ Gzip compression
- ✅ Static asset caching (1 year)
- ✅ Security headers
- ✅ Client-side routing support

### Docker Image Size

- **Development:** ~400MB (includes dev dependencies)
- **Production:** ~50MB (Alpine + Nginx + static files)

### Build Speed

```bash
# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker-compose build

# Or set in environment
export DOCKER_BUILDKIT=1
```

## 🔐 Security

### Nginx Security Headers

```nginx
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
```

### Best Practices

- ✅ Multi-stage builds (smaller images)
- ✅ Alpine base images (minimal attack surface)
- ✅ No root user in containers
- ✅ .dockerignore (exclude sensitive files)
- ✅ Security headers in Nginx

## 🎨 Customization

### Change Ports

Edit `docker-compose.yml`:

```yaml
services:
  docusaurus-dev:
    ports:
      - "3001:3000"  # Change 3001 to your port
```

### Add Environment Variables

```yaml
services:
  docusaurus-dev:
    environment:
      - NODE_ENV=development
      - CUSTOM_VAR=value
```

### Custom Nginx Config

Edit `nginx.conf` for:
- Custom headers
- Proxy settings
- SSL/TLS configuration
- Rate limiting

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docusaurus Docker Guide](https://docusaurus.io/docs/deployment#deploying-to-docker)

## ✅ Verification Checklist

After Docker setup:

- [ ] Development server runs: `docker-compose --profile dev up`
- [ ] Hot reload works (edit a .md file)
- [ ] Production build succeeds: `docker-compose --profile prod up --build`
- [ ] Production site accessible at http://localhost:8080
- [ ] All pages load correctly
- [ ] Navigation works
- [ ] Search functionality works
- [ ] Static assets load (images, CSS, JS)

## 🎉 Success!

Your Docusaurus documentation is now running in Docker! 

**Quick Commands:**
```bash
# Development
docker-compose --profile dev up

# Production
docker-compose --profile prod up --build

# Stop all
docker-compose down
```

---

**Need Help?** Check the [Docusaurus Migration Guide](./DOCUSAURUS_MIGRATION.md) or [Quick Start Guide](./DOCUSAURUS_QUICKSTART.md).
