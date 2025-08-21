import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./start_meeting.css";

export default function Start() {
  const [username, setUsername] = useState("");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const userInfo = JSON.parse(userData);
        setUser(userInfo);
        setUsername(userInfo.username);
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/');
      }
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Create meeting attempt:", { username });
    // Add your meeting creation logic here
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="login-container">
      <div className="login-box">
        {/* Header with user info and logout */}
        <div className="login-header">
          <img src="/img/logo.png" alt="Logo" className="login-logo" />
          <div className="login-title-container">
            <h2 className="login-title">
              Paperless Conference System
            </h2>
            <p className="login-subtitle">
              Join or host a paperless conference meeting
            </p>
          </div>
        </div>

        {/* User info and logout */}
        <div className="user-info">
          <div className="user-details">
            <span className="user-role">{user.role.toUpperCase()}</span>
            <span className="user-name">Welcome, {user.username}!</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>

        <label className="label-bold">I want to :</label>
        <div className="option-box">
          <img src="/img/pc.png" alt="PC" className="icon" />
          <span className="option-text">Host a meeting</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label-bold" htmlFor="username">
              Your Name 
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter Your Name"
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <button type="submit" className="login-button">
            Create Meeting
          </button>
        </form>
      </div>
    </div>
  );
}

