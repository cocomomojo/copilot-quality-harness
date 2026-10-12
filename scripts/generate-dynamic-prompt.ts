/**
 * Generate Dynamic Agent Prompt
 *
 * Enhances Copilot agent prompt with:
 * - PR context (description, related issues)
 * - Recent similar failures
 * - Repository-specific patterns
 * - Failure history analysis
 *
 * Used by Phase 2C: Dynamic prompt generation
 */

import { execSync } from "child_process";

interface PromptContext {
  prDescription: string;
  relatedIssues: string[];
  recentFailures: Array<{ test: string; category: string; date: string }>;
  repoPatterns: string[];
  suggestions: string[];
}

async function extractPRContext(prNumber: number): Promise<string> {
  console.log(`📋 Extracting PR #${prNumber} context...`);

  try {
    const output = execSync(
      `gh pr view ${prNumber} --json body,title --jq '.body + "\\n\\nTitle: " + .title'`,
      { encoding: "utf-8" }
    );
    return output.trim();
  } catch (e) {
    console.warn("⚠️ Could not extract PR context");
    return "";
  }
}

async function findRelatedIssues(prNumber: number): Promise<string[]> {
  console.log(`🔗 Finding related issues for PR #${prNumber}...`);

  try {
    const output = execSync(
      `gh pr view ${prNumber} --json body --jq '.body' | grep -oE '#[0-9]+' || echo ""`,
      { encoding: "utf-8", shell: "/bin/bash" }
    );

    const issues = output.match(/#\d+/g) || [];
    console.log(`  Found ${issues.length} related issue(s)`);
    return issues.map((i) => i.substring(1)); // Remove #
  } catch (e) {
    console.warn("⚠️ Could not find related issues");
    return [];
  }
}

async function getRecentFailures(
  testName?: string,
  hoursBack: number = 168
): Promise<Array<{ test: string; category: string; date: string }>> {
  console.log(
    `📊 Scanning recent failures (last ${hoursBack} hours)...`
  );

  const failures: Array<{ test: string; category: string; date: string }> = [];

  try {
    // Check git log for test failure commits
    const output = execSync(
      `git log --oneline --grep="FAILED\\|test.*fail" --since="${hoursBack} hours ago" | head -10`,
      { encoding: "utf-8", cwd: process.cwd() }
    );

    const lines = output.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      const match = line.match(/^([a-f0-9]+)\s+(.+FAILED.+)$/);
      if (match) {
        failures.push({
          test: match[2],
          category: "git_log_failure",
          date: new Date().toISOString()
        });
      }
    }

    console.log(`  Found ${failures.length} recent failure(s) in git log`);
  } catch (e) {
    console.warn("⚠️ Could not scan git log");
  }

  return failures;
}

async function detectRepoPatterns(): Promise<string[]> {
  console.log("🔍 Detecting repository patterns...");

  const patterns: string[] = [];

  try {
    // Pattern 1: Check if using Playwright
    const hasPlaywright = execSync("grep -r 'playwright' package.json 2>/dev/null || echo ''", {
      encoding: "utf-8",
      shell: "/bin/bash"
    }).trim();
    if (hasPlaywright) {
      patterns.push("Playwright-based E2E testing");
    }

    // Pattern 2: Check if using Vitest or Jest
    const testFramework = execSync(
      "grep -E '\"(vitest|jest)\"' package.json | head -1 || echo ''",
      { encoding: "utf-8", shell: "/bin/bash" }
    ).trim();
    if (testFramework.includes("vitest")) {
      patterns.push("Vitest test runner");
    } else if (testFramework.includes("jest")) {
      patterns.push("Jest test runner");
    }

    // Pattern 3: Check for common E2E test patterns
    const hasPageObjects = execSync(
      "find . -name '*.po.ts' -o -name '*page-object*' 2>/dev/null | head -1 || echo ''",
      { encoding: "utf-8", shell: "/bin/bash" }
    ).trim();
    if (hasPageObjects) {
      patterns.push("Page Object Model pattern");
    }

    // Pattern 4: Check for fixture usage
    const hasFixtures = execSync(
      "grep -r 'fixture\\|@fixtures' test/ playwright.config.ts 2>/dev/null | head -1 || echo ''",
      { encoding: "utf-8", shell: "/bin/bash" }
    ).trim();
    if (hasFixtures) {
      patterns.push("Custom test fixtures");
    }

    console.log(`  Detected patterns: ${patterns.join(", ")}`);
  } catch (e) {
    console.warn("⚠️ Could not detect repo patterns");
  }

  return patterns;
}

async function generateSuggestions(
  failingTest: string,
  failureCategory: string,
  recentFailures: Array<{ test: string; category: string; date: string }>
): Promise<string[]> {
  console.log("💡 Generating context-aware suggestions...");

  const suggestions: string[] = [];

  // Suggestion 1: Based on failure category
  switch (failureCategory) {
    case "timeout":
      suggestions.push(
        "Increase timeout or add explicit waits for slow elements"
      );
      suggestions.push("Check for network latency or backend delays");
      break;
    case "element_not_found":
      suggestions.push("Verify selector accuracy with browser DevTools");
      suggestions.push(
        "Add dynamic waits for dynamically-loaded elements"
      );
      break;
    case "network_error":
      suggestions.push("Check API endpoint availability");
      suggestions.push("Mock network requests for testing");
      break;
    case "assertion_failure":
      suggestions.push("Verify expected vs. actual values");
      suggestions.push("Check for race conditions in assertions");
      break;
  }

  // Suggestion 2: Based on recent failures
  const sameTestFailures = recentFailures.filter((f) =>
    f.test.toLowerCase().includes(failingTest.toLowerCase())
  );
  if (sameTestFailures.length > 2) {
    suggestions.push(
      `This test has failed ${sameTestFailures.length} times recently - consider major refactoring`
    );
  }

  return suggestions;
}

async function generatePrompt(
  traceSummary: any,
  prNumber?: number
): Promise<string> {
  console.log("\n🚀 Generating dynamic agent prompt...\n");

  let context: PromptContext = {
    prDescription: "",
    relatedIssues: [],
    recentFailures: [],
    repoPatterns: [],
    suggestions: []
  };

  // Extract PR context if available
  if (prNumber) {
    context.prDescription = await extractPRContext(prNumber);
    context.relatedIssues = await findRelatedIssues(prNumber);
  }

  // Get recent failures
  context.recentFailures = await getRecentFailures(
    traceSummary.failing_test
  );

  // Detect repo patterns
  context.repoPatterns = await detectRepoPatterns();

  // Generate suggestions
  context.suggestions = await generateSuggestions(
    traceSummary.failing_test,
    traceSummary.failure_category,
    context.recentFailures
  );

  // Build enhanced prompt
  const basePrompt = `
You are analyzing a Playwright test failure in cocomomojo/copilot-quality-harness.

## Current Failure
- **Test**: ${traceSummary.failing_test}
- **Category**: ${traceSummary.failure_category}
- **Summary**: ${traceSummary.summary || "See trace excerpt below"}

## Repository Context
- **Patterns**: ${context.repoPatterns.join(", ") || "Standard setup"}
- **Recent Similar Failures**: ${context.recentFailures.length}
${
  context.recentFailures.length > 0
    ? context.recentFailures
        .map((f) => `  - ${f.test} (${f.category})`)
        .join("\n")
    : "  (none)"
}

${
  prNumber
    ? `
## Pull Request Context
- **PR**: #${prNumber}
- **Related Issues**: ${context.relatedIssues.join(", ") || "none"}
- **Description**:
\`\`\`
${context.prDescription.substring(0, 500)}
\`\`\`
`
    : ""
}

## Trace Details
\`\`\`
${traceSummary.trace_excerpt || "See console errors below"}
\`\`\`

## Console Errors
${
  traceSummary.top_console_errors
    ?.slice(0, 3)
    .map((e: string) => `- ${e}`)
    .join("\n") || "- (none)"
}

## Context-Aware Guidance
${context.suggestions.map((s) => `- ${s}`).join("\n")}

## Your Task
1. **Summarize** the failure in 3 lines (日本語)
2. **Provide 3 fix suggestions** with:
   - Purpose (目的)
   - Changed code (変更箇所)
   - Code snippet (コードスニペット)
   - Risk assessment (リスク)
   - Verification steps (検証手順)
3. **Prioritize** by likelihood of success

## Constraints
- Output MUST be valid JSON only
- 日本語 for summary and explanations
- Max 2000 characters total for code snippets
- No auto-commit or breaking changes
`;

  console.log("✅ Dynamic prompt generated\n");
  return basePrompt;
}

// Main execution
async function main() {
  const traceSummaryPath = process.env.TRACE_SUMMARY_PATH || "./trace-summary.json";
  const prNumber = process.env.PR_NUMBER ? parseInt(process.env.PR_NUMBER) : undefined;

  console.log("📝 Dynamic Prompt Generation\n");

  try {
    const fs = require("fs");
    const traceSummary = JSON.parse(fs.readFileSync(traceSummaryPath, "utf-8"));

    const prompt = await generatePrompt(traceSummary, prNumber);

    // Save to file for workflow use
    fs.writeFileSync("./dynamic-prompt.md", prompt);
    console.log("💾 Saved to: ./dynamic-prompt.md");

    // Output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      const output = `prompt_path=./dynamic-prompt.md\nprompt_length=${prompt.length}\n`;
      fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
    }

    console.log(`✅ Prompt generated (${prompt.length} chars)`);
  } catch (error) {
    console.error("❌ Error generating prompt:", (error as Error).message);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});

export { generatePrompt, extractPRContext, findRelatedIssues, getRecentFailures };
