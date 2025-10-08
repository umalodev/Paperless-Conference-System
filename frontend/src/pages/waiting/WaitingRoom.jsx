import React, { useEffect, useMemo, useState } from "react";
import "./WaitingRoom.css";
import { useNavigate } from "react-router-dom";
import meetingService from "../../services/meetingService.js";

export default function WaitingRoom() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("participant");
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState(null);

  const navigate = useNavigate();

  // bootstrap user/role
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setUser(u);
        const r = (
          u?.role?.name ||
          u?.role ||
          u?.user_role ||
          u?.userRole ||
          u?.role_name ||
          ""
        )
          .toString()
          .toLowerCase();
        setRole(r === "host" ? "host" : "participant");
      } catch {}
    }
    setDisplayName(localStorage.getItem("pconf.displayName") || "");

    // Get current meeting info
    const meetingRaw = localStorage.getItem("currentMeeting");
    if (meetingRaw) {
      try {
        const meeting = JSON.parse(meetingRaw);
        setCurrentMeeting(meeting);
        console.log("Current meeting loaded:", meeting);
      } catch (e) {
        console.error("Failed to parse meeting info:", e);
      }
    }
  }, []);

  // meetingId dari currentMeeting state
  const { meetingId, meetingCode } = useMemo(() => {
    if (!currentMeeting) {
      return { meetingId: null, meetingCode: "—" };
    }
    return {
      meetingId: currentMeeting.id || currentMeeting.meetingId,
      meetingCode: currentMeeting.code || currentMeeting.meetingCode || "—",
    };
  }, [currentMeeting]);

  useEffect(() => {
    const pushName = async () => {
      if (!meetingId) return;
      const name = (localStorage.getItem("pconf.displayName") || "").trim();
      if (!name) return;
      try {
        await meetingService.setParticipantDisplayName({
          meetingId,
          displayName: name,
        });
        // optional: simpan juga per-meeting
        localStorage.setItem(`meeting:${meetingId}:displayName`, name);
      } catch (e) {
        console.warn("Gagal sync display name:", e);
      }
    };
    pushName();

    // Re-sync display name whenever it changes
    const interval = setInterval(pushName, 5000);
    return () => clearInterval(interval);
  }, [meetingId]);
  // cek status + polling untuk participant
  useEffect(() => {
    let cancel = false;
    let timer;

    const fetchStatus = async () => {
      try {
        setErr("");
        if (!meetingId) {
          console.log("No meeting ID available");
          return;
        }

        console.log("Checking meeting status for:", meetingId);
        const result = await meetingService.getMeetingStatus(meetingId);
        if (cancel) return;

        console.log("Meeting status result:", result);
        const on = !!(
          result?.data?.isActive ??
          result?.data?.started ??
          result?.started
        );
        setStarted(on);

        if (on) {
          console.log(
            "Meeting is active, attempting auto-join then redirecting"
          );
          try {
            // Attempt auto-join; ignore errors to allow redirect flow
            await meetingService.autoJoinMeeting(meetingId);
          } catch (e) {
            console.warn("Auto-join failed or not required:", e?.message || e);
          }
        }
      } catch (e) {
        if (!cancel) {
          console.error("Error fetching meeting status:", e);
          // Suppress 404 not found noise in waiting room; show friendly text
          const msg = String(e.message || e);
          if (msg.toLowerCase().includes("not found")) {
            setErr("Meeting belum tersedia. Menunggu host memulai…");
          } else {
            setErr(msg);
          }
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    if (meetingId) {
      fetchStatus();
      if (role !== "host") {
        timer = setInterval(fetchStatus, 3000);
      }
    } else {
      setLoading(false);
    }

    return () => {
      cancel = true;
      if (timer) clearInterval(timer);
    };
  }, [meetingId, role]);

  // auto-redirect bila sudah mulai - semua user ke participant dashboard
  useEffect(() => {
    if (!loading && started && meetingId) {
      console.log("Redirecting to participant dashboard");
      navigate("/participant/dashboard");
    }
  }, [started, loading, meetingId, navigate]);

  const handleStart = async () => {
    if (!meetingId) {
      setErr("No meeting ID available");
      return;
    }

    setActionLoading(true);
    setErr("");
    try {
      console.log("Starting meeting:", meetingId);
      const result = await meetingService.startMeeting(meetingId);
      if (result.success) {
        console.log("Meeting started successfully");
        setStarted(true); // akan memicu redirect
      } else {
        throw new Error(result.message || "Failed to start meeting");
      }
    } catch (e) {
      console.error("Error starting meeting:", e);
      setErr(String(e.message || e));
    } finally {
      setActionLoading(false);
    }
  };

  const leave = () => {
    // Clear meeting from localStorage
    localStorage.removeItem("currentMeeting");

    // Navigate based on user role
    if (role === "host") {
      // Host should go back to start page (same as screenshot)
      navigate("/start");
    } else {
      // Participant can go to start page or login
      navigate("/start");
    }
  };

  const who = displayName || user?.username || user?.name || "You";

  // If no meeting ID, show error
  if (!meetingId) {
    return (
      <div className="wr-app">
        <header className="wr-topbar">
          <div className="wr-left">
            <span className="wr-live" aria-hidden />
            <div className="wr-title-wrap">
              <h1 className="wr-title">Error</h1>
              <div className="wr-sub">No meeting information</div>
            </div>
          </div>
        </header>
        <main className="wr-main">
          <div className="wr-card">
            <div className="wr-error">
              No meeting information found. Please go back to start page.
            </div>
            <div className="wr-actions">
              <button
                className="wr-btn wr-ghost"
                onClick={() => navigate("/start")}
              >
                Go Back to Start
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="wr-app">
      <header className="wr-topbar">
        <div className="wr-left">
          <span className="wr-live" aria-hidden />
          <div className="wr-title-wrap">
            <h1 className="wr-title">Waiting Room</h1>
            <div className="wr-sub">Meeting ID: {meetingId}</div>
          </div>
        </div>
        <div className="wr-right">
          <div className="wr-clock" aria-live="polite">
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="wr-user-badge">
            <div className="wr-avatar">{who.slice(0, 2).toUpperCase()}</div>
            <div className="wr-user-meta">
              <div className="wr-user-name">{who}</div>
              <div className="wr-user-role">
                {role === "host" ? "Host" : "Participant"}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="wr-main">
        <div className="wr-card" role="status" aria-live="polite">
          {/* status badge */}
          {!started && (
            <div
              className={`wr-badge ${role === "host" ? "is-host" : "is-wait"}`}
            >
              {role === "host" ? "Ready to start" : "Waiting for host to start"}
            </div>
          )}

          {/* konten utama */}
          <h2 className="wr-heading">
            {role === "host"
              ? "Mulai rapat saat semua siap"
              : "Kamu sudah di ruang tunggu"}
          </h2>
          <p className="wr-desc">
            {role === "host"
              ? "Peserta akan otomatis masuk ke ruang rapat ketika kamu menekan Start Meeting."
              : "Begitu host memulai rapat, kamu akan otomatis diarahkan ke ruang rapat."}
          </p>

          {/* meeting info */}
          {currentMeeting && (
            <div
              className="wr-meeting-info"
              style={{
                background: "#f3f4f6",
                padding: "12px",
                borderRadius: "8px",
                margin: "16px 0",
                fontSize: "14px",
              }}
            >
              <strong>Meeting:</strong>{" "}
              {currentMeeting.title || "Conference Meeting"}
              <br />
              <strong>ID:</strong> {meetingId}
              <br />
              <strong>Status:</strong> {currentMeeting.status || "waiting"}
            </div>
          )}

          {/* spinner untuk participant */}
          {role !== "host" && !started && (
            <div className="wr-wait">
              <div className="wr-spin" />
              <div className="wr-wait-text">Menunggu host…</div>
            </div>
          )}

          {/* tombol aksi */}
          <div className="wr-actions">
            {role === "host" ? (
              <button
                className="wr-btn wr-primary"
                onClick={handleStart}
                disabled={actionLoading || started}
              >
                {actionLoading ? "Memulai…" : "Start Meeting"}
              </button>
            ) : (
              <button className="wr-btn wr-muted" disabled>
                Menunggu…
              </button>
            )}
            <button className="wr-btn wr-ghost" onClick={leave}>
              Leave
            </button>
          </div>

          {/* info kecil */}
          <div className="wr-foot">
            <span className="wr-dot" /> Meeting Code:{" "}
            <strong>{meetingCode}</strong>
          </div>

          {/* error */}
          {err && <div className="wr-error">Gagal memuat status: {err}</div>}
        </div>
      </main>
    </div>
  );
}
