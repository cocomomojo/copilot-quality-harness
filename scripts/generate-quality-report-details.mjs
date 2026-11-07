import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Generate detailed quality report HTML pages
 * Reads issue-reports.json and creates individual HTML pages for each report
 */
async function generateDetailPages() {
  const reportsDir = 'docs/dashboard/data';
  const reportFile = path.join(reportsDir, 'issue-reports.json');
  
  if (!existsSync(reportFile)) {
    console.log('No issue-reports.json found, skipping detail page generation');
    return;
  }

  let reportsData;
  try {
    reportsData = JSON.parse(await readFile(reportFile, 'utf-8'));
  } catch (err) {
    console.error('Failed to parse issue-reports.json:', err.message);
    return;
  }

  const detailsDir = 'docs/dashboard/details';
  await mkdir(detailsDir, { recursive: true });

  // Helper to escape HTML
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  // Helper to format percentage
  function formatPercent(value) {
    return typeof value === 'number' ? value.toFixed(2) + '%' : '-';
  }

  // Helper to build GitHub links
  function buildGitHubLink(filePath, repoUrl = 'https://github.com/cocomomojo/copilot-quality-harness') {
    return `${repoUrl}/blob/main/${filePath}`;
  }

  // Generate page for each report
  for (const report of reportsData.reports || []) {
    const { issue_number, pr_number, pass_rate, coverage, traceability, github_run_url } = report;

    // Build perspectives table
    let perspectivesHtml = '';
    if (traceability?.perspectives_file) {
      try {
        const perspFile = await readFile(traceability.perspectives_file, 'utf-8');
        const perspData = JSON.parse(perspFile);
        const perspectives = Array.isArray(perspData) ? perspData : (perspData.testPerspectives || []);
        
        if (Array.isArray(perspectives) && perspectives.length > 0) {
          perspectivesHtml = `
          <div class="section">
            <h3>📊 テスト観点（${perspectives.length} 件）</h3>
            <table class="details-table">
              <thead>
                <tr>
                  <th>特性名</th>
                  <th>説明</th>
                  <th>テスト観点</th>
                </tr>
              </thead>
              <tbody>
                ${perspectives.map(p => `
                  <tr>
                    <td>${escapeHtml(p.characteristic_name || '—')}</td>
                    <td>${escapeHtml(p.description || '—')}</td>
                    <td>${(p.test_perspectives || []).map(tp => `<code>${escapeHtml(tp)}</code>`).join(' ')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          `;
        }
      } catch (err) {
        console.warn(`Failed to load perspectives file ${traceability.perspectives_file}:`, err.message);
      }
    }

    // Build test items table
    let itemsHtml = '';
    if (traceability?.test_items_file) {
      try {
        const itemsFile = await readFile(traceability.test_items_file, 'utf-8');
        const itemsData = JSON.parse(itemsFile);
        const items = Array.isArray(itemsData) ? itemsData : (itemsData.testItems || []);

        if (Array.isArray(items) && items.length > 0) {
          itemsHtml = `
          <div class="section">
            <h3>✅ テスト項目（${items.length} 件）</h3>
            <table class="details-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>観点</th>
                  <th>説明</th>
                  <th>受け入れ条件</th>
                </tr>
              </thead>
              <tbody>
                ${items.slice(0, 50).map(item => `
                  <tr>
                    <td><code>${escapeHtml(item.id || '—')}</code></td>
                    <td>${escapeHtml(item.perspective || '—')}</td>
                    <td>${escapeHtml(item.description || '—')}</td>
                    <td>${escapeHtml((item.acceptance_criteria || item.detail || '—').substring(0, 100))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${items.length > 50 ? `<p><em>...と${items.length - 50}件のテスト項目</em></p>` : ''}
          </div>
          `;
        }
      } catch (err) {
        console.warn(`Failed to load test items file ${traceability.test_items_file}:`, err.message);
      }
    }

    // Build coverage table
    let coverageHtml = '';
    if (coverage?.files && coverage.files.length > 0) {
      coverageHtml = `
      <div class="section">
        <h3>📈 カバレッジ詳細</h3>
        <p>全体: Lines ${formatPercent(coverage.overall?.lines_pct)} / Branches ${formatPercent(coverage.overall?.branches_pct)} / Functions ${formatPercent(coverage.overall?.functions_pct)}</p>
        <table class="details-table">
          <thead>
            <tr>
              <th>ファイル</th>
              <th>Lines</th>
              <th>Branches</th>
              <th>Functions</th>
              <th>ステータス</th>
            </tr>
          </thead>
          <tbody>
            ${coverage.files.slice(0, 30).map(f => `
              <tr>
                <td><code>${escapeHtml(f.path)}</code></td>
                <td>${formatPercent(f.lines_pct)}</td>
                <td>${formatPercent(f.branches_pct)}</td>
                <td>${formatPercent(f.functions_pct)}</td>
                <td><span class="status-${f.status}">${f.status === 'pass' ? '✅' : '❌'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${coverage.files.length > 30 ? `<p><em>...と${coverage.files.length - 30}件のファイル</em></p>` : ''}
      </div>
      `;
    }

    // Build spec files section
    let specsHtml = '';
    if (traceability?.spec_files && traceability.spec_files.length > 0) {
      specsHtml = `
      <div class="section">
        <h3>📋 仕様ファイル（${traceability.spec_files.length} 件）</h3>
        <ul>
          ${traceability.spec_files.map(spec => `
            <li><a href="${buildGitHubLink(spec.path)}" target="_blank">${escapeHtml(spec.feature || spec.path)}</a></li>
          `).join('')}
        </ul>
      </div>
      `;
    }

    // Build test details section
    let testDetailsHtml = '';
    if (traceability?.ut_details && traceability.ut_details.length > 0) {
      testDetailsHtml += `
      <div class="section">
        <h3>🧪 ユニットテスト詳細（${traceability.ut_cases || 0} テスト）</h3>
        <table class="details-table">
          <thead>
            <tr>
              <th>テストファイル</th>
              <th>総テスト数</th>
              <th>合格</th>
              <th>不合格</th>
              <th>合格率</th>
            </tr>
          </thead>
          <tbody>
            ${traceability.ut_details.map(t => `
              <tr>
                <td><code>${escapeHtml(t.test_file || '—')}</code></td>
                <td>${t.test_count || 0}</td>
                <td><span class="status-pass">${t.passed || 0}</span></td>
                <td><span class="status-${t.failed > 0 ? 'fail' : 'pass'}">${t.failed || 0}</span></td>
                <td><span class="metric ${t.pass_rate === 100 ? 'pass' : 'fail'}">${formatPercent(t.pass_rate)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      `;
    }
    if (traceability?.e2e_details && traceability.e2e_details.length > 0) {
      testDetailsHtml += `
      <div class="section">
        <h3>🎬 E2E テスト詳細（${traceability.e2e_cases || 0} テスト）</h3>
        <table class="details-table">
          <thead>
            <tr>
              <th>テストファイル</th>
              <th>総テスト数</th>
              <th>合格</th>
              <th>不合格</th>
              <th>合格率</th>
            </tr>
          </thead>
          <tbody>
            ${traceability.e2e_details.map(t => `
              <tr>
                <td><code>${escapeHtml(t.test_file || '—')}</code></td>
                <td>${t.test_count || 0}</td>
                <td><span class="status-pass">${t.passed || 0}</span></td>
                <td><span class="status-${t.failed > 0 ? 'fail' : 'pass'}">${t.failed || 0}</span></td>
                <td><span class="metric ${t.pass_rate === 100 ? 'pass' : 'fail'}">${formatPercent(t.pass_rate)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      `;
    }

    // Build workflow link
    const workflowLink = github_run_url ? `<a href="${github_run_url}" target="_blank">Workflow #${report.workflow_run_id}</a>` : `-`;

    // Generate HTML page
    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Issue #${issue_number} - Quality Report Detail</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f6f8fa;
      color: #24292e;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background: white;
      border-bottom: 1px solid #e1e4e8;
      padding: 20px 0;
      margin-bottom: 30px;
      border-radius: 6px;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header-info {
      display: flex;
      gap: 30px;
      flex-wrap: wrap;
      font-size: 14px;
    }
    .header-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section {
      background: white;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 20px;
    }
    h3 {
      font-size: 20px;
      margin-bottom: 15px;
      color: #24292e;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      background: #f6f8fa;
      text-align: left;
      padding: 12px 8px;
      border-bottom: 2px solid #e1e4e8;
      font-weight: 600;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e1e4e8;
    }
    tr:hover {
      background: #f9fafb;
    }
    code {
      background: #f6f8fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 12px;
    }
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .status-pass {
      color: #28a745;
      font-weight: 600;
    }
    .status-fail {
      color: #cb2431;
      font-weight: 600;
    }
    ul {
      list-style: none;
      padding: 0;
    }
    ul li {
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
    }
    ul li:before {
      content: "•";
      position: absolute;
      left: 0;
    }
    .metric {
      display: inline-block;
      background: #f6f8fa;
      padding: 6px 12px;
      border-radius: 3px;
      margin: 4px 4px 4px 0;
      font-size: 13px;
    }
    .metric.pass {
      background: #d4edda;
      color: #155724;
    }
    .metric.fail {
      background: #f8d7da;
      color: #721c24;
    }
    footer {
      text-align: center;
      padding: 20px;
      color: #6a737d;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Issue #${issue_number} - Quality Report Detail</h1>
      <div class="header-info">
        <div class="header-item">
          <strong>PR:</strong> <a href="https://github.com/cocomomojo/copilot-quality-harness/pull/${pr_number}" target="_blank">#${pr_number}</a>
        </div>
        <div class="header-item">
          <strong>Workflow:</strong> ${workflowLink}
        </div>
        <div class="header-item">
          <strong>Pass Rate:</strong> <span class="metric ${pass_rate >= 80 ? 'pass' : 'fail'}">${pass_rate ?? '-'}%</span>
        </div>
      </div>
    </header>

    <main>
      ${perspectivesHtml}
      ${itemsHtml}
      ${specsHtml}
      ${testDetailsHtml}
      ${coverageHtml}
    </main>

    <footer>
      <p>Generated by Copilot Quality Harness</p>
      <p><a href="../index.html">← Back to Dashboard</a></p>
    </footer>
  </div>
</body>
</html>`;

    const filename = `issue-${issue_number}-report.html`;
    await writeFile(path.join(detailsDir, filename), html, 'utf-8');
    console.log(`✅ Generated detail page: ${filename}`);
  }
}

// Run
generateDetailPages().catch(console.error);
