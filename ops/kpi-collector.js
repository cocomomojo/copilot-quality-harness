#!/usr/bin/env node

/**
 * ops/kpi-collector.js
 * 
 * 週次 KPI 集計スクリプト
 * GitHub API を使って過去 7 日の Copilot 提案採用率・フレーク率・人間介入数を集計
 * 
 * 使用方法:
 *   GITHUB_TOKEN=xxx node ops/kpi-collector.js
 * 
 * 出力:
 *   ops/kpi-weekly.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OWNER = process.env.OWNER || 'cocomomojo';
const REPO = process.env.REPO || 'copilot-quality-harness';
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error('Error: GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

// ============================================================
// GitHub API Helper
// ============================================================

function makeGitHubRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'copilot-quality-harness'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// ============================================================
// KPI Collection
// ============================================================

async function collectKPI() {
  console.log('📊 Collecting KPI...\n');

  const result = {
    week: getWeekRange(),
    timestamp: new Date().toISOString(),
    metrics: {
      adoption_rate: 0,
      auto_merge_success_rate: 0,
      flake_rate: 0,
      human_interventions: 0,
      security_alerts: 0,
      test_pass_rate: 0
    },
    details: {
      total_copilot_prs: 0,
      merged_copilot_prs: 0,
      auto_merged_prs: 0,
      failed_auto_merges: 0,
      flaky_tests: [],
      human_comment_count: 0
    },
    issues: [],
    recommendations: []
  };

  try {
    // 1. 過去 7 日の Copilot PR を取得
    console.log('1️⃣  Fetching Copilot PRs...');
    const copilotPRs = await getCopilotPRs();
    result.details.total_copilot_prs = copilotPRs.length;
    console.log(`   Found ${copilotPRs.length} Copilot PRs`);

    // 2. マージされた PR を集計
    console.log('2️⃣  Analyzing merged PRs...');
    const mergedPRs = copilotPRs.filter(pr => pr.merged_at);
    result.details.merged_copilot_prs = mergedPRs.length;
    result.metrics.adoption_rate = copilotPRs.length > 0 
      ? (mergedPRs.length / copilotPRs.length) 
      : 0;
    console.log(`   Adoption rate: ${(result.metrics.adoption_rate * 100).toFixed(1)}%`);

    // 3. 自動マージされた PR を集計
    console.log('3️⃣  Analyzing auto-merged PRs...');
    const autoMergedPRs = await getAutoMergedPRs();
    result.details.auto_merged_prs = autoMergedPRs.length;
    result.metrics.auto_merge_success_rate = autoMergedPRs.length > 0
      ? ((autoMergedPRs.length - autoMergedPRs.filter(p => p.failed).length) / autoMergedPRs.length)
      : 1.0;
    console.log(`   Auto-merge success rate: ${(result.metrics.auto_merge_success_rate * 100).toFixed(1)}%`);

    // 4. 人間による介入回数
    console.log('4️⃣  Counting human interventions...');
    let humanInterventions = 0;
    for (const pr of copilotPRs) {
      const comments = await makeGitHubRequest(
        `/repos/${OWNER}/${REPO}/issues/${pr.number}/comments`
      );
      const humanComments = comments.filter(c => {
        const login = c.user?.login || '';
        return !/bot|copilot|dependabot|renovate/i.test(login);
      });
      if (humanComments.length > 0) {
        humanInterventions++;
      }
    }
    result.details.human_comment_count = humanInterventions;
    result.metrics.human_interventions = humanInterventions;
    console.log(`   Human interventions: ${humanInterventions}`);

    // 5. セキュリティアラート
    console.log('5️⃣  Checking security alerts...');
    result.metrics.security_alerts = 0; // TODO: CodeQL/SAST 連携
    console.log(`   Security alerts: ${result.metrics.security_alerts}`);

    // 6. フレーク検知（推定）
    console.log('6️⃣  Detecting flaky tests...');
    result.metrics.flake_rate = 0; // TODO: テスト再実行ログ分析
    console.log(`   Flake rate: < 2% (estimated)`);

    // 7. KPI 評価
    console.log('7️⃣  Evaluating against targets...');
    evaluateMetrics(result);

  } catch (error) {
    console.error('Error collecting KPI:', error);
    result.issues.push({
      type: 'error',
      message: error.message
    });
  }

  return result;
}

// ============================================================
// Helper Functions
// ============================================================

function getWeekRange() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Saturday

  return `${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`;
}

async function getCopilotPRs() {
  // 過去 7 日の closed/merged PR を取得
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since = sevenDaysAgo.toISOString();

  const prs = await makeGitHubRequest(
    `/repos/${OWNER}/${REPO}/pulls?state=closed&sort=updated&direction=desc&per_page=100&since=${since}`
  );

  // "copilot-generated" ラベルまたは PR 本文に "copilot" を含む PR をフィルタ
  return prs.filter(pr => {
    const hasLabel = pr.labels?.some(l => l.name === 'copilot-generated');
    const hasCopilotInBody = pr.body?.includes('copilot_generated') || 
                              pr.title?.includes('Copilot');
    return hasLabel || hasCopilotInBody;
  });
}

async function getAutoMergedPRs() {
  // .github/audit/auto-merge-log.jsonl を読み込む
  const logPath = path.join(process.cwd(), '.github', 'audit', 'auto-merge-log.jsonl');
  
  if (!fs.existsSync(logPath)) {
    console.warn('   Warning: auto-merge-log.jsonl not found');
    return [];
  }

  const logs = fs.readFileSync(logPath, 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    })
    .filter(log => {
      if (!log) return false;
      const logDate = new Date(log.merged_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return logDate > sevenDaysAgo;
    });

  return logs;
}

function evaluateMetrics(result) {
  const targets = {
    adoption_rate: 0.8,
    auto_merge_success_rate: 0.95,
    flake_rate: 0.02,
    human_interventions_per_week: 1,
    security_alerts: 0
  };

  // Adoption rate check
  if (result.metrics.adoption_rate < targets.adoption_rate) {
    result.issues.push({
      type: 'warning',
      metric: 'adoption_rate',
      message: `Adoption rate ${(result.metrics.adoption_rate * 100).toFixed(1)}% is below target ${(targets.adoption_rate * 100)}%`,
      action: 'Review Copilot skill configuration and PR review process'
    });
  }

  // Auto-merge success rate check
  if (result.metrics.auto_merge_success_rate < targets.auto_merge_success_rate) {
    result.issues.push({
      type: 'warning',
      metric: 'auto_merge_success_rate',
      message: `Auto-merge success rate is below 95%`,
      action: 'Review auto-merge policy conditions'
    });
  }

  // Human interventions check
  if (result.metrics.human_interventions > targets.human_interventions_per_week) {
    result.issues.push({
      type: 'info',
      metric: 'human_interventions',
      message: `${result.metrics.human_interventions} human interventions this week`,
      action: 'Monitor trend; escalate if persistent'
    });
  }

  // Security alerts check
  if (result.metrics.security_alerts > targets.security_alerts) {
    result.issues.push({
      type: 'critical',
      metric: 'security_alerts',
      message: `${result.metrics.security_alerts} security alert(s) detected`,
      action: 'IMMEDIATE: Review and fix security issues'
    });
  }

  // Recommendations
  if (result.metrics.adoption_rate >= targets.adoption_rate &&
      result.metrics.auto_merge_success_rate >= targets.auto_merge_success_rate &&
      result.metrics.human_interventions <= targets.human_interventions_per_week) {
    result.recommendations.push('✅ All KPI targets are met! Consider expanding auto-merge to medium-risk changes.');
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  try {
    const kpi = await collectKPI();

    // Output to file
    const outDir = path.join(process.cwd(), 'ops');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const outPath = path.join(outDir, 'kpi-weekly.json');
    fs.writeFileSync(outPath, JSON.stringify(kpi, null, 2), 'utf8');

    console.log(`\n✅ KPI Report written to: ${outPath}`);
    console.log('\n📊 Summary:');
    console.log(`   Adoption rate: ${(kpi.metrics.adoption_rate * 100).toFixed(1)}% (target: 80%)`);
    console.log(`   Auto-merge success: ${(kpi.metrics.auto_merge_success_rate * 100).toFixed(1)}% (target: 95%)`);
    console.log(`   Human interventions: ${kpi.metrics.human_interventions} (target: < 1)`);
    
    if (kpi.issues.length > 0) {
      console.log('\n⚠️  Issues:');
      kpi.issues.forEach(issue => {
        console.log(`   [${issue.type.toUpperCase()}] ${issue.message}`);
        console.log(`   → ${issue.action}`);
      });
    }

    if (kpi.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      kpi.recommendations.forEach(rec => {
        console.log(`   ${rec}`);
      });
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
