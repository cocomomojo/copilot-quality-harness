import React from 'react';
import './Header.css';

/**
 * Header コンポーネント
 * 
 * アプリケーションのヘッダーバーを表示
 * 
 * Props:
 *   - title (string): ヘッダーに表示するタイトル（デフォルト: "Copilot Quality Harness Dash"）
 *   - backgroundColor (string): ヘッダーの背景色（デフォルト: "#1f2937"）
 */
const Header = ({ 
  title = 'Copilot Quality Harness Dash',
  backgroundColor = '#1f2937'
}) => {
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
            <li><a href="/">ダッシュボード</a></li>
            <li><a href="/issues">Issues</a></li>
            <li><a href="/tests">テスト</a></li>
            <li><a href="/settings">設定</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
