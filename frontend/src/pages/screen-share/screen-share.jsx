import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import mediaSoapService from "../../services/mediaSoapService";
import "./screen-share.css";

const ScreenShare = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [activeTab, setActiveTab] = useState("people");
  const [screenShareStatus, setScreenShareStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMediaSoupConnected, setIsMediaSoupConnected] = useState(false);
  const [mediaSoupStatus, setMediaSoupStatus] = useState('Connecting...');
  
  const videoRef = useRef(null);
  const screenRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  useEffect(() => {
    // Debug: Check if we're in Electron and API availability
    console.log('=== SCREEN SHARE COMPONENT MOUNTED ===');
    console.log('navigator.userAgent:', navigator.userAgent);
    console.log('window.electronAPI available:', !!window.electronAPI);
    
    if (window.electronAPI) {
      console.log('electronAPI object:', window.electronAPI);
      console.log('electronAPI.isElectron:', window.electronAPI.isElectron);
      console.log('electronAPI.platform:', window.electronAPI.platform);
      console.log('electronAPI.desktopCapturer available:', !!(window.electronAPI.desktopCapturer));
      
      // Test the API
      try {
        if (window.electronAPI.test) {
          const testResult = window.electronAPI.test();
          console.log('electronAPI.test() result:', testResult);
        }
      } catch (error) {
        console.error('electronAPI.test() failed:', error);
      }
    } else {
      console.warn('window.electronAPI is NOT available!');
      console.log('Available window properties:', Object.keys(window).filter(key => key.includes('electron')));
    }
    
    // Get user data from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const userInfo = JSON.parse(userData);
        setUser(userInfo);
      } catch (error) {
        console.error("Error parsing user data:", error);
        navigate("/");
      }
    } else {
      navigate("/");
    }

    // Initialize participants
    setParticipants([
      { id: 1, name: "A Alice Johnson", role: "participant", isMuted: false, isVideoOff: false },
      { id: 2, name: "B Bob Smith", role: "participant", isMuted: true, isVideoOff: false },
      { id: 3, name: "C Carol Wilson", role: "participant", isMuted: false, isVideoOff: true },
      { id: 4, name: "R Rohit Panjaitan", role: "host", isMuted: false, isVideoOff: false }
    ]);

    // Initialize MediaSoup connection
    const initializeMediaSoup = async () => {
      try {
        setMediaSoupStatus('Initializing MediaSoup...');
        const meetingId = userData ? JSON.parse(userData).id || 'default-meeting' : 'default-meeting';
        
        // Try to connect to MediaSoup server
        try {
          await mediaSoapService.initialize(meetingId, true);
          
          // Set up MediaSoup event handlers
          mediaSoapService.onParticipantUpdate((event, data) => {
            console.log('Participant update:', event, data);
            // Update participants list if needed
          });
          
          mediaSoapService.onTrack((producerId, stream) => {
            console.log('New track received:', producerId, stream);
            // Handle incoming media streams
          });
          
          setIsMediaSoupConnected(true);
          setMediaSoupStatus('Connected to MediaSoup');
          console.log('MediaSoup initialized successfully');
        } catch (mediaSoupError) {
          console.warn('MediaSoup connection failed, continuing without it:', mediaSoupError);
          setMediaSoupStatus('MediaSoup unavailable - local mode only');
          setIsMediaSoupConnected(false);
          // Continue without MediaSoup - local screen sharing will still work
        }
      } catch (error) {
        console.error('Failed to initialize MediaSoup:', error);
        setMediaSoupStatus('MediaSoup connection failed');
        setIsMediaSoupConnected(false);
      }
    };

    initializeMediaSoup();
  }, [navigate]);

  const handleEndMeeting = () => {
    // Stop all media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Disconnect from MediaSoup
    if (isMediaSoupConnected) {
      try {
        mediaSoapService.disconnect();
        console.log('Disconnected from MediaSoup');
      } catch (error) {
        console.error('Failed to disconnect from MediaSoup:', error);
      }
    }
    
    navigate("/dashboard");
  };

  const toggleAudio = async () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const newAudioState = !isAudioOn;
        audioTrack.enabled = newAudioState;
        setIsAudioOn(newAudioState);
        console.log(`Audio ${newAudioState ? 'enabled' : 'disabled'}`);
      }
    }
  };

  const toggleVideo = async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const newVideoState = !isVideoOn;
        videoTrack.enabled = newVideoState;
        setIsVideoOn(newVideoState);
        console.log(`Video ${newVideoState ? 'enabled' : 'disabled'}`);
      }
    }
  };

  const startScreenShare = async () => {
    setIsLoading(true);
    setScreenShareStatus('Starting screen share...');
    
    try {
      console.log('Starting screen share...');
      console.log('Browser info:', navigator.userAgent);
      console.log('Protocol:', location.protocol || window.location.protocol || 'undefined');
      console.log('Hostname:', location.hostname || window.location.hostname || 'undefined');
      
             // Declare isElectron and variables at the beginning
       const isElectron = navigator.userAgent.includes('Electron') || (window.electronAPI && window.electronAPI.isElectron);
       let stream;
       let errorDetails = [];
       
       console.log('Is Electron:', isElectron);
       console.log('window.electronAPI available:', !!window.electronAPI);
       console.log('window.electronAPI.desktopCapturer available:', !!(window.electronAPI && window.electronAPI.desktopCapturer));
       
       // Debug: Log all available APIs
       if (window.electronAPI) {
         console.log('electronAPI object:', window.electronAPI);
         console.log('electronAPI.platform:', window.electronAPI.platform);
         console.log('electronAPI.versions:', window.electronAPI.versions);
       }
      
      // Detailed browser detection
      const userAgent = navigator.userAgent;
      const isChrome = userAgent.includes('Chrome');
      const isFirefox = userAgent.includes('Firefox');
      const isEdge = userAgent.includes('Edge');
      const isSafari = userAgent.includes('Safari') && !isChrome;
      
      console.log('Browser detection:', { isChrome, isFirefox, isEdge, isSafari, isElectron });
      
      // Check if getDisplayMedia is supported
      const hasGetDisplayMedia = navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia;
      const hasLegacyAPI = navigator.getDisplayMedia;
      const hasUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      
      console.log('API availability:', { hasGetDisplayMedia, hasLegacyAPI, hasUserMedia });
      
      if (!hasGetDisplayMedia && !hasLegacyAPI) {
        alert('Screen sharing is not supported in this browser. Please use Chrome 72+, Firefox 66+, or Edge 79+.');
        return;
      }
      
      // For Electron, try multiple approaches
      if (isElectron) {
        console.log('Attempting Electron screen capture...');
        
                 // Method 1: Try desktopCapturer if available via electronAPI
         if (window.electronAPI && window.electronAPI.desktopCapturer && window.electronAPI.desktopCapturer.getSources) {
           try {
             console.log('Trying Electron desktopCapturer API via electronAPI...');
             console.log('Calling getSources with options...');
             
             const sources = await window.electronAPI.desktopCapturer.getSources({ 
               types: ['screen', 'window'],
               thumbnailSize: { width: 150, height: 150 }
             });
             
             console.log('Electron sources response:', sources);
             console.log('Electron sources found:', sources ? sources.length : 0);
             
             if (sources && sources.length > 0) {
               // Use the first screen source (preferably screen type)
               const screenSource = sources.find(s => s.id.startsWith('screen:')) || sources[0];
               console.log('Using Electron source:', screenSource.id, screenSource.name);
               
               // Try to get stream using the source ID with multiple constraint formats
               try {
                 // Method 1: Standard constraints
                 console.log('Trying standard Electron constraints...');
                 stream = await navigator.mediaDevices.getUserMedia({
                   audio: false,
                   video: {
                     mandatory: {
                       chromeMediaSource: 'desktop',
                       chromeMediaSourceId: screenSource.id,
                       minWidth: 1280,
                       maxWidth: 1920,
                       minHeight: 720,
                       maxHeight: 1080
                     }
                   }
                 });
                 console.log('Electron screen capture successful with standard constraints');
               } catch (electronError1) {
                 console.log('Standard Electron constraints failed:', electronError1.name, electronError1.message);
                 
                 // Method 2: Simplified constraints
                 try {
                   console.log('Trying simplified Electron constraints...');
                   stream = await navigator.mediaDevices.getUserMedia({
                     audio: false,
                     video: {
                       mandatory: {
                         chromeMediaSource: 'desktop',
                         chromeMediaSourceId: screenSource.id
                       }
                     }
                   });
                   console.log('Electron screen capture successful with simplified constraints');
                 } catch (electronError2) {
                   console.log('Simplified Electron constraints failed:', electronError2.name, electronError2.message);
                   errorDetails.push(`Electron getUserMedia (standard): ${electronError1.name} - ${electronError1.message}`);
                   errorDetails.push(`Electron getUserMedia (simplified): ${electronError2.name} - ${electronError2.message}`);
                 }
               }
             } else {
               console.log('No sources available from desktopCapturer');
               errorDetails.push('Electron desktopCapturer: No sources available');
             }
           } catch (electronError) {
             console.log('Electron desktopCapturer failed:', electronError.name, electronError.message);
             console.error('Full Electron error:', electronError);
             errorDetails.push(`Electron desktopCapturer: ${electronError.name} - ${electronError.message}`);
           }
         } else {
           console.log('Electron desktopCapturer API not available');
           console.log('Available APIs:', {
             electronAPI: !!window.electronAPI,
             desktopCapturer: !!(window.electronAPI && window.electronAPI.desktopCapturer),
             getSources: !!(window.electronAPI && window.electronAPI.desktopCapturer && window.electronAPI.desktopCapturer.getSources)
           });
           errorDetails.push('Electron desktopCapturer: API not exposed properly');
           
           // CRITICAL: Try direct getDisplayMedia from electronAPI if available
           if (window.electronAPI && window.electronAPI.getDisplayMedia) {
             try {
               console.log('Trying direct getDisplayMedia from electronAPI...');
               stream = await window.electronAPI.getDisplayMedia({
                 video: true,
                 audio: false
               });
               console.log('Direct getDisplayMedia from electronAPI successful');
             } catch (directError) {
               console.log('Direct getDisplayMedia from electronAPI failed:', directError.name, directError.message);
               errorDetails.push(`Direct getDisplayMedia: ${directError.name} - ${directError.message}`);
             }
           }
         }
        
        // Method 2: Try standard getDisplayMedia for Electron (fallback)
        if (!stream && hasGetDisplayMedia) {
          try {
            console.log('Trying standard getDisplayMedia in Electron...');
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: false
            });
            console.log('Electron getDisplayMedia successful');
          } catch (electronError) {
            console.log('Electron getDisplayMedia failed:', electronError.name, electronError.message);
            errorDetails.push(`Electron getDisplayMedia: ${electronError.name} - ${electronError.message}`);
          }
        }
      }

      // Check if we're on HTTPS or localhost (required for screen sharing)
      // Handle cases where protocol/hostname might be undefined (Electron environment)
      const protocol = location.protocol || window.location.protocol || 'http:';
      const hostname = location.hostname || window.location.hostname || 'localhost';
      
      console.log('Protocol check:', protocol);
      console.log('Hostname check:', hostname);
      console.log('Is Electron:', isElectron);
     
     // In Electron environment, allow screen sharing regardless of protocol
     if (isElectron) {
       console.log('Running in Electron - allowing screen sharing');
     } else if (protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
       alert('Screen sharing requires HTTPS or localhost. Please use HTTPS or localhost.');
       return;
     }

     // Only try browser methods if not Electron or if Electron methods failed
     if (!isElectron || !stream) {
       try {
         console.log('Attempting to get display media with advanced options...');
         stream = await navigator.mediaDevices.getDisplayMedia({
           video: {
             mediaSource: 'screen',
             width: { ideal: 1920 },
             height: { ideal: 1080 }
           },
           audio: true
         });
         console.log('Display media obtained with advanced options');
       } catch (fallbackError) {
       console.log('First attempt failed:', fallbackError.name, fallbackError.message);
       errorDetails.push(`Advanced: ${fallbackError.name} - ${fallbackError.message}`);
       
       // Try with simpler options if the first attempt fails
       try {
         console.log('Trying with simple options...');
         stream = await navigator.mediaDevices.getDisplayMedia({
           video: true,
           audio: true
         });
         console.log('Display media obtained with simple options');
       } catch (secondError) {
         console.log('Second attempt failed:', secondError.name, secondError.message);
         errorDetails.push(`Simple: ${secondError.name} - ${secondError.message}`);
         
         // Try with video only (no audio)
         try {
           console.log('Trying with video only...');
           stream = await navigator.mediaDevices.getDisplayMedia({
             video: true,
             audio: false
           });
           console.log('Display media obtained with video only');
         } catch (thirdError) {
           console.log('Third attempt failed:', thirdError.name, thirdError.message);
           errorDetails.push(`Video only: ${thirdError.name} - ${thirdError.message}`);
           
           // Try legacy API as last resort
           if (navigator.getDisplayMedia) {
             try {
               console.log('Trying legacy API...');
               stream = await navigator.getDisplayMedia({
                 video: true,
                 audio: false
               });
               console.log('Display media obtained with legacy API');
             } catch (legacyError) {
               console.log('Legacy API failed:', legacyError.name, legacyError.message);
               errorDetails.push(`Legacy: ${legacyError.name} - ${legacyError.message}`);
               throw new Error(`All screen sharing methods failed:\n${errorDetails.join('\n')}`);
             }
           } else {
             throw new Error(`All screen sharing methods failed:\n${errorDetails.join('\n')}`);
           }
         }
       }
     }
     }
     
     // Final fallback: Try to use camera as placeholder if no screen sharing works
     if (!stream && hasUserMedia) {
       try {
         console.log('Final fallback: Trying camera as placeholder...');
         stream = await navigator.mediaDevices.getUserMedia({
           video: true,
           audio: true
         });
         console.log('Camera fallback successful - using camera instead of screen');
         alert('Screen sharing not available. Using camera instead. You may need to enable screen sharing permissions or use a different browser.');
       } catch (cameraError) {
         console.log('Camera fallback failed:', cameraError.name, cameraError.message);
         errorDetails.push(`Camera fallback: ${cameraError.name} - ${cameraError.message}`);
       }
     }
    
    if (!stream) {
      throw new Error('No stream received');
    }

    screenStreamRef.current = stream;
    console.log('Setting isScreenSharing to true');
    setIsScreenSharing(true);
    setScreenShareStatus('Screen sharing active');
    setIsLoading(false);
    
    // Debug: Log stream info
    console.log('Stream tracks:', stream.getTracks());
    console.log('Video tracks:', stream.getVideoTracks());
    console.log('Audio tracks:', stream.getAudioTracks());
    
    if (screenRef.current) {
      console.log('Setting video srcObject:', stream);
      screenRef.current.srcObject = stream;
      
      // Force video to load and play
      screenRef.current.onloadedmetadata = () => {
        console.log('Video metadata loaded');
        screenRef.current.play().catch(e => console.log('Auto-play failed:', e));
      };
      
      screenRef.current.onplay = () => {
        console.log('Video started playing');
      };
      
      screenRef.current.onerror = (e) => {
        console.error('Video error:', e);
      };
    } else {
      console.error('screenRef.current is null!');
    }
    
    // Handle when user stops screen sharing
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        console.log('Screen sharing ended by user');
        stopScreenShare();
      };
    }
    
    // Send screen share to MediaSoup if connected
    if (isMediaSoupConnected) {
      try {
        console.log('Sending screen share to MediaSoup server...');
        await mediaSoapService.startScreenShare();
        console.log('Screen share sent to MediaSoup server successfully');
      } catch (error) {
        console.error('Failed to send screen share to MediaSoup:', error);
        // Continue with local display even if MediaSoup fails
      }
    } else {
      console.log('MediaSoup not connected, skipping server sync');
    }
    
    console.log('Screen sharing started successfully');
    console.log('Final state check:');
    console.log('- isScreenSharing:', isScreenSharing);
    console.log('- screenRef.current:', screenRef.current);
    console.log('- screenStreamRef.current:', screenStreamRef.current);
    console.log('- screenRef.current.srcObject:', screenRef.current?.srcObject);
    } catch (error) {
      setIsLoading(false);
      setScreenShareStatus('Screen sharing failed');
      console.error("Error starting screen share:", error);
      
      // More specific error handling
      if (error.name === 'NotAllowedError') {
        alert('Screen sharing permission denied. Please allow screen sharing when prompted and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No screen or window selected for sharing. Please select a screen or window and try again.');
      } else if (error.name === 'NotSupportedError') {
        alert('Screen sharing is not supported in this browser or context. Please use a different browser.');
      } else if (error.name === 'AbortError') {
        alert('Screen sharing was cancelled. Please try again.');
      } else if (error.message.includes('HTTPS')) {
        alert('Screen sharing requires a secure connection (HTTPS). Please use HTTPS or localhost.');
      } else if (error.message.includes('All screen sharing methods failed')) {
        console.error('Detailed error info:', error);
        alert(`Screen sharing failed: ${error.message}\n\nPlease check:\n1. Screen sharing permissions\n2. Browser compatibility\n3. Try refreshing the page`);
      } else {
        alert(`Screen sharing failed: ${error.message || 'Unknown error'}. Please try again.`);
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    setScreenShareStatus('');
    
    if (screenRef.current) {
      screenRef.current.srcObject = null;
    }
    
    // Stop MediaSoup screen share if connected
    if (isMediaSoupConnected) {
      try {
        mediaSoapService.stopScreenShare();
        console.log('MediaSoup screen share stopped');
      } catch (error) {
        console.error('Failed to stop MediaSoup screen share:', error);
      }
    }
    
    console.log('Screen sharing stopped');
  };

  const startLocalMedia = async () => {
    try {
      // Request camera and microphone access directly
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      setIsVideoOn(true);
      setIsAudioOn(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      console.log('Local media started successfully');
    } catch (error) {
      console.error("Error starting local media:", error);
      alert('Failed to access camera/microphone. Please check permissions.');
    }
  };

  useEffect(() => {
    // Start local media when component mounts
    startLocalMedia();

    return () => {
      // Cleanup media streams when component unmounts
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Debug useEffect for screen sharing state
  useEffect(() => {
    console.log('isScreenSharing changed:', isScreenSharing);
    console.log('screenRef.current:', screenRef.current);
    console.log('screenStreamRef.current:', screenStreamRef.current);
  }, [isScreenSharing]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="conference-container">
      {/* Top Header */}
      <header className="conference-header">
        <div className="header-left">
          <h1 className="conference-title">Conference Meeting</h1>
          <div className="meeting-info">
            <span className="host-badge">Host</span>
            <span className="meeting-id">ID: abcdefg</span>
          </div>
        </div>
        <button onClick={handleEndMeeting} className="end-meeting-btn">
          <span className="end-icon">📞</span>
          End Meeting
        </button>
      </header>

      {/* Main Content Area */}
      <div className="conference-main">
        <div className="main-content">
          {console.log('Rendering main content, isScreenSharing:', isScreenSharing)}
          
          {/* Debug info */}
          <div style={{position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', borderRadius: '5px', fontSize: '12px', zIndex: 1000}}>
            Debug: isScreenSharing = {String(isScreenSharing)}<br/>
            screenRef exists: {String(!!screenRef.current)}<br/>
            stream exists: {String(!!screenStreamRef.current)}
          </div>
          
          {isScreenSharing ? (
            <div className="screen-share-container">
              <video
                ref={screenRef}
                autoPlay
                playsInline
                className="screen-video"
                controls
                key="screen-video"
              />
              <div className="screen-share-info">
                <span className="status-badge active">● Live Screen Sharing</span>
              </div>
            </div>
          ) : (
            <div className="no-screen-share">
              <div className="monitor-icon">🖥️</div>
              <h2>No Screen Share</h2>
              <p>Click 'Share Screen' to start presenting</p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="conference-sidebar">
          {/* Tabs */}
          <div className="sidebar-tabs">
            <button
              className={`tab ${activeTab === "people" ? "active" : ""}`}
              onClick={() => setActiveTab("people")}
            >
              People
            </button>
            <button
              className={`tab ${activeTab === "files" ? "active" : ""}`}
              onClick={() => setActiveTab("files")}
            >
              Files
            </button>
            <button
              className={`tab ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              Chat
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === "people" && (
              <div className="participants-section">
                <h3>Participants ({participants.length})</h3>
                <div className="participants-list">
                  {participants.map((participant) => (
                    <div key={participant.id} className="participant-item">
                      <span className="participant-name">{participant.name}</span>
                      <div className="participant-status">
                        {participant.isMuted && <span className="muted-icon">🔇</span>}
                        {participant.isVideoOff && <span className="video-off-icon">📹</span>}
                        {participant.role === "host" && <span className="host-tag">Host</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === "files" && (
              <div className="files-section">
                <h3>Shared Files</h3>
                <p>No files shared yet</p>
              </div>
            )}
            
            {activeTab === "chat" && (
              <div className="chat-section">
                <h3>Meeting Chat</h3>
                <p>No messages yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="control-bar">
        <button
          onClick={toggleAudio}
          className={`control-btn ${!isAudioOn ? "muted" : ""}`}
        >
          {isAudioOn ? "🎤" : "🔇"}
        </button>
        
        <button
          onClick={toggleVideo}
          className={`control-btn ${!isVideoOn ? "muted" : ""}`}
        >
          {isVideoOn ? "📹" : "📷"}
        </button>
        
        <button
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          className={`control-btn primary ${isScreenSharing ? 'sharing' : ''} ${isLoading ? 'loading' : ''}`}
          title={isScreenSharing ? "Click to stop screen sharing" : "Click to start screen sharing"}
          disabled={isLoading}
        >
          {isLoading ? "⏳ Starting..." : isScreenSharing ? "🖥️ Stop Sharing" : "🖥️ Share Screen"}
        </button>
        
        <button className="control-btn primary">
          ✏️ Annotate
        </button>
        
        {/* MediaSoup Connection Status */}
        <div className="mediasoup-status">
          <span className={`status-dot ${isMediaSoupConnected ? 'connected' : 'disconnected'}`}>
            ●
          </span>
          <span className="status-text">
            {isMediaSoupConnected ? 'MediaSoup' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      {/* Screen Share Status */}
      {screenShareStatus && (
        <div className="screen-share-status">
          <span className={`status-indicator ${isScreenSharing ? 'active' : 'error'}`}>
            {isScreenSharing ? '●' : '●'}
          </span>
          {screenShareStatus}
        </div>
      )}
      
      {/* MediaSoup Status */}
      {mediaSoupStatus && (
        <div className="mediasoup-status-bar">
          <span className={`status-dot ${isMediaSoupConnected ? 'connected' : 'disconnected'}`}>
            ●
          </span>
          <span className="status-text">{mediaSoupStatus}</span>
        </div>
      )}

      {/* Local Video Preview */}
      <div className="local-video-preview">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="local-video"
        />
      </div>
    </div>
  );
}

export default ScreenShare;
