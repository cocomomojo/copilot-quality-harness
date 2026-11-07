import fs from 'fs';
import path from 'path';

/**
 * Generate detailed coverage report HTML pages for each Issue
 * Shows which lines/branches are covered vs uncovered
 * Supports both per-issue and global coverage reports
 */

const backendCoveragePath = './backend/coverage/coverage-final.json';
const frontendCoveragePath = './frontend/coverage/coverage-summary.json';
const reportsDataPath = './docs/dashboard/data/issue-reports.json';
const outputDir = './docs/dashboard/details';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function loadCoverageData(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Coverage file not found: ${filePath}`);
    return {};
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  // Normalize frontend summary to match backend format
  if (filePath.includes('frontend')) {
    const normalized = {};
    Object.entries(data).forEach(([filePath, stats]) => {
      if (stats.lines && stats.branches) {
        normalized[filePath] = {
          l: stats.lines,  // Pass summary format directly
          b: stats.branches
        };
      }
    });
    return normalized;
  }
  return data;
}

function loadReportData() {
  if (!fs.existsSync(reportsDataPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(reportsDataPath, 'utf-8'));
  } catch (err) {
    console.warn('Failed to load reports data:', err.message);
    return null;
  }
}

function parseFilePath(fullPath) {
  // Convert /full/path/to/file.js to relative path
  const normalized = fullPath.replace(/\\/g, '/');
  const match = normalized.match(/copilot-quality-harness\/(.+)$/);
  return match ? match[1] : normalized;
}

function analyzeLineCoverage(lineCoverage) {
  // Handle both detailed format (object with line numbers) and summary format (already counted)
  if (typeof lineCoverage === 'object' && lineCoverage.total !== undefined) {
    // Summary format from frontend
    return { 
      covered: lineCoverage.covered || 0, 
      total: lineCoverage.total || 0, 
      percentage: lineCoverage.pct !== undefined ? lineCoverage.pct : 0 
    };
  }
  
  // Detailed format from backend
  const lines = Object.entries(lineCoverage || {});
  const covered = lines.filter(([_, hits]) => hits > 0).length;
  const total = lines.length;
  return { covered, total, percentage: total > 0 ? (covered / total * 100).toFixed(2) : 0 };
}

function analyzeBranchCoverage(branchCoverage) {
  // Handle both summary format and detailed format
  if (typeof branchCoverage === 'object' && branchCoverage.total !== undefined) {
    // Summary format
    return { 
      covered: branchCoverage.covered || 0, 
      total: branchCoverage.total || 0, 
      percentage: branchCoverage.pct !== undefined ? branchCoverage.pct : 0 
    };
  }
  
  // Detailed format from backend
  const branches = Object.entries(branchCoverage || {});
  let covered = 0, total = 0;
  
  branches.forEach(([_, branchData]) => {
    if (Array.isArray(branchData)) {
      branchData.forEach(hits => {
        total++;
        if (hits > 0) covered++;
      });
    }
  });
  
  return { covered, total, percentage: total > 0 ? (covered / total * 100).toFixed(2) : 0 };
}

function getUncoveredLines(lineCoverage) {
  if (typeof lineCoverage === 'object' && lineCoverage.total !== undefined) {
    return []; // Summary format doesn't have line details
  }
  return Object.entries(lineCoverage || {})
    .filter(([_, hits]) => hits === 0)
    .map(([line]) => parseInt(line));
}

function generateFileRow(filePath, coverage) {
  const lineCov = analyzeLineCoverage(coverage.l);
  const branchCov = analyzeBranchCoverage(coverage.b);
  const uncoveredLines = getUncoveredLines(coverage.l);
  
  const lineStatus = lineCov.percentage >= 80 ? 'good' : lineCov.percentage >= 50 ? 'warning' : 'poor';
  const branchStatus = branchCov.percentage >= 80 ? 'good' : branchCov.percentage >= 50 ? 'warning' : 'poor';
  
  let uncoveredDisplay = '—';
  if (uncoveredLines.length > 0) {
    const display = uncoveredLines.slice(0, 5).join(', ');
    uncoveredDisplay = uncoveredLines.length > 5 
      ? `${display}... (+${uncoveredLines.length - 5} more)`
      : display;
  }
  
  return `
    <tr>
      <td><code>${filePath}</code></td>
      <td class="coverage-${lineStatus}">${lineCov.covered}/${lineCov.total} (${lineCov.percentage}%)</td>
      <td class="coverage-${branchStatus}">${branchCov.covered}/${branchCov.total} (${branchCov.percentage}%)</td>
      <td class="uncovered-lines">${uncoveredDisplay}</td>
    </tr>`;
}

function generateHTML(backendCoverage, frontendCoverage, issueNumber = null) {
  const allFiles = { ...backendCoverage, ...frontendCoverage };
  const fileEntries = Object.entries(allFiles)
    .map(([filePath, coverage]) => ({
      filePath: parseFilePath(filePath),
      coverage,
      lines: analyzeLineCoverage(coverage.l)
    }))
    .sort((a, b) => a.filePath.localeCompare(b.filePath));
  
  // Calculate totals
  let totalLines = 0, coveredLines = 0;
  let totalBranches = 0, coveredBranches = 0;
  
  Object.values(allFiles).forEach(coverage => {
    const lineCov = analyzeLineCoverage(coverage.l);
    totalLines += lineCov.total;
    coveredLines += lineCov.covered;
    
    const branchCov = analyzeBranchCoverage(coverage.b);
    totalBranches += branchCov.total;
    coveredBranches += branchCov.covered;
  });
  
  const overallLinePercentage = totalLines > 0 ? (coveredLines / totalLines * 100).toFixed(2) : 0;
  const overallBranchPercentage = totalBranches > 0 ? (coveredBranches / totalBranches * 100).toFixed(2) : 0;
  
  const fileRows = fileEntries.map(({ filePath, coverage }) => 
    generateFileRow(filePath, coverage)
  ).join('');
  
  const backLink = issueNumber 
    ? `<a href="issue-${issueNumber}-report.html" class="back-link">← Issue #${issueNumber} レポートに戻る</a>`
    : '<a href="../index.html" class="back-link">← ダッシュボードに戻る</a>';
  
  const title = issueNumber 
    ? `詳細カバレッジ | Issue #${issueNumber} 品質レポート`
    : '詳細カバレッジ | Quality Report';
  
  const heading = issueNumber 
    ? `<h1>📊 詳細カバレッジ分析 - Issue #${issueNumber}</h1>`
    : '<h1>📊 詳細カバレッジ分析</h1>';
  
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      color: #333;
      padding: 2rem;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 2rem; }
    h1 { color: #2c3e50; margin-bottom: 1rem; }
    .summary { background: #f8f9fa; padding: 1.5rem; border-radius: 4px; margin: 1.5rem 0; border-left: 4px solid #3498db; }
    .summary-item { margin: 0.5rem 0; }
    .summary-item strong { min-width: 200px; display: inline-block; }
    table { width: 100%; border-collapse: collapse; margin: 2rem 0; }
    thead { background: #34495e; color: white; }
    th { padding: 1rem; text-align: left; font-weight: 600; }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid #ecf0f1; }
    tr:hover { background: #f8f9fa; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
    .coverage-good { color: #27ae60; font-weight: 600; }
    .coverage-warning { color: #f39c12; font-weight: 600; }
    .coverage-poor { color: #e74c3c; font-weight: 600; }
    .uncovered-lines { font-size: 0.9rem; color: #7f8c8d; font-family: 'Courier New', monospace; }
    .back-link { display: inline-block; margin-bottom: 1.5rem; color: #3498db; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
    .legend { display: flex; gap: 2rem; margin: 1.5rem 0; padding: 1rem; background: #f8f9fa; border-radius: 4px; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; }
    .legend-color { width: 20px; height: 20px; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="container">
    ${backLink}
    
    ${heading}
    
    <div class="summary">
      <div class="summary-item"><strong>全体 Lines:</strong> <span class="coverage-${ overallLinePercentage >= 80 ? 'good' : overallLinePercentage >= 50 ? 'warning' : 'poor'}">${coveredLines}/${totalLines} (${overallLinePercentage}%)</span></div>
      <div class="summary-item"><strong>全体 Branches:</strong> <span class="coverage-${overallBranchPercentage >= 80 ? 'good' : overallBranchPercentage >= 50 ? 'warning' : 'poor'}">${coveredBranches}/${totalBranches} (${overallBranchPercentage}%)</span></div>
      <div class="summary-item"><strong>対象ファイル数:</strong> ${fileEntries.length}</div>
    </div>
    
    <div class="legend">
      <div class="legend-item">
        <div class="legend-color" style="background: #27ae60;"></div>
        <span>良好 (≥80%)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #f39c12;"></div>
        <span>警告 (50-80%)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #e74c3c;"></div>
        <span>要改善 (<50%)</span>
      </div>
    </div>
    
    <h2>ファイル別カバレッジ</h2>
    <table>
      <thead>
        <tr>
          <th>ファイル</th>
          <th>Lines カバレッジ</th>
          <th>Branches カバレッジ</th>
          <th>未カバー行</th>
        </tr>
      </thead>
      <tbody>
        ${fileRows}
      </tbody>
    </table>
    
    <div class="summary">
      <p style="font-size: 0.9rem; color: #7f8c8d;">
        ℹ️ 生成日時: ${new Date().toLocaleString('ja-JP')}<br>
        ℹ️ 「未カバー行」は、テストで実行されなかった行番号を表示します（最初の5件+件数表示）
      </p>
    </div>
  </div>
</body>
</html>`;
}

// Main execution
const backendCov = loadCoverageData(backendCoveragePath);
const frontendCov = loadCoverageData(frontendCoveragePath);

// Generate global coverage report
const globalHtml = generateHTML(backendCov, frontendCov);
const globalOutputFile = path.join(outputDir, 'coverage-details.html');
fs.writeFileSync(globalOutputFile, globalHtml);
console.log(`✅ Global coverage details page generated: ${globalOutputFile}`);

// Generate per-issue coverage reports (if issue-reports.json exists)
const reportsData = loadReportData();
if (reportsData && Array.isArray(reportsData.reports)) {
  reportsData.reports.forEach(report => {
    if (report.issue_number) {
      const issueHtml = generateHTML(backendCov, frontendCov, report.issue_number);
      const issueOutputFile = path.join(outputDir, `coverage-issue-${report.issue_number}.html`);
      fs.writeFileSync(issueOutputFile, issueHtml);
      console.log(`✅ Issue #${report.issue_number} coverage details generated: ${issueOutputFile}`);
    }
  });
}
