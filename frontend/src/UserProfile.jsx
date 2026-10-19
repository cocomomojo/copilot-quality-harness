/* copilot-generated */

import { useEffect, useState } from 'react';
import { formatAccountCreatedDate, fetchUserProfile } from './utils/dateFormatter.js';
import Footer from './components/Footer.jsx';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const profile = await fetchUserProfile();
        
        if (!profile.success) {
          setError(profile.error_message);
          setLoading(false);
          return;
        }

        setUser(profile);

        // Format the date
        const formatted = formatAccountCreatedDate(profile.created_at, 'ja-JP', 'Asia/Tokyo');
        setFormattedDate(formatted.formatted_date);
      } catch (err) {
        setError('ユーザープロフィール取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <p role="alert" className="error">{error}</p>;
  }

  if (!user) {
    return <p>ユーザー情報を取得できません</p>;
  }

  return (
    <main className="user-profile">
      <header>
        <h1>プロフィール</h1>
      </header>
      <section aria-labelledby="profile-heading">
        <h2 id="profile-heading">ユーザー情報</h2>
        <div className="profile-info">
          <div className="profile-field">
            <label>メールアドレス</label>
            <span>{user.email}</span>
          </div>
          <div className="profile-field">
            <label>アカウント作成日</label>
            <span data-testid="account-created-at">
              <span data-testid="account-created-at-value">{formattedDate}</span>
            </span>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
