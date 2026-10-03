#!/usr/bin/env node

// Minimal AI Review evaluator using GitHub REST API via fetch and COPILOT_GITHUB_TOKEN

const token = process.env.COPILOT_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const prNumber = process.argv[2] || process.env.PR_NUMBER;
const repoFull = process.env.GITHUB_REPOSITORY;

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

const [owner, repo] = repoFull.split('/');
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

(async () => {
  try {
    const pr = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}`);
    const files = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}/files`);

    const evidence = {};
    const stopReasons = [];

    const prBody = pr.body || '';
    const issueLink = /#\d+/.test(prBody) || /Issue[:# ]/i.test(prBody);
    evidence.issueLinked = issueLink ? 'yes' : 'no';
    if (!issueLink) {
      stopReasons.push('PR に Issue との紐付けが見つかりません');
    }

    const hasTestDesign = files.some(f =>
      f.filename.toLowerCase().endsWith('test-design.json') ||
      f.filename.toLowerCase().includes('test-design')
    );
    evidence.testDesign = hasTestDesign ? 'found' : 'not found';
    if (!hasTestDesign) {
      stopReasons.push('test-design.json やテスト設計の成果物が見つかりません');
    }

    const coverageMention =
      /coverage/i.test(prBody) ||
      files.some(f => /coverage/i.test(f.filename));

    evidence.coverageMention = coverageMention ? 'mentioned' : 'not mentioned';
    if (!coverageMention) {
      stopReasons.push('coverage の結果が明示されていません');
    }

    const secretPatterns = [
      /API[_-]?KEY/i,
      /SECRET/i,
      /AWS[_-]?SECRET/i,
      /BEGIN\s+(RSA|DSA|EC)\s+PRIVATE\s+KEY/i,
      /password\s*=/i
    ];

    let secretFound = false;
    for (const f of files) {
      if (!f.patch) continue;
      for (const pattern of secretPatterns) {
        if (pattern.test(f.patch)) {
          secretFound = true;
          stopReasons.push(`差分内に秘密情報らしき文字列が見つかりました: ${f.filename}`);
          break;
        }
      }
      if (secretFound) break;
    }
    evidence.secretFound = secretFound ? 'yes' : 'no';

    const isFork =
      !!pr.head &&
      !!pr.head.repo &&
      pr.head.repo.full_name.toLowerCase() !== `${owner}/${repo}`.toLowerCase();

    evidence.isFork = isFork ? 'yes' : 'no';

    let result = 'pass';
    if (secretFound || stopReasons.length > 0) {
      result = 'fail';
    }
    if (isFork) {
      result = 'neutral';
    }

    const summaryLines = [];
    summaryLines.push(`- 判定: **${result.toUpperCase()}**`);
    summaryLines.push(`- Issue linkage: ${evidence.issueLinked}`);
    summaryLines.push(`- test-design: ${evidence.testDesign}`);
    summaryLines.push(`- coverage mention: ${evidence.coverageMention}`);
    summaryLines.push(`- secret found: ${evidence.secretFound}`);
    summaryLines.push(`- is fork: ${evidence.isFork}`);

    const output = {
      result,
      stopReasons,
      evidence,
      summary: summaryLines.join('\n')
    };

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
})();