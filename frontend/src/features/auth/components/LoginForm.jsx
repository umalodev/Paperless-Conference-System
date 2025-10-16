import React from "react";

export default function LoginForm({
  username,
  setUsername,
  password,
  setPassword,
  loading,
  handleSubmit,
  error,
}) {
  return (
    <form onSubmit={handleSubmit} autoComplete="on" className="login-form">
      {error && <div className="error-message">{error}</div>}

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
  );
}
