import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', testId: 'nav-home' },
  { to: '/quality-checks', label: 'Quality Checks', testId: 'nav-quality' },
  { to: '/url-validator', label: 'URL Validator', testId: 'nav-validator' },
  { to: '/dashboard', label: 'Dashboard', testId: 'nav-dashboard' },
  { to: '/settings', label: 'Settings', testId: 'nav-settings' },
];

/**
 * Header コンポーネント
 *
 * Props:
 *   - title (string): ヘッダーに表示するタイトル（デフォルト: "Copilot Quality Harness"）
 *   - backgroundColor (string): ヘッダーの背景色（デフォルト: "#1f2937"）
 */
const Header = ({
  title = 'Copilot Quality Harness',
  backgroundColor = '#1f2937'
}) => {
  const { pathname } = useLocation();

  return (
    <header
      className="header"
      style={{ backgroundColor }}
      data-testid="header"
    >
      <div className="header-content">
        <h1 className="header-title" data-testid="header-title">
          {title}
        </h1>
        <nav className="header-nav" data-testid="header-nav">
          <ul>
            {NAV_ITEMS.map(({ to, label, testId }) => (
              <li key={to}>
                <Link to={to} className={pathname === to ? 'active' : ''} data-testid={testId}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
