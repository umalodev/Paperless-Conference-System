import React, { useState } from "react";

export default function LoginForm({
  username,
  setUsername,
  password,
  setPassword,
  loading,
  handleSubmit,
  error,
  fieldErrors,
}) {
  return (
    <form onSubmit={handleSubmit} autoComplete="on" className="login-form">
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label className="label-bold" htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          className={`login-input ${fieldErrors.username ? "input-error" : ""}`}
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          autoComplete="username"
          autoFocus
        />
        {fieldErrors.username && (
          <p className="error-text">Username is required.</p>
        )}
      </div>

      <div className="form-group">
        <label className="label-bold" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          className={`login-input ${fieldErrors.password ? "input-error" : ""}`}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="current-password"
        />
        {fieldErrors.password && (
          <p className="error-text">Password is required.</p>
        )}
      </div>

      <button type="submit" className="login-button" disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
