import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useApp } from '../context/AppContext.jsx';
import './ActivityLogs.css';

function ActivityLogs() {
  const { showToast } = useApp();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadLogs();
  }, [typeFilter, startDate, endDate]);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const filters = { limit: 100 };
      if (typeFilter) filters.type = typeFilter;

      const data = await api.logs.list(filters);
      let filteredLogs = data || [];

      // Client-side date filtering
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : new Date('1970-01-01');
        const end = endDate ? new Date(endDate) : new Date();

        filteredLogs = filteredLogs.filter((log) => {
          const logDate = new Date(log.timestamp);
          return logDate >= start && logDate <= end;
        });
      }

      setLogs(filteredLogs);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const eventTypes = [
    { value: '', label: 'All Events' },
    { value: 'user_login', label: 'User Login' },
    { value: 'todo_created', label: 'TODO Created' },
    { value: 'todo_updated', label: 'TODO Updated' },
    { value: 'todo_deleted', label: 'TODO Deleted' },
    { value: 'file_uploaded', label: 'File Uploaded' },
    { value: 'file_deleted', label: 'File Deleted' },
  ];

  return (
    <main className="activity-logs-page" data-testid="logs-page">
      <header className="page-header">
        <h1>Activity Logs</h1>
      </header>

      <section className="filters-section">
        <h2>Filters</h2>
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="type-filter">Event Type</label>
            <select
              id="type-filter"
              data-testid="filter-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-select"
            >
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="start-date">Start Date</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="end-date">End Date</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-input"
            />
          </div>
        </div>
      </section>

      <section className="logs-section">
        <h2>Event Log</h2>
        {isLoading ? (
          <p>Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="empty-message">No logs found</p>
        ) : (
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event Type</th>
                  <th>Action</th>
                  <th>Resource ID</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.logId} data-testid={`log-item-${log.logId}`}>
                    <td className="log-time">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <span className="event-type-badge">
                        {log.eventType}
                      </span>
                    </td>
                    <td>{log.action}</td>
                    <td className="resource-id">
                      {log.resourceId || '-'}
                    </td>
                    <td className="log-details">
                      {JSON.stringify(log.details || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default ActivityLogs;
