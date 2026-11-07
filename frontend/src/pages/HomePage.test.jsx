import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';

describe('HomePage Component', () => {
  it('renders home page with application overview', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('アプリケーション概要')).toBeTruthy();
    expect(screen.getByText(/Copilot Quality Harness は/)).toBeTruthy();
  });

  it('displays all feature cards', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('🔍 品質チェック')).toBeTruthy();
    expect(screen.getByText('🌐 URL バリデータ')).toBeTruthy();
    expect(screen.getByText('📊 ダッシュボード')).toBeTruthy();
    expect(screen.getByText('⚙️ 設定')).toBeTruthy();
  });
});
