/**
 * Generate Aggregated Multi-Trace Comment
 *
 * Converts aggregated-analysis.json into formatted PR comment
 * Suitable for multi-trace scenarios where multiple failures are analyzed
 *
 * Input: aggregated-analysis.json
 * Output: Markdown comment + gh pr comment execution
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

interface AggregatedAnalysis {
  summary: string;
  traces_analyzed: number;
  traces_failed: number;
  trace_files: string[];
  common_issues: Array<{
    issue: string;
    affected_traces: string[];
    priority: string;
  }>;
  deduplicated_solutions: Array<{
    title: string;
    patch: string;
    risk: string;
    verify: string;
    priority: "high" | "medium" | "low";
    affected_traces: string[];
    similarity_matches: number;
  }>;
  statistics: {
    total_issues: number;
    common_issues_count: number;
    unique_issues_count: number;
    coverage_percent: number;
  };
  recommendations: string[];
  timestamp: string;
}

function priorityToEmoji(
  priority: "high" | "medium" | "low"
): string {
  switch (priority) {
    case "high":
      return "🔴";
    case "medium":
      return "🟡";
    case "low":
      return "⚪";
    default:
      return "❓";
  }
}

function generateCommentBody(analysis: AggregatedAnalysis): string {
  const lines: string[] = [];

  // Header
  lines.push("## 🤖 Copilot Trace Analysis Report (Multi-Trace)\n");

  // Summary
  lines.push("### 📋 Summary\n");
  lines.push(analysis.summary);
  lines.push("");

  // Overview stats
  lines.push("### 📊 Analysis Overview\n");
  lines.push(`- **Traces Analyzed**: ${analysis.traces_analyzed}`);
  lines.push(`- **Failed Traces**: ${analysis.traces_failed}`);
  lines.push(`- **Unique Issues**: ${analysis.statistics.total_issues}`);
  lines.push(`- **Common Issues**: ${analysis.statistics.common_issues_count}`);
  lines.push(`- **Systemic Pattern**: ${analysis.statistics.coverage_percent}%`);
  lines.push("");

  // Trace list
  if (analysis.trace_files.length > 0) {
    lines.push("### 📁 Traces Processed\n");
    for (const trace of analysis.trace_files) {
      lines.push(`- ${trace}`);
    }
    lines.push("");
  }

  // Common issues (if any)
  if (analysis.common_issues.length > 0) {
    lines.push("### ⚠️ Common Issues (Affecting Multiple Traces)\n");
    for (const issue of analysis.common_issues) {
      const emoji = priorityToEmoji(issue.priority as "high" | "medium" | "low");
      lines.push(
        `${emoji} **${issue.issue}**`
      );
      lines.push(
        `   - Affects: ${issue.affected_traces.join(", ")} (${issue.affected_traces.length} traces)`
      );
    }
    lines.push("");
  }

  // Solutions (deduplicated)
  if (analysis.deduplicated_solutions.length > 0) {
    lines.push("### 💡 Recommended Solutions\n");

    // Sort by priority and affected traces
    const sortedSolutions = analysis.deduplicated_solutions.sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const priorityDiff =
        (priorityOrder[a.priority] || 999) -
        (priorityOrder[b.priority] || 999);
      if (priorityDiff !== 0) return priorityDiff;
      return b.affected_traces.length - a.affected_traces.length;
    });

    for (let i = 0; i < sortedSolutions.length && i < 5; i++) {
      const solution = sortedSolutions[i];
      const emoji = priorityToEmoji(solution.priority);

      lines.push(
        `${emoji} **Solution ${i + 1}: ${solution.title}** [${solution.priority.toUpperCase()}]`
      );
      lines.push("");

      // Affected traces
      lines.push(
        `**Affects**: ${solution.affected_traces.join(", ")} (${solution.affected_traces.length}/${analysis.traces_failed} traces)`
      );

      // Details
      lines.push("**目的** (Purpose):");
      lines.push("```");
      lines.push(solution.title);
      lines.push("```");

      lines.push("**変更箇所** (Changed Files):");
      lines.push("```");
      lines.push(solution.patch.split("\n").slice(0, 10).join("\n")); // First 10 lines
      lines.push("```");

      lines.push("**リスク** (Risk):");
      lines.push(`- ${solution.risk}`);

      lines.push("**検証手順** (Verification):");
      lines.push(`- ${solution.verify}`);

      lines.push("");
    }

    // Impact analysis
    if (analysis.common_issues.length > 0) {
      lines.push("### 📈 Impact Analysis\n");
      const fixedTraces = Math.min(
        analysis.statistics.common_issues_count + 1,
        analysis.traces_failed
      );
      const expectedFix = Math.round((fixedTraces / analysis.traces_failed) * 100);
      lines.push(
        `- Implementing these solutions would fix approximately **${fixedTraces}/${analysis.traces_failed}** traces (${expectedFix}%)`
      );
      lines.push(
        `- Expected speedup: ${analysis.traces_analyzed}x analysis completed`
      );
      lines.push("");
    }
  }

  // Recommendations
  if (analysis.recommendations.length > 0) {
    lines.push("### 🎯 Quick Wins\n");
    for (const rec of analysis.recommendations.slice(0, 3)) {
      lines.push(`- ${rec}`);
    }
    lines.push("");
  }

  // Footer
  lines.push(
    `**Generated**: ${new Date(analysis.timestamp).toLocaleString("ja-JP")}`
  );
  lines.push("*Powered by Copilot Dynamic Workflows - Phase 2D*");

  return lines.join("\n");
}

async function postAggregatedComment(
  analysisPath: string = "./aggregated-analysis.json",
  prNumber?: number
): Promise<void> {
  console.log("📝 Generating aggregated multi-trace comment...\n");

  // Read aggregated analysis
  let analysis: AggregatedAnalysis;
  try {
    const content = readFileSync(analysisPath, "utf-8");
    analysis = JSON.parse(content);
    console.log("✅ Loaded aggregated analysis");
  } catch (error) {
    console.error("❌ Failed to load analysis:", (error as Error).message);
    process.exit(1);
  }

  // Generate comment body
  const commentBody = generateCommentBody(analysis);

  // Save to file
  writeFileSync("./aggregated-comment.md", commentBody);
  console.log("✅ Saved comment to: ./aggregated-comment.md");

  // Post to PR if PR_NUMBER is set
  if (!prNumber && process.env.PR_NUMBER) {
    prNumber = parseInt(process.env.PR_NUMBER);
  }

  if (prNumber) {
    console.log(`\n📤 Posting comment to PR #${prNumber}...\n`);

    try {
      // Use gh CLI to post comment (safer than inline JSON)
      const commentFile = "./aggregated-comment.md";
      execSync(`gh pr comment ${prNumber} -F "${commentFile}"`, {
        stdio: "inherit",
        shell: "/bin/bash"
      });
      console.log("✅ Comment posted successfully");
    } catch (error) {
      console.warn(
        "⚠️ Failed to post comment:",
        (error as Error).message
      );
    }
  } else {
    console.log("\nℹ️ No PR_NUMBER provided. Comment saved to aggregated-comment.md");
    console.log("To post manually: gh pr comment <PR_NUMBER> -F aggregated-comment.md");
  }

  // Set GitHub output
  if (process.env.GITHUB_OUTPUT) {
    const fs = require("fs");
    const output = `comment_generated=true\ncomment_path=./aggregated-comment.md\ntraces_analyzed=${analysis.traces_analyzed}\n`;
    fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  }
}

// Main execution
const analysisPath = process.argv[2] || "./aggregated-analysis.json";
const prNumber = process.argv[3] ? parseInt(process.argv[3]) : undefined;

postAggregatedComment(analysisPath, prNumber).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

export { generateCommentBody, postAggregatedComment };
