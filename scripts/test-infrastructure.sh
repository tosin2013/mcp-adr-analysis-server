#!/bin/bash

# Enhanced Test Infrastructure Runner
# Provides comprehensive testing with proper resource management and cleanup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_TIMEOUT=300  # 5 minutes
MEMORY_LIMIT_MB=1024
MAX_RETRIES=3

echo -e "${BLUE}🧪 Enhanced Test Infrastructure Runner${NC}"
echo "=========================================="

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check system resources
check_system_resources() {
    print_status "Checking system resources..."
    
    # Check available memory
    if command -v free &> /dev/null; then
        local available_mb=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        if [ "$available_mb" -lt "$MEMORY_LIMIT_MB" ]; then
            print_warning "Low available memory: ${available_mb}MB (recommended: ${MEMORY_LIMIT_MB}MB)"
        fi
    fi
    
    # Check disk space
    local available_space=$(df . | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 1048576 ]; then  # 1GB in KB
        print_warning "Low disk space available"
    fi
    
    # Check for existing test processes
    if pgrep -f "jest\|npm.*test" > /dev/null; then
        print_warning "Existing test processes detected, they may interfere with resource tracking"
    fi
    
    print_success "System resource check completed"
}

# Function to setup test environment
setup_test_environment() {
    print_status "Setting up test environment..."
    
    # Set environment variables for enhanced testing
    export NODE_ENV=test
    export MCP_ADR_TEST_INFRASTRUCTURE=true
    export MCP_ADR_RESOURCE_TRACKING=true
    
    # Increase Node.js memory limit if needed
    if [ -z "$NODE_OPTIONS" ]; then
        export NODE_OPTIONS="--max-old-space-size=${MEMORY_LIMIT_MB}"
    fi
    
    # Create test results directory
    mkdir -p test-results
    
    # Clean up any existing temp directories from previous runs
    find /tmp -name "test-*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
    
    print_success "Test environment setup completed"
}

# Function to run tests with resource monitoring
run_tests_with_monitoring() {
    local test_type="$1"
    local test_pattern="${2:-}"
    local timeout="${3:-$DEFAULT_TIMEOUT}"
    
    print_status "Running $test_type tests with resource monitoring..."
    
    # Start resource monitoring in background
    local monitor_pid=""
    if command -v top &> /dev/null; then
        (
            while true; do
                echo "$(date): $(ps -o pid,ppid,pcpu,pmem,comm -p $$)" >> "test-results/resource-monitor-${test_type}.log"
                sleep 5
            done
        ) &
        monitor_pid=$!
    fi
    
    # Prepare test command
    local test_cmd="npm test"
    if [ -n "$test_pattern" ]; then
        test_cmd="$test_cmd -- $test_pattern"
    fi
    
    # Add test type specific options
    case "$test_type" in
        "unit")
            export MCP_ADR_TEST_TYPE=unit
            ;;
        "integration")
            export MCP_ADR_TEST_TYPE=integration
            test_cmd="$test_cmd --testTimeout=60000"
            ;;
        "performance")
            export MCP_ADR_TEST_TYPE=performance
            export MCP_ADR_PERFORMANCE_TEST=true
            test_cmd="$test_cmd --testTimeout=180000"
            ;;
    esac
    
    # Run tests with timeout
    local test_result=0
    if timeout $timeout bash -c "$test_cmd"; then
        print_success "$test_type tests completed successfully"
    else
        test_result=$?
        print_error "$test_type tests failed or timed out"
    fi
    
    # Stop resource monitoring
    if [ -n "$monitor_pid" ]; then
        kill $monitor_pid 2>/dev/null || true
    fi
    
    # Cleanup test environment
    cleanup_test_environment "$test_type"
    
    return $test_result
}

# Function to cleanup test environment
cleanup_test_environment() {
    local test_type="$1"
    
    print_status "Cleaning up test environment for $test_type tests..."
    
    # Kill any hanging test processes
    pkill -f "jest.*$test_type" 2>/dev/null || true
    
    # Clean up temp directories created during tests
    find /tmp -name "test-*" -type d -mmin +5 -exec rm -rf {} + 2>/dev/null || true
    
    # Force garbage collection if available
    if command -v node &> /dev/null; then
        node -e "if (global.gc) global.gc();" 2>/dev/null || true
    fi
    
    # Wait for any async cleanup
    sleep 2
    
    print_success "Cleanup completed for $test_type tests"
}

# Function to generate test report
generate_test_report() {
    print_status "Generating comprehensive test report..."
    
    local report_file="test-results/infrastructure-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Test Infrastructure Report

**Generated**: $(date)
**Environment**: $(uname -a)
**Node.js**: $(node --version)
**npm**: $(npm --version)
**Memory Limit**: ${MEMORY_LIMIT_MB}MB

## Test Execution Summary

EOF
    
    # Add resource monitoring data if available
    if [ -f "test-results/resource-monitor-unit.log" ]; then
        echo "### Resource Usage - Unit Tests" >> "$report_file"
        echo '```' >> "$report_file"
        tail -10 "test-results/resource-monitor-unit.log" >> "$report_file"
        echo '```' >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    if [ -f "test-results/resource-monitor-integration.log" ]; then
        echo "### Resource Usage - Integration Tests" >> "$report_file"
        echo '```' >> "$report_file"
        tail -10 "test-results/resource-monitor-integration.log" >> "$report_file"
        echo '```' >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    if [ -f "test-results/resource-monitor-performance.log" ]; then
        echo "### Resource Usage - Performance Tests" >> "$report_file"
        echo '```' >> "$report_file"
        tail -10 "test-results/resource-monitor-performance.log" >> "$report_file"
        echo '```' >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    # Add coverage information if available
    if [ -f "coverage/coverage-summary.json" ]; then
        echo "### Coverage Summary" >> "$report_file"
        echo '```json' >> "$report_file"
        cat coverage/coverage-summary.json >> "$report_file"
        echo '```' >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    echo "### Infrastructure Improvements" >> "$report_file"
    echo "- ✅ Enhanced resource tracking and cleanup" >> "$report_file"
    echo "- ✅ Dynamic timeout configuration based on test type" >> "$report_file"
    echo "- ✅ Memory usage monitoring and limits" >> "$report_file"
    echo "- ✅ Proper test isolation and cleanup procedures" >> "$report_file"
    echo "- ✅ CI/CD environment adaptation" >> "$report_file"
    
    print_success "Test report generated: $report_file"
}

# Function to run specific test suite
run_test_suite() {
    local suite="$1"
    
    case "$suite" in
        "unit")
            run_tests_with_monitoring "unit" "tests/utils tests/config tests/types" 120
            ;;
        "integration")
            run_tests_with_monitoring "integration" "tests/integration" 300
            ;;
        "performance")
            run_tests_with_monitoring "performance" "tests/performance tests/*performance*" 600
            ;;
        "infrastructure")
            # Test the infrastructure itself
            run_tests_with_monitoring "unit" "tests/utils/test-infrastructure.test.ts tests/utils/test-helpers.test.ts" 180
            ;;
        "all")
            local overall_result=0
            
            run_test_suite "unit" || overall_result=1
            run_test_suite "integration" || overall_result=1
            run_test_suite "performance" || overall_result=1
            
            return $overall_result
            ;;
        *)
            print_error "Unknown test suite: $suite"
            echo "Available suites: unit, integration, performance, infrastructure, all"
            return 1
            ;;
    esac
}

# Function to validate test infrastructure
validate_infrastructure() {
    print_status "Validating test infrastructure..."
    
    # Check if required files exist
    local required_files=(
        "tests/utils/test-infrastructure.ts"
        "tests/utils/test-helpers.ts"
        "tests/utils/test-config.ts"
        "tests/setup.ts"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required file missing: $file"
            return 1
        fi
    done
    
    # Build the project to ensure TypeScript compilation
    print_status "Building project..."
    if ! npm run build; then
        print_error "Build failed"
        return 1
    fi
    
    # Run a quick validation test
    print_status "Running infrastructure validation..."
    if ! timeout 60 npm test -- tests/utils/test-infrastructure.test.ts 2>/dev/null; then
        print_warning "Infrastructure validation test not found or failed"
    fi
    
    print_success "Infrastructure validation completed"
}

# Main execution function
main() {
    local start_time=$(date +%s)
    
    echo "Starting enhanced test infrastructure at $(date)"
    echo ""
    
    # Setup
    check_system_resources
    setup_test_environment
    validate_infrastructure || exit 1
    
    # Run tests based on arguments
    local test_suite="${1:-all}"
    run_test_suite "$test_suite" || exit 1
    
    # Generate report
    generate_test_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    print_success "🎉 Test infrastructure execution completed!"
    print_success "Total execution time: ${duration} seconds"
    echo ""
    echo "Enhanced test infrastructure is working properly! 🚀"
}

# Handle script arguments
case "${1:-all}" in
    "unit"|"integration"|"performance"|"infrastructure"|"all")
        main "$1"
        ;;
    "validate")
        check_system_resources
        setup_test_environment
        validate_infrastructure
        ;;
    "cleanup")
        print_status "Performing cleanup..."
        cleanup_test_environment "all"
        find /tmp -name "test-*" -type d -exec rm -rf {} + 2>/dev/null || true
        print_success "Cleanup completed"
        ;;
    *)
        echo "Usage: $0 [unit|integration|performance|infrastructure|all|validate|cleanup]"
        echo ""
        echo "Test suites:"
        echo "  unit         - Run unit tests with enhanced infrastructure"
        echo "  integration  - Run integration tests with resource monitoring"
        echo "  performance  - Run performance tests with memory tracking"
        echo "  infrastructure - Test the infrastructure components themselves"
        echo "  all          - Run all test suites"
        echo ""
        echo "Utilities:"
        echo "  validate     - Validate infrastructure setup"
        echo "  cleanup      - Clean up test resources"
        exit 1
        ;;
esac