# GitHub Actions Artifact Workflow Guide

## Overview

このガイドは、ワークフロー間でのアーティファクト受け渡しのベストプラクティスを説明します。

## Workflow Chain: Generate → Consume

### 1. Generate Quality Items Workflow

品質テスト項目を生成し、アーティファクトとして保存します。

```bash
gh workflow run generate-quality-items.yml -f mode=simple
```

**出力:**
- Artifact: `quality-items-simple`
- Files:
  - `test-perspectives-simple.json`
  - `test-items-simple.yml`
  - `test-items-simple.json`
  - `manifest.json` (メタデータ)

**Manifest Structure:**
```json
{
  "version": "1.0",
  "generated_at": "2026-10-20T05:28:19Z",
  "workflow_run_id": 39375069089,
  "mode": "simple",
  "files": {
    "test_perspectives": "test-perspectives-simple.json",
    "test_items_yaml": "test-items-simple.yml",
    "test_items_json": "test-items-simple.json"
  },
  "artifact_name": "quality-items-simple",
  "github_run_url": "https://github.com/cocomomojo/copilot-quality-harness/actions/runs/39375069089"
}
```

### 2. Use Artifact in Next Workflow (Spec-to-Implementation)

生成された品質項目を後続ワークフローで使用します。

**Option A: Direct Run ID and Artifact Name**

```bash
gh workflow run spec-to-implementation.yml \
  -f spec_file='tests/specs/user-registration.yml' \
  -f quality_items_artifact='quality-items-simple' \
  -f quality_items_run_id='39375069089'
```

**Option B: Get Run ID from Previous Workflow**

```bash
# Get latest run ID from generate-quality-items
RUN_ID=$(gh run list --workflow generate-quality-items.yml --limit 1 --json databaseId -q '.[0].databaseId')

# Run spec-to-implementation with artifact
gh workflow run spec-to-implementation.yml \
  -f spec_file='tests/specs/user-registration.yml' \
  -f quality_items_artifact='quality-items-simple' \
  -f quality_items_run_id="$RUN_ID"
```

### 3. Artifact Download in Workflow

ワークフロー内でアーティファクトを自動的にダウンロード:

```yaml
- name: Download quality items artifact (if provided)
  if: inputs.quality_items_artifact != '' && inputs.quality_items_run_id != ''
  id: download-quality-items
  run: |
    mkdir -p qa/quality-items-input
    gh run download "${{ inputs.quality_items_run_id }}" \
      --name "${{ inputs.quality_items_artifact }}" \
      --dir qa/quality-items-input
  env:
    GH_TOKEN: ${{ github.token }}
```

## Complete Example Workflow

### Step 1: Generate Quality Items (simple mode)

```bash
$ gh workflow run generate-quality-items.yml -f mode=simple

# Wait for completion
$ gh run list --workflow generate-quality-items.yml --limit 1
completed	success	Generate Quality Items	Generate Quality Items	main	workflow_dispatch	39375069089	...

# Get Run ID
$ RUN_ID=$(gh run list --workflow generate-quality-items.yml --limit 1 --json databaseId -q '.[0].databaseId')
$ echo "Run ID: $RUN_ID"
Run ID: 39375069089
```

### Step 2: Use in Spec-to-Implementation

```bash
$ gh workflow run spec-to-implementation.yml \
  -f spec_file='tests/specs/user-registration.yml' \
  -f quality_items_artifact='quality-items-simple' \
  -f quality_items_run_id='39375069089'

# Verify workflow completed
$ gh run list --workflow spec-to-implementation.yml --limit 1
completed	success	Spec-to-Implementation	...
```

### Step 3: Access Quality Items in Workflow

ワークフロー内のステップから品質項目を使用:

```bash
# アーティファクトは qa/quality-items-input に配置される
- name: Use quality items
  run: |
    # マニフェストを読む
    MANIFEST=$(cat qa/quality-items-input/manifest.json)
    echo "Quality items mode: $(echo $MANIFEST | jq -r '.mode')"
    
    # テスト項目を使う
    cp qa/quality-items-input/test-items-simple.yml tests/integration/
```

## Best Practices

### 1. Artifact Naming Convention

```
quality-items-{mode}
├── test-perspectives-{mode}.json
├── test-items-{mode}.yml
├── test-items-{mode}.json
└── manifest.json
```

### 2. Manifest for Tracking

常に `manifest.json` を含めることで:
- 生成日時を記録
- ワークフロー実行IDを追跡
- 使用ファイルを明確に定義
- 後続ワークフローでの検証が容易

### 3. Retention Policy

```yaml
- name: Upload generated artifacts
  uses: actions/upload-artifact@v4
  with:
    name: quality-items-${{ github.event.inputs.mode }}
    path: qa/quality-characteristics/generated/
    retention-days: 30  # ← 適切なライフサイクル設定
    if-no-files-found: error  # ← ファイル生成失敗時に検知
```

### 4. Conditional Workflow Chaining

必要に応じてのみ後続ワークフローを実行:

```yaml
- name: Trigger spec-to-implementation if quality items ready
  if: success()
  run: |
    RUN_ID=$(echo "${{ github.run_id }}")
    gh workflow run spec-to-implementation.yml \
      -f spec_file='tests/specs/user-registration.yml' \
      -f quality_items_artifact='quality-items-simple' \
      -f quality_items_run_id="$RUN_ID"
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Troubleshooting

### Artifact Not Found

```bash
# 利用可能なアーティファクトを確認
$ gh run view <RUN_ID> --json artifacts

# 特定のアーティファクトを確認
$ gh run download <RUN_ID> --name quality-items-simple --dir /tmp/test
```

### Manifest Validation

```bash
# マニフェスト構造を検証
$ jq . qa/quality-items-input/manifest.json

# 必須フィールドを確認
$ jq '.files' qa/quality-items-input/manifest.json
```

### Run ID Retrieval

```bash
# 最新の実行を取得
$ gh run list --workflow generate-quality-items.yml --limit 1 --json databaseId,conclusion

# 成功した最新の実行を取得
$ gh run list --workflow generate-quality-items.yml --limit 10 --json databaseId,conclusion | \
  jq '.[] | select(.conclusion == "success") | .databaseId' | head -1
```

## Integration with CI/CD

### Automated Quality Pipeline

```bash
#!/bin/bash
set -e

echo "🚀 Starting quality pipeline..."

# Step 1: Generate quality items
echo "📦 Generating quality items (simple mode)..."
gh workflow run generate-quality-items.yml -f mode=simple
sleep 5

# Get the run ID
RUN_ID=$(gh run list --workflow generate-quality-items.yml --limit 1 --json databaseId -q '.[0].databaseId')
echo "✅ Quality items generated: Run ID $RUN_ID"

# Wait for completion
echo "⏳ Waiting for quality items generation..."
while true; do
  STATUS=$(gh run view "$RUN_ID" --json conclusion -q '.conclusion')
  if [ "$STATUS" == "success" ]; then
    echo "✅ Quality items ready"
    break
  elif [ "$STATUS" == "failure" ]; then
    echo "❌ Quality items generation failed"
    exit 1
  fi
  sleep 10
done

# Step 2: Run spec-to-implementation with quality items
echo "🔧 Running spec-to-implementation with quality items..."
gh workflow run spec-to-implementation.yml \
  -f spec_file='tests/specs/user-registration.yml' \
  -f quality_items_artifact='quality-items-simple' \
  -f quality_items_run_id="$RUN_ID"

echo "✅ Quality pipeline complete"
```

## Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Upload and Download Artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
- [Workflow Triggers](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)
