import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

/**
 * Header コンポーネント
 * 
 * React Router v6 を使用したナビゲーション対応ヘッダー
 * 
 * Props:
 *   - title (string): ヘッダーに表示するタイトル（デフォルト: "Copilot Quality Harness"）
 *   - backgroundColor (string): ヘッダーの背景色（デフォルト: "#1f2937"）
 */
const Header = ({ 
  title = 'Copilot Quality Harness',
  backgroundColor = '#1f2937'
}) => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header 
      className="header" 
      style={{ backgroundColor }}
      data-testid="header"
    >
      <div className="header-content">
        <h1 className="header-title" data-testid="header-title">
          {title}
        </h1>
        <nav className="header-nav" data-testid="header-nav">
          <ul>
            <li>
              <Link 
                to="/" 
                className={isActive('/') ? 'active' : ''}
                data-testid="nav-home"
              >
                Home
              </Link>
            </li>
            <li>
              <Link 
                to="/quality-checks" 
                className={isActive('/quality-checks') ? 'active' : ''}
                data-testid="nav-quality"
              >
                Quality Checks
              </Link>
            </li>
            <li>
              <Link 
                to="/url-validator" 
                className={isActive('/url-validator') ? 'active' : ''}
                data-testid="nav-validator"
              >
                URL Validator
              </Link>
            </li>
            <li>
              <Link 
                to="/dashboard" 
                className={isActive('/dashboard') ? 'active' : ''}
                data-testid="nav-dashboard"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                to="/settings" 
                className={isActive('/settings') ? 'active' : ''}
                data-testid="nav-settings"
              >
                Settings
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
