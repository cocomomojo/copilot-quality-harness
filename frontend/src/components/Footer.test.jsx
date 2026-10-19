import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import Footer from './Footer.jsx';

test('Footer renders copyright text correctly', () => {
  render(<Footer />);
  const copyrightText = screen.getByText(/© 2026 Copilot Quality Harness/);
  expect(copyrightText).toBeInTheDocument();
});

test('Footer has correct HTML structure', () => {
  const { container } = render(<Footer />);
  const footer = container.querySelector('footer');
  expect(footer).toBeInTheDocument();
  expect(footer).toHaveClass('footer');
});

test('Footer contains a paragraph element', () => {
  const { container } = render(<Footer />);
  const paragraph = container.querySelector('footer p');
  expect(paragraph).toBeInTheDocument();
});
