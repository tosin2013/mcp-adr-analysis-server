# Ansible Playbooks for MCP Server Testing

This directory contains Ansible playbooks for testing and validating the MCP ADR Analysis Server using the `tosin2013.mcp_audit` collection from Ansible Galaxy.

## Prerequisites

1. **Python 3.11**: Required for Ansible and the MCP Python SDK
2. **Virtual Environment**: A Python 3.11 virtual environment is already set up at `../venv-ansible/`
3. **MCP Server**: The server must be built (`npm run build`)

## Setup

### 1. Activate the Virtual Environment

```bash
source venv-ansible/bin/activate
```

### 2. Verify Ansible Installation

```bash
ansible --version
ansible-galaxy collection list | grep mcp_audit
```

### 3. Install Collection (if needed)

```bash
ansible-galaxy collection install -r ../ansible-requirements.yml
```

### 4. Configure Secrets

See [VAULT_SETUP.md](VAULT_SETUP.md) for details on setting up secrets securely.

**Quick option**: Set environment variables:
```bash
export OPENROUTER_API_KEY="sk-or-v1-your-api-key"
export PROJECT_PATH="/path/to/your/project"
```

## Running Playbooks

### Test MCP Server

```bash
# Activate virtual environment
source ../venv-ansible/bin/activate

# Run the test playbook
ansible-playbook test-mcp-server.yml

# Run with verbose output
ansible-playbook test-mcp-server.yml -v

# Run with extra verbose output
ansible-playbook test-mcp-server.yml -vvv
```

### Customize Server Path

You can override the server path using extra variables:

```bash
ansible-playbook test-mcp-server.yml -e "mcp_server_path=/path/to/custom/server.js"
```

### Set Environment Variables

```bash
# Via command line
ansible-playbook test-mcp-server-enhanced.yml \
  -e "openrouter_api_key=sk-or-v1-your-key" \
  -e "project_path=/path/to/project"

# Via environment variables
export OPENROUTER_API_KEY="sk-or-v1-your-key"
export PROJECT_PATH="/path/to/project"
ansible-playbook test-mcp-server-enhanced.yml
```

### Use Ansible Vault

```bash
# Create vault file
cp vault.yml.example vault.yml
ansible-vault edit vault.yml

# Run with vault
ansible-playbook test-mcp-server-enhanced.yml --ask-vault-pass
```

## Available Playbooks

1. **test-mcp-server.yml** - Basic server validation
2. **test-mcp-server-enhanced.yml** - Comprehensive tool testing with environment variables
3. **test-mcp-server-with-ollama.yml** - Ollama integration testing

## Configuration

The playbooks support the following environment variables (matching MCP client configuration):

- `PROJECT_PATH`: Path to the project being analyzed
- `ADR_DIRECTORY`: Directory for ADR files (default: `docs/adrs`)
- `LOG_LEVEL`: Logging level (default: `INFO`, options: `ERROR`, `WARN`, `INFO`, `DEBUG`)
- `EXECUTION_MODE`: Execution mode (default: `full`)
- `AI_MODEL`: AI model to use (default: `openai/codex-mini`)
- `OPENROUTER_API_KEY`: API key for OpenRouter (required for AI features)

These can be set via:
1. Ansible Vault (`vault.yml`)
2. Environment variables
3. Extra variables (`-e` flag)

## Example Output

```
PLAY [Test MCP ADR Analysis Server] ******************************************

TASK [Get MCP server information] ********************************************
ok: [localhost]

TASK [Display server information] *********************************************
ok: [localhost] => {
    "msg": [
        "Server Name: mcp-adr-analysis-server",
        "Server Version: 2.1.11",
        "Protocol Version: 2024-11-05",
        "Capabilities: ['tools', 'resources', 'prompts']",
        "Success: true"
    ]
}

TASK [Run comprehensive test suite] ******************************************
ok: [localhost]

TASK [Display test suite results] **********************************************
ok: [localhost] => {
    "msg": [
        "Test Suite Results:",
        "  Total Tests: 3",
        "  Passed: 3",
        "  Failed: 0",
        "  Success Rate: 100%"
    ]
}
```

## Troubleshooting

### Server Binary Not Found

If you get an error that the server binary is not found:

```bash
# Build the server first
npm run build
```

### Collection Not Found

If the collection is not installed:

```bash
source venv-ansible/bin/activate
ansible-galaxy collection install tosin2013.mcp_audit
```

### Timeout Errors

If you encounter timeout errors, increase the timeout:

```bash
ansible-playbook test-mcp-server.yml -e "mcp_timeout=60"
```

### Missing Environment Variables

If tools fail due to missing configuration:

```bash
# Set environment variables
export OPENROUTER_API_KEY="sk-or-v1-your-key"
export PROJECT_PATH="/path/to/project"

# Or use extra variables
ansible-playbook test-mcp-server-enhanced.yml \
  -e "openrouter_api_key=sk-or-v1-your-key" \
  -e "project_path=/path/to/project"
```

## Additional Resources

- [Ansible Galaxy Collection](https://galaxy.ansible.com/ui/repo/published/tosin2013/mcp_audit/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Ansible Documentation](https://docs.ansible.com/)
- [Vault Setup Guide](VAULT_SETUP.md)
