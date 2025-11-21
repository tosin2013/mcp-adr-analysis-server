# Quick Start: Testing MCP Server with Ansible

## One-Line Setup

```bash
# Setup virtual environment and install dependencies
python3.11 -m venv venv-ansible && \
source venv-ansible/bin/activate && \
pip install --upgrade pip setuptools wheel && \
pip install ansible mcp && \
ansible-galaxy collection install tosin2013.mcp_audit
```

## Run Tests

```bash
# Activate environment
source venv-ansible/bin/activate

# Run playbook
cd playbooks
ansible-playbook test-mcp-server.yml
```

## Files Created

- `venv-ansible/` - Python 3.11 virtual environment
- `ansible.cfg` - Ansible configuration
- `ansible-requirements.yml` - Collection requirements
- `requirements.txt` - Python package requirements
- `playbooks/test-mcp-server.yml` - Main test playbook
- `playbooks/inventory.ini` - Localhost inventory
- `playbooks/README.md` - Playbook documentation
- `ANSIBLE_SETUP.md` - Complete setup guide

## Verify Setup

```bash
source venv-ansible/bin/activate
python --version          # Should show 3.11.x
ansible --version         # Should show ansible [core 2.19.x]
ansible-galaxy collection list | grep mcp_audit  # Should show collection
python -c "from mcp import ClientSession; print('MCP SDK OK')"  # Should succeed
```

## Troubleshooting

If modules can't find MCP SDK, ensure you're using the virtual environment's Python:

```bash
source venv-ansible/bin/activate
which python  # Should point to venv-ansible/bin/python
pip show mcp  # Should show mcp package info
```

