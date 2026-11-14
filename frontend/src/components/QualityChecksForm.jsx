import React, { useState, useEffect } from 'react';
import '../styles/quality-checks.css';

function QualityChecksForm() {
  const [checks, setChecks] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch existing checks on component mount
  useEffect(() => {
    const fetchChecks = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/checks');
        if (response.ok) {
          const data = await response.json();
          setChecks(data || []);
        } else {
          setError('Failed to load checks from server');
        }
      } catch (err) {
        setError('Failed to load checks: ' + err.message);
      }
    };
    fetchChecks();
  }, []);

  const handleAddCheck = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const trimmedInput = input.trim();

    if (!trimmedInput || trimmedInput.length === 0 || trimmedInput.length > 120) {
      setError('name must be between 1 and 120 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedInput }),
      });

      if (response.ok) {
        const newCheck = await response.json();
        setChecks([newCheck, ...checks]);
        setInput('');
        setSuccessMessage('Check added successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add check');
      }
    } catch (err) {
      setError('API error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quality-checks-form">
      <h1>Quality Checks</h1>
      
      <form onSubmit={handleAddCheck} className="checks-input-form">
        <div className="form-group">
          <label htmlFor="check-name">Check name</label>
          <input
            id="check-name"
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError('');
            }}
            maxLength="50"
            placeholder="Enter check name (max 50 characters)"
            disabled={loading}
            data-testid="check-name-input"
          />
          {input.length > 0 && (
            <div className="char-count">
              {input.length} / 50
              {input.length > 40 && <span className="warning"> (nearly full)</span>}
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="error-message" data-testid="error-alert">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="success-message" data-testid="success-message">
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || input.trim().length === 0}
          className="add-check-btn"
          data-testid="add-check-button"
        >
          {loading ? 'Adding...' : 'Add check'}
        </button>
      </form>

      <div className="checks-list">
        {checks.length === 0 ? (
          <p className="no-checks-message">No checks recorded yet</p>
        ) : (
          <>
            <h2>Recorded Checks</h2>
            <ul data-testid="checks-list">
              {checks.map((check) => (
                <li key={check.id || check.name} data-testid={`check-item-${check.id}`}>
                  <span className="check-name">{check.name}</span>
                  {check.status && (
                    <span 
                      className={`status-badge status-${check.status}`}
                      title={check.status}
                      tabIndex="0"
                    >
                      {check.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default QualityChecksForm;
