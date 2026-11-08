import { useEffect, useRef, useState } from 'react';
import Footer from './components/Footer.jsx';
import UserProfile from './UserProfile.jsx';

const MAX_LENGTH = 50;

const STATUS_TOOLTIPS = {
  pending: 'pending: まだ確認されていません',
  passed: 'passed: チェック済み・合格',
  failed: 'failed: チェック済み・不合格',
};

function QualityChecksPage() {
  const [checks, setChecks] = useState([]);
  const [name, setName] = useState('');
  const [checkNameLength, setCheckNameLength] = useState(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const inputRef = useRef(null);
  const successTimeoutRef = useRef(null);

  async function loadChecks() {
    const response = await fetch('/api/checks');
    if (!response.ok) throw new Error('Unable to load quality checks');
    setChecks(await response.json());
  }

  useEffect(() => { loadChecks().catch((cause) => setError(cause.message)); }, []);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  async function addCheck(event) {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/checks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    setChecks((current) => [payload, ...current]);
    setName('');
    setCheckNameLength(0);
    
    // Show success message
    setSuccessMessage('Check added successfully');
    
    // Auto-clear message after 3 seconds
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
    
    // Focus input after successful submission
    if (inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 0);
    }
  }

  return (
    <main className="app">
      <header>
        <p className="eyebrow">AI development quality harness</p>
        <h1>Quality checks</h1>
        <p>Track a small, deterministic checklist before a change reaches review.</p>
      </header>
      <form onSubmit={addCheck} aria-label="Add quality check">
        <label htmlFor="check-name">Check name</label>
        <div className="form-row">
          <input 
            ref={inputRef}
            id="check-name" 
            value={name} 
            onChange={(event) => { setName(event.target.value); setCheckNameLength(event.target.value.length); }} 
            required 
            maxLength={MAX_LENGTH}
          />
          <span
            className={`char-count${(MAX_LENGTH - checkNameLength) <= 10 ? ' char-count-warning' : ''}`}
            data-testid="char-count"
          >{checkNameLength}/{MAX_LENGTH}</span>
          <button type="submit">Add check</button>
        </div>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}
      <section aria-labelledby="checks-heading">
        <h2 id="checks-heading">Current checks</h2>
        {checks.length === 0 ? <p>No checks recorded yet.</p> : (
          <ul>{checks.map((check) => <li key={check.id}><span>{check.name}</span><small className="status-badge" data-testid="status-badge" title={STATUS_TOOLTIPS[check.status] || check.status} tabIndex={0} aria-describedby={`status-desc-${check.id}`}>{check.status}<span id={`status-desc-${check.id}`} className="sr-only">{STATUS_TOOLTIPS[check.status] || check.status}</span></small></li>)}</ul>
        )}
      </section>
      <Footer />
    </main>
  );
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (path === '/profile') {
    return <UserProfile />;
  }

  return <QualityChecksPage />;
}
