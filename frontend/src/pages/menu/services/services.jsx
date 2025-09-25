import React, { useEffect, useMemo, useState, useCallback } from "react";
import BottomNav from "../../../components/BottomNav";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../../config";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import "./services.css";
import meetingService from "../../../services/meetingService.js";
import { useMediaRoom } from "../../../contexts/MediaRoomContext.jsx";

export default function Services() {
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");
  const navigate = useNavigate();

  // Services state
  const [selectedService, setSelectedService] = useState(null);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [note, setNote] = useState("");

  // Backend data
  const [myRequests, setMyRequests] = useState([]);
  const [teamRequests, setTeamRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(false);
  const [errReq, setErrReq] = useState("");
  const [busyId, setBusyId] = useState(null); // track in-flight action per row

  // Load user + menus
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}

    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
        setErrMenus("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          headers: meetingService.getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json?.data)
          ? json.data.map((m) => ({
              slug: m.slug,
              label: m.displayLabel,
              flag: m.flag ?? "Y",
              iconUrl: m.iconMenu || null,
              seq: m.sequenceMenu,
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

  const {
    ready: mediaReady,
    micOn,
    camOn,
    startMic,
    stopMic,
    startCam,
    stopCam,
  } = useMediaRoom();

  const onToggleMic = useCallback(() => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  }, [mediaReady, micOn, startMic, stopMic]);

  const onToggleCam = useCallback(() => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  }, [mediaReady, camOn, startCam, stopCam]);

  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );
  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  const quickOptions = [
    { key: "staff_assist", label: "Staff Assist", icon: "🧑‍💼" },
    { key: "mineral", label: "Mineral/Tea", icon: "🥤" },
    { key: "coffee", label: "Coffee", icon: "☕" },
    { key: "clean", label: "Clean Up", icon: "🧹" },
  ];

  const onQuickSelect = (opt) => setSelectedService(opt);
  const canSend = !!selectedService && name.trim().length > 0;

  // meetingId: sesuaikan
  const resolveMeetingId = () => {
    const fromLS = Number(localStorage.getItem("currentMeetingId") || 0);
    return fromLS || 1000;
  };

  const isAssist = String(user?.role || "").toLowerCase() === "assist";

  // Load requests
  const loadRequests = useCallback(async () => {
    if (!user) return;
    setLoadingReq(true);
    setErrReq("");
    try {
      const headers = meetingService.getAuthHeaders();
      const meetingId = resolveMeetingId();

      if (isAssist) {
        const res = await fetch(
          `${API_URL}/api/services/meeting/${meetingId}`,
          {
            headers,
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : [];
        const others = rows.filter(
          (r) => r.requesterUserId !== (user?.id || user?.userId)
        );
        setTeamRequests(others);
        setMyRequests([]);
      } else {
        const me = user?.id || user?.userId;
        if (me) {
          const res = await fetch(
            `${API_URL}/api/services?requesterUserId=${me}&sortBy=created_at&sortDir=DESC`,
            { headers }
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          setMyRequests(Array.isArray(json?.data) ? json.data : []);
        } else {
          setMyRequests([]);
        }
        setTeamRequests([]);
      }
    } catch (e) {
      setErrReq(String(e.message || e));
    } finally {
      setLoadingReq(false);
    }
  }, [user, isAssist]);

  useEffect(() => {
    loadRequests();
    // Polling untuk sinkron status di kedua sisi
    const intervalMs = 10000;
    const t = setInterval(loadRequests, intervalMs);
    return () => clearInterval(t);
  }, [loadRequests]);

  // Create request
  const onSend = async () => {
    if (!canSend || !user) return;
    const meetingId = resolveMeetingId();
    const body = {
      meetingId,
      serviceKey: selectedService.key,
      serviceLabel: selectedService.label,
      name: name.trim(),
      priority,
      note: note.trim() || null,
    };
    try {
      const res = await fetch(`${API_URL}/api/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      setName("");
      setNote("");
      setSelectedService(null);
      await loadRequests();
    } catch (e) {
      alert(`Failed to send request: ${String(e.message || e)}`);
    }
  };

  // ---- Assist actions ----
  const doAssign = async (id) => {
    setBusyId(id);
    try {
      const res = await fetch(`${API_URL}/api/services/${id}/assign`, {
        method: "POST",
        headers: meetingService.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      await loadRequests();
    } catch (e) {
      alert(`Assign failed: ${String(e.message || e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const doUpdateStatus = async (id, status) => {
    setBusyId(id);
    try {
      const res = await fetch(`${API_URL}/api/services/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      await loadRequests();
    } catch (e) {
      alert(`Update failed: ${String(e.message || e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const doCancel = async (id) => {
    setBusyId(id);
    try {
      const res = await fetch(`${API_URL}/api/services/${id}/cancel`, {
        method: "POST",
        headers: meetingService.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      await loadRequests();
    } catch (e) {
      alert(`Cancel failed: ${String(e.message || e)}`);
    } finally {
      setBusyId(null);
    }
  };

  // UI helpers
  const iconFor = (key) =>
    key === "coffee"
      ? "☕"
      : key === "mineral"
      ? "🥤"
      : key === "clean"
      ? "🧹"
      : key === "staff_assist"
      ? "🧑‍💼"
      : "🔔";

  const StatusBadge = ({ status }) => (
    <em className={`svc-status svc-status--${status}`}>{status}</em>
  );

  return (
    <MeetingLayout
      meetingId={resolveMeetingId()}
      userId={user?.id || user?.userId || null}
      userRole={user?.role || "participant"}
    >
      <div className="pd-app">
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">Services</h1>
              <div className="pd-sub">
                {isAssist
                  ? "Assist console — handle participants' requests"
                  : "Request assistance during the session"}
              </div>
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
                <div className="pd-user-role">
                  {user?.role || "Participant"}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="pd-main">
          <div className="svc-grid">
            {/* LEFT COLUMN */}
            <section className="svc-card svc-recent">
              {isAssist ? (
                <>
                  <div className="svc-card-title">All requests (others)</div>
                  {loadingReq && <div className="pd-empty">Loading...</div>}
                  {errReq && <div className="pd-empty">Error: {errReq}</div>}
                  {!loadingReq && !errReq && teamRequests.length === 0 && (
                    <div className="pd-empty" style={{ padding: 12 }}>
                      No requests
                    </div>
                  )}
                  {!loadingReq &&
                    !errReq &&
                    teamRequests.map((r) => (
                      <div key={r.serviceRequestId} className="svc-row">
                        <div
                          className="svc-recent-item"
                          title={r.note || undefined}
                        >
                          <span className="svc-recent-icon" aria-hidden>
                            {iconFor(r.serviceKey)}
                          </span>
                          <span className="svc-recent-text">
                            <strong>{r.serviceLabel}</strong>
                            <span>
                              {r.name} — {r.priority} —{" "}
                              <StatusBadge status={r.status} />
                            </span>
                          </span>
                        </div>
                        <div className="svc-actions">
                          {(!r.handledByUserId || r.status === "pending") && (
                            <button
                              className="svc-btn"
                              disabled={busyId === r.serviceRequestId}
                              onClick={() => doAssign(r.serviceRequestId)}
                              title="Assign to me"
                            >
                              Assign
                            </button>
                          )}
                          {r.status === "pending" && (
                            <button
                              className="svc-btn"
                              disabled={busyId === r.serviceRequestId}
                              onClick={() =>
                                doUpdateStatus(r.serviceRequestId, "accepted")
                              }
                              title="Accept"
                            >
                              Accept
                            </button>
                          )}
                          {r.status === "accepted" && (
                            <button
                              className="svc-btn"
                              disabled={busyId === r.serviceRequestId}
                              onClick={() =>
                                doUpdateStatus(r.serviceRequestId, "done")
                              }
                              title="Mark as done"
                            >
                              Done
                            </button>
                          )}
                          {r.status !== "done" && r.status !== "cancelled" && (
                            <button
                              className="svc-btn svc-btn--danger"
                              disabled={busyId === r.serviceRequestId}
                              onClick={() => doCancel(r.serviceRequestId)}
                              title="Cancel request"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </>
              ) : (
                <>
                  <div className="svc-card-title">My Requests</div>
                  {loadingReq && <div className="pd-empty">Loading...</div>}
                  {errReq && <div className="pd-empty">Error: {errReq}</div>}
                  {!loadingReq && !errReq && myRequests.length === 0 && (
                    <div className="pd-empty" style={{ padding: 12 }}>
                      No requests
                    </div>
                  )}
                  {!loadingReq &&
                    !errReq &&
                    myRequests.map((r) => (
                      <div
                        key={r.serviceRequestId}
                        className="svc-recent-item"
                        title={r.note || undefined}
                      >
                        <span className="svc-recent-icon" aria-hidden>
                          {iconFor(r.serviceKey)}
                        </span>
                        <span className="svc-recent-text">
                          <strong>{r.serviceLabel}</strong>
                          <span>
                            {r.name} — {r.priority} —{" "}
                            <StatusBadge status={r.status} />
                          </span>
                        </span>
                      </div>
                    ))}
                </>
              )}
            </section>

            {/* RIGHT COLUMN */}
            {!isAssist && (
              <section className="svc-card svc-main">
                <div className="svc-card-title">Quick services</div>
                <div className="svc-quick">
                  {quickOptions.map((q) => (
                    <button
                      key={q.key}
                      className={`svc-quick-btn ${
                        selectedService?.key === q.key ? "is-active" : ""
                      }`}
                      onClick={() => onQuickSelect(q)}
                      title={q.label}
                    >
                      <span className="svc-quick-icon">{q.icon}</span>
                      <span className="svc-quick-label">{q.label}</span>
                    </button>
                  ))}
                </div>

                <div className="svc-form">
                  <div className="svc-form-title">Request</div>
                  <div className="svc-form-field">
                    <label>Service</label>
                    <input
                      className="svc-input"
                      readOnly
                      value={selectedService ? selectedService.label : ""}
                      placeholder="Select service from quick menu"
                    />
                  </div>
                  <div className="svc-form-row">
                    <div className="svc-form-field flex-1">
                      <label>Name (required)</label>
                      <input
                        className="svc-input"
                        placeholder="e.g., Seat 12"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!selectedService}
                      />
                    </div>
                    <div className="svc-form-field svc-priority">
                      <label>Priority</label>
                      <select
                        className="svc-input"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        disabled={!selectedService}
                      >
                        <option value="Low">Low</option>
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                  <div className="svc-form-field">
                    <label>Note</label>
                    <textarea
                      className="svc-textarea"
                      rows={2}
                      placeholder="Additional note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={!selectedService}
                    />
                  </div>
                  <div className="svc-form-actions">
                    <button
                      className="svc-send"
                      disabled={!canSend}
                      onClick={onSend}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>

        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="services"
            onSelect={handleSelectNav}
          />
        )}

        <MeetingFooter
          userRole={user?.role || "participant"}
          micOn={micOn}
          camOn={camOn}
          onToggleMic={onToggleMic}
          onToggleCam={onToggleCam}
        />
      </div>
    </MeetingLayout>
  );
}
