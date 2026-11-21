import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../context/AppContext.jsx';
import Toast from './Toast.jsx';

function Trigger({ duration }) {
  const { showToast, toggleTheme, theme } = useApp();
  return (
    <>
      <button onClick={() => showToast('Saved', 'success', duration)}>show</button>
      <button onClick={toggleTheme}>theme</button>
      <span data-testid="theme">{theme}</span>
    </>
  );
}

function renderToast(duration) {
  return render(
    <AppProvider>
      <Trigger duration={duration} />
      <Toast />
    </AppProvider>
  );
}

describe('Toast / AppContext', () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('renders nothing until a toast is shown, then closes on click', async () => {
    renderToast(0);
    expect(screen.queryByTestId('toast')).toBeNull();
    await userEvent.click(screen.getByText('show'));
    expect(screen.getByTestId('toast')).toHaveTextContent('Saved');
    expect(screen.getByTestId('toast')).toHaveClass('toast-success');
    await userEvent.click(screen.getByTestId('toast-close'));
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('auto-hides after the given duration', () => {
    vi.useFakeTimers();
    renderToast(1000);
    act(() => screen.getByText('show').click());
    expect(screen.getByTestId('toast')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('toggles and persists theme', async () => {
    localStorage.setItem('theme', 'light');
    renderToast(0);
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    await userEvent.click(screen.getByText('theme'));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('useApp throws outside AppProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow('useApp must be used within AppProvider');
    spy.mockRestore();
  });
});
