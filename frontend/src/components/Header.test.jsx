import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../components/Header';

describe('Header Component', () => {
  beforeEach(() => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
  });

  it('renders header with title', () => {
    expect(screen.getByText('Copilot Quality Harness')).toBeTruthy();
  });

  it('renders all navigation links', () => {
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Quality Checks')).toBeTruthy();
    expect(screen.getByText('URL Validator')).toBeTruthy();
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('has correct href attributes for all navigation links', () => {
    const homeLink = screen.getByTestId('nav-home');
    const qualityLink = screen.getByTestId('nav-quality');
    const validatorLink = screen.getByTestId('nav-validator');
    const dashboardLink = screen.getByTestId('nav-dashboard');
    const settingsLink = screen.getByTestId('nav-settings');

    expect(homeLink.getAttribute('href')).toBe('/');
    expect(qualityLink.getAttribute('href')).toBe('/quality-checks');
    expect(validatorLink.getAttribute('href')).toBe('/url-validator');
    expect(dashboardLink.getAttribute('href')).toBe('/dashboard');
    expect(settingsLink.getAttribute('href')).toBe('/settings');
  });

  it('marks active link with active class', () => {
    const homeLink = screen.getByTestId('nav-home');
    expect(homeLink.className).toContain('active');
  });
});
