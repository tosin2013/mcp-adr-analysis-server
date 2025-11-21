# Setting Up Ansible Vault for Secrets

## Quick Setup

### Option 1: Environment Variables (Recommended for Testing)

```bash
export OPENROUTER_API_KEY="sk-or-v1-your-api-key-here"
export PROJECT_PATH="/path/to/your/project"

# Run playbook
source venv-ansible/bin/activate
cd playbooks
ansible-playbook test-mcp-server-enhanced.yml
```

### Option 2: Ansible Vault (Recommended for Production)

1. **Create vault file**:
```bash
cd playbooks
cp vault.yml.example vault.yml
# Edit vault.yml with your values
ansible-vault edit vault.yml
```

2. **Create vault password file** (optional):
```bash
echo "your-vault-password" > ~/.ansible/vault_pass
chmod 600 ~/.ansible/vault_pass
```

3. **Run playbook with vault**:
```bash
# With password prompt
ansible-playbook test-mcp-server-enhanced.yml --ask-vault-pass

# With password file
ansible-playbook test-mcp-server-enhanced.yml --vault-password-file ~/.ansible/vault_pass
```

### Option 3: Direct Variable Override

```bash
ansible-playbook test-mcp-server-enhanced.yml \
  -e "openrouter_api_key=sk-or-v1-your-key" \
  -e "project_path=/path/to/project"
```

## Environment Variables Priority

The playbook checks for secrets in this order:
1. Vault variables (`vault_openrouter_api_key`)
2. Environment variables (`OPENROUTER_API_KEY`)
3. Default values (empty string)

## Security Best Practices

1. **Never commit secrets** to git
2. **Use vault** for production deployments
3. **Use environment variables** for local testing
4. **Add vault.yml to .gitignore**:
```bash
echo "playbooks/vault.yml" >> .gitignore
```

## Example vault.yml Structure

```yaml
---
vault_openrouter_api_key: "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"
vault_project_path: "/home/lab-user/automated-braking"
```

