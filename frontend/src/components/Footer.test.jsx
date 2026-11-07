import { render, screen } from '@testing-library/react';
import { expect, test, describe, it, vi } from 'vitest';
import Footer from './Footer.jsx';

describe('Footer Component - Dynamic Copyright Year (Issue #63)', () => {
  it('UT-001: 現在の年号が正しく表示されること', () => {
    const currentYear = new Date().getFullYear();
    const { container } = render(<Footer />);
    const paragraph = container.querySelector('footer p');
    
    expect(paragraph.textContent).toContain(`© ${currentYear}`);
    expect(paragraph.textContent).toContain('Copilot Quality Harness');
    expect(paragraph.textContent).toContain('All rights reserved');
  });

  it('UT-002: フッターが正しいHTML構造を持つこと', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');
    
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('footer');
    expect(footer.querySelector('p')).toBeInTheDocument();
  });

  it('UT-003: 年号フォーマットが「© YYYY」の形式であること', () => {
    const currentYear = new Date().getFullYear();
    const { container } = render(<Footer />);
    const paragraph = container.querySelector('footer p');
    const yearRegex = new RegExp(`© ${currentYear}`, 'i');
    
    expect(paragraph.textContent).toMatch(yearRegex);
  });
});

