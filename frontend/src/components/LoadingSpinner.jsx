import React from 'react';
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
