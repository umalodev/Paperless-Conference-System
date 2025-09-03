// src/pages/menu/participants.jsx
import React, { useEffect, useMemo, useState } from "react";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import "./participant.css";
import { API_URL } from "../../../config.js";
import { useNavigate } from "react-router-dom";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import SimpleScreenShare from "../../../components/SimpleScreenShare.jsx";
import simpleScreenShare from "../../../services/simpleScreenShare.js";

export default function ParticipantsPage() {
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  const [query, setQuery] = useState("");
  const [participants, setParticipants] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errList, setErrList] = useState("");

  // Screen share state - initialize from service if already sharing
  const [screenShareOn, setScreenShareOn] = useState(() => {
    // Check if screen sharing is already active from service
    return simpleScreenShare.isSharing || false;
  });

  const navigate = useNavigate();

  // meetingId dari localStorage
  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || null;
    } catch {
      return null;
    }
  }, []);

  // Sync screen share state with service on mount
  useEffect(() => {
    if (meetingId && user?.id) {
      // Sync state with service to maintain state across page navigation
      setScreenShareOn(simpleScreenShare.isSharing || false);
    }
  }, [meetingId, user?.id]);

  // Screen share handlers
  const handleToggleScreenShare = async () => {
    if (screenShareOn) {
      setScreenShareOn(false);
    } else {
      try {
        const success = await simpleScreenShare.startScreenShare();
        if (success) {
          setScreenShareOn(true);
        }
      } catch (error) {
        console.error('Failed to start screen sharing:', error);
      }
    }
  };

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // Ambil menu bottom-nav dari API (sama dengan dashboard)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
        setErrMenus("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json?.data)
          ? json.data.map((m) => ({
              slug: m.slug,
              label: m.displayLabel,
              iconUrl: m.iconMenu || null,
              flag: m.flag ?? "Y",
            }))
          : [];
        if (!cancel) setMenus(list);
      } catch (e) {
        if (!cancel) setErrMenus(String(e.message || e));
      } finally {
        if (!cancel) setLoadingMenus(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Ambil data participant dari database
  useEffect(() => {
    let cancel = false;
    
    const loadParticipants = async () => {
      try {
        setLoadingList(true);
        setErrList("");
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Try to get participants with status "joined" from database first
        let res = await fetch(`${API_URL}/api/participants/joined`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        // If joined endpoint fails, fallback to test-data endpoint
        if (!res.ok) {
          console.log('Joined endpoint failed, trying test-data endpoint...');
          res = await fetch(`${API_URL}/api/participants/test-data`, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        
        if (!cancel) {
          if (json.success) {
            setParticipants(json.data || []);
          } else {
            setErrList(json.message || 'Failed to load participants');
          }
        }
      } catch (e) {
        if (!cancel) {
          console.error('Error loading participants:', e);
          setErrList(String(e.message || e));
        }
      } finally {
        if (!cancel) setLoadingList(false);
      }
    };

    // Load participants immediately
    loadParticipants();

    // Set up polling every 5 seconds to refresh participant data
    const interval = setInterval(loadParticipants, 5000);

    return () => {
      cancel = true;
      clearInterval(interval);
    };
  }, []);

  const visibleMenus = useMemo(
    () => (menus || []).filter((m) => (m?.flag ?? "Y") === "Y"),
    [menus]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        (p.seat || "").toLowerCase().includes(q)
    );
  }, [participants, query]);

  const totals = useMemo(() => {
    const total = participants.length;
    const micOn = participants.filter((p) => p.mic).length;
    const camOn = participants.filter((p) => p.cam).length;
    const hands = participants.filter((p) => p.hand).length;
    return { total, micOn, camOn, hands };
  }, [participants]);

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  // Function to update participant status
  const updateParticipantStatus = async (participantId, updates) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Map frontend properties to database fields
      const dbUpdates = {};
      if (updates.mic !== undefined) dbUpdates.isAudioEnabled = updates.mic;
      if (updates.cam !== undefined) dbUpdates.isVideoEnabled = updates.cam;
      if (updates.isScreenSharing !== undefined) dbUpdates.isScreenSharing = updates.isScreenSharing;

      const res = await fetch(`${API_URL}/api/participants/${participantId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dbUpdates)
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      
      if (json.success) {
        // Update local state
        setParticipants(prev => prev.map(p => 
          p.id === participantId ? { ...p, ...updates } : p
        ));
      } else {
        console.error('Failed to update participant status:', json.message);
      }
    } catch (error) {
      console.error('Error updating participant status:', error);
    }
  };

  // Function to handle mic toggle
  const handleMicToggle = (participantId, currentStatus) => {
    updateParticipantStatus(participantId, { mic: !currentStatus });
  };

  // Function to handle camera toggle
  const handleCameraToggle = (participantId, currentStatus) => {
    updateParticipantStatus(participantId, { cam: !currentStatus });
  };

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || 'participant'}
      socket={null} // Will be set when socket is integrated
      mediasoupDevice={null} // MediaSoup will be auto-initialized by simpleScreenShare
    >
      <div className="pd-app">
        {/* Top bar */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">Participants</h1>
              <div className="pd-sub">Manage attendees & seats</div>
            </div>
          </div>
          <div className="pd-right">
            <div className="pd-clock" aria-live="polite">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          <div className="pd-user">
            <div className="pd-avatar">
              {(user?.username || "US").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="pd-user-name">
                {user?.username || "Participant"}
              </div>
              <div className="pd-user-role">Participant</div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pd-main">
        {/* Simple Screen Share */}
        <SimpleScreenShare 
          meetingId={meetingId} 
          userId={user?.id}
          isSharing={screenShareOn}
          onSharingChange={setScreenShareOn}
          onError={(error) => console.error('Screen share error:', error)}
        />
        
        <section className="prt-wrap">
          <div className="prt-header">
            <div className="prt-search">
              <span className="prt-search-icon">
                <Icon slug="search" />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, role, or seat…"
                aria-label="Search participants"
              />
            </div>
            <div className="prt-actions">
              <button className="prt-btn" title="Invite">
                <Icon slug="invite" />
                <span>Invite</span>
              </button>
              <button className="prt-btn ghost" title="Sort">
                <Icon slug="sort" />
                <span>Sort</span>
              </button>
            </div>
          </div>

          <div className="prt-summary">
            <div className="prt-card">
              <div className="prt-card-icon">
                <Icon slug="users" />
              </div>
              <div>
                <div className="prt-card-title">{totals.total}</div>
                <div className="prt-card-sub">Total</div>
              </div>
            </div>
            <div className="prt-card">
              <div className="prt-card-icon">
                <Icon slug="mic" />
              </div>
              <div>
                <div className="prt-card-title">{totals.micOn}</div>
                <div className="prt-card-sub">Mic On</div>
              </div>
            </div>
            <div className="prt-card">
              <div className="prt-card-icon">
                <Icon slug="camera" />
              </div>
              <div>
                <div className="prt-card-title">{totals.camOn}</div>
                <div className="prt-card-sub">Cam On</div>
              </div>
            </div>
            <div className="prt-card">
              <div className="prt-card-icon">
                <Icon slug="hand" />
              </div>
              <div>
                <div className="prt-card-title">{totals.hands}</div>
                <div className="prt-card-sub">Raised</div>
              </div>
            </div>
          </div>

          {/* List peserta */}
          {loadingList && <div className="pd-empty">Loading participants…</div>}
          {errList && !loadingList && (
            <div className="pd-error">Gagal memuat peserta: {errList}</div>
          )}

          {!loadingList && !errList && (
            <div className="prt-grid">
              {filtered.map((p) => (
                <div key={p.id} className="prt-item">
                  <div className="prt-avatar">
                    {(p.name || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="prt-info">
                    <div className="prt-name">{p.name}</div>
                    <div className="prt-meta">
                      <span className="prt-role">{p.role}</span>
                      {p.seat && <span className="prt-sep">•</span>}
                      {p.seat && (
                        <span className="prt-seat">Seat {p.seat}</span>
                      )}
                    </div>
                    {p.joinTime && (
                      <div className="prt-join-time">
                        Joined: {new Date(p.joinTime).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  <div className="prt-status">
                    <button
                      className={`prt-pill ${p.mic ? "on" : "off"}`}
                      title={p.mic ? "Mic On - Click to turn off" : "Mic Off - Click to turn on"}
                      onClick={() => handleMicToggle(p.id, p.mic)}
                    >
                      <Icon slug="mic" />
                    </button>
                    <button
                      className={`prt-pill ${p.cam ? "on" : "off"}`}
                      title={p.cam ? "Camera On - Click to turn off" : "Camera Off - Click to turn on"}
                      onClick={() => handleCameraToggle(p.id, p.cam)}
                    >
                      <Icon slug="camera" />
                    </button>
                    {p.hand && (
                      <span className="prt-pill on" title="Hand raised">
                        <Icon slug="hand" />
                      </span>
                    )}
                  </div>
                  <div className="prt-actions-right">
                    <button className="prt-act" title="Pin">
                      <Icon slug="pin" />
                    </button>
                    <button className="prt-act" title="More">
                      <Icon slug="dots" />
                    </button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && participants.length === 0 && (
                <div className="pd-empty" style={{ gridColumn: "1 / -1" }}>
                  Tidak ada peserta yang sedang bergabung dalam meeting saat ini.
                </div>
              )}

              {filtered.length === 0 && participants.length > 0 && (
                <div className="pd-empty" style={{ gridColumn: "1 / -1" }}>
                  Tidak ada peserta yang cocok dengan pencarian.
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Bottom nav dari DB */}
      {!loadingMenus && !errMenus && (
        <BottomNav
          items={visibleMenus}
          active="participants"
          onSelect={handleSelectNav}
        />
      )}

        <MeetingFooter
          showEndButton={true}
          onMenuClick={() => console.log("open menu")}
          screenShareOn={screenShareOn}
          onToggleScreenShare={handleToggleScreenShare}
        />


      </div>
    </MeetingLayout>
  );
}
