/**
 * Meeting WebSocket Service
 * Centralized WebSocket management for meeting features
 */

class MeetingWebSocketService {
  constructor() {
    this.ws = null;
    this.meetingId = null;
    this.userId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.eventListeners = new Map();
    this.isConnecting = false;
  }

  /**
   * Connect to meeting WebSocket
   * @param {string} meetingId - Meeting ID
   * @param {string} userId - User ID
   * @param {string} apiUrl - API URL
   */
  async connect(meetingId, userId, apiUrl) {
    if (this.isConnecting) {
      console.log('WebSocket connection already in progress');
      return;
    }

    this.isConnecting = true;
    this.meetingId = meetingId;
    this.userId = userId;

    try {
      // Close existing connection
      if (this.ws) {
        this.ws.close();
      }

      const wsUrl = `${apiUrl.replace(/^http/, "ws")}/meeting/${meetingId}`;
      console.log('Connecting to meeting WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      // Store global reference for screen sharing
      if (typeof window !== 'undefined') {
        window.meetingWebSocket = this.ws;
      }

      this.ws.onopen = () => {
        console.log('Meeting WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Send participant identification
        this.send({
          type: 'participant_joined',
          participantId: userId,
          username: userId // You might want to get actual username
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('Meeting WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        
        // Don't reconnect for normal closure
        if (event.code === 1000) {
          return;
        }
        
        // Retry connection with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          
          console.log(`Meeting WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          this.reconnectTimeout = setTimeout(() => {
            if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
              this.connect(meetingId, userId, apiUrl);
            }
          }, delay);
        } else {
          console.error('Meeting WebSocket max reconnection attempts reached');
        }
      };

      this.ws.onerror = (error) => {
        console.error('Meeting WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Failed to connect to meeting WebSocket:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Object} data - Message data
   */
  handleMessage(data) {
    console.log('Meeting WebSocket message received:', data);

    // Handle different message types
    switch (data.type) {
      case 'chat_message':
        this.emit('chat_message', data);
        break;
      
      case 'screen-share-started':
        console.log('Screen share started by:', data.userId);
        this.emit('screen-share-started', data);
        // Also dispatch global event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('screen-share-started', {
            detail: data
          }));
        }
        break;
      
      case 'screen-share-stopped':
        console.log('Screen share stopped by:', data.userId);
        this.emit('screen-share-stopped', data);
        // Also dispatch global event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('screen-share-stopped', {
            detail: data
          }));
        }
        break;
      
      case 'screen-share-producer-created':
        console.log('Screen share producer created:', data);
        this.emit('screen-share-producer-created', data);
        // Also dispatch global event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('screen-share-producer-created', {
            detail: data
          }));
        }
        break;
      
      case 'screen-share-producer-closed':
        console.log('Screen share producer closed:', data);
        this.emit('screen-share-producer-closed', data);
        // Also dispatch global event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('screen-share-producer-closed', {
            detail: data
          }));
        }
        break;
      
      case 'meeting-ended':
        console.log('Meeting ended by:', data.endedBy);
        this.emit('meeting-ended', data);
        // Also dispatch global event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('meeting-ended', {
            detail: data
          }));
        }
        break;
      
      case 'participant_joined':
        this.emit('participant_joined', data);
        break;
      
      case 'participant_left':
        this.emit('participant_left', data);
        break;
      
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * Send message via WebSocket
   * @param {Object} message - Message to send
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log('Meeting WebSocket message sent:', message);
    } else {
      console.warn('Meeting WebSocket not connected, cannot send message:', message);
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }

    // Clear global reference
    if (typeof window !== 'undefined') {
      window.meetingWebSocket = null;
    }

    this.eventListeners.clear();
    this.isConnecting = false;
    console.log('Meeting WebSocket disconnected');
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status
   */
  getStatus() {
    if (!this.ws) return 'disconnected';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

// Export singleton instance
const meetingWebSocketService = new MeetingWebSocketService();
export default meetingWebSocketService;

