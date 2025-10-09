import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
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
  const [displayName, setDisplayName] = useState("");

  // Services state
  const [selectedService, setSelectedService] = useState(null);

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
      const dn = localStorage.getItem("pconf.displayName");
      if (dn) setDisplayName(dn);
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
              menuId: m.menuId,
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

  const handleSelectNav = (item) => {
    console.log("handleSelectNav called with:", {
      slug: item.slug,
      label: item.label,
      menuId: item.menuId,
    });
    navigate(`/menu/${item.slug}`);
  };

  const quickOptions = [
    { key: "staff_assist", label: "Staff Assist", icon: "🧑‍💼" },
    { key: "mineral", label: "Mineral/Tea", icon: "🥤" },
    { key: "coffee", label: "Coffee", icon: "☕" },
    { key: "clean", label: "Clean Up", icon: "🧹" },
  ];

  const onQuickSelect = (opt) => setSelectedService(opt);
  const canSend = !!selectedService;

  // meetingId: sesuaikan
  const resolveMeetingId = () => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null; // jangan default 0/1000
    } catch {
      return null;
    }
  };
  // isAssist (previous) and isStaff (new)
  const isAssist = String(user?.role || "").toLowerCase() === "assist";
  const isStaff = ["admin", "host", "assist"].includes(
    String(user?.role || "").toLowerCase()
  );

  const getMeetingDisplayName = () => {
    const meetingId = resolveMeetingId();
    const byMeeting = localStorage.getItem(`meeting:${meetingId}:displayName`);
    const name = localStorage.getItem("pconf.displayName");

    if (name && name.trim()) return name.trim();
    if (byMeeting && byMeeting.trim()) return byMeeting.trim();

    // fallback 1: mungkin kamu pernah simpan "displayName" global
    const globalName = localStorage.getItem("displayName");
    if (globalName && globalName.trim()) return globalName.trim();

    // fallback 2: username dari objek user (kalau ada)
    if (user?.username) return String(user.username).trim();

    // fallback 3: string generik
    return "Participant";
  };

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
    // Polling untuk sinkron status di kedua sisi (10s)
    const intervalMs = 10000;
    const t = setInterval(loadRequests, intervalMs);
    return () => clearInterval(t);
  }, [loadRequests]);

  // Create request
  const onSend = async () => {
    if (!canSend || !user) return;

    const meetingId = resolveMeetingId();
    if (!meetingId) {
      alert("Meeting belum aktif/terpilih.");
      return;
    }

    const displayName = (getMeetingDisplayName() || "").trim();
    if (!displayName) {
      alert("Nama peminta (name) kosong. Mohon set display name Anda.");
      return;
    }

    const body = {
      meetingId,
      serviceKey: selectedService.key,
      serviceLabel: selectedService.label,
      name: displayName, // Wajib oleh backend
      priority, // "Low" | "Normal" | "High"
      note: note.trim() || null,
      requesterUserId: user.id || user.userId || undefined, // optional tapi membantu
    };

    try {
      const res = await fetch(`${API_URL}/api/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...meetingService.getAuthHeaders(), // pastikan Authorization terkirim
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // Baca pesan error dari server supaya tahu tepatnya kenapa 400
        const text = await res.text().catch(() => "");
        let msg = text;
        try {
          const j = JSON.parse(text);
          msg = j.message || j.error || text;
        } catch {}
        throw new Error(`HTTP ${res.status}${msg ? ` - ${msg}` : ""}`);
      }

      await res.json();
      setNote("");
      setSelectedService(null);
      await loadRequests();
    } catch (e) {
      alert(`Failed to send request: ${e.message || e}`);
      console.error("POST /api/services failed. Payload:", body);
    }
  };

  // ---- Assist/staff actions ----
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

  // helper to mark done (used by staff)
  const markDone = async (id) => {
    // alias for doUpdateStatus
    await doUpdateStatus(id, "done");
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

  // display human-friendly status label (map 'done' -> 'Completed')
  const StatusBadge = ({ status }) => {
    const label = status === "done" ? "Completed" : status;
    return <em className={`svc-status svc-status--${status}`}>{label}</em>;
  };

  const [showSendHint, setShowSendHint] = useState(false);
  const hintTimerRef = React.useRef(null);
  const quickWrapRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(hintTimerRef.current);
  }, []);

  const onClickSend = async (e) => {
    if (!canSend) {
      e.preventDefault();
      e.stopPropagation();
      setShowSendHint(true);
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setShowSendHint(false), 1800);
      return;
    }
    await onSend();
  };

  return (
    <MeetingLayout
      meetingId={resolveMeetingId()}
      userId={user?.id || user?.userId || null}
      userRole={user?.role || "participant"}
      meetingTitle={(() => {
        try {
          const raw = localStorage.getItem("currentMeeting");
          const cm = raw ? JSON.parse(raw) : null;
          return cm?.title || `Meeting #${resolveMeetingId()}`;
        } catch {
          return `Meeting #${resolveMeetingId()}`;
        }
      })()}
    >
      <div className="pd-app">
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">
                {localStorage.getItem("currentMeeting")
                  ? JSON.parse(localStorage.getItem("currentMeeting"))?.title ||
                    "Meeting Default"
                  : "Default"}
              </h1>
              <div className="pd-sub">
                {isAssist
                  ? "Assist console — handle participants' requests"
                  : ""}
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
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="pd-user-name">
                  {displayName || "Participant"}
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
                          {/* Staff can always mark done */}
                          {isStaff && r.status !== "done" && (
                            <button
                              className="svc-btn"
                              disabled={busyId === r.serviceRequestId}
                              onClick={() => markDone(r.serviceRequestId)}
                              title="Mark as completed"
                            >
                              Mark Done
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
                        className="svc-row"
                        title={r.note || undefined}
                      >
                        <div className="svc-recent-item">
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

                        {/* If current user is staff, allow marking done from left column too */}
                        <div className="svc-actions">
                          {isStaff && r.status !== "done" && (
                            <button
                              className="svc-btn"
                              disabled={busyId === r.serviceRequestId}
                              onClick={() => markDone(r.serviceRequestId)}
                              title="Mark as completed"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </>
              )}
            </section>

            {/* RIGHT COLUMN (only for participant) */}
            {!isAssist && (
              <section className="svc-card svc-main">
                <div className="svc-card-title">Quick services</div>

                <div className="svc-quick" ref={quickWrapRef}>
                  {/* Tooltip diarahkan ke grid (muncul di atasnya) */}
                  {showSendHint && !canSend && (
                    <span
                      className="svc-tooltip svc-tooltip--grid"
                      role="tooltip"
                    >
                      Pilih layanan terlebih dahulu
                    </span>
                  )}

                  {quickOptions.map((q) => (
                    <button
                      key={q.key}
                      className={`svc-quick-btn ${
                        selectedService?.key === q.key ? "is-active" : ""
                      } ${showSendHint && !canSend ? "is-hint" : ""}`}
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
                    <div
                      className="svc-form-field svc-priority"
                      style={{ flex: 1 }}
                    >
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

                  <div
                    className="svc-form-actions"
                    style={{ position: "relative" }}
                  >
                    <button
                      className={`svc-send ${
                        !canSend ? "is-aria-disabled" : ""
                      }`}
                      aria-disabled={!canSend}
                      onClick={onClickSend}
                      // JANGAN pakai disabled di sini agar klik tetap diterima
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
