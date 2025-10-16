import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config.js";
import "./Login.css";
import meetingService from "../../services/meetingService.js";

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

    // 🔹 Hapus semua data lama dulu agar tidak tertimpa antar user
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log("🧹 Storage cleared before new login");
    } catch (err) {
      console.warn("⚠️ Failed to clear storage before login:", err);
    }

    try {
      // 🔹 Kirim permintaan login
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      // 🔹 Parsing payload apapun bentuknya
      let payload = null;
      try {
        const ct = response.headers.get("content-type") || "";
        payload = ct.includes("application/json")
          ? await response.json()
          : { message: await response.text() };
      } catch {
        payload = null;
      }

      // 🔹 Tangani HTTP error
      if (!response.ok) {
        let msg = payload?.message;
        switch (response.status) {
          case 400:
          case 401:
            msg = msg || "Username atau password salah.";
            break;
          case 422:
            msg = msg || "Data login tidak valid. Periksa input Anda.";
            break;
          case 403:
            msg = msg || "Akun Anda tidak memiliki akses.";
            break;
          case 429:
            msg = msg || "Terlalu banyak percobaan. Coba lagi beberapa saat.";
            break;
          default:
            msg =
              msg || `Terjadi kesalahan pada server (HTTP ${response.status}).`;
        }
        setError(msg);
        return;
      }

      if (payload?.success === false) {
        setError(payload?.message || "Username atau password salah.");
        return;
      }

      // 🔹 Ambil token dan user
      const { token, user } = payload?.data || {};
      if (!token || !user?.id) {
        setError("Login response tidak valid (missing token atau user.id)");
        return;
      }

      // 🔹 Simpan ke localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      meetingService.updateToken(token);

      console.log("✅ Login success:", user);

      // 🔹 Arahkan sesuai role
      const role = user.userRole || user.role;
      if (role === "admin") navigate("/admin/dashboard");
      else navigate("/start");
    } catch (err) {
      // biasanya TypeError saat network gagal / CORS
      if (err?.name === "TypeError") {
        setError(
          "Tidak dapat terhubung ke server. Periksa koneksi internet Anda."
        );
      } else {
        setError(err?.message || "Terjadi kesalahan tak terduga.");
      }
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
            <p className="login-subtitle">
              Login to access the Conference System
            </p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="form-group">
            <label className="label-bold" htmlFor="username">
              Username
            </label>
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
            <label className="label-bold" htmlFor="password">
              Password
            </label>
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
