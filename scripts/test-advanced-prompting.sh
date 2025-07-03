#!/bin/bash

# Advanced Prompting Techniques Test Runner
# Comprehensive testing script for the MCP ADR Analysis Server enhancements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_TIMEOUT=300  # 5 minutes
COVERAGE_THRESHOLD=80
PERFORMANCE_THRESHOLD=5000  # 5 seconds max for performance tests

echo -e "${BLUE}🧪 Advanced Prompting Techniques Test Suite${NC}"
echo "=============================================="

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

# Function to run tests with timeout
run_test_with_timeout() {
    local test_name="$1"
    local test_command="$2"
    local timeout="${3:-$TEST_TIMEOUT}"
    
    print_status "Running $test_name..."
    
    if timeout $timeout bash -c "$test_command"; then
        print_success "$test_name completed successfully"
        return 0
    else
        print_error "$test_name failed or timed out"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_warning "Dependencies not found, installing..."
        npm install
    fi
    
    print_success "Prerequisites check passed"
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests for advanced prompting modules..."
    
    local unit_tests=(
        "knowledge-generation.test.ts"
        "ape.test.ts"
        "reflexion.test.ts"
    )
    
    for test in "${unit_tests[@]}"; do
        if ! run_test_with_timeout "Unit Test: $test" "npm test -- tests/$test" 120; then
            return 1
        fi
    done
    
    print_success "All unit tests passed"
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests for enhanced tools..."
    
    if ! run_test_with_timeout "Integration Tests" "npm test -- tests/tool-enhancement.test.ts" 180; then
        return 1
    fi
    
    print_success "Integration tests passed"
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running performance and effectiveness tests..."
    
    # Set environment variable for performance testing
    export MCP_ADR_PERFORMANCE_TEST=true
    
    if ! run_test_with_timeout "Performance Tests" "npm test -- tests/performance-effectiveness.test.ts" 300; then
        unset MCP_ADR_PERFORMANCE_TEST
        return 1
    fi
    
    unset MCP_ADR_PERFORMANCE_TEST
    print_success "Performance tests passed"
}

# Function to run coverage analysis
run_coverage_analysis() {
    print_status "Running test coverage analysis..."
    
    if ! run_test_with_timeout "Coverage Analysis" "npm run test:coverage" 240; then
        return 1
    fi
    
    # Check coverage threshold
    if [ -f "coverage/coverage-summary.json" ]; then
        local coverage=$(node -e "
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
            const total = coverage.total;
            const avg = (total.lines.pct + total.functions.pct + total.branches.pct + total.statements.pct) / 4;
            console.log(Math.round(avg));
        ")
        
        if [ "$coverage" -lt "$COVERAGE_THRESHOLD" ]; then
            print_warning "Coverage ($coverage%) is below threshold ($COVERAGE_THRESHOLD%)"
        else
            print_success "Coverage ($coverage%) meets threshold ($COVERAGE_THRESHOLD%)"
        fi
    fi
}

# Function to run linting and type checking
run_quality_checks() {
    print_status "Running code quality checks..."
    
    # Type checking
    if ! run_test_with_timeout "TypeScript Check" "npm run typecheck" 60; then
        return 1
    fi
    
    # Linting
    if ! run_test_with_timeout "Linting" "npm run lint" 60; then
        return 1
    fi
    
    print_success "Quality checks passed"
}

# Function to validate test utilities
validate_test_utilities() {
    print_status "Validating test utilities..."
    
    # Create a simple test to validate utilities
    cat > temp_utility_test.js << 'EOF'
const { 
    createTestPrompt, 
    createTestKnowledgeConfig, 
    createTestAPEConfig, 
    createTestReflexionConfig,
    validatePromptObject,
    assessPromptQuality
} = require('./dist/tests/utils/advanced-prompting-test-utils.js');

try {
    // Test prompt creation
    const prompt = createTestPrompt();
    if (!validatePromptObject(prompt)) {
        throw new Error('Test prompt validation failed');
    }
    
    // Test config creation
    const knowledgeConfig = createTestKnowledgeConfig();
    const apeConfig = createTestAPEConfig();
    const reflexionConfig = createTestReflexionConfig();
    
    if (!knowledgeConfig.domains || !apeConfig.candidateCount || !reflexionConfig.memoryEnabled) {
        throw new Error('Config creation failed');
    }
    
    // Test quality assessment
    const quality = assessPromptQuality('Test prompt for quality assessment');
    if (typeof quality.score !== 'number') {
        throw new Error('Quality assessment failed');
    }
    
    console.log('✅ Test utilities validation passed');
    process.exit(0);
} catch (error) {
    console.error('❌ Test utilities validation failed:', error.message);
    process.exit(1);
}
EOF
    
    if ! run_test_with_timeout "Test Utilities Validation" "node temp_utility_test.js" 30; then
        rm -f temp_utility_test.js
        return 1
    fi
    
    rm -f temp_utility_test.js
    print_success "Test utilities validation passed"
}

# Function to generate test report
generate_test_report() {
    print_status "Generating test report..."
    
    local report_file="test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Advanced Prompting Techniques Test Report

**Generated**: $(date)
**Node.js Version**: $(node --version)
**npm Version**: $(npm --version)

## Test Results Summary

EOF
    
    if [ -f "coverage/coverage-summary.json" ]; then
        echo "### Coverage Summary" >> "$report_file"
        echo '```json' >> "$report_file"
        cat coverage/coverage-summary.json >> "$report_file"
        echo '```' >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    echo "### Test Execution" >> "$report_file"
    echo "- Unit Tests: ✅ Passed" >> "$report_file"
    echo "- Integration Tests: ✅ Passed" >> "$report_file"
    echo "- Performance Tests: ✅ Passed" >> "$report_file"
    echo "- Quality Checks: ✅ Passed" >> "$report_file"
    echo "" >> "$report_file"
    
    echo "### Advanced Prompting Modules Tested" >> "$report_file"
    echo "- Knowledge Generation: ✅ Validated" >> "$report_file"
    echo "- Automatic Prompt Engineering (APE): ✅ Validated" >> "$report_file"
    echo "- Reflexion Learning: ✅ Validated" >> "$report_file"
    echo "" >> "$report_file"
    
    echo "### Enhanced Tools Tested" >> "$report_file"
    echo "- suggest_adrs (Knowledge Generation + Reflexion): ✅ Validated" >> "$report_file"
    echo "- generate_adrs_from_prd (APE + Knowledge Generation): ✅ Validated" >> "$report_file"
    echo "- analyze_project_ecosystem (Knowledge Generation + Reflexion): ✅ Validated" >> "$report_file"
    
    print_success "Test report generated: $report_file"
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    echo "Starting comprehensive test suite at $(date)"
    echo ""
    
    # Run all test phases
    check_prerequisites || exit 1
    
    # Build the project first
    print_status "Building project..."
    if ! run_test_with_timeout "Project Build" "npm run build" 120; then
        print_error "Build failed, cannot proceed with tests"
        exit 1
    fi
    
    # Validate test utilities
    validate_test_utilities || exit 1
    
    # Run quality checks
    run_quality_checks || exit 1
    
    # Run unit tests
    run_unit_tests || exit 1
    
    # Run integration tests
    run_integration_tests || exit 1
    
    # Run performance tests
    run_performance_tests || exit 1
    
    # Run coverage analysis
    run_coverage_analysis || exit 1
    
    # Generate report
    generate_test_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    print_success "🎉 All tests completed successfully!"
    print_success "Total execution time: ${duration} seconds"
    echo ""
    echo "Advanced Prompting Techniques are ready for production! 🚀"
}

# Handle script arguments
case "${1:-all}" in
    "unit")
        check_prerequisites && run_unit_tests
        ;;
    "integration")
        check_prerequisites && run_integration_tests
        ;;
    "performance")
        check_prerequisites && run_performance_tests
        ;;
    "coverage")
        check_prerequisites && run_coverage_analysis
        ;;
    "quality")
        check_prerequisites && run_quality_checks
        ;;
    "all"|"")
        main
        ;;
    *)
        echo "Usage: $0 [unit|integration|performance|coverage|quality|all]"
        exit 1
        ;;
esac
