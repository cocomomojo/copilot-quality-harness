import React from 'react';

function DashboardPage() {
  return (
    <div className="page-container">
      <h2>Dashboard</h2>
      <iframe 
        src="/dashboard/index.html" 
        style={{
          width: '100%',
          height: '800px',
          border: 'none',
          borderRadius: '8px'
        }}
        title="Quality Dashboard"
      />
    </div>
  );
}

export default DashboardPage;
