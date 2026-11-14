import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useApp } from '../context/AppContext.jsx';
import './Dashboard.css';

function Dashboard() {
  const { showToast } = useApp();
  const [stats, setStats] = useState({
    totalTodos: 0,
    completedTodos: 0,
    totalFiles: 0,
    totalFileSize: 0,
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [todos, files, logs] = await Promise.all([
        api.todos.list({}),
        api.files.list(),
        api.logs.list({ limit: 10 }),
      ]);

      const totalTodos = todos?.length || 0;
      const completedTodos = todos?.filter(t => t.status === 'completed').length || 0;
      const totalFiles = files?.length || 0;
      const totalFileSize = files?.reduce((sum, f) => sum + (f.fileSize || 0), 0) || 0;

      setStats({
        totalTodos,
        completedTodos,
        totalFiles,
        totalFileSize,
      });
      setRecentLogs(logs || []);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const completionRate = stats.totalTodos > 0
    ? Math.round((stats.completedTodos / stats.totalTodos) * 100)
    : 0;

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <main className="dashboard" data-testid="dashboard-page">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's your activity overview.</p>
      </header>

      <section className="summary-cards">
        <div className="card" data-testid="summary-card-todos">
          <div className="card-icon">📋</div>
          <div className="card-content">
            <h3>Total TODOs</h3>
            <p className="card-value">{stats.totalTodos}</p>
          </div>
        </div>

        <div className="card" data-testid="summary-card-completion">
          <div className="card-icon">✓</div>
          <div className="card-content">
            <h3>Completion Rate</h3>
            <p className="card-value">{completionRate}%</p>
          </div>
        </div>

        <div className="card" data-testid="summary-card-files">
          <div className="card-icon">📁</div>
          <div className="card-content">
            <h3>Files</h3>
            <p className="card-value">{stats.totalFiles}</p>
          </div>
        </div>

        <div className="card" data-testid="summary-card-storage">
          <div className="card-icon">💾</div>
          <div className="card-content">
            <h3>Storage Used</h3>
            <p className="card-value">{formatFileSize(stats.totalFileSize)}</p>
          </div>
        </div>
      </section>

      <section className="activity-section">
        <h2>Recent Activity</h2>
        {recentLogs.length === 0 ? (
          <p className="empty-message">No recent activity</p>
        ) : (
          <div className="activity-timeline" data-testid="activity-timeline">
            {recentLogs.map((log) => (
              <div key={log.logId} className="timeline-item" data-testid={`activity-item-${log.logId}`}>
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <p className="timeline-event">
                    <strong>{log.eventType}</strong> - {log.action}
                  </p>
                  <p className="timeline-details">{JSON.stringify(log.details)}</p>
                  <p className="timeline-time">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Dashboard;
