import { API_URL } from '../config.js';

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
      console.log('Creating meeting with data:', meetingData);
      
      const response = await fetch(`${API_URL}/api/meeting/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify(meetingData)
      });

      console.log('Response status:', response.status);

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
      console.log('Meeting created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  // Start a meeting (host only)
  async startMeeting(meetingId) {
    try {
      const response = await fetch(`${API_URL}/api/meeting/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

  // Join a meeting
  async joinMeeting(meetingId) {
    try {
      const response = await fetch(`${API_URL}/api/meeting/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
          errorData = { message: errorText || 'Failed to join meeting' };
        }
        
        throw new Error(errorData.message || 'Failed to join meeting');
      }

      const result = await response.json();
      console.log('Joined meeting successfully:', result);
      return result;
    } catch (error) {
      console.error('Error joining meeting:', error);
      throw error;
    }
  }

  // Auto-join meeting (server validates host started and is online)
  async autoJoinMeeting(meetingId) {
    try {
      const response = await fetch(`${API_URL}/api/meeting/auto-join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
          errorData = { message: errorText || 'Failed to auto-join meeting' };
        }
        throw new Error(errorData.message || 'Failed to auto-join meeting');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error auto-joining meeting:', error);
      throw error;
    }
  }

  // Get meeting status (public endpoint, no auth required)
  async getMeetingStatus(meetingId) {
    try {
      const response = await fetch(`${API_URL}/api/meeting/${meetingId}/public-status`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || 'Failed to get meeting status' };
        }
        
        throw new Error(errorData.message || 'Failed to get meeting status');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting meeting status:', error);
      throw error;
    }
  }

  // Get active meetings for participants to join (no auth required)
  async getActiveMeetings() {
    try {
      const response = await fetch(`${API_URL}/api/meeting/active/public`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || 'Failed to get active meetings' };
        }
        
        throw new Error(errorData.message || 'Failed to get active meetings');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting active meetings:', error);
      throw error;
    }
  }

  // Get meeting status with authentication (for authenticated users)
  async getMeetingStatusAuth(meetingId) {
    try {
      const response = await fetch(`${API_URL}/api/meeting/${meetingId}/status`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || 'Failed to get meeting status' };
        }
        
        throw new Error(errorData.message || 'Failed to get meeting status');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting authenticated meeting status:', error);
      throw error;
    }
  }

  // Get meetings by current user
  async getMyMeetings() {
    try {
      const response = await fetch(`${API_URL}/api/meeting/my-meetings`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
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

  // Get scheduled meetings by current user
  async getScheduledMeetings() {
    try {
      const response = await fetch(`${API_URL}/api/meeting/scheduled`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch scheduled meetings');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching scheduled meetings:', error);
      throw error;
    }
  }

  // Get all meetings (admin only)
  async getAllMeetings() {
    try {
      const response = await fetch(`${API_URL}/api/meeting/all`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
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

  // End meeting (host/admin only)
  async endMeeting(meetingId) {
    try {
      const response = await fetch(`${API_URL}/api/meeting/end`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ meetingId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || 'Failed to end meeting' };
        }
        
        throw new Error(errorData.message || 'Failed to end meeting');
      }

      const result = await response.json();
      console.log('Meeting ended successfully:', result);
      return result;
    } catch (error) {
      console.error('Error ending meeting:', error);
      throw error;
    }
  }

  // Check meeting status for participant (for auto-exit)
  async checkMeetingStatus(meetingId) {
    try {
      const response = await fetch(`${API_URL}/api/meeting/${meetingId}/status`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || 'Failed to check meeting status' };
        }
        
        throw new Error(errorData.message || 'Failed to check meeting status');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking meeting status:', error);
      throw error;
    }
  }

  // Leave meeting (participant only)
  async leaveMeeting(meetingId) {
    try {
      const response = await fetch(`${API_URL}/api/meeting/leave`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ meetingId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || 'Failed to leave meeting' };
        }
        
        throw new Error(errorData.message || 'Failed to leave meeting');
      }

      const result = await response.json();
      console.log('Left meeting successfully:', result);
      return result;
    } catch (error) {
      console.error('Error leaving meeting:', error);
      throw error;
    }
  }

  // Update token when it changes
  updateToken(newToken) {
    this.token = newToken;
  }
}

export default new MeetingService();
