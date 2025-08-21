import React from "react";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login attempt:", { username, password });
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src="/img/logo.png" alt="Logo" className="login-logo" />
          <div>
            <h2 className="login-title">Paperless Conference System</h2>
            <p className="login-subtitle">
              Login to access the Conference System
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label-bold" htmlFor="username">
              Username
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

          <div className="form-group">
            <label className="label-bold" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter Your Password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="login-button">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
