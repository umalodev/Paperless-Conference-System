import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config.js";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store user data in localStorage for frontend use
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to role-specific dashboard
        if (data.user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (data.user.role === 'host') {
          navigate('/host/dashboard');
        } else if (data.user.role === 'participant') {
          navigate('/participant/dashboard');
        } else {
          // Fallback to admin dashboard if role is unknown
          navigate('/admin/dashboard');
        }
      } else {
        setError(data.message || 'Login gagal');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
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

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

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
              disabled={loading}
              required
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
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
