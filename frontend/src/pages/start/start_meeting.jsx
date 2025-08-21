import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./start_meeting.css";

export default function Start() {
  const [username, setUsername] = useState("");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const userInfo = JSON.parse(userData);
        setUser(userInfo);
        setUsername(userInfo.username);
      } catch (error) {
        console.error("Error parsing user data:", error);
        navigate("/");
      }
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    const meeting = {
      id: (crypto?.randomUUID && crypto.randomUUID()) || `mtg-${Date.now()}`,
      host: username.trim(),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("currentMeeting", JSON.stringify(meeting));

    navigate("/dashboard", { state: { meeting } });
  };
  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src="/img/logo.png" alt="Logo" className="login-logo" />
          <div className="login-title-container">
            <h2 className="login-title">Paperless Conference System</h2>
            <p className="login-subtitle">
              Join or host a paperless conference meeting
            </p>
          </div>
        </div>

        {/* User info and logout */}
        <br />
        <div className="user-details">
          <span className="user-name">Welcome, {user.username}!</span>
        </div>
        <br />

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
