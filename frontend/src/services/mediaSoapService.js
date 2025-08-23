// Media Soap Service for Live Streaming
// This service handles WebRTC connections and media streaming via MediaSoup

import io from 'socket.io-client';

class MediaSoapService {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.peerId = null;
    this.localStream = null;
    this.screenStream = null;
    this.transports = new Map();
    this.producers = new Map();
    this.consumers = new Map();
    this.rtpCapabilities = null;
    this.onTrackCallback = null;
    this.onParticipantCallback = null;
    this.isHost = false;
    this.meetingId = null;
    
    // MediaSoup server configuration
    this.mediaServerUrl = 'ws://localhost:3002';
  }

  // Initialize the service
  async initialize(meetingId, isHost = false) {
    this.meetingId = meetingId;
    this.isHost = isHost;
    this.roomId = meetingId;
    this.peerId = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Connect to MediaSoup server
      await this.connectToMediaSoup();
      
      // Get user media permissions
      await this.requestMediaPermissions();
      
      console.log('Media Soap Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Media Soap Service:', error);
      throw error;
    }
  }

  // Connect to MediaSoup server
  async connectToMediaSoup() {
    return new Promise((resolve, reject) => {
      try {
        // Use Socket.IO client
        this.socket = io(this.mediaServerUrl);
        
        this.socket.on('connect', () => {
          console.log('Connected to MediaSoup server');
          this.joinRoom();
          resolve();
        });
        
        this.socket.on('disconnect', () => {
          console.log('Disconnected from MediaSoup server');
        });
        
        this.socket.on('error', (error) => {
          console.error('MediaSoup server error:', error);
          reject(error);
        });
        
        // Handle MediaSoup events
        this.setupMediaSoupEventHandlers();
        
      } catch (error) {
        console.error('Failed to connect to MediaSoup:', error);
        reject(error);
      }
    });
  }

  // Setup MediaSoup event handlers
  setupMediaSoupEventHandlers() {
    // Router RTP capabilities
    this.socket.on('router-rtp-capabilities', (data) => {
      this.rtpCapabilities = data.rtpCapabilities;
      console.log('Received router RTP capabilities');
    });
    
    // Transport created
    this.socket.on('transport-created', (data) => {
      console.log('Transport created:', data);
      // Store transport info for later use
      this.transports.set(data.id, data);
    });
    
    // Media produced
    this.socket.on('produced', (data) => {
      console.log('Media produced:', data);
      this.producers.set(data.id, data);
    });
    
    // Media consumed
    this.socket.on('consumed', (data) => {
      console.log('Media consumed:', data);
      this.consumers.set(data.id, data);
      
      // Notify about new media
      if (this.onTrackCallback) {
        this.onTrackCallback(data.producerId, data);
      }
    });
    
    // New producer (from other peers)
    this.socket.on('new-producer', (data) => {
      console.log('New producer from peer:', data);
      // Auto-consume new producers
      this.consumeProducer(data.producerId);
    });
    
    // Peer events
    this.socket.on('peer-joined', (data) => {
      console.log('Peer joined:', data);
      if (this.onParticipantCallback) {
        this.onParticipantCallback('joined', data);
      }
    });
    
    this.socket.on('peer-left', (data) => {
      console.log('Peer left:', data);
      if (this.onParticipantCallback) {
        this.onParticipantCallback('left', data);
      }
    });
  }

  // Join room on MediaSoup server
  joinRoom() {
    this.socket.emit('join-room', {
      roomId: this.roomId,
      roomName: `Meeting ${this.meetingId}`,
      peerId: this.peerId
    });
  }

  // Request media permissions
  async requestMediaPermissions() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      console.log('Media permissions granted');
      return this.localStream;
    } catch (error) {
      console.error('Failed to get media permissions:', error);
      throw error;
    }
  }

  // Start screen sharing
  async startScreenShare() {
    try {
      // Don't create a new stream here - use the one from the component
      if (!this.screenStream) {
        throw new Error('No screen stream available. Call setScreenStream() first.');
      }

      // Send screen share to MediaSoup server
      if (this.socket && this.socket.connected) {
        try {
          await this.produceScreenShare();
        } catch (produceError) {
          console.warn('Failed to produce screen share to MediaSoup:', produceError);
          // Don't fail the entire operation
        }
      }

      console.log('Screen sharing started');
      return this.screenStream;
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      throw error;
    }
  }

  // Set screen stream from external source
  setScreenStream(stream) {
    this.screenStream = stream;
    
    // Handle screen share stop
    if (stream && stream.getVideoTracks().length > 0) {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.onended = () => {
        this.stopScreenShare();
      };
    }
  }

  // Clear screen stream
  clearScreenStream() {
    this.screenStream = null;
  }

  // Produce screen share to MediaSoup
  async produceScreenShare() {
    try {
      // Create send transport
      await this.createSendTransport();
      
      // Produce screen share tracks
      for (const track of this.screenStream.getTracks()) {
        await this.produceTrack(track, 'screen-share');
      }
      
      console.log('Screen share produced to MediaSoup');
    } catch (error) {
      console.error('Failed to produce screen share:', error);
      throw error;
    }
  }

  // Create send transport
  async createSendTransport() {
    return new Promise((resolve, reject) => {
      this.socket.emit('create-transport', {
        direction: 'send',
        roomId: this.roomId
      });
      
      // Wait for transport-created event
      const timeout = setTimeout(() => {
        reject(new Error('Transport creation timeout'));
      }, 10000);
      
      this.socket.once('transport-created', (data) => {
        clearTimeout(timeout);
        this.transports.set(data.id, data);
        resolve(data);
      });
    });
  }

  // Produce track to MediaSoup
  async produceTrack(track, appData = {}) {
    try {
      // Get send transport
      const sendTransport = Array.from(this.transports.values())[0];
      if (!sendTransport) {
        throw new Error('No send transport available');
      }
      
      // For now, just log that we would produce the track
      // The actual MediaSoup implementation needs to be done on the server side
      console.log(`Would produce track: ${track.kind}`, {
        transportId: sendTransport.id,
        trackKind: track.kind,
        trackId: track.id,
        appData
      });
      
      // TODO: Implement actual MediaSoup track production
      // This requires the server to handle the actual WebRTC transport
      
      return { id: `mock-producer-${Date.now()}` };
    } catch (error) {
      console.error('Failed to produce track:', error);
      throw error;
    }
  }

  // Stop screen sharing
  stopScreenShare() {
    if (this.screenStream) {
      try {
        this.screenStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.warn('Error stopping screen stream tracks:', error);
      }
      this.screenStream = null;
      console.log('Screen sharing stopped');
    }
  }

  // Toggle audio
  toggleAudio(enabled) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
        console.log(`Audio ${enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }

  // Toggle video
  toggleVideo(enabled) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
        console.log(`Video ${enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }

  // Get local stream
  getLocalStream() {
    return this.localStream;
  }

  // Get screen stream
  getScreenStream() {
    return this.screenStream;
  }

  // Create peer connection for a participant
  createPeerConnection(participantId) {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);
    
    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      if (this.onTrackCallback) {
        this.onTrackCallback(participantId, event.streams[0]);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to signaling server
        this.sendIceCandidate(participantId, event.candidate);
      }
    };

    this.peerConnections.set(participantId, peerConnection);
    return peerConnection;
  }

  // Create offer for peer connection
  async createOffer(participantId) {
    try {
      const peerConnection = this.createPeerConnection(participantId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      // Send offer to signaling server
      this.sendOffer(participantId, offer);
      
      return offer;
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  // Handle incoming offer
  async handleOffer(participantId, offer) {
    try {
      const peerConnection = this.createPeerConnection(participantId);
      await peerConnection.setRemoteDescription(offer);
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      // Send answer to signaling server
      this.sendAnswer(participantId, answer);
      
      return answer;
    } catch (error) {
      console.error('Failed to handle offer:', error);
      throw error;
    }
  }

  // Handle incoming answer
  async handleAnswer(participantId, answer) {
    try {
      const peerConnection = this.peerConnections.get(participantId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
        console.log('Remote description set for participant:', participantId);
      }
    } catch (error) {
      console.error('Failed to handle answer:', error);
      throw error;
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(participantId, candidate) {
    try {
      const peerConnection = this.peerConnections.get(participantId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
        console.log('ICE candidate added for participant:', participantId);
      }
    } catch (error) {
      console.error('Failed to handle ICE candidate:', error);
      throw error;
    }
  }

  // Send offer to signaling server (implement based on your backend)
  sendOffer(participantId, offer) {
    // TODO: Implement signaling server communication
    console.log('Sending offer to participant:', participantId, offer);
  }

  // Send answer to signaling server (implement based on your backend)
  sendAnswer(participantId, answer) {
    // TODO: Implement signaling server communication
    console.log('Sending answer to participant:', participantId, answer);
  }

  // Send ICE candidate to signaling server (implement based on your backend)
  sendIceCandidate(participantId, candidate) {
    // TODO: Implement signaling server communication
    console.log('Sending ICE candidate to participant:', participantId, candidate);
  }

  // Set callback for incoming tracks
  onTrack(callback) {
    this.onTrackCallback = callback;
  }

  // Set callback for participant updates
  onParticipantUpdate(callback) {
    this.onParticipantCallback = callback;
  }

  // Disconnect from all peers
  disconnect() {
    // Close all transports
    this.transports.forEach((transport) => {
      if (transport.close) {
        transport.close();
      }
    });
    
    // Close all producers
    this.producers.forEach((producer) => {
      if (producer.close) {
        producer.close();
      }
    });
    
    // Close all consumers
    this.consumers.forEach((consumer) => {
      if (consumer.close) {
        consumer.close();
      }
    });
    
    // Clear collections
    this.transports.clear();
    this.producers.clear();
    this.consumers.clear();
    
    // Stop local streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.stopScreenShare();
    
    // Disconnect from MediaSoup server
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    console.log('Media Soap Service disconnected');
  }

  // Get connection statistics
  async getConnectionStats() {
    const stats = {};
    
    for (const [participantId, connection] of this.peerConnections) {
      try {
        const connectionStats = await connection.getStats();
        stats[participantId] = connectionStats;
      } catch (error) {
        console.error(`Failed to get stats for participant ${participantId}:`, error);
      }
    }
    
    return stats;
  }

  // Check if service is connected
  isConnected() {
    return this.socket && this.socket.connected;
  }

  // Get current meeting ID
  getMeetingId() {
    return this.meetingId;
  }

  // Consume producer from MediaSoup
  async consumeProducer(producerId) {
    try {
      // Create receive transport
      await this.createReceiveTransport();
      
      // Get receive transport
      const receiveTransport = Array.from(this.transports.values()).find(t => t.direction === 'recv');
      if (!receiveTransport) {
        throw new Error('No receive transport available');
      }
      
      // Consume the producer
      this.socket.emit('consume', {
        transportId: receiveTransport.id,
        producerId,
        rtpCapabilities: this.rtpCapabilities,
        paused: false,
        roomId: this.roomId
      });
      
      console.log(`Consuming producer: ${producerId}`);
    } catch (error) {
      console.error('Failed to consume producer:', error);
      throw error;
    }
  }

  // Create receive transport
  async createReceiveTransport() {
    return new Promise((resolve, reject) => {
      this.socket.emit('create-transport', {
        direction: 'recv',
        roomId: this.roomId
      });
      
      // Wait for transport-created event
      const timeout = setTimeout(() => {
        reject(new Error('Transport creation timeout'));
      }, 10000);
      
      this.socket.once('transport-created', (data) => {
        clearTimeout(timeout);
        this.transports.set(data.id, data);
        resolve(data);
      });
    });
  }

  // Check if user is host
  isUserHost() {
    return this.isHost;
  }
}

// Create singleton instance
const mediaSoapService = new MediaSoapService();

export default mediaSoapService;
