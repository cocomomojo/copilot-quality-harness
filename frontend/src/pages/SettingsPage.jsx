import React, { useState } from 'react';

function SettingsPage() {
  const [settings, setSettings] = useState({
    theme: 'light',
    notifications: true,
    autoRun: false
  });

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = () => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  return (
    <div className="page-container">
      <h2>Settings</h2>
      <form className="settings-form">
        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => handleChange('notifications', e.target.checked)}
            />
            Enable Notifications
          </label>
        </div>
        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              checked={settings.autoRun}
              onChange={(e) => handleChange('autoRun', e.target.checked)}
            />
            Auto-run Tests on Save
          </label>
        </div>
        <div className="setting-group">
          <label>
            Theme:
            <select 
              value={settings.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </label>
        </div>
        <button type="button" onClick={handleSave} className="btn-primary">
          Save Settings
        </button>
      </form>
    </div>
  );
}

export default SettingsPage;
