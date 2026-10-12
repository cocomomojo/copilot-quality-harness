/**
 * Aggregate Trace Results
 *
 * Merges multiple analysis.json files and deduplicates solutions
 * Identifies cross-trace patterns and systemic issues
 *
 * Input: analysis-trace-1.json, analysis-trace-2.json, ...
 * Output: aggregated-analysis.json
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { extname } from "path";

interface Solution {
  title: string;
  patch: string;
  risk: string;
  verify: string;
  priority: "high" | "medium" | "low";
}

interface Analysis {
  summary: string;
  solutions: Solution[];
}

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

/**
 * Calculate similarity between two strings (0-100)
 * Simple implementation: matching words / total words
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;
  return Math.round((intersection.size / union.size) * 100);
}

/**
 * Find duplicate solutions based on similarity
 */
function deduplicateSolutions(
  allSolutions: Array<{ solution: Solution; trace: string }>
): Array<{
  solution: Solution;
  affected_traces: string[];
  similarity_matches: number;
}> {
  const deduplicated: Map<
    string,
    {
      solution: Solution;
      affected_traces: Set<string>;
      match_count: number;
    }
  > = new Map();

  const SIMILARITY_THRESHOLD = 85;

  for (const { solution, trace } of allSolutions) {
    let found = false;

    // Check against existing deduplicated solutions
    for (const [key, existing] of deduplicated.entries()) {
      const similarity = calculateSimilarity(
        solution.title,
        existing.solution.title
      );

      if (similarity >= SIMILARITY_THRESHOLD) {
        existing.affected_traces.add(trace);
        existing.match_count++;
        found = true;
        break;
      }
    }

    // If no match, add as new
    if (!found) {
      const key = `${solution.title.substring(0, 50)}_${Date.now()}`;
      deduplicated.set(key, {
        solution,
        affected_traces: new Set([trace]),
        match_count: 1
      });
    }
  }

  // Convert to output format
  return Array.from(deduplicated.values()).map((item) => ({
    solution: item.solution,
    affected_traces: Array.from(item.affected_traces),
    similarity_matches: item.match_count
  }));
}

/**
 * Identify common issues across traces
 */
function identifyCommonIssues(
  allAnalyses: Map<string, Analysis>
): Array<{
  issue: string;
  affected_traces: string[];
  priority: string;
}> {
  const issues: Map<
    string,
    {
      traces: Set<string>;
      priority: string;
    }
  > = new Map();

  for (const [trace, analysis] of allAnalyses.entries()) {
    // Extract issues from summary (first line)
    const firstLine = analysis.summary.split("\n")[0];

    if (!issues.has(firstLine)) {
      // Infer priority from first solution if available
      const priority = analysis.solutions[0]?.priority || "medium";
      issues.set(firstLine, {
        traces: new Set([trace]),
        priority
      });
    } else {
      const issueData = issues.get(firstLine)!;
      issueData.traces.add(trace);
    }
  }

  return Array.from(issues.entries())
    .filter(([_, data]) => data.traces.size > 1) // Only common issues
    .map(([issue, data]) => ({
      issue,
      affected_traces: Array.from(data.traces),
      priority: data.priority
    }))
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder]
        ? -1
        : 1;
    });
}

/**
 * Generate aggregated summary
 */
function generateAggregatedSummary(
  allAnalyses: Map<string, Analysis>,
  commonIssuesCount: number
): string {
  const failedTraces = allAnalyses.size;
  const summaryLines: string[] = [];

  // Line 1: Overview
  summaryLines.push(
    `複数のテストで失敗を検出しました（${failedTraces}件）。`
  );

  // Line 2: Common issues
  if (commonIssuesCount > 0) {
    summaryLines.push(
      `共通する問題は${commonIssuesCount}件です。システム的な原因が考えられます。`
    );
  } else {
    summaryLines.push("各テストで異なる原因が検出されました。");
  }

  // Line 3: Recommendation
  summaryLines.push("重大度の高い順に修正案を参照してください。");

  return summaryLines.join("\n");
}

async function aggregateResults(outputDir: string = "."): Promise<void> {
  console.log("🔍 Aggregating trace analysis results...\n");

  // Find all analysis files
  const analysisFiles = readdirSync(outputDir).filter((file) =>
    file.startsWith("analysis-") && file.endsWith(".json")
  );

  if (analysisFiles.length === 0) {
    console.log("⚠️ No analysis files found");
    return;
  }

  console.log(`Found ${analysisFiles.length} analysis file(s):`);
  analysisFiles.forEach((f) => console.log(`  - ${f}`));

  const allAnalyses = new Map<string, Analysis>();
  const allSolutions: Array<{ solution: Solution; trace: string }> = [];

  // Load all analysis files
  for (const file of analysisFiles) {
    try {
      const content = readFileSync(`${outputDir}/${file}`, "utf-8");
      const analysis = JSON.parse(content) as Analysis;
      const traceName = file.replace("analysis-", "").replace(".json", "");

      allAnalyses.set(traceName, analysis);

      // Collect solutions
      for (const solution of analysis.solutions || []) {
        allSolutions.push({ solution, trace: traceName });
      }

      console.log(`✅ Loaded: ${file}`);
    } catch (error) {
      console.warn(`⚠️ Failed to load ${file}:`, (error as Error).message);
    }
  }

  // Process results
  console.log("\n🔄 Processing aggregation...");

  // Deduplicate solutions
  const deduplicatedSolutions = deduplicateSolutions(allSolutions);
  console.log(
    `  Deduplicated ${allSolutions.length} solutions → ${deduplicatedSolutions.length} unique`
  );

  // Identify common issues
  const commonIssues = identifyCommonIssues(allAnalyses);
  console.log(`  Found ${commonIssues.length} common issue(s)`);

  // Generate aggregated summary
  const summary = generateAggregatedSummary(allAnalyses, commonIssues.length);
  console.log(`  Generated aggregated summary (3 lines)`);

  // Build aggregated result
  const failedTraces = allAnalyses.size;
  const uniqueIssues = deduplicatedSolutions.length;
  const coverage = Math.round((commonIssues.length / uniqueIssues) * 100);

  const aggregated: AggregatedAnalysis = {
    summary,
    traces_analyzed: analysisFiles.length,
    traces_failed: failedTraces,
    trace_files: analysisFiles.map((f) => f.replace("analysis-", "").replace(".json", "")),
    common_issues: commonIssues,
    deduplicated_solutions: deduplicatedSolutions,
    statistics: {
      total_issues: uniqueIssues,
      common_issues_count: commonIssues.length,
      unique_issues_count: uniqueIssues - commonIssues.length,
      coverage_percent: coverage
    },
    recommendations: deduplicatedSolutions
      .filter((s) => s.solution.priority === "high")
      .map((s) => `[HIGH] ${s.solution.title} (affects ${s.affected_traces.length} traces)`)
      .slice(0, 5), // Top 5 high-priority
    timestamp: new Date().toISOString()
  };

  // Write result
  const outputPath = `${outputDir}/aggregated-analysis.json`;
  writeFileSync(outputPath, JSON.stringify(aggregated, null, 2));
  console.log(`\n✅ Aggregated result: ${outputPath}`);

  // Print summary
  console.log("\n📊 Aggregation Summary:");
  console.log(`  Traces analyzed: ${aggregated.traces_analyzed}`);
  console.log(`  Failed traces: ${failedTraces}`);
  console.log(`  Unique issues: ${uniqueIssues}`);
  console.log(`  Common issues: ${commonIssues.length}`);
  console.log(`  Coverage: ${coverage}%`);
  console.log(
    `  Top solution: ${deduplicatedSolutions[0]?.solution.title || "(none)"}`
  );

  // Set GitHub output
  if (process.env.GITHUB_OUTPUT) {
    const fs = require("fs");
    const output = `aggregation_complete=true\ntotal_issues=${uniqueIssues}\ncommon_issues=${commonIssues.length}\n`;
    fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  }
}

// Main execution
aggregateResults(".").catch((error) => {
  console.error("❌ Aggregation failed:", error);
  process.exit(1);
});

export { aggregateResults, deduplicateSolutions, identifyCommonIssues };
