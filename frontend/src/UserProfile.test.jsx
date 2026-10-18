/* copilot-generated */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import UserProfile from './UserProfile.jsx';

describe('UserProfile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Normal case - valid createdAt', () => {
    test('renders profile with valid createdAt', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'user-123',
          email: 'testuser@example.com',
          created_at: '2026-10-18T10:00:00Z'
        })
      });

      render(<UserProfile />);

      await waitFor(() => {
        expect(screen.getByText('プロフィール')).toBeInTheDocument();
        expect(screen.getByText('testuser@example.com')).toBeInTheDocument();
      });

      const createdDateValue = screen.getByTestId('account-created-at-value');
      expect(createdDateValue).toHaveTextContent('2026年10月18日');
    });

    test('has account-created-at data-testid element', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'user-123',
          email: 'testuser@example.com',
          created_at: '2026-10-18T10:00:00Z'
        })
      });

      render(<UserProfile />);

      await waitFor(() => {
        const element = screen.getByTestId('account-created-at');
        expect(element).toBeVisible();
      });
    });
  });

  describe('Error case - null createdAt', () => {
    test('renders profile with null createdAt and shows fallback', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'user-456',
          email: 'legacyuser@example.com',
          created_at: null
        })
      });

      render(<UserProfile />);

      await waitFor(() => {
        const createdDateValue = screen.getByTestId('account-created-at-value');
        expect(createdDateValue).toHaveTextContent('-');
      });
    });
  });

  describe('Error case - API 404 error', () => {
    test('displays error message when API returns 404', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'User not found' })
      });

      render(<UserProfile />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Error case - invalid createdAt format', () => {
    test('renders profile with invalid createdAt and shows fallback', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'user-789',
          email: 'user@example.com',
          created_at: 'not-a-valid-date'
        })
      });

      render(<UserProfile />);

      await waitFor(() => {
        const createdDateValue = screen.getByTestId('account-created-at-value');
        expect(createdDateValue).toHaveTextContent('-');
      });
    });
  });

  describe('Loading state', () => {
    test('shows loading message initially', () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            id: 'user-123',
            email: 'testuser@example.com',
            created_at: '2026-10-18T10:00:00Z'
          })
        }), 100))
      );

      render(<UserProfile />);
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });
  });

  describe('API error handling', () => {
    test('displays error message when fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<UserProfile />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('ユーザー情報を取得できません')).toBeInTheDocument();
      });
    });

    test('displays error message when API returns error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal Server Error',
          message: 'Failed to fetch user profile'
        })
      });

      render(<UserProfile />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Page structure', () => {
    test('renders profile section with proper heading', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'user-123',
          email: 'testuser@example.com',
          created_at: '2026-10-18T10:00:00Z'
        })
      });

      render(<UserProfile />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'プロフィール' })).toBeInTheDocument();
        expect(screen.getByText('ユーザー情報')).toBeInTheDocument();
      });
    });

    test('displays email address', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'user-123',
          email: 'testuser@example.com',
          created_at: '2026-10-18T10:00:00Z'
        })
      });

      render(<UserProfile />);

      await waitFor(() => {
        expect(screen.getByText('testuser@example.com')).toBeInTheDocument();
      });
    });
  });
});
