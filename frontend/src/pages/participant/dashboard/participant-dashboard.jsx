import React, { useState, useEffect } from 'react';
import './participant-dashboard.css';

const ParticipantDashboard = () => {
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

  const participantFeatures = [
    { id: 1, name: 'Files', icon: '📁', description: 'View conference files' },
    { id: 2, name: 'Chat/Messaging', icon: '💬', description: 'Join conversations' },
    { id: 3, name: 'Agenda', icon: '📋', description: 'View meeting agenda' },
    { id: 4, name: 'Materials', icon: '📚', description: 'Access materials' },
    { id: 5, name: 'Survey', icon: '📊', description: 'Participate in surveys' }
  ];

  return (
    <div className="participant-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Participant Dashboard</h1>
          <p>Join and participate in conferences</p>
        </div>
        <div className="header-right">
          <span className="user-info">Welcome, {user?.username || 'Participant'}!</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="stats-section">
          <div className="stat-card">
            <h3>Joined Meetings</h3>
            <p className="stat-number">8</p>
          </div>
          <div className="stat-card">
            <h3>Available Now</h3>
            <p className="stat-number">2</p>
          </div>
          <div className="stat-card">
            <h3>My Files</h3>
            <p className="stat-number">15</p>
          </div>
          <div className="stat-card">
            <h3>Surveys Taken</h3>
            <p className="stat-number">5</p>
          </div>
        </div>

        <div className="features-section">
          <h2>Available Features</h2>
          <div className="features-grid">
            {participantFeatures.map(feature => (
              <div key={feature.id} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.name}</h3>
                <p>{feature.description}</p>
                <button className="feature-btn">Access</button>
              </div>
            ))}
          </div>
        </div>

        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button className="action-btn primary">Join Meeting</button>
            <button className="action-btn secondary">Browse Files</button>
            <button className="action-btn secondary">View Schedule</button>
            <button className="action-btn secondary">My Profile</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;
