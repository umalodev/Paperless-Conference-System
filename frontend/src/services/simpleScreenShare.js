/**
 * Simple Screen Share Service
 * Implementasi screen sharing yang sederhana dan langsung
 */

class SimpleScreenShare {
  constructor() {
    this.isSharing = false;
    this.currentStream = null;
    this.ws = null;
    this.meetingId = null;
    this.userId = null;
    this.onScreenShareReceived = null;
    this.onScreenShareStart = null;
    this.onScreenShareStop = null;
  }

  /**
   * Initialize simple screen share
   */
  async initialize(meetingId, userId) {
    this.meetingId = meetingId;
    this.userId = userId;
    
    // Connect to WebSocket
    this.connectWebSocket();
    
    console.log('SimpleScreenShare initialized');
    return true;
  }

  /**
   * Connect to WebSocket
   */
  connectWebSocket() {
    // Use environment-based WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    
    // For production, use same port as frontend (usually 80/443)
    // For development, use port 3000 for backend
    const port = process.env.NODE_ENV === 'production' ? '' : ':3000';
    const wsUrl = `${protocol}//${host}${port}/meeting/${this.meetingId}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    console.log('Environment:', process.env.NODE_ENV);
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('SimpleScreenShare WebSocket connected successfully');
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SimpleScreenShare received message:', data.type);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('SimpleScreenShare WebSocket disconnected');
      // Reconnect after 3 seconds
      setTimeout(() => {
        this.connectWebSocket();
      }, 3000);
    };

    this.ws.onerror = (error) => {
      console.error('SimpleScreenShare WebSocket error:', error);
    };
  }

  /**
   * Handle WebSocket messages
   */
  handleMessage(data) {
    console.log('=== SimpleScreenShare Message Received ===');
    console.log('Message type:', data.type);
    console.log('From user:', data.userId);
    console.log('Meeting ID:', data.meetingId);
    console.log('Current user ID:', this.userId);
    console.log('Is from different user:', data.userId !== this.userId);
    console.log('Full message:', data);
    
    switch (data.type) {
      case 'screen-share-start':
        console.log('Handling screen-share-start event');
        if (this.onScreenShareStart) {
          this.onScreenShareStart(data);
        }
        break;
        
      case 'screen-share-stop':
      case 'screen-share-stopped':
        console.log('Handling screen-share-stop event');
        if (this.onScreenShareStop) {
          this.onScreenShareStop(data);
        }
        break;
        
      case 'screen-share-stream':
        console.log('Handling screen-share-stream event');
        console.log('Image data length:', data.imageData?.length || 0);
        console.log('Image data preview:', data.imageData?.substring(0, 100) + '...');
        
        // Process screen share stream from any user (including own stream for preview)
        console.log('Processing screen share stream from user:', data.userId);
        if (this.onScreenShareReceived) {
          this.onScreenShareReceived(data);
        }
        break;
        
      default:
        console.log('Unhandled message type:', data.type);
        break;
    }
    console.log('=== End Message Handling ===');
  }

  /**
   * Start screen sharing
   */
  async startScreenShare() {
    try {
      console.log('Starting simple screen share...');
      
      // Get screen stream
      this.currentStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      this.isSharing = true;
      
      // Send start event
      this.sendMessage({
        type: 'screen-share-start',
        userId: this.userId,
        meetingId: this.meetingId,
        timestamp: Date.now()
      });
      
      // Start sending video frames
      this.startSendingFrames();
      
      console.log('Simple screen share started');
      return true;
      
    } catch (error) {
      console.error('Failed to start screen share:', error);
      return false;
    }
  }

  /**
   * Start sending video frames
   */
  startSendingFrames() {
    if (!this.currentStream) return;
    
    const video = document.createElement('video');
    video.srcObject = this.currentStream;
    video.play();
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const sendFrame = () => {
      if (!this.isSharing || !this.currentStream) return;
      
      // Reduce resolution for better performance
      const maxWidth = 800;
      const maxHeight = 600;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      // Scale down if too large
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);
      
      // Convert to base64 with lower quality for better performance
      const imageData = canvas.toDataURL('image/jpeg', 0.5);
      
      // Send frame
      this.sendMessage({
        type: 'screen-share-stream',
        userId: this.userId,
        meetingId: this.meetingId,
        imageData: imageData,
        timestamp: Date.now()
      });
      
      // Continue sending frames
      setTimeout(sendFrame, 500); // 2 FPS - reduced for better performance
    };
    
    video.onloadedmetadata = () => {
      sendFrame();
    };
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare() {
    console.log('Stopping simple screen share...');
    
    this.isSharing = false;
    
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    
    // Send stop event
    this.sendMessage({
      type: 'screen-share-stop',
      userId: this.userId,
      meetingId: this.meetingId,
      timestamp: Date.now()
    });
    
    console.log('Simple screen share stopped');
    return true;
  }

  /**
   * Send WebSocket message
   */
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message.type, 'to meeting:', this.meetingId);
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected. State:', this.ws?.readyState);
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.stopScreenShare();
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Export singleton
const simpleScreenShare = new SimpleScreenShare();
export default simpleScreenShare;
