/**
 * Check for Duplicate Analysis
 *
 * Prevents re-analyzing the same test failure
 * Useful for cost optimization and reducing noise
 *
 * Logic:
 * 1. Check PR comments for previous Copilot analyses
 * 2. Compare current failure with previous failures
 * 3. If duplicate: post reference comment
 * 4. If new: proceed with analysis
 */

import { execSync } from "child_process";

interface CopilotComment {
  id: number;
  body: string;
  created_at: string;
  analysis: {
    failing_test: string;
    failure_category: string;
    failure_reason: string;
  };
}

interface CurrentFailure {
  failing_test: string;
  failure_category: string;
  failure_reason: string;
}

async function getPreviousCopilotAnalyses(
  prNumber: number,
  sinceHours: number = 168 // 7 days
): Promise<CopilotComment[]> {
  console.log(`🔍 Checking previous Copilot analyses on PR #${prNumber}...`);

  try {
    // Get PR comments
    const output = execSync(
      `gh pr view ${prNumber} --json comments --jq '.comments[] | select(.body | contains("🤖 Copilot"))' 2>/dev/null`,
      { encoding: "utf-8" }
    );

    if (!output.trim()) {
      console.log("  No previous analyses found");
      return [];
    }

    // Parse comments
    const lines = output.split("\n");
    const comments: CopilotComment[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        const analysis = extractAnalysisFromBody(parsed.body);
        if (analysis) {
          comments.push({
            id: parsed.id,
            body: parsed.body,
            created_at: parsed.createdAt,
            analysis
          });
        }
      } catch (e) {
        // Skip parse errors
      }
    }

    console.log(`  Found ${comments.length} previous Copilot comment(s)`);
    return comments;
  } catch (error) {
    console.warn("⚠️ Could not fetch previous comments:", (error as Error).message);
    return [];
  }
}

function extractAnalysisFromBody(body: string): any {
  const matches = {
    failing_test: body.match(/Test Failure[`:\s]*`?([^`\n]+)`?/),
    failure_category: body.match(/Category[`:\s]*`?([^`\n]+)`?/),
    failure_reason: body.match(/Summary[\s\n]*([^\n]+)/i)
  };

  if (!matches.failing_test && !matches.failure_category) {
    return null;
  }

  return {
    failing_test: matches.failing_test?.[1]?.trim() || "",
    failure_category: matches.failure_category?.[1]?.trim() || "",
    failure_reason: matches.failure_reason?.[1]?.trim() || ""
  };
}

function isSameFailure(current: CurrentFailure, previous: CopilotComment): boolean {
  // Exact match on failing_test or failure_category
  const testMatch =
    current.failing_test?.toLowerCase() ===
    previous.analysis.failing_test?.toLowerCase();

  const categoryMatch =
    current.failure_category?.toLowerCase() ===
    previous.analysis.failure_category?.toLowerCase();

  // If both test and category match, it's the same failure
  if (testMatch && categoryMatch) {
    return true;
  }

  // If test name matches exactly, likely the same failure
  if (testMatch && current.failing_test) {
    return true;
  }

  return false;
}

async function checkDuplicate(
  currentFailure: CurrentFailure,
  prNumber: number
): Promise<{ isDuplicate: boolean; referenceId?: number; message?: string }> {
  console.log("🔎 Checking for duplicate analysis...\n");

  const previousAnalyses = await getPreviousCopilotAnalyses(prNumber);

  if (previousAnalyses.length === 0) {
    console.log("✅ No previous analyses found. Proceeding with new analysis.");
    return { isDuplicate: false };
  }

  // Check each previous analysis
  for (const previous of previousAnalyses) {
    if (isSameFailure(currentFailure, previous)) {
      const createdAt = new Date(previous.created_at);
      const hoursAgo = Math.round(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
      );

      const message = `ℹ️ Same failure was analyzed ${hoursAgo} hours ago.\nReferenced analysis:\n${previous.body.substring(0, 500)}...`;

      console.log(`⚠️ Duplicate detected! (${hoursAgo}h ago)`);
      console.log(message);

      return {
        isDuplicate: true,
        referenceId: previous.id,
        message
      };
    }
  }

  console.log("✅ No duplicate analysis found. Proceeding with new analysis.");
  return { isDuplicate: false };
}

async function postDuplicateComment(
  prNumber: number,
  referenceId: number
): Promise<void> {
  const body = `ℹ️ This test failure was already analyzed by Copilot (see comment above).

**Why no re-analysis?**
- Same test failure detected
- Analysis cost optimization
- Refer to previous analysis for fix suggestions

**Have you implemented the suggested fix?**
1. ✅ Yes → Push fix, tests should pass
2. ❓ Different error? → Comment below for new analysis`;

  console.log("📝 Posting duplicate reference comment...");
  execSync(`gh pr comment ${prNumber} --body "${body.replace(/"/g, '\\"')}"`, {
    stdio: "inherit"
  });
  console.log("✅ Comment posted");
}

// Main execution
async function main() {
  const prNumber = parseInt(process.env.PR_NUMBER || "0");
  const failingTest = process.env.FAILING_TEST || "Unknown Test";
  const failureCategory =
    process.env.FAILURE_CATEGORY || "unknown_failure";

  if (!prNumber) {
    console.log("⚠️ PR_NUMBER not set. Skipping duplicate check.");
    return;
  }

  const currentFailure: CurrentFailure = {
    failing_test: failingTest,
    failure_category: failureCategory,
    failure_reason: process.env.FAILURE_REASON || ""
  };

  const result = await checkDuplicate(currentFailure, prNumber);

  if (result.isDuplicate && result.referenceId) {
    await postDuplicateComment(prNumber, result.referenceId);
    // Set environment variable to skip analysis
    if (process.env.GITHUB_OUTPUT) {
      const fs = require("fs");
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `skip_analysis=true\nduplicate_message=${result.message}\n`
      );
    }
  } else {
    if (process.env.GITHUB_OUTPUT) {
      const fs = require("fs");
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `skip_analysis=false\n`);
    }
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});

export { getPreviousCopilotAnalyses, isSameFailure, checkDuplicate };
