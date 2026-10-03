#!/usr/bin/env node

import fetch from 'node-fetch';

// AI Review evaluator using GitHub REST API via fetch
// Validates PR quality against contract criteria

const token = process.env.COPILOT_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const prNumber = process.argv[2] || process.env.PR_NUMBER;
const repoFull = process.env.GITHUB_REPOSITORY;

function validateEnvironment() {
  if (!token) {
    console.error('COPILOT_GITHUB_TOKEN (or GITHUB_TOKEN) is required');
    process.exit(2);
  }
  if (!prNumber) {
    console.error('PR number required as argument');
    process.exit(2);
  }
  if (!repoFull) {
    console.error('GITHUB_REPOSITORY env required');
    process.exit(2);
  }
}

const [owner, repo] = repoFull?.split('/') || [];
const apiBase = 'https://api.github.com';

async function gh(path) {
  const res = await fetch(`${apiBase}${path}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

function checkIssueLink(prBody) {
  const issueLink = /#\d+/.test(prBody) || /Issue[:# ]/i.test(prBody);
  return {
    passed: issueLink,
    evidence: issueLink ? 'yes' : 'no',
    reason: !issueLink ? 'PR に Issue との紐付けが見つかりません' : null
  };
}

function checkTestDesign(files) {
  const hasTestDesign = files.some(f =>
    f.filename.toLowerCase().endsWith('test-design.json') ||
    f.filename.toLowerCase().includes('test-design')
  );
  return {
    passed: hasTestDesign,
    evidence: hasTestDesign ? 'found' : 'not found',
    reason: !hasTestDesign ? 'test-design.json やテスト設計の成果物が見つかりません' : null
  };
}

function checkCoverageMention(prBody, files) {
  const coverageMention =
    /coverage/i.test(prBody) ||
    files.some(f => /coverage/i.test(f.filename));
  return {
    passed: coverageMention,
    evidence: coverageMention ? 'mentioned' : 'not mentioned',
    reason: !coverageMention ? 'coverage の結果が明示されていません' : null
  };
}

function checkSecrets(files) {
  const secretPatterns = [
    /API[_-]?KEY/i,
    /SECRET/i,
    /AWS[_-]?SECRET/i,
    /BEGIN\s+(RSA|DSA|EC)\s+PRIVATE\s+KEY/i,
    /password\s*=/i
  ];

  for (const f of files) {
    if (!f.patch) continue;
    for (const pattern of secretPatterns) {
      if (pattern.test(f.patch)) {
        return {
          passed: false,
          evidence: 'yes',
          reason: `差分内に秘密情報らしき文字列が見つかりました: ${f.filename}`
        };
      }
    }
  }

  return {
    passed: true,
    evidence: 'no',
    reason: null
  };
}

function checkFork(pr) {
  const isFork =
    !!pr.head &&
    !!pr.head.repo &&
    pr.head.repo.full_name.toLowerCase() !== `${owner}/${repo}`.toLowerCase();
  return {
    isFork,
    evidence: isFork ? 'yes' : 'no'
  };
}

function determineResult(checks, forkInfo) {
  if (!checks.issueLink.passed || !checks.testDesign.passed || 
      !checks.coverage.passed || !checks.secrets.passed) {
    return 'fail';
  }
  if (forkInfo.isFork) {
    return 'neutral';
  }
  return 'pass';
}

function buildOutput(result, checks, forkInfo, stopReasons) {
  const evidence = {
    issueLinked: checks.issueLink.evidence,
    testDesign: checks.testDesign.evidence,
    coverageMention: checks.coverage.evidence,
    secretFound: checks.secrets.evidence,
    isFork: forkInfo.evidence
  };

  const summaryLines = [];
  summaryLines.push(`- 判定: **${result.toUpperCase()}**`);
  summaryLines.push(`- Issue linkage: ${evidence.issueLinked}`);
  summaryLines.push(`- test-design: ${evidence.testDesign}`);
  summaryLines.push(`- coverage mention: ${evidence.coverageMention}`);
  summaryLines.push(`- secret found: ${evidence.secretFound}`);
  summaryLines.push(`- is fork: ${evidence.isFork}`);

  return {
    result,
    stopReasons,
    evidence,
    summary: summaryLines.join('\n')
  };
}

async function runAIReview() {
  validateEnvironment();

  try {
    const pr = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}`);
    const files = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}/files`);

    const prBody = pr.body || '';
    const stopReasons = [];

    // Run all checks
    const checks = {
      issueLink: checkIssueLink(prBody),
      testDesign: checkTestDesign(files),
      coverage: checkCoverageMention(prBody, files),
      secrets: checkSecrets(files)
    };

    const forkInfo = checkFork(pr);

    // Collect stop reasons
    if (!checks.issueLink.passed) stopReasons.push(checks.issueLink.reason);
    if (!checks.testDesign.passed) stopReasons.push(checks.testDesign.reason);
    if (!checks.coverage.passed) stopReasons.push(checks.coverage.reason);
    if (!checks.secrets.passed) stopReasons.push(checks.secrets.reason);

    const result = determineResult(checks, forkInfo);
    const output = buildOutput(result, checks, forkInfo, stopReasons);

    console.log(JSON.stringify(output, null, 2));

    if (result === 'fail') process.exit(1);
    process.exit(0);
  } catch (error) {
    console.error('Error during AI review:', error);
    const output = {
      result: 'neutral',
      stopReasons: ['AI review 実行中にエラーが発生しました'],
      evidence: { error: String(error) },
      summary: 'AI review 実行エラー'
    };
    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
  }
}

runAIReview();
