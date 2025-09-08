import { API_URL } from '../config.js';

class DashboardService {
  // Get dashboard statistics
  static async getDashboardStats() {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/api/dashboard/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // Get current time and date
  static getCurrentTimeAndDate() {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    const date = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
    
    return { time, date };
  }
}

export default DashboardService;
