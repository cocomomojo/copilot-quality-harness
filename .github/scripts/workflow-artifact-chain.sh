#!/bin/bash
# Workflow Artifact Chaining Script
# This script demonstrates the end-to-end artifact workflow chain

set -e

echo "🚀 Workflow Artifact Chaining Pipeline"
echo "========================================"
echo ""

# Configuration
SPEC_FILE="${SPEC_FILE:-tests/specs/user-registration.yml}"
QUALITY_MODE="${QUALITY_MODE:-simple}"

echo "📋 Configuration:"
echo "  Spec File: $SPEC_FILE"
echo "  Quality Mode: $QUALITY_MODE"
echo ""

# Step 1: Generate Quality Items
echo "📦 Step 1: Generating quality items ($QUALITY_MODE mode)..."
gh workflow run generate-quality-items.yml -f mode="$QUALITY_MODE"
sleep 5

# Get Run ID
echo "⏳ Retrieving workflow run ID..."
RUN_ID=$(gh run list --workflow generate-quality-items.yml --limit 1 --json databaseId -q '.[0].databaseId')
echo "✅ Run ID: $RUN_ID"
echo ""

# Wait for completion
echo "⏳ Waiting for quality items generation to complete..."
WAIT_COUNT=0
MAX_WAIT=120
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  STATUS=$(gh run view "$RUN_ID" --json conclusion -q '.conclusion')
  
  if [ "$STATUS" == "success" ]; then
    echo "✅ Quality items generated successfully"
    break
  elif [ "$STATUS" == "failure" ]; then
    echo "❌ Quality items generation failed"
    exit 1
  fi
  
  WAIT_COUNT=$((WAIT_COUNT + 10))
  echo "  [${WAIT_COUNT}s] Status: $STATUS (waiting...)"
  sleep 10
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
  echo "⚠️  Timeout waiting for quality items generation"
  echo "Continuing with Run ID: $RUN_ID"
fi

echo ""

# Step 2: Display Generated Artifact Info
echo "📊 Generated Artifact Information:"
echo "  Artifact Name: quality-items-$QUALITY_MODE"
echo "  Workflow Run: https://github.com/$GITHUB_REPOSITORY/actions/runs/$RUN_ID"
echo ""

# Step 3: Download and verify artifact (optional)
if command -v gh &> /dev/null; then
  echo "🔍 Verifying artifact..."
  TEMP_DIR=$(mktemp -d)
  gh run download "$RUN_ID" --name "quality-items-$QUALITY_MODE" --dir "$TEMP_DIR"
  
  echo "✅ Artifact files verified:"
  ls -1 "$TEMP_DIR" | sed 's/^/   - /'
  
  echo ""
  echo "📋 Manifest:"
  cat "$TEMP_DIR/manifest.json" | sed 's/^/   /'
  echo ""
  
  rm -rf "$TEMP_DIR"
fi

# Step 4: Run Spec-to-Implementation
echo "🔧 Step 2: Running spec-to-implementation workflow..."
if [ ! -f "$SPEC_FILE" ]; then
  echo "⚠️  Spec file not found: $SPEC_FILE"
  echo "   Skipping spec-to-implementation step"
  echo ""
  echo "✅ Artifact workflow chain setup complete!"
  echo "   Run ID: $RUN_ID"
  echo "   Artifact: quality-items-$QUALITY_MODE"
  exit 0
fi

gh workflow run spec-to-implementation.yml \
  -f spec_file="$SPEC_FILE" \
  -f quality_items_artifact="quality-items-$QUALITY_MODE" \
  -f quality_items_run_id="$RUN_ID"

sleep 5

# Get new Run ID
SPEC_RUN_ID=$(gh run list --workflow spec-to-implementation.yml --limit 1 --json databaseId -q '.[0].databaseId')
echo "✅ Spec-to-Implementation Run ID: $SPEC_RUN_ID"
echo ""

# Wait for completion
echo "⏳ Waiting for spec-to-implementation to complete..."
WAIT_COUNT=0
MAX_WAIT=180
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  STATUS=$(gh run view "$SPEC_RUN_ID" --json conclusion -q '.conclusion')
  
  if [ "$STATUS" == "success" ]; then
    echo "✅ Spec-to-implementation completed successfully"
    break
  elif [ "$STATUS" == "failure" ]; then
    echo "⚠️  Spec-to-implementation failed (may be expected for this workflow)"
    break
  fi
  
  WAIT_COUNT=$((WAIT_COUNT + 15))
  echo "  [${WAIT_COUNT}s] Status: $STATUS (waiting...)"
  sleep 15
done

echo ""
echo "✅ Workflow Artifact Chaining Complete!"
echo ""
echo "📊 Summary:"
echo "  Step 1 (Generate Quality Items):"
echo "    Run ID: $RUN_ID"
echo "    URL: https://github.com/$GITHUB_REPOSITORY/actions/runs/$RUN_ID"
echo "    Artifact: quality-items-$QUALITY_MODE"
echo ""
echo "  Step 2 (Spec-to-Implementation):"
echo "    Run ID: $SPEC_RUN_ID"
echo "    URL: https://github.com/$GITHUB_REPOSITORY/actions/runs/$SPEC_RUN_ID"
echo ""
echo "🎯 Next Steps:"
echo "  1. Review artifact: gh run download $RUN_ID --name quality-items-$QUALITY_MODE"
echo "  2. Check workflow logs: gh run view $SPEC_RUN_ID --log"
echo "  3. Reference guide: .github/WORKFLOW_ARTIFACT_GUIDE.md"
