import React, { useState, useEffect, useRef } from 'react';
import simpleScreenShare from '../services/simpleScreenShare';
import './SimpleScreenShare.css';

/**
 * Simple Screen Share Component
 * Komponen screen sharing yang sederhana dan langsung
 */
const SimpleScreenShare = ({ 
  meetingId, 
  userId, 
  isSharing: externalIsSharing, 
  onSharingChange: externalOnSharingChange,
  onError: externalOnError 
}) => {
  // Use external state if provided, otherwise use internal state
  const [internalIsSharing, setInternalIsSharing] = useState(false);
  const [receivedStream, setReceivedStream] = useState(null);
  const [sharingUser, setSharingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const videoRef = useRef(null);
  const imageRef = useRef(null);

  // Determine which state to use
  const isSharing = externalIsSharing !== undefined ? externalIsSharing : internalIsSharing;
  const setIsSharing = externalOnSharingChange || setInternalIsSharing;
  const setError = externalOnError || (() => {});

  useEffect(() => {
    if (meetingId && userId) {
      // Only initialize if not already initialized
      if (!simpleScreenShare.meetingId || simpleScreenShare.meetingId !== meetingId) {
        console.log('Component: Initializing simpleScreenShare for meeting:', meetingId);
        initializeScreenShare();
      } else {
        console.log('Component: simpleScreenShare already initialized, just setting up listeners');
        // Just set up event listeners if already initialized
        setupEventListeners();
        // Sync current status from service in case we navigated away and back
        syncFromService();
      }
    }
    
    return () => {
      // Don't cleanup here as footer might still need it
      // simpleScreenShare.cleanup();
    };
  }, [meetingId, userId]);

  const setupEventListeners = () => {
    // Store original handlers to avoid overriding
    const originalOnStart = simpleScreenShare.onScreenShareStart;
    const originalOnStop = simpleScreenShare.onScreenShareStop;
    const originalOnReceived = simpleScreenShare.onScreenShareReceived;
    
    // Set up event handlers for component state
    simpleScreenShare.onScreenShareStart = (data) => {
      console.log('Component: Screen share started by:', data.userId);
      setSharingUser(data.userId);
      if (data.userId === userId) {
        setIsSharing(true);
      }
      // Call original handler if exists
      if (originalOnStart) {
        originalOnStart(data);
      }
    };
    
    simpleScreenShare.onScreenShareStop = (data) => {
      console.log('Component: Screen share stopped by:', data.userId);
      setSharingUser(null);
      setReceivedStream(null);
      if (data.userId === userId) {
        setIsSharing(false);
      }
      // Call original handler if exists
      if (originalOnStop) {
        originalOnStop(data);
      }
    };
    
    simpleScreenShare.onScreenShareReceived = (data) => {
      console.log('Component: Received screen share from:', data.userId);
      console.log('Component: Image data length:', data.imageData?.length || 0);
      
      // Update received stream with timestamp to force re-render
      setReceivedStream({
        ...data,
        timestamp: Date.now()
      });
      setSharingUser(data.userId);
      
      // Call original handler if exists
      if (originalOnReceived) {
        originalOnReceived(data);
      }
    };
  };

  const initializeScreenShare = async () => {
    await simpleScreenShare.initialize(meetingId, userId);
    setupEventListeners();
    // After init, reflect current service state (might already be sharing)
    syncFromService();
  };

  const syncFromService = () => {
    try {
      const currentlySharing = !!simpleScreenShare.isSharing;
      setIsSharing(currentlySharing);
      if (currentlySharing) {
        // If I am the sharer, show me; otherwise keep previous sharingUser until a frame arrives
        setSharingUser(simpleScreenShare.userId || userId);
      }
    } catch (e) {
      // no-op
    }
  };

  const handleStartShare = async () => {
    setIsLoading(true);
    try {
      const success = await simpleScreenShare.startScreenShare();
      if (success) {
        setIsSharing(true);
      } else {
        setError('Failed to start screen sharing');
      }
    } catch (error) {
      console.error('Failed to start screen share:', error);
      setError(error.message || 'Failed to start screen sharing');
    }
    setIsLoading(false);
  };

  const handleStopShare = () => {
    simpleScreenShare.stopScreenShare();
    setIsSharing(false);
  };

  // Update image when received stream changes
  useEffect(() => {
    console.log('Received stream changed:', receivedStream ? 'has data' : 'no data');
    if (receivedStream && imageRef.current) {
      console.log('Setting image src, imageData length:', receivedStream.imageData?.length || 0);
      imageRef.current.src = receivedStream.imageData;
      
      // Force image refresh
      imageRef.current.onload = () => {
        console.log('Image loaded successfully');
      };
      
      imageRef.current.onerror = (error) => {
        console.error('Error loading image:', error);
      };
    }
  }, [receivedStream]);

  // Always render to allow starting share from this page and show empty state

  return (
    <div className="simple-screen-share">
      <div className="screen-share-header">
        <h3>Screen Share</h3>
        <div className="screen-share-controls">
          {!isSharing ? (
            <button 
              onClick={handleStartShare}
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Starting...' : 'Start Share'}
            </button>
          ) : (
            <button 
              onClick={handleStopShare}
              className="btn btn-danger"
            >
              Stop Share
            </button>
          )}
        </div>
      </div>

      <div className="screen-share-content">
        {receivedStream ? (
          <div className="received-screen-share">
            <div className="share-info">
              <span className="live-indicator">🔴 LIVE</span>
              <span>
                {sharingUser === userId ? 'You are sharing' : `Sharing: ${sharingUser}`}
              </span>
            </div>
            <div className="video-container">
              <img
                ref={imageRef}
                className="screen-share-image"
                alt="Screen Share"
              />
            </div>
          </div>
        ) : (
          <div className="no-screen-share">
            <div className="empty-state">
              <div className="empty-icon">📺</div>
              <p>No screen share active</p>
              <small>Start sharing to see your screen here</small>
              <br />
              <small style={{ color: 'red' }}>Debug: receivedStream = {receivedStream ? 'true' : 'false'}</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleScreenShare;
