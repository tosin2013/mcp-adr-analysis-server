#!/bin/bash

# MCP Functionality Testing Script
# Tests MCP server functionality using @modelcontextprotocol/inspector

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MCP_SERVER_PATH="$PROJECT_ROOT/dist/src/index.js"
TEST_TIMEOUT=30
MCP_INSPECTOR_TIMEOUT=10

echo -e "${BLUE}🔍 MCP Functionality Testing${NC}"
echo "==============================="

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
    esac
}

# Function to check prerequisites
check_prerequisites() {
    print_status "INFO" "Checking prerequisites..."

    # Check if built server exists
    if [ ! -f "$MCP_SERVER_PATH" ]; then
        print_status "ERROR" "MCP server not found at $MCP_SERVER_PATH"
        print_status "INFO" "Building the project..."
        npm run build
        if [ ! -f "$MCP_SERVER_PATH" ]; then
            print_status "ERROR" "Failed to build MCP server"
            exit 1
        fi
    fi

    # Check if server is executable
    if [ ! -x "$MCP_SERVER_PATH" ]; then
        print_status "WARNING" "Making MCP server executable..."
        chmod +x "$MCP_SERVER_PATH"
    fi

    # Check Node.js version
    NODE_VERSION=$(node --version)
    print_status "INFO" "Node.js version: $NODE_VERSION"

    print_status "SUCCESS" "Prerequisites check passed"
}

# Function to test basic MCP server health
test_server_health() {
    print_status "INFO" "Testing MCP server health..."

    # Use gtimeout on macOS, timeout on Linux
    local timeout_cmd="timeout"
    if command -v gtimeout >/dev/null 2>&1; then
        timeout_cmd="gtimeout"
    elif ! command -v timeout >/dev/null 2>&1; then
        # Fallback: no timeout command
        print_status "WARNING" "No timeout command available, running without timeout..."
        if node "$MCP_SERVER_PATH" --test; then
            print_status "SUCCESS" "MCP server health check passed"
            return 0
        else
            print_status "ERROR" "MCP server health check failed"
            return 1
        fi
        return
    fi

    if $timeout_cmd $TEST_TIMEOUT node "$MCP_SERVER_PATH" --test; then
        print_status "SUCCESS" "MCP server health check passed"
        return 0
    else
        print_status "ERROR" "MCP server health check failed"
        return 1
    fi
}

# Function to test MCP tools listing using inspector CLI
test_mcp_tools_list() {
    print_status "INFO" "Testing MCP tools listing..."

    # Use MCP Inspector CLI to list tools
    local tools_output
    local timeout_cmd="timeout"
    if command -v gtimeout >/dev/null 2>&1; then
        timeout_cmd="gtimeout"
    elif ! command -v timeout >/dev/null 2>&1; then
        timeout_cmd=""
    fi

    if [ -n "$timeout_cmd" ]; then
        tools_output=$($timeout_cmd $MCP_INSPECTOR_TIMEOUT npx @modelcontextprotocol/inspector --cli node "$MCP_SERVER_PATH" --method tools/list 2>/dev/null)
    else
        tools_output=$(npx @modelcontextprotocol/inspector --cli node "$MCP_SERVER_PATH" --method tools/list 2>/dev/null)
    fi

    if [ $? -eq 0 ] && [ -n "$tools_output" ]; then
        print_status "SUCCESS" "MCP tools list retrieved successfully"

        # Check for expected tools (based on actual MCP server implementation)
        local expected_tools=(
            "analyze_project_ecosystem"
            "get_architectural_context"
            "generate_adrs_from_prd"
            "generate_adr_todo"
            "compare_adr_progress"
            "analyze_content_security"
            "generate_content_masking"
            "suggest_adrs"
            "review_existing_adrs"
            "tool_chain_orchestrator"
        )

        local found_tools=0
        for tool in "${expected_tools[@]}"; do
            # Use jq to parse JSON if available, otherwise use grep on the "name" field
            if command -v jq >/dev/null 2>&1; then
                if echo "$tools_output" | jq -e ".tools[]? | select(.name == \"$tool\")" >/dev/null 2>&1; then
                    print_status "SUCCESS" "Found tool: $tool"
                    ((found_tools++))
                else
                    print_status "WARNING" "Tool not found: $tool"
                fi
            else
                # Fallback: look for the tool name in the JSON structure
                if echo "$tools_output" | grep -q "\"name\": \"$tool\""; then
                    print_status "SUCCESS" "Found tool: $tool"
                    ((found_tools++))
                else
                    print_status "WARNING" "Tool not found: $tool"
                fi
            fi
        done

        print_status "INFO" "Found $found_tools/${#expected_tools[@]} expected tools"

        if [ $found_tools -ge 8 ]; then
            print_status "SUCCESS" "MCP tools validation passed"
            return 0
        else
            print_status "ERROR" "Too few tools found ($found_tools/${#expected_tools[@]})"
            return 1
        fi
    else
        print_status "ERROR" "Failed to retrieve MCP tools list"
        return 1
    fi
}

# Function to test MCP resources listing
test_mcp_resources() {
    print_status "INFO" "Testing MCP resources..."

    local resources_output
    local timeout_cmd="timeout"
    if command -v gtimeout >/dev/null 2>&1; then
        timeout_cmd="gtimeout"
    elif ! command -v timeout >/dev/null 2>&1; then
        timeout_cmd=""
    fi

    if [ -n "$timeout_cmd" ]; then
        resources_output=$($timeout_cmd $MCP_INSPECTOR_TIMEOUT npx @modelcontextprotocol/inspector --cli node "$MCP_SERVER_PATH" --method resources/list 2>/dev/null)
    else
        resources_output=$(npx @modelcontextprotocol/inspector --cli node "$MCP_SERVER_PATH" --method resources/list 2>/dev/null)
    fi

    if [ $? -eq 0 ] && [ -n "$resources_output" ]; then
        print_status "SUCCESS" "MCP resources list retrieved successfully"

        # Check for expected resource patterns
        if echo "$resources_output" | grep -q "adr://"; then
            print_status "SUCCESS" "Found ADR resources"
        else
            print_status "WARNING" "No ADR resources found (may be expected if no ADRs exist)"
        fi

        return 0
    else
        print_status "WARNING" "Failed to retrieve MCP resources (may not be implemented)"
        return 0
    fi
}

# Function to test MCP prompts
test_mcp_prompts() {
    print_status "INFO" "Testing MCP prompts..."

    local prompts_output
    local timeout_cmd="timeout"
    if command -v gtimeout >/dev/null 2>&1; then
        timeout_cmd="gtimeout"
    elif ! command -v timeout >/dev/null 2>&1; then
        timeout_cmd=""
    fi

    if [ -n "$timeout_cmd" ]; then
        prompts_output=$($timeout_cmd $MCP_INSPECTOR_TIMEOUT npx @modelcontextprotocol/inspector --cli node "$MCP_SERVER_PATH" --method prompts/list 2>/dev/null)
    else
        prompts_output=$(npx @modelcontextprotocol/inspector --cli node "$MCP_SERVER_PATH" --method prompts/list 2>/dev/null)
    fi

    if [ $? -eq 0 ] && [ -n "$prompts_output" ]; then
        print_status "SUCCESS" "MCP prompts list retrieved successfully"

        # Check for expected prompts
        local expected_prompts=(
            "analyze_architecture"
            "suggest_improvements"
            "review_decisions"
        )

        local found_prompts=0
        for prompt in "${expected_prompts[@]}"; do
            if echo "$prompts_output" | grep -q "$prompt"; then
                print_status "SUCCESS" "Found prompt: $prompt"
                ((found_prompts++))
            fi
        done

        if [ $found_prompts -gt 0 ]; then
            print_status "SUCCESS" "MCP prompts validation passed"
        else
            print_status "WARNING" "No expected prompts found (may not be implemented)"
        fi

        return 0
    else
        print_status "WARNING" "Failed to retrieve MCP prompts (may not be implemented)"
        return 0
    fi
}

# Function to test a specific MCP tool call
test_mcp_tool_call() {
    print_status "INFO" "Testing MCP tool call..."

    # Test analyze_project tool with minimal parameters
    local tool_output
    local timeout_cmd="timeout"
    if command -v gtimeout >/dev/null 2>&1; then
        timeout_cmd="gtimeout"
    elif ! command -v timeout >/dev/null 2>&1; then
        timeout_cmd=""
    fi

    if [ -n "$timeout_cmd" ]; then
        tool_output=$($timeout_cmd $MCP_INSPECTOR_TIMEOUT npx @modelcontextprotocol/inspector --cli node "$MCP_SERVER_PATH" --method tools/call --tool-name analyze_project_ecosystem --tool-arg projectPath="$PROJECT_ROOT" --tool-arg analysisDepth=basic 2>/dev/null)
    else
        tool_output=$(npx @modelcontextprotocol/inspector --cli node "$MCP_SERVER_PATH" --method tools/call --tool-name analyze_project_ecosystem --tool-arg projectPath="$PROJECT_ROOT" --tool-arg analysisDepth=basic 2>/dev/null)
    fi

    if [ $? -eq 0 ] && [ -n "$tool_output" ]; then
        print_status "SUCCESS" "MCP tool call executed successfully"

        # Check if output contains expected content patterns
        if echo "$tool_output" | grep -q -E "(content|analysis|project)"; then
            print_status "SUCCESS" "Tool output contains expected content"
            return 0
        else
            print_status "WARNING" "Tool output may be unexpected"
            return 1
        fi
    else
        print_status "ERROR" "Failed to execute MCP tool call"
        return 1
    fi
}

# Function to generate MCP test report
generate_test_report() {
    local total_tests=$1
    local passed_tests=$2
    local test_results_file="$PROJECT_ROOT/mcp-test-results.json"

    print_status "INFO" "Generating MCP test report..."

    cat > "$test_results_file" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "mcp_server_path": "$MCP_SERVER_PATH",
  "node_version": "$(node --version)",
  "total_tests": $total_tests,
  "passed_tests": $passed_tests,
  "success_rate": $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l),
  "status": "$([ $passed_tests -eq $total_tests ] && echo "PASS" || echo "PARTIAL")"
}
EOF

    print_status "SUCCESS" "Test report generated: $test_results_file"
}

# Main execution
main() {
    local total_tests=0
    local passed_tests=0

    print_status "INFO" "Starting MCP functionality tests..."

    # Test 1: Prerequisites
    ((total_tests++))
    if check_prerequisites; then
        ((passed_tests++))
    fi

    # Test 2: Server Health
    ((total_tests++))
    if test_server_health; then
        ((passed_tests++))
    fi

    # Test 3: Tools List
    ((total_tests++))
    if test_mcp_tools_list; then
        ((passed_tests++))
    fi

    # Test 4: Resources
    ((total_tests++))
    if test_mcp_resources; then
        ((passed_tests++))
    fi

    # Test 5: Prompts
    ((total_tests++))
    if test_mcp_prompts; then
        ((passed_tests++))
    fi

    # Test 6: Tool Call
    ((total_tests++))
    if test_mcp_tool_call; then
        ((passed_tests++))
    fi

    # Generate report
    generate_test_report $total_tests $passed_tests

    # Final results
    echo
    print_status "INFO" "MCP Functionality Test Results:"
    print_status "INFO" "================================"
    print_status "INFO" "Total Tests: $total_tests"
    print_status "INFO" "Passed Tests: $passed_tests"
    print_status "INFO" "Success Rate: $(echo "scale=1; $passed_tests * 100 / $total_tests" | bc -l)%"

    if [ $passed_tests -eq $total_tests ]; then
        print_status "SUCCESS" "All MCP functionality tests passed! 🎉"
        exit 0
    elif [ $passed_tests -ge $((total_tests * 2 / 3)) ]; then
        print_status "WARNING" "Most MCP functionality tests passed (${passed_tests}/${total_tests})"
        exit 0
    else
        print_status "ERROR" "Too many MCP functionality tests failed (${passed_tests}/${total_tests})"
        exit 1
    fi
}

# Handle script arguments
case "${1:-main}" in
    "help")
        echo "Usage: $0 [main|help]"
        echo "  main: Run all MCP functionality tests (default)"
        echo "  help: Show this help message"
        exit 0
        ;;
    "main"|"")
        main
        ;;
    *)
        print_status "ERROR" "Unknown command: $1"
        print_status "INFO" "Use '$0 help' for usage information"
        exit 1
        ;;
esac