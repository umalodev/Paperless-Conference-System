import React from "react";
import useLogin from "../hooks/useLogin.js";
import LoginHeader from "../components/LoginHeader.jsx";
import LoginForm from "../components/LoginForm.jsx";
import "../styles/login.css";

export default function Login() {
  const {
    username,
    setUsername,
    password,
    setPassword,
    loading,
    error,
    handleSubmit,
  } = useLogin();

  return (
    <div className="login-container">
      <div className="login-box">
        <LoginHeader />
        <LoginForm
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          loading={loading}
          error={error}
          handleSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
