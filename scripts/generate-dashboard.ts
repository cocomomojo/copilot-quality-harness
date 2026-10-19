import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface KPIData {
  timestamp: string;
  pass_rate: number;
  test_count: number;
  passed: number;
  failed: number;
  coverage: number;
  ai_danger_rank?: 'A' | 'B' | 'C' | 'D' | 'E';
}

interface DashboardConfig {
  kpiDataDir: string;
  outputDir: string;
  title?: string;
}

async function generateDashboard(config: DashboardConfig): Promise<void> {
  console.log(`\n🎨 Quality Dashboard Generation`);
  console.log(`KPI Data Directory: ${config.kpiDataDir}`);
  console.log(`Output Directory: ${config.outputDir}\n`);

  // Create output directory
  mkdirSync(config.outputDir, { recursive: true });

  // Generate HTML dashboard
  const dashboardHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title || 'Quality Dashboard'} - Copilot Quality Harness</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 30px;
    }

    header h1 {
      color: #333;
      font-size: 2.5em;
      margin-bottom: 10px;
    }

    header p {
      color: #666;
      font-size: 1.1em;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-left: 5px solid #667eea;
    }

    .summary-card.danger {
      border-left-color: #ff6b6b;
    }

    .summary-card.warning {
      border-left-color: #ffa94d;
    }

    .summary-card.success {
      border-left-color: #51cf66;
    }

    .summary-card h3 {
      color: #666;
      font-size: 0.9em;
      font-weight: normal;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .summary-card .value {
      font-size: 2.5em;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }

    .summary-card .unit {
      color: #999;
      font-size: 0.9em;
    }

    .ai-danger-badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 5px;
      font-weight: bold;
      font-size: 0.9em;
      margin-top: 10px;
    }

    .ai-danger-badge.rank-a {
      background: #51cf66;
      color: white;
    }

    .ai-danger-badge.rank-b {
      background: #94d82d;
      color: white;
    }

    .ai-danger-badge.rank-c {
      background: #ffa94d;
      color: white;
    }

    .ai-danger-badge.rank-d {
      background: #ff8787;
      color: white;
    }

    .ai-danger-badge.rank-e {
      background: #ff6b6b;
      color: white;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .chart-card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .chart-card h3 {
      color: #333;
      margin-bottom: 20px;
      font-size: 1.2em;
    }

    .chart-container {
      position: relative;
      height: 300px;
    }

    .details-section {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 30px;
    }

    .details-section h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 1.5em;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    th {
      background: #f5f5f5;
      padding: 12px;
      text-align: left;
      color: #333;
      font-weight: 600;
      border-bottom: 2px solid #ddd;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #eee;
      color: #666;
    }

    tr:hover {
      background: #f9f9f9;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: bold;
    }

    .status-pass {
      background: #d4edda;
      color: #155724;
    }

    .status-fail {
      background: #f8d7da;
      color: #721c24;
    }

    .footer {
      background: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      color: #999;
      font-size: 0.9em;
    }

    .trend-up {
      color: #51cf66;
      font-weight: bold;
    }

    .trend-down {
      color: #ff6b6b;
      font-weight: bold;
    }

    @media (max-width: 768px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }

      .charts-grid {
        grid-template-columns: 1fr;
      }

      header h1 {
        font-size: 1.8em;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 品質ダッシュボード</h1>
      <p>Copilot Quality Harness - リアルタイム品質指標</p>
    </header>

    <div class="summary-grid">
      <div class="summary-card success">
        <h3>テスト合格率</h3>
        <div class="value" id="passRate">-</div>
        <div class="unit">%</div>
      </div>

      <div class="summary-card">
        <h3>テスト実行数</h3>
        <div class="value" id="testCount">-</div>
        <div class="unit">テスト</div>
      </div>

      <div class="summary-card">
        <h3>コードカバレッジ</h3>
        <div class="value" id="coverage">-</div>
        <div class="unit">%</div>
      </div>

      <div class="summary-card">
        <h3>AI危険度ランク</h3>
        <div class="value" id="aiRank">-</div>
        <div id="aiRankBadge"></div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h3>📈 テスト合格率推移（30日間）</h3>
        <div class="chart-container">
          <canvas id="passRateTrendChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <h3>🎯 テスト結果分布</h3>
        <div class="chart-container">
          <canvas id="testResultChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <h3>⚠️ AI危険度分布</h3>
        <div class="chart-container">
          <canvas id="aiDangerChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <h3>📦 カバレッジ推移（30日間）</h3>
        <div class="chart-container">
          <canvas id="coverageTrendChart"></canvas>
        </div>
      </div>
    </div>

    <div class="details-section">
      <h2>📋 最近のテスト実行結果</h2>
      <table id="testResultsTable">
        <thead>
          <tr>
            <th>日時</th>
            <th>テスト数</th>
            <th>合格</th>
            <th>不合格</th>
            <th>合格率</th>
            <th>カバレッジ</th>
            <th>AI危険度</th>
          </tr>
        </thead>
        <tbody id="testResultsBody">
          <tr>
            <td colspan="7" style="text-align: center; color: #999;">データを読み込み中...</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="details-section">
      <h2>📝 ISO/IEC 25010 品質特性別テスト状況</h2>
      <table id="qualityCharacteristicsTable">
        <thead>
          <tr>
            <th>品質特性</th>
            <th>説明</th>
            <th>テスト項目数</th>
            <th>合格数</th>
            <th>合格率</th>
          </tr>
        </thead>
        <tbody id="qualityCharacteristicsBody">
          <tr>
            <td colspan="5" style="text-align: center; color: #999;">データを読み込み中...</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>最終更新: <span id="lastUpdated">-</span></p>
      <p>Copilot Quality Harness v1.0 | <a href="https://github.com/cocomomojo/copilot-quality-harness" style="color: #667eea; text-decoration: none;">GitHub</a></p>
    </div>
  </div>

  <script>
    // Sample data - will be replaced by actual data
    const sampleData = {
      latestKPI: {
        pass_rate: 92,
        test_count: 150,
        passed: 138,
        failed: 12,
        coverage: 85,
        ai_danger_rank: 'B',
        timestamp: new Date().toISOString()
      },
      passRateTrend: [
        { date: '2026-09-19', rate: 88 },
        { date: '2026-09-20', rate: 89 },
        { date: '2026-09-21', rate: 90 },
        { date: '2026-09-22', rate: 89 },
        { date: '2026-09-23', rate: 91 },
        { date: '2026-09-24', rate: 92 },
        { date: '2026-09-25', rate: 92 },
        { date: '2026-09-26', rate: 93 },
        { date: '2026-09-27', rate: 92 },
        { date: '2026-09-28', rate: 92 },
        { date: '2026-09-29', rate: 91 },
        { date: '2026-09-30', rate: 92 }
      ],
      coverageTrend: [
        { date: '2026-09-19', coverage: 78 },
        { date: '2026-09-20', coverage: 79 },
        { date: '2026-09-21', coverage: 80 },
        { date: '2026-09-22', coverage: 81 },
        { date: '2026-09-23', coverage: 82 },
        { date: '2026-09-24', coverage: 83 },
        { date: '2026-09-25', coverage: 84 },
        { date: '2026-09-26', coverage: 85 },
        { date: '2026-09-27', coverage: 85 },
        { date: '2026-09-28', coverage: 85 },
        { date: '2026-09-29', coverage: 85 },
        { date: '2026-09-30', coverage: 85 }
      ],
      qualityCharacteristics: [
        { id: 'functional-suitability', name: '機能適合性', description: 'ソフトウェアが指定された用途に必要な機能を提供する程度', total: 6, passed: 6 },
        { id: 'performance-efficiency', name: '性能効率', description: 'リソースに関連した性能を提供する程度', total: 5, passed: 5 },
        { id: 'compatibility', name: '互換性', description: '他システムとの交換可能性と共存可能な程度', total: 3, passed: 3 },
        { id: 'usability', name: 'ユーザビリティ', description: 'ユーザーが効果的かつ効率的に使用できる程度', total: 4, passed: 4 },
        { id: 'reliability', name: '信頼性', description: '性能レベルを維持する程度', total: 4, passed: 3 },
        { id: 'security', name: 'セキュリティ', description: 'データと情報を保護する程度', total: 5, passed: 5 },
        { id: 'maintainability', name: '保守性', description: 'システムを修正できる程度', total: 4, passed: 4 },
        { id: 'portability', name: '移植性', description: '異なる環境へシステムを移行できる程度', total: 3, passed: 3 }
      ]
    };

    // Update summary cards
    function updateSummary(data) {
      document.getElementById('passRate').textContent = data.latestKPI.pass_rate;
      document.getElementById('testCount').textContent = data.latestKPI.test_count;
      document.getElementById('coverage').textContent = data.latestKPI.coverage;
      document.getElementById('aiRank').textContent = data.latestKPI.ai_danger_rank || '-';

      const rankMap = {
        'A': 'rank-a',
        'B': 'rank-b',
        'C': 'rank-c',
        'D': 'rank-d',
        'E': 'rank-e'
      };
      const badge = document.getElementById('aiRankBadge');
      const rank = data.latestKPI.ai_danger_rank;
      if (rank) {
        badge.innerHTML = `<div class="ai-danger-badge ${rankMap[rank]}">Rank ${rank}</div>`;
      }

      const lastUpdated = new Date(data.latestKPI.timestamp);
      document.getElementById('lastUpdated').textContent = lastUpdated.toLocaleString('ja-JP');
    }

    // Initialize charts
    function initCharts(data) {
      // Pass rate trend chart
      const passRateCtx = document.getElementById('passRateTrendChart').getContext('2d');
      new Chart(passRateCtx, {
        type: 'line',
        data: {
          labels: data.passRateTrend.map(d => d.date.split('-')[2]),
          datasets: [{
            label: 'テスト合格率 (%)',
            data: data.passRateTrend.map(d => d.rate),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#667eea',
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { min: 0, max: 100 } }
        }
      });

      // Test result distribution chart
      const testResultCtx = document.getElementById('testResultChart').getContext('2d');
      new Chart(testResultCtx, {
        type: 'doughnut',
        data: {
          labels: ['合格', '不合格'],
          datasets: [{
            data: [data.latestKPI.passed, data.latestKPI.failed],
            backgroundColor: ['#51cf66', '#ff6b6b'],
            borderColor: ['white', 'white'],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });

      // AI Danger distribution chart
      const aiDangerCtx = document.getElementById('aiDangerChart').getContext('2d');
      new Chart(aiDangerCtx, {
        type: 'bar',
        data: {
          labels: ['A (安全)', 'B', 'C', 'D', 'E (危険)'],
          datasets: [{
            label: 'Issue数',
            data: [5, 8, 3, 1, 0],
            backgroundColor: ['#51cf66', '#94d82d', '#ffa94d', '#ff8787', '#ff6b6b']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          indexAxis: 'y'
        }
      });

      // Coverage trend chart
      const coverageCtx = document.getElementById('coverageTrendChart').getContext('2d');
      new Chart(coverageCtx, {
        type: 'line',
        data: {
          labels: data.coverageTrend.map(d => d.date.split('-')[2]),
          datasets: [{
            label: 'カバレッジ (%)',
            data: data.coverageTrend.map(d => d.coverage),
            borderColor: '#764ba2',
            backgroundColor: 'rgba(118, 75, 162, 0.1)',
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#764ba2',
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { min: 0, max: 100 } }
        }
      });
    }

    // Update tables
    function updateTables(data) {
      // Test results table
      const tbody = document.getElementById('testResultsBody');
      tbody.innerHTML = '';
      
      // Add 5 sample rows
      for (let i = 0; i < 5; i++) {
        const row = document.createElement('tr');
        const date = new Date(data.passRateTrend[data.passRateTrend.length - 1 - i].date);
        row.innerHTML = `
          <td>${date.toLocaleDateString('ja-JP')}</td>
          <td>${150}</td>
          <td>${138}</td>
          <td>${12}</td>
          <td><span class="trend-up">${data.passRateTrend[data.passRateTrend.length - 1 - i].rate}%</span></td>
          <td>${data.coverageTrend[data.coverageTrend.length - 1 - i].coverage}%</td>
          <td><span class="status-badge status-pass">Rank B</span></td>
        `;
        tbody.appendChild(row);
      }

      // Quality characteristics table
      const charBody = document.getElementById('qualityCharacteristicsBody');
      charBody.innerHTML = '';
      data.qualityCharacteristics.forEach(char => {
        const passRate = Math.round((char.passed / char.total) * 100);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${char.name}</strong></td>
          <td>${char.description}</td>
          <td>${char.total}</td>
          <td>${char.passed}</td>
          <td><span class="status-badge ${passRate === 100 ? 'status-pass' : 'status-fail'}">${passRate}%</span></td>
        `;
        charBody.appendChild(row);
      });
    }

    // Initialize dashboard
    function initDashboard() {
      updateSummary(sampleData);
      initCharts(sampleData);
      updateTables(sampleData);
    }

    // Load on page ready
    document.addEventListener('DOMContentLoaded', initDashboard);
  </script>
</body>
</html>`;

  const dashboardPath = join(config.outputDir, 'index.html');
  writeFileSync(dashboardPath, dashboardHTML);
  console.log(`✅ Dashboard HTML: ${dashboardPath}`);

  // Create sample data file
  const sampleKPIData = {
    timestamp: new Date().toISOString(),
    pass_rate: 92,
    test_count: 150,
    passed: 138,
    failed: 12,
    coverage: 85,
    ai_danger_rank: 'B'
  };

  const dataPath = join(config.outputDir, 'data', 'latest-kpi.json');
  mkdirSync(dirname(dataPath), { recursive: true });
  writeFileSync(dataPath, JSON.stringify(sampleKPIData, null, 2));
  console.log(`✅ Sample KPI data: ${dataPath}`);

  console.log(`\n✅ Dashboard generation complete!`);
  console.log(`📍 View dashboard at: file://${dashboardPath}\n`);
}

// CLI Interface
const args = process.argv.slice(2);
const kpiDataDir = args[0] || join(process.cwd(), 'qa', 'dashboard-data');
const outputDir = args[1] || join(process.cwd(), 'docs', 'dashboard');
const title = args[2] || 'Quality Dashboard';

generateDashboard({ kpiDataDir, outputDir, title }).catch((err) => {
  console.error('❌ Dashboard generation failed:', err.message);
  process.exit(1);
});
