---
title: Deploy MCP ADR Analysis Server To Production
description: Complete guide for production deployment of MCP ADR Analysis Server v2.1.0
---

# 🚀 Deploy MCP ADR Analysis Server To Production

**Complete production deployment guide for enterprise environments**

> **Version**: 2.1.0 | **Target**: Production environments | **Security**: Enterprise-grade

## 📋 Prerequisites

### System Requirements

- **Node.js**: ≥20.0.0 (LTS recommended)
- **NPM**: ≥9.0.0
- **Memory**: Minimum 2GB RAM, 4GB+ recommended
- **Storage**: 1GB+ free space for cache and logs
- **Network**: HTTPS access to OpenRouter.ai API

### Security Requirements

- **API Keys**: OpenRouter.ai API key with appropriate limits
- **Environment**: Isolated production environment
- **Permissions**: Non-root user with limited privileges
- **Monitoring**: Log aggregation and monitoring setup

### Infrastructure Prerequisites

- **Load Balancer**: For high availability (optional)
- **Process Manager**: PM2 or systemd for process management
- **Reverse Proxy**: Nginx or similar (recommended)
- **SSL/TLS**: Valid certificates for HTTPS

## 🔧 Production Deployment Steps

### 1. Environment Preparation

```bash
# Create dedicated user for MCP server
sudo useradd -m -s /bin/bash mcpserver
sudo usermod -aG sudo mcpserver

# Switch to MCP server user
sudo su - mcpserver

# Create application directory
mkdir -p /opt/mcp-adr-analysis-server
cd /opt/mcp-adr-analysis-server
```

### 2. Install MCP ADR Analysis Server

```bash
# Install globally from NPM
npm install -g mcp-adr-analysis-server@2.1.0

# Verify installation
mcp-adr-analysis-server --version
# Should output: MCP ADR Analysis Server v2.1.0

# Alternative: Install from source
git clone https://github.com/tosin2013/mcp-adr-analysis-server.git
cd mcp-adr-analysis-server
npm install
npm run build
npm test  # Ensure all tests pass
```

### 3. Production Configuration

```bash
# Create production environment file
cat > /opt/mcp-adr-analysis-server/.env.production << 'EOF'
# MCP ADR Analysis Server Production Configuration
NODE_ENV=production
EXECUTION_MODE=full

# API Configuration
OPENROUTER_API_KEY=your_production_api_key_here
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Project Configuration
PROJECT_PATH=/opt/mcp-adr-analysis-server/projects
ADR_DIRECTORY=./adrs
LOG_LEVEL=info

# Security Configuration
ENABLE_CONTENT_MASKING=true
MASKING_STRATEGY=full
SECURITY_SCAN_ENABLED=true

# Performance Configuration
CACHE_ENABLED=true
CACHE_TTL=3600
MAX_CONCURRENT_REQUESTS=10

# Monitoring Configuration
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_PORT=8080
EOF

# Set secure permissions
chmod 600 /opt/mcp-adr-analysis-server/.env.production
```

### 4. Process Management with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > /opt/mcp-adr-analysis-server/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'mcp-adr-analysis-server',
    script: 'mcp-adr-analysis-server',
    cwd: '/opt/mcp-adr-analysis-server',
    env_file: '/opt/mcp-adr-analysis-server/.env.production',
    instances: 2,
    exec_mode: 'cluster',
    max_memory_restart: '2G',
    error_file: '/var/log/mcp-adr-analysis-server/error.log',
    out_file: '/var/log/mcp-adr-analysis-server/out.log',
    log_file: '/var/log/mcp-adr-analysis-server/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Create log directory
sudo mkdir -p /var/log/mcp-adr-analysis-server
sudo chown mcpserver:mcpserver /var/log/mcp-adr-analysis-server

# Start the application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Reverse Proxy Configuration (Nginx)

```bash
# Create Nginx configuration
sudo cat > /etc/nginx/sites-available/mcp-adr-analysis-server << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8080/health;
        access_log off;
    }

    # Metrics endpoint (restrict access)
    location /metrics {
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
        proxy_pass http://127.0.0.1:9090/metrics;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/mcp-adr-analysis-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Monitoring and Logging

```bash
# Install monitoring tools
npm install -g @pm2/io

# Configure log rotation
sudo cat > /etc/logrotate.d/mcp-adr-analysis-server << 'EOF'
/var/log/mcp-adr-analysis-server/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 mcpserver mcpserver
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Set up system monitoring
pm2 install pm2-server-monit
```

## 🔍 Production Validation

### Health Checks

```bash
# Test server health
curl -f http://localhost:8080/health
# Expected: {"status":"healthy","timestamp":"..."}

# Test MCP functionality
mcp-adr-analysis-server --test
# Expected: ✅ Health check passed

# Test API endpoints
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'
```

### Performance Testing

```bash
# Install testing tools
npm install -g autocannon

# Load test the server
autocannon -c 10 -d 30 http://localhost:3000/health

# Memory usage monitoring
pm2 monit
```

### Security Validation

```bash
# Run security scan
npm audit
gitleaks detect --source . --verbose

# Test content masking
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"analyze_content_security","arguments":{"content":"API_KEY=secret123"}}}'
```

## 🚨 Production Troubleshooting

### Common Issues

#### 1. Server Won't Start

```bash
# Check logs
pm2 logs mcp-adr-analysis-server

# Check configuration
mcp-adr-analysis-server --config

# Verify environment
cat /opt/mcp-adr-analysis-server/.env.production
```

#### 2. High Memory Usage

```bash
# Monitor memory
pm2 monit

# Restart if needed
pm2 restart mcp-adr-analysis-server

# Check for memory leaks
node --inspect mcp-adr-analysis-server
```

#### 3. API Rate Limiting

```bash
# Check OpenRouter API usage
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  https://openrouter.ai/api/v1/auth/key

# Adjust rate limits in nginx
sudo nano /etc/nginx/sites-available/mcp-adr-analysis-server
```

## 🔒 Security Best Practices

### API Key Management

- Use environment variables, never hardcode keys
- Rotate API keys regularly (monthly recommended)
- Monitor API usage and set appropriate limits
- Use separate keys for different environments

### Network Security

- Enable HTTPS only (no HTTP)
- Use strong SSL/TLS configuration
- Implement rate limiting
- Restrict access to metrics endpoints

### System Security

- Run as non-root user
- Keep system and dependencies updated
- Enable firewall (UFW/iptables)
- Regular security audits

## 📊 Monitoring and Maintenance

### Daily Checks

- [ ] Server health status
- [ ] Memory and CPU usage
- [ ] Error log review
- [ ] API rate limit status

### Weekly Maintenance

- [ ] Log rotation and cleanup
- [ ] Security updates
- [ ] Performance metrics review
- [ ] Backup verification

### Monthly Tasks

- [ ] API key rotation
- [ ] Security audit
- [ ] Dependency updates
- [ ] Capacity planning review

## 🆘 Emergency Procedures

### Server Down

1. Check PM2 status: `pm2 status`
2. Review logs: `pm2 logs --lines 100`
3. Restart if needed: `pm2 restart mcp-adr-analysis-server`
4. Check system resources: `htop`, `df -h`

### High Load

1. Scale horizontally: `pm2 scale mcp-adr-analysis-server +2`
2. Enable caching: Verify `CACHE_ENABLED=true`
3. Check rate limiting: Review nginx configuration
4. Monitor API usage: Check OpenRouter dashboard

### Security Incident

1. Isolate server: Block suspicious IPs
2. Rotate API keys: Generate new OpenRouter key
3. Review logs: Check for unauthorized access
4. Update security: Apply patches immediately

---

## 📚 Additional Resources

- **[Configuration Guide](./reference/environment-config.md)** - Detailed configuration options
- **[Security Guide](../explanation/security-philosophy.md)** - Security best practices
- **[Troubleshooting Guide](./troubleshooting.md)** - Common issues and solutions
- **[API Reference](./reference/api-reference.md)** - Complete API documentation

---

**🎯 Production Deployment Checklist**

- [ ] System requirements met
- [ ] Security requirements implemented
- [ ] MCP server installed and configured
- [ ] Process management setup (PM2)
- [ ] Reverse proxy configured (Nginx)
- [ ] Monitoring and logging enabled
- [ ] Health checks passing
- [ ] Security validation complete
- [ ] Emergency procedures documented
- [ ] Team trained on operations

**Your MCP ADR Analysis Server is now production-ready! 🚀**

### 3. Verify results

```bash
# Verification command
echo "Verify success"
```

## Troubleshooting

If you encounter issues:

- Check condition 1
- Verify setting 2

## Related Guides

- [Another How-To Guide](./another-guide.md)
- [Reference Documentation](./reference/)
