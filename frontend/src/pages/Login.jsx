import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { showToast } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          showToast('Name is required', 'error');
          setIsLoading(false);
          return;
        }
        await register(email, password, name);
        showToast('Registration successful!', 'success');
      } else {
        await login(email, password);
        showToast('Login successful!', 'success');
      }
      navigate('/');
    } catch (error) {
      showToast(error.message || 'An error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>{isRegister ? 'Register' : 'Login'}</h1>
        
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                data-testid="name-input"
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isRegister}
                placeholder="Enter your name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              data-testid="email-input"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              data-testid="password-input"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            data-testid={isRegister ? 'register-button' : 'login-button'}
            className="submit-btn"
          >
            {isLoading ? 'Processing...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <div className="toggle-mode">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setEmail('');
              setPassword('');
              setName('');
            }}
            className="toggle-btn"
            data-testid="toggle-auth-mode"
          >
            {isRegister
              ? 'Already have an account? Login'
              : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
