import React, { useState } from 'react';

function URLValidatorPage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    if (!url.trim()) {
      setResult({ error: 'Please enter a URL' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/validate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2>URL Validator</h2>
      <div className="validator-form">
        <input
          type="text"
          placeholder="Enter URL to validate"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleValidate()}
          disabled={loading}
        />
        <button onClick={handleValidate} disabled={loading}>
          {loading ? 'Validating...' : 'Validate'}
        </button>
      </div>
      {result && (
        <div className={`result ${result.error ? 'error' : 'success'}`}>
          {result.error ? (
            <p>Error: {result.error}</p>
          ) : (
            <div>
              <p>✓ URL is valid</p>
              <p>Status: {result.status}</p>
              <p>Response Time: {result.responseTime}ms</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default URLValidatorPage;
