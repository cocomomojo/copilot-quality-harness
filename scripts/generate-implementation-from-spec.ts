#!/usr/bin/env node

/**
 * generate-implementation-from-spec.ts
 * 
 * テスト設計 YAML (tests/specs/*.yml) から実装コード（React コンポーネント等）を自動生成する
 * 
 * 使用方法:
 *   npx ts-node scripts/generate-implementation-from-spec.ts <spec-file-path>
 *   例: npx ts-node scripts/generate-implementation-from-spec.ts tests/specs/web.yml
 * 
 * 出力:
 *   - frontend/src/components/{component}.jsx (React コンポーネント)
 *   - frontend/src/styles/{component}.css (スタイル)
 */

import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';

interface E2ETest {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  steps?: Array<{
    step_id: number;
    action: string;
    target: string;
    value?: string;
    expected?: Record<string, any>;
  }>;
}

interface TestSpec {
  feature: string;
  description?: string;
  component?: string;
  e2e_tests?: E2ETest[];
}

/**
 * Spec YAML から実装コンポーネント情報を抽出
 */
function extractImplementationRequirements(spec: TestSpec): {
  headerRequired: boolean;
  headerTitle: string;
  headerBackground: string;
  loadingRequired: boolean;
  otherComponents: string[];
} {
  const requirements = {
    headerRequired: false,
    headerTitle: 'Copilot Quality Harness Dash',
    headerBackground: '#1f2937',
    loadingRequired: false,
    otherComponents: [],
  };

  // spec.feature または spec.description をチェック
  const fullText = `${spec.feature || ''} ${spec.description || ''}`.toLowerCase();

  if (fullText.includes('ヘッダー') || fullText.includes('header')) {
    requirements.headerRequired = true;
  }

  if (fullText.includes('ローディング') || fullText.includes('loading') || 
      fullText.includes('スピナー') || fullText.includes('spinner')) {
    requirements.loadingRequired = true;
  }

  // E2E テストの description もチェック
  if (spec.e2e_tests) {
    for (const test of spec.e2e_tests) {
      const descLower = (test.description || '').toLowerCase();
      
      // ヘッダーバー検出
      if (descLower.includes('ヘッダー') || descLower.includes('header') || 
          descLower.includes('header bar')) {
        requirements.headerRequired = true;
        
        // タイトル抽出
        const titleMatch = test.description?.match(/タイトル\s*[「"]([^」"]+)[」"]/);
        if (titleMatch) {
          requirements.headerTitle = titleMatch[1];
        } else {
          // "Copilot Quality Harness Dash" を検出
          const dashMatch = test.description?.match(/(Copilot Quality Harness [^」"]+)/);
          if (dashMatch) {
            requirements.headerTitle = dashMatch[1];
          }
        }
        
        // 背景色抽出
        const colorMatch = test.description?.match(/(#[0-9a-fA-F]{6})/);
        if (colorMatch) {
          requirements.headerBackground = colorMatch[1];
        }
      }
      
      // ローディング表示検出
      if (descLower.includes('ローディング') || descLower.includes('loading') || 
          descLower.includes('スピナー') || descLower.includes('spinner') ||
          descLower.includes('アニメーション')) {
        requirements.loadingRequired = true;
      }
    }
  }

  return requirements;
}

/**
 * ヘッダーコンポーネントを生成
 */
function generateHeaderComponent(title: string, bgColor: string): string {
  return `import React from 'react';
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
  title = '${title}',
  backgroundColor = '${bgColor}'
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
`;
}

/**
 * ローディングスピナーコンポーネントを生成
 */
function generateLoadingSpinnerComponent(): string {
  return `import React from 'react';
import './LoadingSpinner.css';

/**
 * LoadingSpinner コンポーネント
 * 
 * ページ読み込み中に表示するローディングアニメーション
 * 
 * Props:
 *   - isVisible (boolean): スピナーを表示するかどうか（デフォルト: true）
 *   - message (string): ローディングメッセージ（デフォルト: "読み込み中..."）
 */
const LoadingSpinner = ({ 
  isVisible = true, 
  message = '読み込み中...' 
}) => {
  if (!isVisible) return null;

  return (
    <div className="loading-overlay" data-testid="loading-overlay">
      <div className="spinner-container" data-testid="spinner-container">
        <div className="spinner" data-testid="loading-spinner"></div>
        <p className="loading-message" data-testid="loading-message">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
`;
}

/**
 * ヘッダーコンポーネントのスタイルを生成
 */
function generateHeaderStyles(bgColor: string): string {
  return `.header {
  width: 100%;
  padding: 1rem 2rem;
  background-color: ${bgColor};
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.header-nav {
  display: flex;
  flex: 1;
  justify-content: flex-end;
}

.header-nav ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 2rem;
}

.header-nav a {
  color: #ffffff;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: opacity 0.3s ease;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
}

.header-nav a:hover {
  opacity: 0.8;
  border-bottom-color: #ffffff;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .header {
    padding: 0.75rem 1rem;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-nav {
    width: 100%;
    justify-content: flex-start;
  }

  .header-nav ul {
    gap: 1rem;
  }

  .header-title {
    font-size: 1.25rem;
  }
}
`;
}

/**
 * ローディングスピナーのスタイルを生成
 */
function generateLoadingSpinnerStyles(): string {
  return `.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-message {
  font-size: 1rem;
  color: #374151;
  font-weight: 500;
  margin: 0;
  letter-spacing: 0.5px;
}

/* Dark mode サポート */
@media (prefers-color-scheme: dark) {
  .loading-overlay {
    background-color: rgba(17, 24, 39, 0.95);
  }

  .loading-message {
    color: #d1d5db;
  }

  .spinner {
    border-color: #374151;
    border-top-color: #60a5fa;
  }
}
`;
}

/**
 * アプリケーションメインコンポーネントを更新（Header と LoadingSpinner を統合）
 */
function generateUpdatedAppComponent(headerTitle: string): string {
  return `import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import './App.css';

/**
 * App コンポーネント
 * 
 * アプリケーションのメインコンポーネント
 * ヘッダーナビゲーションおよびローディング表示を統合
 */
function App() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 初期ローディング完了をシミュレート
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleNavigation = () => {
    setIsLoading(true);
    // ナビゲーション処理...
  };

  return (
    <div className="app">
      <Header title="${headerTitle}" />
      <LoadingSpinner isVisible={isLoading} message="読み込み中..." />
      <main className="app-content">
        {/* メインコンテンツ */}
      </main>
    </div>
  );
}

export default App;
`;
}

/**
 * ファイルを安全に書き込む（ディレクトリ作成）
 */
function ensureAndWriteFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Generated: ${filePath}`);
}

/**
 * メイン処理
 */
async function main() {
  const specFilePath = process.argv[2];

  if (!specFilePath) {
    console.error('❌ Error: Spec file path is required');
    console.error('Usage: npx ts-node scripts/generate-implementation-from-spec.ts <spec-file-path>');
    process.exit(1);
  }

  if (!fs.existsSync(specFilePath)) {
    console.error(`❌ Error: Spec file not found: ${specFilePath}`);
    process.exit(1);
  }

  try {
    console.log(`📖 Reading spec file: ${specFilePath}`);
    const specContent = fs.readFileSync(specFilePath, 'utf8');
    const spec: TestSpec = YAML.parse(specContent);

    console.log(`\n📋 Spec Information:`);
    console.log(`   Feature: ${spec.feature}`);
    console.log(`   Component: ${spec.component || 'unknown'}`);

    // 実装要件を抽出
    const requirements = extractImplementationRequirements(spec);

    console.log(`\n🔍 Implementation Requirements Detected:`);
    console.log(`   - Header Required: ${requirements.headerRequired}`);
    if (requirements.headerRequired) {
      console.log(`     * Title: ${requirements.headerTitle}`);
      console.log(`     * Background: ${requirements.headerBackground}`);
    }
    console.log(`   - Loading Spinner Required: ${requirements.loadingRequired}`);

    console.log(`\n🚀 Generating Implementation Components...`);

    // ヘッダーコンポーネントを生成
    if (requirements.headerRequired) {
      const headerComponent = generateHeaderComponent(
        requirements.headerTitle,
        requirements.headerBackground
      );
      const headerPath = path.join('frontend', 'src', 'components', 'Header.jsx');
      ensureAndWriteFile(headerPath, headerComponent);

      const headerStyles = generateHeaderStyles(requirements.headerBackground);
      const headerStylesPath = path.join('frontend', 'src', 'components', 'Header.css');
      ensureAndWriteFile(headerStylesPath, headerStyles);
    }

    // ローディングスピナーコンポーネントを生成
    if (requirements.loadingRequired) {
      const spinnerComponent = generateLoadingSpinnerComponent();
      const spinnerPath = path.join('frontend', 'src', 'components', 'LoadingSpinner.jsx');
      ensureAndWriteFile(spinnerPath, spinnerComponent);

      const spinnerStyles = generateLoadingSpinnerStyles();
      const spinnerStylesPath = path.join('frontend', 'src', 'components', 'LoadingSpinner.css');
      ensureAndWriteFile(spinnerStylesPath, spinnerStyles);
    }

    // App.jsx を更新
    if (requirements.headerRequired || requirements.loadingRequired) {
      const appComponent = generateUpdatedAppComponent(requirements.headerTitle);
      const appPath = path.join('frontend', 'src', 'App.jsx');
      ensureAndWriteFile(appPath, appComponent);
    }

    console.log(`\n✅ Implementation generation completed successfully!`);
    console.log(`\n📁 Generated Files:`);
    if (requirements.headerRequired) {
      console.log(`   - frontend/src/components/Header.jsx`);
      console.log(`   - frontend/src/components/Header.css`);
    }
    if (requirements.loadingRequired) {
      console.log(`   - frontend/src/components/LoadingSpinner.jsx`);
      console.log(`   - frontend/src/components/LoadingSpinner.css`);
    }
    console.log(`   - frontend/src/App.jsx (updated)`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during implementation generation:', error);
    process.exit(1);
  }
}

main();
