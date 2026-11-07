import React, { useState, useEffect } from 'react';
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
      <Header title="Copilot Quality Harness Dash" />
      <LoadingSpinner isVisible={isLoading} message="読み込み中..." />
      <main className="app-content">
        {/* メインコンテンツ */}
      </main>
    </div>
  );
}

export default App;
