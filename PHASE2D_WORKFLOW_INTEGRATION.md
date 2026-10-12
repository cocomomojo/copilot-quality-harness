# Phase 2D Workflow Integration Guide

## Overview

Phase 2D adds parallel matrix execution to the workflow. This document explains how to integrate matrix strategy into `copilot-analyze-trace.yml`.

## Architecture Change

### Current (Phase 2C)
```
Single job (analyze-trace):
  - Download artifact
  - Generate trace-summary.json
  - Check duplicate
  - Generate dynamic prompt
  - Run Copilot CLI
  - Post PR comment
  
Result: 1 trace analyzed per run
```

### Target (Phase 2D)
```
Job 1: detect-artifacts
  - outputs: artifacts JSON array

Job 2: analyze-traces (matrix)
  strategy:
    matrix:
      trace: ${{ fromJson(needs.detect-artifacts.outputs.artifacts) }}
  
  Parallel jobs (4-8 traces):
  - Download trace
  - Generate trace-summary.json
  - Run Copilot CLI
  - Upload analysis-*.json

Job 3: aggregate-results
  - needs: [analyze-traces]
  - Download all analysis-*.json
  - Run aggregate-trace-results.ts
  - Generate aggregated-analysis.json

Job 4: post-aggregated-comment
  - needs: [aggregate-results]
  - Run generate-aggregated-comment.ts
  - Post PR comment with multi-trace analysis
```

## Implementation Steps

### Step 1: Extract detect-artifacts to separate job

```yaml
jobs:
  detect-artifacts:
    name: Detect Trace Artifacts
    runs-on: ubuntu-latest
    outputs:
      artifacts: ${{ steps.detect.outputs.artifacts }}
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - id: detect
        run: npx ts-node scripts/detect-trace-artifacts.ts
```

### Step 2: Create matrix job

```yaml
  analyze-traces:
    name: Analyze Trace (Matrix)
    needs: [detect-artifacts]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        trace: ${{ fromJson(needs.detect-artifacts.outputs.artifacts) }}
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Download Trace Artifact
        uses: actions/download-artifact@v4
        with:
          name: ${{ matrix.trace }}
          path: ./trace-artifacts
      
      - name: Generate Trace Summary
        run: |
          npx ts-node scripts/trace-summary.ts \
            $(find ./trace-artifacts -name "*.trace" | head -1)
      
      - name: Run Copilot Analysis
        env:
          COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}
        run: |
          npx ts-node scripts/analyze-with-copilot.ts \
            ./trace-artifacts/trace-summary.json
      
      - name: Upload Analysis Result
        uses: actions/upload-artifact@v4
        with:
          name: analysis-${{ matrix.trace }}
          path: trace-artifacts/analysis.json
          retention-days: 7
```

### Step 3: Add aggregation job

```yaml
  aggregate-results:
    name: Aggregate Multi-Trace Results
    needs: [analyze-traces]
    runs-on: ubuntu-latest
    if: success()
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Download All Analysis Results
        uses: actions/download-artifact@v4
        with:
          path: ./results
      
      - name: Aggregate Results
        run: |
          # Copy all analysis files to current dir
          find ./results -name "analysis-*.json" -exec cp {} . \;
          npx ts-node scripts/aggregate-trace-results.ts
      
      - name: Upload Aggregated Analysis
        uses: actions/upload-artifact@v4
        with:
          name: aggregated-analysis
          path: aggregated-analysis.json
          retention-days: 30
```

### Step 4: Add comment posting job

```yaml
  post-aggregated-comment:
    name: Post Aggregated Comment
    needs: [aggregate-results]
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' && success()
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Download Aggregated Analysis
        uses: actions/download-artifact@v4
        with:
          name: aggregated-analysis
          path: .
      
      - name: Post Comment
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: |
          npx ts-node scripts/generate-aggregated-comment.ts \
            ./aggregated-analysis.json $PR_NUMBER
```

## Backward Compatibility

Phase 2D maintains backward compatibility with Phase 2C:

1. **Single trace**: Matrix with 1 element = same as Phase 2C
2. **Multiple traces**: Matrix parallelization activated
3. **No artifacts detected**: Graceful degradation to single analysis
4. **Manual trigger**: Works with specified artifact or auto-detection

## Performance Improvements

| Scenario | Phase 2C | Phase 2D | Speedup |
|----------|----------|---------|---------|
| 1 trace | 5 min | 5 min | - |
| 4 traces | 20 min | 6 min | 3.3x |
| 8 traces | 40 min | 10 min | 4x |

*Assuming 5 min per trace + 1 min overhead*

## Error Handling

### Matrix Job Failure
- If one matrix job fails, others continue
- Failed traces listed in aggregation report
- Comment includes "⚠️ 1/4 traces failed"

### Rate Limiting
- Copilot API: Max 4 concurrent calls
- Workflow: Matrix size capped at 8
- Fallback: Sequential execution if rate-limited

### No Artifacts
- Phase 2D gracefully falls back to Phase 2C mode
- Single analysis performed
- Comment posting works normally

## Configuration

### Environment Variables
```bash
# In .github/workflows/copilot-analyze-trace.yml

env:
  COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}
  SIMILARITY_THRESHOLD: 85  # For deduplication
  MAX_PARALLEL_TRACES: 8
  MAX_COPILOT_CALLS: 4
```

### Artifact Retention
```yaml
retention-days: 7   # Analysis artifacts (short-term)
retention-days: 30  # Aggregated results (archive)
```

## Testing Matrix Integration

### Test 1: Single Trace
```
Inputs: 1 trace
Expected: Matrix runs once, normal output
Command: Act --matrix trace:["trace-1"]
```

### Test 2: Multiple Unique Traces
```
Inputs: 4 unique failures
Expected: 4 parallel jobs, aggregation works
Command: Act --matrix trace:["t1","t2","t3","t4"]
```

### Test 3: Duplicate Detection in Matrix
```
Inputs: 4 traces (2 same failure)
Expected: Deduplication in aggregation
Command: Act --matrix trace:["t1","t2","t3","t4"] (t1≈t2)
```

### Test 4: Partial Failure
```
Inputs: 4 traces, 1 times out
Expected: 3 succeed, 1 fails, report partial
Command: Act --matrix trace:["t1","t2","t3","timeout"]
```

## Next Steps (Phase 2D Part 2)

1. Implement matrix strategy in workflow
2. Test with mock artifacts
3. Verify aggregation logic
4. Optimize rate limiting
5. Add error handling
6. Update documentation

---

**Status**: Planning complete, ready for implementation
**Target PR**: #10
**Est. LOC**: 100-150 workflow YAML lines
