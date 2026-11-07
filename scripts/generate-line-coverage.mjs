#!/usr/bin/env node
/**
 * Generate line-by-line code coverage reports with source code highlighting
 * Shows exactly which lines are covered/uncovered in green/red
 * Supports Istanbul format (coverage-final.json)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/**
 * Parse Istanbul coverage data and generate line coverage map
 * @param {Object} coverageData - Coverage from coverage-final.json
 * @returns {Map<number, boolean>} - lineNumber -> isCovered
 */
function parseLineCoverage(coverageData) {
  const lineMap = new Map();
  
  if (!coverageData.statementMap || !coverageData.s) {
    return lineMap;
  }

  // Map each statement to its line numbers
  for (const [stmtId, coverage] of Object.entries(coverageData.s || {})) {
    const stmt = coverageData.statementMap[stmtId];
    if (!stmt) continue;
    
    const startLine = stmt.start.line;
    const endLine = stmt.end.line;
    const isCovered = coverage > 0;
    
    for (let line = startLine; line <= endLine; line++) {
      if (!lineMap.has(line)) {
        lineMap.set(line, isCovered);
      }
    }
  }
  
  return lineMap;
}

/**
 * Read source file content
 */
function readSourceFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8').split('\n');
  } catch (err) {
    return null;
  }
}

/**
 * Calculate coverage statistics
 */
function calculateStats(lineMap) {
  if (lineMap.size === 0) return { covered: 0, uncovered: 0, total: 0, pct: 0 };
  
  const covered = Array.from(lineMap.values()).filter(c => c).length;
  const total = lineMap.size;
  const uncovered = total - covered;
  const pct = Math.round((covered / total) * 100);
  
  return { covered, uncovered, total, pct };
}

/**
 * Generate HTML for single file with line coverage
 */
function generateFileHTML(filePath, sourceLines, lineMap, stats) {
  const statusClass = stats.pct >= 80 ? 'good' : stats.pct >= 50 ? 'warning' : 'poor';
  const statusColor = stats.pct >= 80 ? '#27ae60' : stats.pct >= 50 ? '#f39c12' : '#e74c3c';
  
  let htmlContent = '';
  
  if (!sourceLines) {
    htmlContent = '<div class="error">Source file not found</div>';
  } else {
    htmlContent = '<pre class="code-lines">';
    sourceLines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const isCovered = lineMap.get(lineNum);
      const lineClass = isCovered === undefined ? '' : isCovered ? 'covered' : 'uncovered';
      
      const displayLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .substring(0, 200);
      
      htmlContent += `<div class="line ${lineClass}">`;
      htmlContent += `<span class="line-num">${lineNum.toString().padStart(4)}</span>`;
      htmlContent += `<span class="line-content">${displayLine}</span>`;
      htmlContent += `</div>`;
    });
    htmlContent += '</pre>';
  }
  
  return `
    <div class="file-section">
      <div class="file-header" style="background-color: ${statusColor}; color: white; padding: 10px;">
        <strong>${filePath}</strong>
        <span class="stats"> | ${stats.covered}/${stats.total} lines (${stats.pct}%)</span>
      </div>
      <div class="file-content">
        ${htmlContent}
      </div>
    </div>
  `;
}

/**
 * Generate master coverage report HTML
 */
function generateMasterHTML(fileReports) {
  const totalStats = fileReports.reduce((acc, r) => ({
    covered: acc.covered + r.stats.covered,
    uncovered: acc.uncovered + r.stats.uncovered,
    total: acc.total + r.stats.total
  }), { covered: 0, uncovered: 0, total: 0 });
  
  const totalPct = totalStats.total > 0 ? Math.round((totalStats.covered / totalStats.total) * 100) : 0;
  
  const filesHTML = fileReports.map(r => r.html).join('\n');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Line Coverage Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f9f9f9;
      border-bottom: 1px solid #eee;
    }
    .summary-card {
      text-align: center;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
      margin: 10px 0;
    }
    .summary-card .label {
      font-size: 14px;
      color: #666;
    }
    .file-section {
      margin: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
    }
    .file-header {
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .file-header strong {
      font-size: 14px;
    }
    .file-header .stats {
      font-size: 12px;
      opacity: 0.9;
    }
    .file-content {
      max-height: 400px;
      overflow-y: auto;
      background: #fafafa;
    }
    .code-lines {
      display: block;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .line {
      display: flex;
      border-bottom: 1px solid #eee;
    }
    .line.covered {
      background-color: #f0fdf4;
    }
    .line.uncovered {
      background-color: #fef2f2;
    }
    .line-num {
      display: inline-block;
      width: 50px;
      padding: 2px 5px;
      background: #f0f0f0;
      color: #888;
      text-align: right;
      flex-shrink: 0;
      border-right: 1px solid #ddd;
    }
    .line.covered .line-num {
      background: #dcfce7;
      color: #166534;
    }
    .line.uncovered .line-num {
      background: #fee2e2;
      color: #991b1b;
    }
    .line-content {
      flex: 1;
      padding: 2px 10px;
      overflow-x: auto;
    }
    .footer {
      padding: 20px;
      background: #f9f9f9;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .legend {
      display: flex;
      gap: 30px;
      justify-content: center;
      padding: 20px;
      background: #f9f9f9;
      border-bottom: 1px solid #eee;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .legend-box {
      width: 30px;
      height: 20px;
      border: 1px solid #ddd;
    }
    .legend-box.covered {
      background: #f0fdf4;
      border-color: #86efac;
    }
    .legend-box.uncovered {
      background: #fef2f2;
      border-color: #fca5a5;
    }
    .error {
      color: #d32f2f;
      padding: 10px;
      background: #ffebee;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Line Coverage Report</h1>
      <p>Code line-by-line coverage analysis</p>
    </div>
    
    <div class="summary">
      <div class="summary-card">
        <div class="label">Total Lines</div>
        <div class="value">${totalStats.total}</div>
      </div>
      <div class="summary-card">
        <div class="label">Covered Lines</div>
        <div class="value" style="color: #27ae60">${totalStats.covered}</div>
      </div>
      <div class="summary-card">
        <div class="label">Uncovered Lines</div>
        <div class="value" style="color: #e74c3c">${totalStats.uncovered}</div>
      </div>
      <div class="summary-card">
        <div class="label">Coverage Rate</div>
        <div class="value">${totalPct}%</div>
      </div>
    </div>
    
    <div class="legend">
      <div class="legend-item">
        <div class="legend-box covered"></div>
        <span>Covered line (executed in tests)</span>
      </div>
      <div class="legend-item">
        <div class="legend-box uncovered"></div>
        <span>Uncovered line (not executed)</span>
      </div>
    </div>
    
    <div class="files">
      ${filesHTML}
    </div>
    
    <div class="footer">
      <p>Generated: ${new Date().toISOString()}</p>
      <p>Coverage data: Istanbul format (nyc)</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Main execution
 */
async function main() {
  const backendCoveragePath = path.join(ROOT, 'backend', 'coverage', 'coverage-final.json');
  
  if (!fs.existsSync(backendCoveragePath)) {
    console.error('❌ coverage-final.json not found');
    process.exit(1);
  }

  try {
    const backendCoverageRaw = JSON.parse(fs.readFileSync(backendCoveragePath, 'utf-8'));
    
    const fileReports = [];
    
    for (const [filePath, coverageData] of Object.entries(backendCoverageRaw)) {
      const lineMap = parseLineCoverage(coverageData);
      if (lineMap.size === 0) continue;
      
      const sourceLines = readSourceFile(filePath);
      const stats = calculateStats(lineMap);
      
      const html = generateFileHTML(filePath, sourceLines, lineMap, stats);
      fileReports.push({ filePath, stats, html });
    }
    
    // Sort by uncovered lines (worst first)
    fileReports.sort((a, b) => (b.stats.uncovered - a.stats.uncovered));
    
    // Generate master report
    const masterHTML = generateMasterHTML(fileReports);
    const outputPath = path.join(ROOT, 'docs', 'dashboard', 'details', 'line-coverage.html');
    
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, masterHTML, 'utf-8');
    
    console.log(`✅ Line coverage report generated: ${outputPath}`);
    console.log(`📊 Total files: ${fileReports.length}`);
    console.log(`📈 Coverage: ${fileReports.length > 0 ? 'See line-coverage.html' : 'No coverage data'}`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
