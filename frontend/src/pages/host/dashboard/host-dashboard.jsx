import React, { useState, useEffect } from 'react';
import './host-dashboard.css';

const HostDashboard = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const hostFeatures = [
    { id: 1, name: 'Files Management', icon: '📁', description: 'Manage conference files' },
    { id: 2, name: 'Chat/Messaging', icon: '💬', description: 'Conference chat' },
    { id: 3, name: 'Annotate', icon: '✏️', description: 'Document annotation' },
    { id: 4, name: 'Share Screen', icon: '🖥️', description: 'Screen sharing' },
    { id: 5, name: 'Recording', icon: '🎥', description: 'Record meetings' },
    { id: 6, name: 'Agenda', icon: '📋', description: 'Meeting agenda' },
    { id: 7, name: 'Materials', icon: '📚', description: 'Conference materials' },
    { id: 8, name: 'Survey', icon: '📊', description: 'Create surveys' }
  ];

  return (
    <div className="host-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Host Dashboard</h1>
          <p>Conference management and hosting</p>
        </div>
        <div className="header-right">
          <span className="user-info">Welcome, {user?.username || 'Host'}!</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="stats-section">
          <div className="stat-card">
            <h3>My Meetings</h3>
            <p className="stat-number">5</p>
          </div>
          <div className="stat-card">
            <h3>Active Now</h3>
            <p className="stat-number">1</p>
          </div>
          <div className="stat-card">
            <h3>Total Files</h3>
            <p className="stat-number">23</p>
          </div>
          <div className="stat-card">
            <h3>Participants</h3>
            <p className="stat-number">12</p>
          </div>
        </div>

        <div className="features-section">
          <h2>Hosting Features</h2>
          <div className="features-grid">
            {hostFeatures.map(feature => (
              <div key={feature.id} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.name}</h3>
                <p>{feature.description}</p>
                <button className="feature-btn">Use</button>
              </div>
            ))}
          </div>
        </div>

        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button className="action-btn primary">Start Meeting</button>
            <button className="action-btn secondary">Schedule Meeting</button>
            <button className="action-btn secondary">Upload Files</button>
            <button className="action-btn secondary">View History</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
