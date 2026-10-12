/**
 * Create Draft PR from Copilot Analysis
 *
 * Input:  ./trace-artifacts/analysis.json
 * Output: Draft PR on GitHub
 */

import { readFileSync, writeFileSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import * as crypto from "crypto";

const execAsync = promisify(exec);

interface Solution {
  id: number;
  title: string;
  purpose: string;
  patch: string;
  risk: string;
  verify_steps: string[];
  priority: "high" | "medium" | "low";
}

interface Analysis {
  status: string;
  summary: string;
  repro_steps: string[];
  solutions: Solution[];
  metadata: {
    failure_category: string;
    failing_test: string;
    generated_at: string;
  };
}

async function createDraftPR() {
  try {
    console.log("📝 Generating Draft PR from Copilot analysis...");

    // Load analysis.json
    const analysisPath = "./trace-artifacts/analysis.json";
    const analysisContent = readFileSync(analysisPath, "utf-8");
    const analysis: Analysis = JSON.parse(analysisContent);

    if (analysis.status !== "success") {
      console.error("❌ Analysis status is not success:", analysis.status);
      process.exit(1);
    }

    // Generate branch name
    const timestamp = Date.now().toString().slice(-8);
    const hash = crypto
      .createHash("sha256")
      .update(timestamp)
      .digest("hex")
      .slice(0, 8);
    const branchName = `copilot-suggest/trace-${timestamp}-${hash}`;

    console.log(`📌 Branch name: ${branchName}`);

    // Generate PR body
    const prBody = generatePRBody(analysis);

    // Write PR body to file for gh command
    const bodyFile = "./draft-pr-body-final.md";
    writeFileSync(bodyFile, prBody, "utf-8");
    console.log(`✅ PR body saved to ${bodyFile}`);

    // Git config
    await execAsync('git config user.name "github-actions[bot]"');
    await execAsync(
      'git config user.email "41898282+github-actions[bot]@users.noreply.github.com"'
    );

    // Create and push branch
    console.log("🔀 Creating branch and pushing...");
    try {
      await execAsync(`git checkout -b ${branchName}`);
    } catch (e) {
      // Branch may already exist locally; try pulling latest
      console.warn("⚠️ Could not create branch; attempting switch...");
      await execAsync(`git checkout ${branchName}`);
    }

    // Add analysis artifacts
    try {
      await execAsync("mkdir -p ./qa/trace-analyses");
      await execAsync("cp ./trace-artifacts/analysis.json ./qa/trace-analyses/");
      await execAsync("cp ./trace-artifacts/trace-summary.json ./qa/trace-analyses/");
      await execAsync("git add ./qa/trace-analyses/");
      await execAsync(
        'git commit -m "chore: add trace analysis artifacts [skip ci]"'
      );
    } catch (e) {
      console.warn("⚠️ Could not commit artifacts:", (e as Error).message);
    }

    // Push branch
    await execAsync(`git push origin ${branchName}`, { maxBuffer: 5 * 1024 * 1024 });
    console.log(`✅ Branch pushed: origin/${branchName}`);

    // Create Draft PR using gh CLI
    console.log("📋 Creating Draft PR...");
    const prTitle = `[Copilot 提案] Playwright トレース解析`;

    const { stdout: prOutput } = await execAsync(
      `gh pr create --draft --title "${prTitle}" --body-file "${bodyFile}" --label "copilot-suggestion"`,
      { maxBuffer: 5 * 1024 * 1024 }
    );

    console.log("✅ Draft PR created successfully");
    console.log(prOutput);

    console.log("\n✨ 完了!");
    console.log("📌 次のステップ:");
    console.log("  1. Draft PR を GitHub で確認してください");
    console.log("  2. Copilot の提案を確認してください");
    console.log("  3. 対応が必要な場合、Draft PR をレビュー状態に変更してください");
    console.log("  4. チーム内で確認後、マージしてください");
  } catch (error) {
    console.error("❌ Error creating Draft PR:", error);
    process.exit(1);
  }
}

function generatePRBody(analysis: Analysis): string {
  const priorityEmoji = {
    high: "🔴",
    medium: "🟡",
    low: "🟢"
  };

  const solutionsSections = analysis.solutions
    .map((sol) => {
      const emoji = priorityEmoji[sol.priority] || "❓";
      return `
### ${emoji} 修正案 ${sol.id}: ${sol.title}

**目的**: ${sol.purpose}

**優先度**: ${sol.priority}

**変更内容**:
\`\`\`patch
${sol.patch}
\`\`\`

**リスク**: ${sol.risk}

**検証手順**:
${sol.verify_steps.map((step) => `- ${step}`).join("\n")}
`;
    })
    .join("\n");

  const body = `# 🤖 Copilot: Playwright トレース解析提案

## 📋 失敗分析

${analysis.summary}

## 🔄 再現手順

${analysis.repro_steps.map((step) => `1. ${step}`).join("\n")}

## 💡 修正提案

${solutionsSections}

---

## 📌 重要な注意事項

⚠️ **このドラフト PR は Copilot が自動生成しました。**

### 必須確認事項

- [ ] 失敗原因の分析が正確か確認しましたか？
- [ ] 提案された修正案が実装可能か確認しましたか？
- [ ] リスク評価に合意しましたか？
- [ ] チームレビューを実施しましたか？

### マージ前に必ず実施すること

1. **ローカル検証**: 修正案をローカルで試してテストが成功することを確認
2. **チームレビュー**: チームメンバーに提案内容をレビューしてもらう
3. **Draft → Open**: Draft PR をレビュー状態に変更
4. **マージ**: チーム内で最終確認後にマージ

### 自動マージについて

🚫 **自動マージは行われません。** 必ず人間が最終判断してください。

---

## 📊 分析メタデータ

- **失敗カテゴリ**: \`${analysis.metadata.failure_category}\`
- **失敗テスト**: \`${analysis.metadata.failing_test}\`
- **生成日時**: ${analysis.metadata.generated_at}
- **ラベル**: \`copilot-suggestion\`

---

**質問や不明な点がある場合は、このドラフト PR のコメントでお知らせください。**
`;

  return body;
}

// Main execution
createDraftPR();
