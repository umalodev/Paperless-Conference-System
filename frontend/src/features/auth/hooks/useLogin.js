import { useState } from "react";
import { API_URL } from "../../../config.js";
import meetingService from "../../../services/meetingService.js";
import { useNavigate } from "react-router-dom";

export default function useLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    username: false,
    password: false,
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 🔹 Local validation (tanpa global message)
    const newErrors = {
      username: username.trim() === "",
      password: password.trim() === "",
    };
    setFieldErrors(newErrors);

    // Kalau masih ada field kosong, hentikan di sini
    if (newErrors.username || newErrors.password) return;

    setLoading(true);

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
            msg = msg || "Invalid username or password.";
            break;
          case 422:
            msg = msg || "Login data is invalid. Please check your input.";
            break;
          case 403:
            msg = msg || "Your account does not have access.";
            break;
          case 429:
            msg = msg || "Too many attempts. Please try again later.";
            break;
          default:
            msg = msg || `Server error (HTTP ${response.status}).`;
        }
        setError(msg);
        return;
      }

      if (payload?.success === false) {
        setError(payload?.message || "Invalid username or password.");
        return;
      }

      const { token, user } = payload?.data || {};
      if (!token) {
        setError("No token received from server.");
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
        setError("Cannot connect to the server. Check your internet connection.");
      } else {
        setError(err?.message || "An unexpected error occurred.");
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
    fieldErrors,
    handleSubmit,
  };
}
