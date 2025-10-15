import { useState } from "react";
import { API_URL } from "../../../config.js";
import meetingService from "../../../services/meetingService.js";
import { useNavigate } from "react-router-dom";

export default function useLogin() {
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      let payload = null;
      try {
        const ct = response.headers.get("content-type") || "";
        payload = ct.includes("application/json")
          ? await response.json()
          : { message: await response.text() };
      } catch {
        payload = null;
      }

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

      const { token, user } = payload?.data || {};
      if (!token) {
        setError("Token tidak ditemukan pada respons login.");
        return;
      }

      localStorage.setItem("token", token);
      meetingService.updateToken(token);

      const role = user?.userRole || user?.role;
      localStorage.setItem("user", JSON.stringify({ ...user, role }));

      if (role === "admin") navigate("/admin/dashboard");
      else navigate("/start");
    } catch (err) {
      if (err?.name === "TypeError") {
        setError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
      } else {
        setError(err?.message || "Terjadi kesalahan tak terduga.");
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    loading,
    error,
    handleSubmit,
  };
}
