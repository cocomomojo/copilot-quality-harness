import React from 'react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="page-container error-page">
      <div className="error-content">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>申し訳ありません。お探しのページが見つかりません。</p>
        <Link to="/" className="btn-primary">
          ← Return to Home
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
