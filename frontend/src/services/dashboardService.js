import { API_URL } from "../config.js";

class DashboardService {
  // Get dashboard statistics
  static async getDashboardStats() {
    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`; // ⬅️ hanya kalau ada
      if (userId) headers["X-User-Id"] = userId; // opsional; middleware biasanya tidak butuh ini

      const response = await fetch(`${API_URL}/api/dashboard/stats`, {
        method: "GET",
        headers,
        credentials: "include", // ⬅️ penting kalau server pakai cookie session/jwt httpOnly
      });

      if (!response.ok) {
        // bubble 401 supaya FE bisa redirect
        const msg = `HTTP error! status: ${response.status}`;
        const err = new Error(msg);
        err.status = response.status;
        throw err;
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  }

  // Get current time and date
  static getCurrentTimeAndDate() {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const date = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

    return { time, date };
  }
}

export default DashboardService;
