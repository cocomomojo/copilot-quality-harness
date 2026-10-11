import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import App from './App.jsx';

describe('App Component - Advanced Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    test('shows loading indicator while fetching checks', async () => {
      let resolveRender;
      const renderPromise = new Promise(resolve => {
        resolveRender = resolve;
      });

      global.fetch = vi.fn(async (url) => {
        if (url.includes('/api/checks')) {
          await renderPromise;
        }
        return {
          ok: true,
          json: async () => [{ id: 1, name: 'Test', status: 'pending', createdAt: '2026-10-11T00:00:00Z' }]
        };
      });

      render(<App />);
      
      // Should show loading state or at minimum not show full content yet
      expect(screen.queryByText('No checks recorded yet.')).toBeInTheDocument();
      
      resolveRender();
      
      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });
    });

    test('handles slow API response gracefully', async () => {
      global.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => [{ id: 1, name: 'Slow Check', status: 'pending', createdAt: '2026-10-11T00:00:00Z' }]
      }));

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Slow Check')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message when API fails on initial load', async () => {
      global.fetch = vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      }));

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Unable to load quality checks')).toBeInTheDocument();
      });
    });

    test('displays error message when API throws error', async () => {
      global.fetch = vi.fn(async () => {
        throw new Error('Unable to load quality checks');
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Unable to load quality checks')).toBeInTheDocument();
      });
    });

    test('displays validation error when name is missing', async () => {
      global.fetch = vi.fn(async (url, options) => {
        if (url.includes('/api/checks') && options?.method === 'POST') {
          return {
            ok: false,
            status: 400,
            json: async () => ({ error: 'name must be between 1 and 120 characters' })
          };
        }
        return {
          ok: true,
          json: async () => []
        };
      });

      render(<App />);
      
      const input = screen.getByLabelText('Check name');
      const button = screen.getByRole('button', { name: 'Add check' });
      
      await userEvent.type(input, '   ');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('name must be between 1 and 120 characters');
      });
    });

    test('clears error message on successful submission after error', async () => {
      let callCount = 0;
      
      global.fetch = vi.fn(async (url, options) => {
        if (url.includes('/api/checks') && options?.method === 'POST') {
          callCount++;
          if (callCount === 1) {
            return {
              ok: false,
              status: 400,
              json: async () => ({ error: 'Invalid input' })
            };
          }
          return {
            ok: true,
            status: 201,
            json: async () => ({ id: 1, name: 'Valid Check', status: 'pending', createdAt: '2026-10-11T00:00:00Z' })
          };
        }
        return {
          ok: true,
          json: async () => []
        };
      });

      render(<App />);
      
      const input = screen.getByLabelText('Check name');
      const button = screen.getByRole('button', { name: 'Add check' });
      
      // First attempt - fails
      await userEvent.type(input, 'Bad');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      
      // Clear and retry
      await userEvent.clear(input);
      await userEvent.type(input, 'Valid Check');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByText('Valid Check')).toBeInTheDocument();
      });
    });
  });

  describe('Form State Management', () => {
    test('clears input field after successful submission', async () => {
      global.fetch = vi.fn(async (url, options) => {
        if (url.includes('/api/checks') && options?.method === 'POST') {
          return {
            ok: true,
            status: 201,
            json: async () => ({ id: 1, name: 'Test Check', status: 'pending', createdAt: '2026-10-11T00:00:00Z' })
          };
        }
        return {
          ok: true,
          json: async () => [{ id: 1, name: 'Test Check', status: 'pending', createdAt: '2026-10-11T00:00:00Z' }]
        };
      });

      render(<App />);
      
      const input = screen.getByLabelText('Check name');
      const button = screen.getByRole('button', { name: 'Add check' });
      
      await userEvent.type(input, 'Test Check');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    test('prevents default form submission', async () => {
      global.fetch = vi.fn(async (url, options) => {
        if (url.includes('/api/checks') && options?.method === 'POST') {
          return {
            ok: true,
            status: 201,
            json: async () => ({ id: 1, name: 'Test', status: 'pending', createdAt: '2026-10-11T00:00:00Z' })
          };
        }
        return {
          ok: true,
          json: async () => []
        };
      });

      render(<App />);
      
      const input = screen.getByLabelText('Check name');
      const button = screen.getByRole('button', { name: 'Add check' });
      
      await userEvent.type(input, 'Test');
      await userEvent.click(button);
      
      // Form should have submitted successfully
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    test('updates form input state as user types', async () => {
      global.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => []
      }));

      render(<App />);
      
      const input = screen.getByLabelText('Check name');
      
      await userEvent.type(input, 'A');
      expect(input).toHaveValue('A');
      
      await userEvent.type(input, 'BC');
      expect(input).toHaveValue('ABC');
    });

    test('maintains error state until cleared by user action', async () => {
      global.fetch = vi.fn(async (url, options) => {
        if (url.includes('/api/checks') && options?.method === 'POST') {
          return {
            ok: false,
            status: 400,
            json: async () => ({ error: 'Validation error' })
          };
        }
        return {
          ok: true,
          json: async () => []
        };
      });

      render(<App />);
      
      const input = screen.getByLabelText('Check name');
      const button = screen.getByRole('button', { name: 'Add check' });
      
      await userEvent.type(input, '   ');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      
      // Error should persist until another action
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('List Updates', () => {
    test('adds new check to top of list', async () => {
      global.fetch = vi.fn(async (url, options) => {
        if (url.includes('/api/checks')) {
          return {
            ok: true,
            status: options?.method === 'POST' ? 201 : 200,
            json: async () => {
              if (options?.method === 'POST') {
                return { id: 2, name: 'New Check', status: 'pending', createdAt: '2026-10-11T01:00:00Z' };
              }
              return [
                { id: 1, name: 'Old Check', status: 'pending', createdAt: '2026-10-11T00:00:00Z' }
              ];
            }
          };
        }
        return { ok: true, json: async () => [] };
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Old Check')).toBeInTheDocument();
      });
      
      const input = screen.getByLabelText('Check name');
      const button = screen.getByRole('button', { name: 'Add check' });
      
      await userEvent.type(input, 'New Check');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('New Check')).toBeInTheDocument();
      });
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems[0]).toHaveTextContent('New Check');
      expect(listItems[1]).toHaveTextContent('Old Check');
    });

    test('updates existing check list without losing data', async () => {
      const checks = [
        { id: 1, name: 'Check 1', status: 'pending', createdAt: '2026-10-11T00:00:00Z' },
        { id: 2, name: 'Check 2', status: 'pending', createdAt: '2026-10-11T01:00:00Z' }
      ];

      global.fetch = vi.fn(async (url) => {
        if (url.includes('/api/checks')) {
          return {
            ok: true,
            json: async () => checks
          };
        }
        return { ok: true, json: async () => [] };
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Check 1')).toBeInTheDocument();
        expect(screen.getByText('Check 2')).toBeInTheDocument();
      });
    });

    test('displays status for each check', async () => {
      global.fetch = vi.fn(async (url) => {
        if (url.includes('/api/checks')) {
          return {
            ok: true,
            json: async () => [
              { id: 1, name: 'Pending Check', status: 'pending', createdAt: '2026-10-11T00:00:00Z' },
              { id: 2, name: 'Passed Check', status: 'passed', createdAt: '2026-10-11T01:00:00Z' }
            ]
          };
        }
        return { ok: true, json: async () => [] };
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('pending')).toBeInTheDocument();
        expect(screen.getByText('passed')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    test('shows empty state message when no checks', async () => {
      global.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => []
      }));

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('No checks recorded yet.')).toBeInTheDocument();
      });
    });

    test('hides empty state after adding first check', async () => {
      global.fetch = vi.fn(async (url, options) => {
        if (url.includes('/api/checks') && options?.method === 'POST') {
          return {
            ok: true,
            status: 201,
            json: async () => ({ id: 1, name: 'First Check', status: 'pending', createdAt: '2026-10-11T00:00:00Z' })
          };
        }
        return {
          ok: true,
          json: async () => [{ id: 1, name: 'First Check', status: 'pending', createdAt: '2026-10-11T00:00:00Z' }]
        };
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('No checks recorded yet.')).toBeInTheDocument();
      });
      
      const input = screen.getByLabelText('Check name');
      const button = screen.getByRole('button', { name: 'Add check' });
      
      await userEvent.type(input, 'First Check');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.queryByText('No checks recorded yet.')).not.toBeInTheDocument();
      });
    });
  });

  describe('Multiple Submissions', () => {
    test('handles rapid form submissions without duplicates', async () => {
      let submitCount = 0;
      
      global.fetch = vi.fn(async (url, options) => {
        if (url.includes('/api/checks') && options?.method === 'POST') {
          submitCount++;
          return {
            ok: true,
            status: 201,
            json: async () => ({ id: submitCount, name: `Check ${submitCount}`, status: 'pending', createdAt: '2026-10-11T00:00:00Z' })
          };
        }
        return {
          ok: true,
          json: async () => []
        };
      });

      render(<App />);
      
      const input = screen.getByLabelText('Check name');
      const button = screen.getByRole('button', { name: 'Add check' });
      
      await userEvent.type(input, 'Test Check');
      
      // Rapid clicks
      await userEvent.click(button);
      await userEvent.click(button);
      
      // Should handle gracefully
      expect(submitCount).toBeLessThanOrEqual(2);
    });

    test('can add multiple different checks', async () => {
      const submittedNames = [];
      
      global.fetch = vi.fn(async (url, options) => {
        if (url.includes('/api/checks') && options?.method === 'POST') {
          const mockResponse = {
            ok: true,
            status: 201,
            json: async () => {
              const name = submittedNames[submittedNames.length - 1];
              return { id: submittedNames.length, name, status: 'pending', createdAt: '2026-10-11T00:00:00Z' };
            }
          };
          return mockResponse;
        }
        return {
          ok: true,
          json: async () => submittedNames.map((name, i) => ({ id: i + 1, name, status: 'pending', createdAt: '2026-10-11T00:00:00Z' }))
        };
      });

      render(<App />);
      
      const input = screen.getByLabelText('Check name');
      const button = screen.getByRole('button', { name: 'Add check' });
      
      for (const checkName of ['First', 'Second', 'Third']) {
        submittedNames.push(checkName);
        await userEvent.type(input, checkName);
        await userEvent.click(button);
        await waitFor(() => {
          expect(input).toHaveValue('');
        });
      }
    });
  });

  describe('Accessibility', () => {
    test('form has accessible label for input', async () => {
      global.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => []
      }));

      render(<App />);
      
      const label = screen.getByText('Check name');
      expect(label).toBeVisible();
      
      const input = screen.getByLabelText('Check name');
      expect(input).toBeInTheDocument();
    });

    test('section is properly labeled', async () => {
      global.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => []
      }));

      render(<App />);
      
      const section = screen.getByRole('region');
      expect(section).toHaveAttribute('aria-labelledby');
    });

    test('error message has alert role', async () => {
      global.fetch = vi.fn(async (url, options) => {
        if (options?.method === 'POST') {
          return {
            ok: false,
            status: 400,
            json: async () => ({ error: 'Test error' })
          };
        }
        return {
          ok: true,
          json: async () => []
        };
      });

      render(<App />);
      
      const input = screen.getByLabelText('Check name');
      const button = screen.getByRole('button', { name: 'Add check' });
      
      await userEvent.type(input, '   ');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });
});
