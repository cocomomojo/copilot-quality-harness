import { defineWorkflow } from "@github/copilot-sdk/extension";

/**
 * Copilot Dynamic Workflow: Playwright トレース解析
 *
 * 目的:
 *   1. Playwright trace artifact を受け取り
 *   2. 失敗原因を短く要約（3行）
 *   3. 再現手順を明記
 *   4. 最大3つの修正案を生成（各案に目的・変更・リスク・検証）
 *   5. 優先度と期待効果を提示
 *
 * 入力: trace-summary.json（9つの必須キー）
 * 出力: analysis.json（structured JSON）
 */

export default defineWorkflow({
  meta: {
    name: "analyze-trace-workflow",
    description: "Analyze Playwright test failures and suggest fixes",
    version: "1.0.0"
  },

  async run({ agent, input }) {
    // Input validation
    if (!input || typeof input !== "object") {
      throw new Error("Invalid input: trace summary object required");
    }

    const traceSummary = input;

    // ========================================
    // Step 1: 失敗原因の短い要約（3行）
    // ========================================
    const summaryResult = await agent.invoke("summarize-failure", {
      trace_summary: traceSummary,
      language: "ja",
      max_lines: 3,
      focus_areas: [
        "actual_failure_type",
        "root_cause",
        "impact_on_test"
      ]
    });

    if (!summaryResult || !summaryResult.output) {
      throw new Error("Failed to generate summary");
    }

    const summary = summaryResult.output.summary ||
      "Failed to generate summary";

    // ========================================
    // Step 2: 再現手順（簡潔）
    // ========================================
    const reproResult = await agent.invoke("extract-repro-steps", {
      trace_summary: traceSummary,
      language: "ja",
      max_steps: 5,
      include_timestamps: false
    });

    const reproSteps = (reproResult?.output?.steps || [])
      .filter((step) => typeof step === "string" && step.length > 0);

    // ========================================
    // Step 3: 修正案3つ（各案に目的・変更・リスク・検証）
    // ========================================
    const solutionsResult = await agent.invoke("generate-fixes", {
      trace_summary: traceSummary,
      failure_reason: summary,
      max_solutions: 3,
      language: "ja",
      solution_format: {
        title: "string",
        purpose: "string (目的)",
        patch: "string (unified diff)",
        risk: "string (リスク評価)",
        verify_steps: ["string"],
        priority: "high|medium|low"
      }
    });

    const rawSolutions = solutionsResult?.output?.solutions || [];

    // ========================================
    // Step 4: 修正案の検証（型チェック・フィルタ）
    // ========================================
    const validated = await agent.invoke("validate-solutions", {
      solutions: rawSolutions,
      original_trace: traceSummary,
      validation_rules: [
        "patch is valid unified diff",
        "risk is realistic",
        "verify_steps are actionable",
        "priority is high/medium/low"
      ]
    });

    const solutions = (validated?.output?.solutions || [])
      .map((sol, idx) => ({
        id: idx + 1,
        title: sol.title || `Fix ${idx + 1}`,
        purpose: sol.purpose || sol.description || "",
        patch: sol.patch || "",
        risk: sol.risk || "Unknown",
        verify_steps: Array.isArray(sol.verify_steps)
          ? sol.verify_steps
          : sol.verify
            ? [sol.verify]
            : [],
        priority: ["high", "medium", "low"].includes(sol.priority)
          ? sol.priority
          : "medium"
      }))
      .filter((sol) => sol.patch.length > 0);

    // ========================================
    // Final Output
    // ========================================
    return {
      status: "success",
      summary: summary,
      repro_steps: reproSteps,
      solutions: solutions,
      metadata: {
        failure_category: traceSummary.failure_category || "unknown",
        failing_test: traceSummary.failing_test || "",
        generated_at: new Date().toISOString(),
        workflow_version: "1.0.0"
      }
    };
  }
});
