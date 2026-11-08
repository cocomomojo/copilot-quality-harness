import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import App from './App.jsx';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, name: 'API contract', status: 'pending' }]
  }));
});

test('renders checks returned by the API', async () => {
  render(<App />);
  expect(await screen.findByText('API contract')).toBeInTheDocument();
  expect(screen.getByText('pending')).toBeInTheDocument();
});

test('displays character count as 0/50 initially', async () => {
  render(<App />);
  await screen.findByText('API contract');
  const counter = screen.getByTestId('char-count');
  expect(counter).toBeInTheDocument();
  expect(counter.textContent).toBe('0/50');
});

test('updates character count when typing in check name input', async () => {
  render(<App />);
  await screen.findByText('API contract');
  const input = screen.getByLabelText('Check name');
  fireEvent.change(input, { target: { value: 'Hello' } });
  const counter = screen.getByTestId('char-count');
  expect(counter.textContent).toBe('5/50');
});

test('status badge has title attribute with tooltip text', async () => {
  render(<App />);
  const badge = await screen.findByTestId('status-badge');
  expect(badge).toBeInTheDocument();
  expect(badge.getAttribute('title')).toBeTruthy();
  expect(badge.getAttribute('title')).toContain('pending');
});
