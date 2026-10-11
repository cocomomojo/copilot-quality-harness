# Dynamic Workflows CI/CD Implementation Guide

This document describes the Dynamic Workflows CI/CD system implemented for the copilot-quality-harness project.

## Overview

Five coordinated GitHub Actions workflows provide comprehensive quality assurance:

```
PR/Push Event
    ↓
┌─────────────────────────────────────┐
│  test-coverage-analysis.yml         │ ← Analyzes coverage gaps (matrix: Node 18, 20)
│  auto-code-review.yml               │ ← Extended code review (linting + test impact)
│  test-matrix.yml                    │ ← Parallel tests (4 × 2 combinations)
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  quality-report-pr.yml              │ ← Aggregates results → PR comment
└─────────────────────────────────────┘

Weekly Friday 5:00 AM JST
    ↓
┌─────────────────────────────────────┐
│  quality-schedule.yml               │ ← Comprehensive validation + issue creation
└─────────────────────────────────────┘
```

## Workflow Details

### 1. test-coverage-analysis.yml

**Purpose**: Analyze test coverage gaps and provide quality metrics.

**Trigger Events**:
- `push` to main branch
- `pull_request` (all events)

**Key Features**:
- **Matrix Strategy**: Tests across Node.js versions 18 and 20
- **Test Execution**: Runs unit, API, and advanced tests
- **Coverage Analysis**: Parses test output to calculate:
  - Gap score (100 - pass rate)
  - Critical gaps detection (>10% gap)
  - Per-test-type breakdown
- **Artifact Upload**: Coverage analysis JSON per node version (5-day retention)
- **Dynamic Outputs**: Exports `gap_score`, `coverage_score`, `critical_gaps` for downstream jobs

**Output Structure**:
```json
{
  "node_version": "20",
  "timestamp": "2026-10-11T18:48:59Z",
  "test_results": {
    "unit": { "passed": 10, "failed": 0, "skipped": 2 },
    "api": { "passed": 5, "failed": 0, "skipped": 0 },
    "advanced": { "passed": 8, "failed": 1, "skipped": 0 }
  },
  "total_tests": 23,
  "coverage_score": 95
}
```

### 2. auto-code-review.yml

**Purpose**: Automated code quality review complementing manual review.

**Trigger Events**:
- `pull_request` opened, synchronized, reopened, ready_for_review, edited

**Key Features**:
- **Linting Check**: 
  - Runs full `npm run lint` across workspaces
  - Parses error/warning counts
  - Flags critical issues
- **Test Coverage Impact Analysis**:
  - Compares test-file changes to source-file changes
  - Calculates test coverage ratio for PR
  - Flags if ratio < 20%
- **Draft PR Skipping**: Respects author intent by skipping draft PRs
- **PR Comment**: Posts structured review comment with findings

**Review Comment Includes**:
- ✅/⚠️ Linting status and counts
- Test coverage ratio and adequacy indicator
- Guidance for developer

### 3. test-matrix.yml

**Purpose**: Execute tests in parallel using matrix strategy for fast feedback.

**Trigger Events**:
- `push` to main, develop branches
- `pull_request` (all events)

**Key Features**:
- **Matrix Dimensions**:
  - Node versions: 18, 20
  - Test types: unit, api, e2e, advanced
  - Total: 8 parallel jobs
- **Test Execution**: 
  - Each job runs its specific test type
  - E2E installs Playwright dependencies dynamically
  - Continues on error for visibility
- **Result Parsing**:
  - Extracts passed/failed/skipped counts per job
  - Generates per-matrix JSON artifacts
- **Artifact Collection**:
  - Uploads individual results (8 artifacts)
  - Generates summary JSON with aggregated metrics
- **Dynamic Outputs**: 
  - `status` (passed/failed)
  - Passed/failed counts per matrix combination

**Summary JSON**:
```json
{
  "total_combinations": 8,
  "passed_combinations": 7,
  "failed_combinations": 1,
  "total_tests": 187,
  "total_passed": 185,
  "total_failed": 2,
  "by_node_version": {
    "18": { "passed_tests": 92, "failed_tests": 1, "status": "some_failed" },
    "20": { "passed_tests": 93, "failed_tests": 1, "status": "some_failed" }
  },
  "by_test_type": {
    "unit": { "passed_tests": 50, "failed_tests": 0, "status": "all_passed" },
    "api": { "passed_tests": 30, "failed_tests": 0, "status": "all_passed" },
    "e2e": { "passed_tests": 40, "failed_tests": 2, "status": "some_failed" },
    "advanced": { "passed_tests": 65, "failed_tests": 0, "status": "all_passed" }
  }
}
```

### 4. quality-report-pr.yml

**Purpose**: Aggregate test results and post quality summary to PR.

**Trigger Events**:
- `workflow_run` when `test-matrix.yml` completes

**Key Features**:
- **Artifact Download**: Retrieves all test results from test-matrix run
- **Report Generation**:
  - Merges results from 8 matrix combinations
  - Calculates aggregated pass rate
  - Formats markdown table (Node versions × test types)
- **Dynamic Table**:
  ```
  | Node Version | Unit Tests | API Tests | E2E Tests | Advanced Tests |
  |---|---|---|---|---|
  | Node 18 | ✅ 25P/0F | ✅ 15P/0F | ⚠️ 20P/1F | ✅ 33P/0F |
  | Node 20 | ✅ 25P/0F | ✅ 15P/0F | ⚠️ 20P/1F | ✅ 32P/0F |
  ```
- **PR Comment**: Posts comment with:
  - Overall pass rate percentage
  - Status emoji (✅ vs ⚠️)
  - Detailed matrix table
  - Timestamp
- **Smart PR Detection**: Finds PR by workflow branch name

### 5. quality-schedule.yml

**Purpose**: Regular comprehensive quality validation (scheduled weekly).

**Trigger Events**:
- `schedule`: Every Friday 5:00 AM JST (cron: `0 20 * * 4`)
- Manual trigger via `workflow_dispatch`

**Key Features**:
- **Cron Schedule**: Thursday 20:00 UTC = Friday 5:00 AM JST
- **Matrix Testing**: Node 18 and 20 with full test suite
- **Comprehensive Analysis**:
  - Runs all test suites sequentially
  - Captures pass rates by node version
  - Generates analysis report
- **Issue Creation**:
  - Creates GitHub issue if pass rate < 100%
  - Tags: `ci-failure`, `quality-check`
  - Links to workflow run
- **Artifact Retention**: 30-day retention for trend analysis
- **Summary Report**: Outputs average pass rate and per-version breakdown

**Issue Template** (created when failures detected):
```
🚨 Scheduled Quality Check Failed

Date: 2026-10-11T20:00:00Z
Average Pass Rate: 95%

Action Required
- Review test failures in the scheduled quality run
- Check the workflow artifacts for detailed results
- Address critical issues before next scheduled run
```

## Integration with Existing Workflows

### With ai-review.yml
- **auto-code-review.yml** complements ai-review.yml (not replacing)
- Both provide different perspectives on code quality
- ai-review.mjs handles AI-specific analysis
- auto-code-review focuses on linting and test coverage

### With quality.yml
- **test-coverage-analysis.yml** and **test-matrix.yml** absorb the testing aspects
- Keep quality.yml for quick baseline checks on push
- New workflows provide matrix dimension for better failure isolation

### With scripts/
- **quality-report.mjs**: Unchanged, can be extended for artifact input
- **ai-review.mjs**: Used by ai-review.yml, not affected
- **m2-validation.mjs**: Included in scheduled workflow

## Dynamic Features

### 1. Matrix Strategy Benefits
- **Isolation**: Failure in one matrix combo doesn't block others
- **Speed**: 8 parallel jobs complete faster than sequential
- **Clarity**: Error reports clearly identify version/test-type combo
- **Trends**: Track performance across Node versions

### 2. Conditional Job Flow
- E2E tests only on main/develop (save time on feature PRs)
- Draft PR review skipped (respect author)
- Report posting only if PR found

### 3. Dynamic Outputs
- Jobs export status/counts for downstream logic
- Summary job uses outputs to decide issue creation
- PR report uses merged results for table generation

### 4. Artifact Management
- Per-matrix-combination uploads for detailed debugging
- Retention policies: 5 days (dev), 30 days (scheduled)
- Automated download/merge in report job

## Troubleshooting

### Matrix job fails for one combo
- Check artifact for that specific Node version
- Example: `test-results-node-20-e2e.json`
- Doesn't block other matrix combinations

### PR comment not posting
- Verify PR exists for the branch
- Check workflow-run PR detection logic
- View workflow logs for GitHub API errors

### Scheduled job doesn't run
- Verify cron syntax: `0 20 * * 4` (Thursday 20:00 UTC)
- Check repository settings (Actions enabled)
- Scheduled workflows only run on default branch

### Coverage gap score seems wrong
- Check test output parsing logic in coverage-analysis step
- Verify test framework output matches regex patterns
- Review coverage-analysis artifact for raw stats

## Best Practices

1. **Monitor Matrix Results**: Check test-matrix-summary.json trends over time
2. **Review Weekly Reports**: Friday scheduled run provides trend analysis
3. **Act on Issues**: Scheduled workflow creates issues for failures
4. **PR Comments**: Use quality report table to identify version-specific issues
5. **Coverage Trends**: Track coverage-score over time across PRs

## Files Reference

| File | Purpose | Trigger |
|------|---------|---------|
| `.github/workflows/test-coverage-analysis.yml` | Coverage gap analysis | push (main), PR |
| `.github/workflows/auto-code-review.yml` | Linting + test impact review | PR (open/sync/reopen/ready) |
| `.github/workflows/test-matrix.yml` | Parallel test execution | push (main/develop), PR |
| `.github/workflows/quality-report-pr.yml` | Aggregate results → PR comment | workflow_run (test-matrix) |
| `.github/workflows/quality-schedule.yml` | Weekly comprehensive check | schedule (Fri 5:00 AM JST) |

## Environment Variables & Secrets

No additional secrets required. Uses:
- `${{ secrets.GITHUB_TOKEN }}`: Default GitHub token (always available)
- `${{ github.token }}`: Same as above in some contexts

## Future Enhancements

1. **Cache npm dependencies** across matrix jobs
2. **Parallel artifact uploads** instead of sequential
3. **Custom threshold configuration** for gap scores
4. **Slack notifications** on scheduled failures
5. **Historical trend analysis** dashboard
6. **Test flakiness detection** across matrix runs
