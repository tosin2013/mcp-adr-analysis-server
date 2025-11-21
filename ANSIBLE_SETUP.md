# Ansible Testing Setup for MCP Server

This guide explains how to set up and use Ansible with Python 3.11 to test the MCP ADR Analysis Server using the `tosin2013.mcp_audit` collection from Ansible Galaxy.

## Overview

We use Ansible playbooks to automate testing and validation of the MCP server. This setup uses:

- **Python 3.11**: Virtual environment for Ansible
- **Ansible**: Automation tool for testing
- **tosin2013.mcp_audit**: Ansible Galaxy collection for MCP server testing

## Quick Start

### 1. Create and Activate Virtual Environment

The virtual environment has already been created at `venv-ansible/`. To activate it:

```bash
source venv-ansible/bin/activate
```

### 2. Verify Setup

```bash
# Check Python version (should be 3.11.x)
python --version

# Check Ansible installation
ansible --version

# Verify collection is installed
ansible-galaxy collection list | grep mcp_audit
```

### 3. Run Tests

```bash
cd playbooks
ansible-playbook test-mcp-server.yml
```

## Detailed Setup

### Step 1: Create Python 3.11 Virtual Environment

```bash
# Create virtual environment
python3.11 -m venv venv-ansible

# Activate virtual environment
source venv-ansible/bin/activate
```

### Step 2: Install Ansible and MCP SDK

```bash
# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install Ansible
pip install ansible

# Install MCP Python SDK (required by mcp_audit collection)
pip install mcp
```

### Step 3: Install MCP Audit Collection

```bash
# Install from Ansible Galaxy
ansible-galaxy collection install tosin2013.mcp_audit

# Or install from requirements file
ansible-galaxy collection install -r ansible-requirements.yml
```

### Step 4: Verify Installation

```bash
# Check Ansible version
ansible --version

# List installed collections
ansible-galaxy collection list

# Check available MCP modules
ansible-doc -l | grep mcp
```

## Project Structure

```
mcp-adr-analysis-server/
├── venv-ansible/              # Python 3.11 virtual environment
├── ansible.cfg                # Ansible configuration
├── ansible-requirements.yml   # Collection requirements
├── playbooks/                 # Ansible playbooks
│   ├── README.md             # Playbook documentation
│   └── test-mcp-server.yml   # Main test playbook
└── ANSIBLE_SETUP.md          # This file
```

## Usage

### Running the Test Playbook

```bash
# Activate virtual environment
source venv-ansible/bin/activate

# Navigate to playbooks directory
cd playbooks

# Run the test playbook
ansible-playbook test-mcp-server.yml
```

### Testing with Custom Options

```bash
# Run with verbose output
ansible-playbook test-mcp-server.yml -v

# Run with extra verbose output (for debugging)
ansible-playbook test-mcp-server.yml -vvv

# Override server path
ansible-playbook test-mcp-server.yml -e "mcp_server_path=/custom/path"

# Increase timeout
ansible-playbook test-mcp-server.yml -e "mcp_timeout=60"
```

## What Gets Tested

The test playbook validates:

1. **Server Availability**: Verifies the server binary exists and can be executed
2. **Server Information**: Retrieves server name, version, and capabilities
3. **Tool Endpoints**: Tests that tools can be listed and called
4. **Resource Endpoints**: Tests that resources can be listed
5. **Prompt Endpoints**: Tests that prompts can be listed

## Troubleshooting

### Issue: Python 3.11 Not Found

**Solution**: Install Python 3.11 using Homebrew:

```bash
brew install python@3.11
```

### Issue: Collection Not Found

**Solution**: Install the collection explicitly:

```bash
source venv-ansible/bin/activate
ansible-galaxy collection install tosin2013.mcp_audit --force
```

### Issue: Server Binary Not Found

**Solution**: Build the server first:

```bash
npm run build
```

### Issue: Module Import Errors

**Solution**: Ensure the MCP Python SDK is installed:

```bash
source venv-ansible/bin/activate
pip install mcp

# Verify installation
python -c "from mcp import ClientSession; print('MCP SDK OK')"
```

### Issue: Permission Errors

**Solution**: Ensure the server binary is executable:

```bash
chmod +x dist/src/index.js
```

## Integration with CI/CD

You can integrate these tests into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Setup Python 3.11
  uses: actions/setup-python@v4
  with:
    python-version: '3.11'

- name: Install Ansible
  run: |
    python -m venv venv-ansible
    source venv-ansible/bin/activate
    pip install ansible

- name: Install MCP Audit Collection
  run: |
    source venv-ansible/bin/activate
    ansible-galaxy collection install tosin2013.mcp_audit

- name: Run Ansible Tests
  run: |
    source venv-ansible/bin/activate
    cd playbooks
    ansible-playbook test-mcp-server.yml
```

## Additional Resources

- [Ansible Galaxy Collection](https://galaxy.ansible.com/ui/repo/published/tosin2013/mcp_audit/)
- [Ansible Documentation](https://docs.ansible.com/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Python Virtual Environments](https://docs.python.org/3/tutorial/venv.html)

## Maintenance

### Updating Collections

```bash
source venv-ansible/bin/activate
ansible-galaxy collection install tosin2013.mcp_audit --upgrade
```

### Recreating Virtual Environment

```bash
# Remove old environment
rm -rf venv-ansible

# Create new environment
python3.11 -m venv venv-ansible

# Activate and install dependencies
source venv-ansible/bin/activate
pip install --upgrade pip setuptools wheel
pip install ansible
ansible-galaxy collection install -r ansible-requirements.yml
```

## Support

For issues with:
- **Ansible setup**: Check this documentation
- **MCP Audit Collection**: Visit [Ansible Galaxy](https://galaxy.ansible.com/ui/repo/published/tosin2013/mcp_audit/)
- **MCP Server**: Check the main project README.md

