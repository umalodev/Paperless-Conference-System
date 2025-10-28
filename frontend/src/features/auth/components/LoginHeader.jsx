import React from "react";

export default function LoginHeader() {
  return (
    <div className="login-header">
      <img src="img/logo.png" alt="Umalo logo" className="login-logo" />
      <div>
        <h2 className="login-title">Paperless Conference System</h2>
        <p className="login-subtitle">Login to access the Conference System</p>
      </div>
    </div>
  );
}
