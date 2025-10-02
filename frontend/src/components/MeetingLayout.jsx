import React, { useEffect, useState } from 'react';
import meetingWebSocketService from '../services/meetingWebSocket.js';
import { API_URL } from '../config.js';
import './MeetingLayout.css';

/**
 * MeetingLayout Component
 * Layout wrapper untuk meeting dengan screen share preview embedded dalam menu content
 */
const MeetingLayout = ({ 
  children, 
  meetingId, 
  userId, 
  userRole, 
  socket, 
  mediasoupDevice,
  className = '',
  meetingTitle = '' 
}) => {
  // Internal state for screen sharing
  const [screenShareError, setScreenShareError] = useState("");
  const [title, setTitle] = useState(meetingTitle || "");
  
  // Initialize WebSocket connection for meeting
  useEffect(() => {
    if (meetingId && userId) {
      // Store global reference for screen sharing
      if (typeof window !== 'undefined') {
        window.meetingWebSocketService = meetingWebSocketService;
      }

      // Connect to meeting WebSocket
      meetingWebSocketService.connect(meetingId, userId, API_URL);
      
      return () => {
        // Cleanup on unmount
        meetingWebSocketService.disconnect();
      };
    }
  }, [meetingId, userId]);

  return (
    <div className={`meeting-layout ${className}`}>
      {/* Screen Share Error Notification */}
      {screenShareError && (
        <div className="pd-error" style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          zIndex: 1000,
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          maxWidth: '300px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span>{screenShareError}</span>
            <button 
              onClick={() => setScreenShareError("")}
              style={{ 
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Meeting Title - Fixed at top left */}
      {meetingId && (
        <div className="meeting-title-container">
          <h2 className="meeting-title">{title || `Meeting #${meetingId}`}</h2>
        </div>
      )}

      {/* Menu Content - Always full width */}
      <div className="menu-section">
        {/* Menu content */}
        <div className="menu-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MeetingLayout;
