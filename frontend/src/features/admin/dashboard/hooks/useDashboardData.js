import { useEffect, useState } from "react";
import DashboardService from "../services/DashboardService.js";

export default function useDashboardData() {
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    activeMeetings: 0,
    totalMeetings: 0,
    totalFiles: 0,
    systemStatus: "offline",
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState({
    time: "00:00",
    date: "Monday, 01/01/2024"
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Panggil static method tanpa `new`
      const res = await DashboardService.getDashboardStats();

      if (res.success) setDashboardData(res.data || {});
      else setError(res.message || "Failed to fetch dashboard data");
    } catch (err) {
      console.error("Error loading dashboard:", err);
      setError(err.message || "Error loading dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const updateTime = () => {
    // ✅ Static juga
    setCurrentTime(DashboardService.getCurrentTimeAndDate());
  };

  useEffect(() => {
    fetchDashboardData();
    updateTime();

    const timeInterval = setInterval(updateTime, 60000);
    const dataInterval = setInterval(fetchDashboardData, 30000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(dataInterval);
    };
  }, []);

  return { dashboardData, loading, error, currentTime, fetchDashboardData };
}
