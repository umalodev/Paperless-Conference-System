const API_BASE_URL = '/api/meeting';

class MeetingService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  // Get auth headers
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }

  // Create a new meeting
  async createMeeting(meetingData) {
    try {
      console.log('Sending meeting data:', meetingData);
      console.log('Auth headers:', this.getAuthHeaders());
      console.log('Token from localStorage:', localStorage.getItem('token'));
      console.log('User from localStorage:', localStorage.getItem('user'));
      
      // Get fresh token and user data
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        throw new Error('User not authenticated');
      }
      
      // Use proper authenticated endpoint
      const response = await fetch(`${API_BASE_URL}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Id': JSON.parse(user).id
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify(meetingData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Response cookies:', document.cookie);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || 'Failed to create meeting' };
        }
        
        throw new Error(errorData.message || 'Failed to create meeting');
      }

      const result = await response.json();
      console.log('Success response:', result);
      return result;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  // Start a meeting (host only)
  async startMeeting(meetingId) {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        throw new Error('User not authenticated');
      }
      
      const response = await fetch(`${API_BASE_URL}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Id': JSON.parse(user).id
        },
        credentials: 'include',
        body: JSON.stringify({ meetingId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || 'Failed to start meeting' };
        }
        
        throw new Error(errorData.message || 'Failed to start meeting');
      }

      const result = await response.json();
      console.log('Meeting started successfully:', result);
      return result;
    } catch (error) {
      console.error('Error starting meeting:', error);
      throw error;
    }
  }

  // Get meetings by current user
  async getMyMeetings() {
    try {
      const response = await fetch(`${API_BASE_URL}/my-meetings`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch meetings');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching meetings:', error);
      throw error;
    }
  }

  // Get all meetings (admin only)
  async getAllMeetings() {
    try {
      const response = await fetch(`${API_BASE_URL}/all`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch all meetings');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching all meetings:', error);
      throw error;
    }
  }

  // Update token when it changes
  updateToken(newToken) {
    this.token = newToken;
  }
}

export default new MeetingService();
