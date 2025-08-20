import React from "react";
import "./start_meeting.css";

export default function Start() {
  const [username, setUsername] = React.useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login attempt:", { username,});
  };


  return (
    <div className="login-container">
      <div className="login-box">
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

        <label className="label-bold">I want to :</label>
          <div className="option-box">
            <img src="/img/pc.png" alt="PC" className="icon" />
            <span className="option-text">Host a meeting</span>
          </div> <p></p>

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

