import React from 'react';

function HomePage() {
  return (
    <div className="page-container">
      <h2>アプリケーション概要</h2>
      <p>Copilot Quality Harness は、自動テスト生成・実行・レポート機能を備えた品質保証ツールです。</p>
      <div className="features-grid">
        <div className="feature-card">
          <h3>🔍 品質チェック</h3>
          <p>カスタム品質チェック機能で、アプリケーションの品質を即座に検証できます。</p>
        </div>
        <div className="feature-card">
          <h3>🌐 URL バリデータ</h3>
          <p>Web サイトの URL を検証し、アクセス可能性をチェックします。</p>
        </div>
        <div className="feature-card">
          <h3>📊 ダッシュボード</h3>
          <p>テスト実行結果とカバレッジ情報をリアルタイムで監視できます。</p>
        </div>
        <div className="feature-card">
          <h3>⚙️ 設定</h3>
          <p>アプリケーション設定をカスタマイズして、最適な運用をサポートします。</p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
