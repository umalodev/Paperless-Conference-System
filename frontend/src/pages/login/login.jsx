import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config.js";
import "./Login.css"; // pastikan file bernama Login.css (huruf besar L)

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.user.role === "admin") navigate("/admin/dashboard");
        else navigate("/start");
      } else {
        setError(data.message || "Login gagal");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src="/img/logo.png" alt="Umalo logo" className="login-logo" />
          <div>
            <h2 className="login-title">Paperless Conference System</h2>
            <p className="login-subtitle">Login to access the Conference System</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="form-group">
            <label className="label-bold" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="login-input"
              placeholder="Enter Your Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="label-bold" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="login-input"
              placeholder="Enter Your Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
