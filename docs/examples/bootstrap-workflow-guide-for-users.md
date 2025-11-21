# Bootstrap Deployment Workflow - User Guide

> **👋 Welcome!** This guide explains what happens when you run the bootstrap tool and how to use the generated scripts.

---

## 🎯 What You'll Get

When you call `bootstrap_validation_loop`, the tool will:

1. ✅ Detect your deployment platform (Kubernetes, Docker, OpenShift, etc.)
2. ✅ Generate deployment scripts customized for your platform
3. ✅ Create an ADR documenting your deployment plan
4. ✅ Track all resources so you can clean them up later
5. ✅ Give you validation scripts to verify everything works

## 📊 Visual Workflow - What Happens Step by Step

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: You Call the Tool                                  │
│                                                             │
│  You: "bootstrap_validation_loop"                          │
│  Tool: "Let me detect your platform..."                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Platform Detection                                  │
│                                                             │
│  Tool looks at your files:                                 │
│  • Found kubernetes.yaml → "You're using Kubernetes!"      │
│  • Found Dockerfile → "You have Docker too!"               │
│  • Confidence: 92% sure it's Kubernetes                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Load Best Practices                                │
│                                                             │
│  Tool: "Loading Kubernetes best practices..."              │
│  • Official documentation: kubernetes.io                    │
│  • Deployment steps: 6 phases                              │
│  • Validation checks: 5 critical checks                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Start Tracking Resources                           │
│                                                             │
│  Tool: "Creating SystemCard to track everything..."        │
│  • Namespace: myapp ✓                                      │
│  • Deployment: myapp ✓                                     │
│  • Service: myapp ✓                                        │
│                                                             │
│  (This lets you clean up everything later!)                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Generate Your Deployment Plan                      │
│                                                             │
│  Tool creates an ADR document with:                        │
│  ✓ What platform you're using                             │
│  ✓ What files you need (deployment.yaml, etc.)            │
│  ✓ What environment variables are required                │
│  ✓ Step-by-step deployment instructions                   │
│  ✓ How to validate it worked                              │
│  ✓ How to clean up when done                              │
│                                                             │
│  File: docs/adrs/bootstrap-deployment-{timestamp}.md       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Generate Deployment Scripts                        │
│                                                             │
│  Tool creates 3 scripts for you:                           │
│                                                             │
│  📝 bootstrap.sh                                           │
│     → Deploys your app automatically                       │
│                                                             │
│  📝 validate_bootstrap.sh                                  │
│     → Checks if deployment worked                          │
│                                                             │
│  📝 cleanup.sh                                             │
│     → Removes everything cleanly                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 7: You're Ready to Deploy!                            │
│                                                             │
│  Tool: "✅ Bootstrap complete! Here's what to do next:"    │
│                                                             │
│  1. Review the ADR in docs/adrs/                           │
│  2. Run ./bootstrap.sh to deploy                           │
│  3. Run ./validate_bootstrap.sh to verify                  │
│  4. When done, run ./cleanup.sh to remove everything       │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Files Created in Your Project

After running the tool, you'll see these new files:

```
your-project/
├── docs/
│   └── adrs/
│       └── bootstrap-deployment-2025-01-23.md  ← Your deployment plan
│
├── bootstrap.sh                ← Deploy script (run this!)
├── validate_bootstrap.sh       ← Validation script
├── cleanup.sh                  ← Cleanup script
└── .system-card.json           ← Resource tracking (internal use)
```

## 🚀 How to Use the Generated Scripts

### 1️⃣ First: Read Your ADR

```bash
# Open and read the generated ADR
cat docs/adrs/bootstrap-deployment-*.md
```

**What to look for:**
- ✅ Is Kubernetes the right platform? (or Docker, etc.)
- ✅ Do you have all required files?
- ✅ Are all environment variables set?
- ✅ Do the deployment steps make sense?

### 2️⃣ Second: Run Bootstrap Script

```bash
# Make sure you're connected to your cluster
kubectl cluster-info  # or: docker ps

# Deploy your application
./bootstrap.sh
```

**What this does:**
```
Phase 1: Check prerequisites (kubectl installed, cluster accessible)
         ↓
Phase 2: Create namespace (myapp)
         ↓
Phase 3: Create secrets (from your .env file)
         ↓
Phase 4: Deploy application (pods, services)
         ↓
Phase 5: Deploy ingress (if needed)
         ↓
Phase 6: Wait for everything to be ready
         ↓
Done! ✅
```

**Watch the output:**
```
========================================
Bootstrap Deployment - kubernetes
Pattern: Kubernetes
========================================

Starting Phase 1: Prerequisites Validation
  → Verify kubectl is installed
kubectl version --client
  → Verify cluster connectivity
kubectl cluster-info
✓ Phase 1 complete

Starting Phase 2: Namespace Setup
  → Create namespace
kubectl create namespace myapp
✓ Phase 2 complete

...

========================================
✅ Bootstrap deployment complete!
========================================
```

### 3️⃣ Third: Validate Deployment

```bash
# Check if everything deployed correctly
./validate_bootstrap.sh
```

**What this checks:**
- ✅ Can we connect to the cluster?
- ✅ Is the namespace created?
- ✅ Are all pods running?
- ✅ Does the service have endpoints?
- ✅ Is the application responding?

**Success looks like:**
```
========================================
Bootstrap Validation
========================================

Checking: Cluster Connection
  ✅ PASSED: Cluster Connection

Checking: Deployment Ready
  ✅ PASSED: Deployment Ready

Checking: Service Has Endpoints
  ✅ PASSED: Service Has Endpoints

Checking: Pods Running
  ✅ PASSED: Pods Running

========================================
✅ All validation checks passed!
========================================
```

**If something fails:**
```
Checking: Deployment Ready
  ❌ FAILED: Deployment Ready
     Some pods are not in Running state
     Remediation steps:
       - Check pod status: kubectl describe pod <pod-name>
       - View pod logs: kubectl logs <pod-name>
       - Check resource limits and requests
```

### 4️⃣ Fourth: When Done - Cleanup

```bash
# Remove everything cleanly
./cleanup.sh
```

**What this removes:**
```
Phase 1: Delete application (deployments, services)
         ↓
Phase 2: Delete secrets
         ↓
Phase 3: Delete namespace
         ↓
Done! Everything cleaned up ✅
```

## 🔍 Understanding the SystemCard

**What is SystemCard?**

SystemCard is like a "shopping list" that tracks everything the tool creates for you. This way, when you clean up, it knows exactly what to delete.

**What it tracks:**
```json
{
  "resources": [
    "namespace: myapp",
    "deployment: myapp",
    "service: myapp",
    "secret: app-secrets"
  ]
}
```

**Why this matters:**

❌ Without SystemCard:
```bash
# You have to remember everything you created
kubectl delete deployment myapp
kubectl delete service myapp
kubectl delete secret app-secrets
kubectl delete namespace myapp
# Did I forget anything? 🤔
```

✅ With SystemCard:
```bash
# Just run cleanup.sh - it knows everything!
./cleanup.sh
# All done! Nothing left behind ✅
```

## 🎬 Complete Example Walkthrough

Let's say you're deploying a Node.js app to Kubernetes.

### Before You Start

**What you have:**
```
my-nodejs-app/
├── src/
│   └── index.js
├── Dockerfile
├── deployment.yaml      ← Kubernetes manifest
├── service.yaml         ← Kubernetes service
└── .env                 ← Environment variables
```

### Step 1: Call the Bootstrap Tool

```bash
# In Claude or your MCP client
"Run bootstrap_validation_loop for my project"
```

**Tool responds:**
```
🔍 Detecting platform...
📋 Found: Kubernetes (92% confidence)
✅ Loaded: Kubernetes validated pattern
📝 Generated: bootstrap-deployment-2025-01-23.md
📝 Generated: bootstrap.sh
📝 Generated: validate_bootstrap.sh
📝 Generated: cleanup.sh
```

### Step 2: Review the Plan

```bash
cat docs/adrs/bootstrap-deployment-2025-01-23.md
```

**You see:**
- Platform: Kubernetes ✓
- Required files: deployment.yaml ✓, service.yaml ✓, .env ✓
- Environment variables: DATABASE_URL, JWT_SECRET
- 6 deployment phases with commands
- 5 validation checks

**You think:** "Looks good! Let's deploy!"

### Step 3: Deploy

```bash
# First, make sure you're connected to your cluster
kubectl cluster-info
# Output: Kubernetes control plane is running at https://...

# Now deploy
./bootstrap.sh
```

**You see:**
```
========================================
Bootstrap Deployment - kubernetes
========================================

Phase 1: Prerequisites Validation
  ✓ kubectl is installed
  ✓ Cluster is accessible

Phase 2: Namespace Setup
  ✓ Created namespace: myapp

Phase 3: Secrets
  ✓ Created secrets from .env

Phase 4: Application Deployment
  ✓ Deployment created: myapp
  ✓ Service created: myapp

Phase 5: Waiting for pods...
  ✓ Pods are running (3/3)

========================================
✅ Bootstrap complete! (took 2m 34s)
========================================
```

### Step 4: Validate

```bash
./validate_bootstrap.sh
```

**You see:**
```
Checking: Cluster Connection      ✅ PASSED
Checking: Namespace Exists         ✅ PASSED
Checking: Deployment Ready         ✅ PASSED
Checking: Service Has Endpoints    ✅ PASSED
Checking: Pods Running             ✅ PASSED

✅ All 5 checks passed! Your app is live!
```

### Step 5: Access Your App

```bash
# Get the service IP
kubectl get service myapp

# Output:
# NAME    TYPE           EXTERNAL-IP      PORT(S)
# myapp   LoadBalancer   203.0.113.42     80:30123/TCP

# Open in browser
open http://203.0.113.42
```

**🎉 Your app is live!**

### Step 6: Later - Cleanup

```bash
# When you're done testing
./cleanup.sh
```

**You see:**
```
🧹 Starting deployment cleanup...

Phase 1: Delete application
  ✓ Deleted deployment: myapp
  ✓ Deleted service: myapp

Phase 2: Delete secrets
  ✓ Deleted secret: app-secrets

Phase 3: Delete namespace
  ✓ Deleted namespace: myapp

✅ Cleanup complete! (took 45s)
Nothing left behind - all resources removed.
```

## 🤔 Common Questions

### Q: Do I need to understand all the internals?

**A:** No! You just need to:
1. Read the generated ADR
2. Run `./bootstrap.sh`
3. Run `./validate_bootstrap.sh`
4. Use `./cleanup.sh` when done

The tool handles all the complexity.

### Q: What if I want to customize the deployment?

**A:** You can edit the generated scripts! They're just bash scripts with clear phases. Or, modify your deployment.yaml and re-run the tool.

### Q: Can I use this in CI/CD?

**A:** Yes! Example:

```yaml
# .github/workflows/deploy.yml
- name: Deploy to Kubernetes
  run: |
    ./bootstrap.sh
    ./validate_bootstrap.sh
```

### Q: What if validation fails?

**A:** The validation script tells you exactly what failed and how to fix it. Example:

```
❌ FAILED: Deployment Ready
   Remediation steps:
   - Check pod status: kubectl describe pod <pod-name>
   - View pod logs: kubectl logs <pod-name>
```

Follow the remediation steps, then re-run validation.

### Q: Can I deploy to multiple environments?

**A:** Yes! The tool accepts `targetEnvironment` parameter:

```typescript
bootstrap_validation_loop({
  targetEnvironment: "production"  // or "staging", "development"
})
```

This generates environment-specific ADRs and scripts.

### Q: What platforms are supported?

The tool auto-detects:
- ✅ Kubernetes
- ✅ OpenShift
- ✅ Docker / Docker Compose
- ✅ Firebase
- ✅ AWS
- ✅ More being added!

If your platform isn't supported, the tool uses AI to generate a deployment plan.

## 🎓 Pro Tips

### Tip 1: Read the ADR First

The ADR has **everything** you need to know:
- What platform was detected
- What files you need
- What could go wrong
- How to fix problems

### Tip 2: Run Validation Often

```bash
# After deployment
./validate_bootstrap.sh

# After making changes
./validate_bootstrap.sh

# Before committing
./validate_bootstrap.sh
```

### Tip 3: Keep Scripts in Git

```bash
git add bootstrap.sh validate_bootstrap.sh cleanup.sh
git commit -m "Add deployment automation"
```

Now your whole team can use them!

### Tip 4: Use Cleanup in CI/CD

```yaml
# Test workflow
- name: Deploy test environment
  run: ./bootstrap.sh

- name: Run tests
  run: npm test

- name: Cleanup test environment
  run: ./cleanup.sh
```

This gives you clean test environments every time.

### Tip 5: Check SystemCard

```bash
# See what resources are being tracked
cat .system-card.json | jq .
```

This shows you exactly what will be deleted during cleanup.

## 📚 Next Steps

1. **Run the tool** and get your deployment scripts
2. **Read your ADR** to understand the plan
3. **Deploy** with `./bootstrap.sh`
4. **Validate** with `./validate_bootstrap.sh`
5. **Use in CI/CD** for automated deployments

## 🆘 Need Help?

- **ADR unclear?** Open an issue: [GitHub Issues](https://github.com/tosin2013/mcp-adr-analysis-server/issues)
- **Validation failed?** Check the remediation steps in the validation output
- **Want to customize?** Edit the generated scripts - they're just bash!
- **Found a bug?** Please report it so we can improve!

---

**Remember:** The tool does the hard work of detecting your platform, finding best practices, and generating scripts. You just run them! 🚀

**Generated by**: MCP ADR Analysis Server v2.1.11
**Documentation**: https://github.com/tosin2013/mcp-adr-analysis-server/tree/main/docs
