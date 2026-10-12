/**
 * List and Detect Trace Artifacts
 *
 * Scans for Playwright trace artifacts in:
 * - GitHub Actions artifacts
 * - Local directories
 *
 * Used by Phase 2C: Multiple trace analysis (parallel)
 */

import { existsSync, readdirSync, statSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface TraceArtifact {
  name: string;
  path: string;
  type: "workflow-artifact" | "local-directory";
  size: number;
}

async function listTraceArtifacts(): Promise<TraceArtifact[]> {
  const artifacts: TraceArtifact[] = [];

  // Step 1: Check local trace directories
  console.log("🔍 Scanning for local trace artifacts...");
  const localDirs = [
    "./trace-artifacts",
    "./playwright-report",
    "./.playwright",
    "./qa/trace-analyses"
  ];

  for (const dir of localDirs) {
    if (existsSync(dir)) {
      const stat = statSync(dir);
      artifacts.push({
        name: dir.split("/").pop() || dir,
        path: dir,
        type: "local-directory",
        size: stat.size
      });
      console.log(`  ✅ Found: ${dir}`);
    }
  }

  // Step 2: Check GitHub Actions artifacts (if in workflow context)
  if (process.env.GITHUB_RUN_ID) {
    console.log("🔍 Scanning for GitHub Actions artifacts...");
    try {
      const { stdout } = await execAsync(
        `gh api repos/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID/artifacts --paginate`
      );
      const artifactsData = JSON.parse(stdout);

      for (const artifact of artifactsData.artifacts || []) {
        if (
          artifact.name.includes("trace") ||
          artifact.name.includes("playwright") ||
          artifact.name.includes("report")
        ) {
          artifacts.push({
            name: artifact.name,
            path: `gh-artifact://${artifact.name}`,
            type: "workflow-artifact",
            size: artifact.size_in_bytes
          });
          console.log(`  ✅ Found: ${artifact.name}`);
        }
      }
    } catch (e) {
      console.warn("⚠️ Could not list GitHub artifacts:", (e as Error).message);
    }
  }

  return artifacts;
}

async function downloadArtifact(
  artifactName: string,
  outputPath: string = "./trace-artifacts"
): Promise<void> {
  console.log(`📥 Downloading artifact: ${artifactName}`);

  try {
    await execAsync(
      `gh run download $GITHUB_RUN_ID --name "${artifactName}" --dir "${outputPath}"`
    );
    console.log(`✅ Downloaded: ${artifactName}`);
  } catch (e) {
    console.warn(`⚠️ Could not download ${artifactName}:`, (e as Error).message);
  }
}

async function detectFailedTests(): Promise<string[]> {
  const failedTests: string[] = [];

  console.log("🔍 Detecting failed tests...");

  // Strategy 1: Look for test output files
  const outputFiles = [
    "./test-results.json",
    "./.playwright/index.json",
    "./playwright-report/index.json"
  ];

  for (const file of outputFiles) {
    if (existsSync(file)) {
      try {
        const content = JSON.parse(require("fs").readFileSync(file, "utf-8"));
        if (content.suites) {
          content.suites.forEach((suite: any) => {
            if (suite.tests) {
              suite.tests.forEach((test: any) => {
                if (test.status === "failed" || test.status === "interrupted") {
                  failedTests.push(test.title || `${suite.title}::${test.title}`);
                }
              });
            }
          });
        }
      } catch (e) {
        console.warn(`⚠️ Could not parse ${file}`);
      }
    }
  }

  // Strategy 2: Check workflow logs for FAILED patterns
  if (process.env.GITHUB_RUN_ID) {
    try {
      const { stdout } = await execAsync(
        `gh run view $GITHUB_RUN_ID --log | grep -E "FAILED|Error|✗"`
      );
      const matches = stdout.match(/FAILED: (.+)/g);
      if (matches) {
        failedTests.push(
          ...matches.map((m) => m.replace("FAILED: ", "").trim())
        );
      }
    } catch (e) {
      console.warn("⚠️ Could not parse workflow logs");
    }
  }

  console.log(`Found ${failedTests.length} failed test(s)`);
  return [...new Set(failedTests)]; // Remove duplicates
}

// Main execution (export for use in workflows)
async function main() {
  console.log("📊 Trace Artifact Detection\n");

  const artifacts = await listTraceArtifacts();
  const failedTests = await detectFailedTests();

  console.log(`\n📈 Summary:`);
  console.log(`  - Trace artifacts found: ${artifacts.length}`);
  console.log(`  - Failed tests detected: ${failedTests.length}`);

  // Output as JSON for GitHub Actions
  console.log("\n📝 JSON Output (for GitHub Actions):");
  console.log(
    JSON.stringify(
      {
        artifacts: artifacts.map((a) => ({ name: a.name, path: a.path })),
        failedTests: failedTests,
        timestamp: new Date().toISOString()
      },
      null,
      2
    )
  );

  // Set GitHub output (for matrix strategy)
  if (process.env.GITHUB_OUTPUT) {
    const fs = require("fs");
    const artifactNames = artifacts.map((a) => a.name);
    const hasArtifacts = artifactNames.length > 0 ? "true" : "false";
    
    // Format: artifacts=["name1","name2"] for fromJson() in workflow
    const artifactsJson = JSON.stringify(artifactNames);
    const output = `artifacts=${artifactsJson}\nhas_artifacts=${hasArtifacts}\nfailed_tests=${JSON.stringify(failedTests)}\n`;
    fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
    
    console.log("\n✅ GitHub Actions output set:");
    console.log(`  - artifacts=${artifactsJson}`);
    console.log(`  - has_artifacts=${hasArtifacts}`);
  }
}

main().catch(console.error);

// Export for testing
export { listTraceArtifacts, downloadArtifact, detectFailedTests };
