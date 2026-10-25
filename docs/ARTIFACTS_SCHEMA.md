---
layout: default
title: 📦 アーティファクト仕様書
---

# 📦 アーティファクト仕様書

ワークフロー間で受け渡されるアーティファクト（ファイル・データ）の完全なスキーマ定義

---

## 📋 目次

1. [Test Matrix Artifacts](#test-matrix-artifacts)
2. [Quality Report Artifacts](#quality-report-artifacts)
3. [Spec to Implementation Artifacts](#spec-to-implementation-artifacts)
4. [Copilot Analyze Trace Artifacts](#copilot-analyze-trace-artifacts)
5. [M2 Issue Intake Artifacts](#m2-issue-intake-artifacts)
6. [Quality Schedule Artifacts](#quality-schedule-artifacts)

---

## Test Matrix Artifacts

### ファイル名パターン
- `test-results-node{version}-{test-type}.json`
- `coverage-summary.json`

### test-results-nodeXX-unit.json

```json
{
  "test_type": "unit",
  "node_version": "20",
  "status": "passed",
  "summary": {
    "passed": 45,
    "failed": 0,
    "skipped": 2,
    "total": 47,
    "duration_ms": 2300,
    "duration_display": "2.3s"
  },
  "test_suites": [
    {
      "name": "src/auth.test.ts",
      "passed": 15,
      "failed": 0,
      "skipped": 1,
      "duration_ms": 450
    }
  ],
  "failures": [],
  "coverage": {
    "lines": {
      "covered": 920,
      "total": 1000,
      "percent": 92
    },
    "branches": {
      "covered": 85,
      "total": 100,
      "percent": 85
    },
    "functions": {
      "covered": 90,
      "total": 100,
      "percent": 90
    }
  }
}
```

### test-results-nodeXX-e2e.json

```json
{
  "test_type": "e2e",
  "node_version": "20",
  "status": "passed",
  "summary": {
    "passed": 12,
    "failed": 0,
    "skipped": 0,
    "total": 12,
    "duration_ms": 15400,
    "duration_display": "15.4s"
  },
  "test_suites": [
    {
      "name": "e2e/user-registration.spec.ts",
      "passed": 6,
      "failed": 0,
      "duration_ms": 7200
    }
  ],
  "failures": []
}
```

### coverage-summary.json

```json
{
  "summary": {
    "lines": {
      "total": 1000,
      "covered": 920,
      "percent": 92,
      "status": "pass"
    },
    "branches": {
      "total": 100,
      "covered": 85,
      "percent": 85,
      "status": "pass"
    },
    "functions": {
      "total": 100,
      "covered": 90,
      "percent": 90,
      "status": "pass"
    }
  },
  "files": [
    {
      "file": "src/auth.ts",
      "lines": { "covered": 200, "total": 220, "percent": 91 },
      "branches": { "covered": 20, "total": 25, "percent": 80 },
      "functions": { "covered": 15, "total": 18, "percent": 83 }
    }
  ]
}
```

---

## Quality Report Artifacts

### quality-report-pr.json

Quality Report PR が生成する JSON レポート（PR コメントと同内容）

```json
{
  "pr_number": 123,
  "report_timestamp": "2026-10-20T09:30:00Z",
  "test_results": {
    "node_18": {
      "unit": { "passed": 45, "failed": 0, "skipped": 2, "status": "pass" },
      "e2e": { "passed": 12, "failed": 0, "skipped": 0, "status": "pass" }
    },
    "node_20": {
      "unit": { "passed": 45, "failed": 0, "skipped": 2, "status": "pass" },
      "e2e": { "passed": 12, "failed": 0, "skipped": 0, "status": "pass" }
    }
  },
  "coverage": {
    "lines": { "percent": 92, "status": "pass", "target": 80 },
    "branches": { "percent": 85, "status": "pass", "target": 75 },
    "functions": { "percent": 90, "status": "pass", "target": 80 }
  },
  "performance": {
    "total_duration_ms": 35200,
    "unit_tests_duration_ms": 4600,
    "e2e_tests_duration_ms": 30600,
    "parallel_jobs_count": 6,
    "speedup_factor": 1.7
  },
  "recommendations": {
    "can_merge": true,
    "notes": ["All tests passed", "Coverage exceeds targets"]
  }
}
```

現在の `quality-report-pr.yml` では、実際には `quality-report-summary.json` を生成し、以下のトレーサビリティ情報を含みます。

```json
{
  "all_passed": true,
  "pass_rate": 97,
  "total_tests": 69,
  "total_passed": 67,
  "total_failed": 2,
  "table": "| Node Version | Unit Tests | API Tests | E2E Tests | Advanced Tests | ...",
  "matrix_summary": {
    "total_combinations": 4,
    "by_test_type": {
      "unit": { "passed_tests": 45, "failed_tests": 0, "status": "all_passed" }
    }
  },
  "traceability": {
    "perspective_count": 8,
    "quality_items_count": 48,
    "spec_issue_mapping": [
      {
        "issue": 100,
        "spec_file": "user-registration.yml",
        "ut_cases": 7,
        "e2e_cases": 4
      }
    ]
  }
}
```

---

## Spec to Implementation Artifacts

### spec-generated-ut.json

```json
{
  "spec_file": "tests/specs/user-registration.yml",
  "generated_files": [
    {
      "path": "src/tests/unit/user-registration.spec.ts",
      "type": "unit",
      "size_bytes": 2450,
      "test_cases": 12,
      "generated_from": "UT-001,UT-002,UT-003"
    }
  ],
  "git_branch": "feature/spec-generated-tests-1729417800000",
  "pr_number": 124,
  "status": "success"
}
```

### spec-generated-e2e.json

```json
{
  "spec_file": "tests/specs/user-registration.yml",
  "generated_files": [
    {
      "path": "e2e/user-registration.spec.ts",
      "type": "e2e",
      "size_bytes": 3240,
      "test_cases": 6,
      "generated_from": "E2E-001,E2E-002"
    }
  ],
  "git_branch": "feature/spec-generated-tests-1729417800000",
  "pr_number": 124,
  "status": "success"
}
```

### spec-generated-mocks.json

```json
{
  "spec_file": "tests/specs/user-registration.yml",
  "generated_files": [
    {
      "path": "tests/fixtures/mocks.ts",
      "type": "mock",
      "size_bytes": 1850,
      "mocks_count": 3,
      "endpoints": [
        "/api/users/register",
        "/api/email/send",
        "/api/auth/verify"
      ]
    }
  ],
  "git_branch": "feature/spec-generated-tests-1729417800000",
  "pr_number": 124,
  "status": "success"
}
```

---

## Copilot Analyze Trace Artifacts

### trace-summary.json

Trace.zip から抽出されたテスト失敗情報

```json
{
  "trace_file": "trace.zip",
  "test_name": "User Registration E2E",
  "status": "failed",
  "failure_timestamp": "2026-10-20T09:15:30Z",
  "error_type": "assertion_failure",
  "error_message": "Expected text 'Registration successful' but got 'Error: Invalid email'",
  "error_location": {
    "file": "e2e/user-registration.spec.ts",
    "line": 45,
    "function": "should register new user successfully"
  },
  "failure_context": {
    "step": 3,
    "action": "click",
    "target": "[data-test='submit-btn']",
    "expected": "Form submission succeeds",
    "actual": "Form submission failed with validation error"
  },
  "stack_trace": "Error: Expected text...",
  "screenshot_count": 5,
  "console_logs": [
    { "level": "error", "message": "Email validation failed", "timestamp": "09:15:28" }
  ],
  "network_requests": [
    {
      "method": "POST",
      "url": "/api/users/register",
      "status": 400,
      "response": { "error": "Invalid email format" }
    }
  ],
  "pii_filtered": true,
  "sensitive_data_removed": ["user@example.com → USER_EMAIL"]
}
```

### analysis-trace.json (per job in Matrix)

各並列ジョブが生成する分析結果

```json
{
  "trace_file": "trace.zip",
  "analysis_timestamp": "2026-10-20T09:20:00Z",
  "copilot_model": "claude-opus",
  "failure_summary": "Email validation not enforced on client side before API call",
  "root_causes": [
    {
      "probability": 0.9,
      "cause": "Missing input validation regex in frontend form",
      "evidence": "HTML form field missing 'type=email' or validation pattern",
      "confidence": 9
    }
  ],
  "solutions": [
    {
      "priority": 1,
      "title": "Add client-side email validation",
      "description": "Add HTML5 email input type or regex validation",
      "code_snippet": "const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\nif (!emailRegex.test(email)) { throw new Error('Invalid email'); }",
      "file_to_modify": "src/components/RegistrationForm.tsx",
      "line_range": "45-50",
      "risk_level": "low",
      "estimated_impact": "high",
      "confidence": 8.5
    }
  ],
  "test_recommendations": [
    {
      "test_id": "E2E-NEW-001",
      "title": "Validate email rejection on client side",
      "description": "Test that invalid emails are rejected before API call",
      "priority": "high"
    }
  ]
}
```

### aggregated-analysis.json

複数トレースを集約した最終分析結果

```json
{
  "traces_analyzed": 3,
  "analysis_timestamp": "2026-10-20T09:25:00Z",
  "aggregated_failure": {
    "title": "Email validation not enforced on client side",
    "occurrences": 3,
    "confidence": 0.92
  },
  "deduplicated_solutions": [
    {
      "solution_id": "SOL-001",
      "title": "Add client-side email validation",
      "mentioned_in_traces": [1, 2, 3],
      "deduplicated_similarity": 0.95,
      "final_code": "...",
      "priority": 1,
      "confidence": 8.5
    }
  ],
  "cross_trace_insights": "Same root cause identified in all 3 traces",
  "recommendations": "Implement client-side validation before calling API"
}
```

---

## M2 Issue Intake Artifacts

### m2-report.json

Issue 自動解析結果

```json
{
  "issue_number": 100,
  "issue_title": "User Registration Flow",
  "analysis_timestamp": "2026-10-20T09:30:00Z",
  "acceptance_criteria": [
    { "id": "AC-1", "description": "Email input field exists", "testable": true },
    { "id": "AC-2", "description": "Password validation rules", "testable": true }
  ],
  "test_perspectives": {
    "functionality": [
      { "name": "Email validation", "priority": "high" },
      { "name": "Password validation", "priority": "high" }
    ],
    "security": [
      { "name": "SQL injection prevention", "priority": "critical" },
      { "name": "XSS prevention", "priority": "critical" }
    ]
  },
  "suggested_spec_yaml": "feature: User Registration\ndescription: ...",
  "repository_context": {
    "existing_similar_features": ["user-login.spec.ts"],
    "suggested_framework": "Playwright",
    "estimated_test_count": 8
  }
}
```

---

## Quality Schedule Artifacts

### weekly-quality-report.json

週次スケジュール実行の品質レポート

```json
{
  "report_week": "2026-W42",
  "report_date": "2026-10-20T05:00:00Z",
  "metrics": {
    "total_tests": 500,
    "passed": 497,
    "failed": 3,
    "flake_rate": 0.6,
    "avg_duration_ms": 45000,
    "coverage": {
      "lines": 92,
      "branches": 85,
      "functions": 90
    }
  },
  "copilot_metrics": {
    "suggestions_per_week": 45,
    "adoption_rate": 0.82,
    "auto_merge_rate": 0.05,
    "security_issues_found": 2
  },
  "trends": {
    "test_count_trend": "increasing",
    "coverage_trend": "stable",
    "flake_rate_trend": "decreasing"
  },
  "alerts": []
}
```

---

## JSON スキーマ定義

各アーティファクトのスキーマは以下のディレクトリに格納：

```
.github/
├── artifacts-schemas/
│   ├── test-results-schema.json
│   ├── quality-report-schema.json
│   ├── trace-analysis-schema.json
│   ├── m2-report-schema.json
│   └── weekly-report-schema.json
```

### スキーマ検証の実施

各ワークフローは、生成するアーティファクトを JSON Schema に対して検証する必要があります：

```bash
# 例: test-results の検証
npx ajv validate \
  -s .github/artifacts-schemas/test-results-schema.json \
  -d artifacts/test-results-node18-unit.json
```

---

## 🔄 ワークフロー間のデータフロー

```
test-matrix.yml
  ↓ (generates)
test-results-*.json, coverage-*.json
  ↓ (downloaded by)
quality-report-pr.yml
  ↓ (generates)
quality-report-pr.json
  ↓ (posted as)
PR Comment
```

```
spec-to-implementation.yml
  ↓ (reads)
tests/specs/*.yml
  ↓ (generates)
spec-generated-ut.json, spec-generated-e2e.json, spec-generated-mocks.json
  ↓ (creates)
PR with generated code
```

```
copilot-analyze-trace.yml
  ↓ (detects)
trace.zip artifacts
  ↓ (extracts)
trace-summary.json
  ↓ (parallel analysis)
analysis-trace-{1..8}.json
  ↓ (aggregates)
aggregated-analysis.json
  ↓ (posts)
Draft PR with solutions
```

---

## ✅ チェックリスト

各ワークフロー実装時に確認：

- [ ] アーティファクト名がこのドキュメントと一致しているか
- [ ] JSON スキーマが定義されているか
- [ ] スキーマ検証が実装されているか
- [ ] アーティファクトが正しくアップロードされているか
- [ ] 後続ワークフローが正しくダウンロードできるか
- [ ] PII フィルタが適用されているか

---

**Last Updated**: 2026-10-20  
**Version**: 1.0
