import React from "react";
import "./start.css";
import { useNavigate } from "react-router-dom";
import meetingService from "../../services/meetingService.js";

export default function Start() {
  const [user, setUser] = React.useState(null);
  const [role, setRole] = React.useState("participant"); // default aman
  const [username, setUsername] = React.useState("");
  const [useAccountName, setUseAccountName] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const navigate = useNavigate();

  const getAccountName = React.useCallback(
    () =>
      user?.username ||
      user?.name ||
      user?.full_name ||
      (user?.email ? user.email.split("@")[0] : "") ||
      "",
    [user]
  );

  // Ambil user dari localStorage saat mount
  React.useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return;

    try {
      const u = JSON.parse(raw);
      setUser(u);

      // Ambil role dari beberapa kemungkinan properti
      const detectedRole = (
        u?.role?.name ||
        u?.role ||
        u?.user_role ||
        u?.userRole ||
        u?.role_name ||
        ""
      )
        .toString()
        .toLowerCase();

      setRole(detectedRole === "host" ? "host" : "participant");

      // kalau user mau auto-isi nanti, kita isi dari sini juga
      // tapi input aktualnya akan diset saat checkbox diubah
    } catch {
      // kalau gagal parse, biarkan default
    }
    const savedUse = localStorage.getItem("pconf.useAccountName") === "1";
    const savedName = localStorage.getItem("pconf.displayName") || "";
    setUseAccountName(savedUse);
    // kalau sebelumnya pakai account name, biarkan diisi nanti saat user termuat
    if (!savedUse) setUsername(savedName);
  }, []);

  React.useEffect(() => {
    if (useAccountName) {
      const accountName = getAccountName();
      setUsername(accountName);
      localStorage.setItem("pconf.displayName", accountName);
      localStorage.setItem("pconf.useAccountName", "1");
    } else {
      setUsername("");
      localStorage.removeItem("pconf.useAccountName");

      localStorage.removeItem("pconf.displayName");
    }
  }, [useAccountName, getAccountName]);

  const handleChangeUsername = (e) => {
    const val = e.target.value;
    setUsername(val);
    if (!useAccountName) {
      localStorage.setItem("pconf.displayName", val);
    }
  };

  // Saat checkbox diubah → isi/bersihkan nama sesuai username akun
  const handleToggleUseAccountName = (e) => {
    const checked = e.target.checked;
    setUseAccountName(checked);

    if (checked) {
      const accountName =
        user?.username ||
        user?.name ||
        user?.full_name ||
        (user?.email ? user.email.split("@")[0] : "") ||
        "";
      setUsername(accountName);
    } else {
      setUsername("");
    }
  };

  const isHost = role === "host";
  const intentText = isHost ? "Host a meeting" : "Join a meeting";
  const ctaText = isHost ? "Create Meeting" : "Join Meeting";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      localStorage.setItem("pconf.displayName", username || "");
      localStorage.setItem("pconf.useAccountName", useAccountName ? "1" : "0");

      if (isHost) {
        // Host creates a new meeting
        const meetingData = {
          title: `Meeting by ${username || user?.username || 'Host'}`,
          description: 'Conference meeting',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        };

        const result = await meetingService.createMeeting(meetingData);
        
        if (result.success) {
          // Store meeting info in localStorage
          const meetingInfo = {
            id: result.data.meetingId,
            code: `MTG-${result.data.meetingId}`,
            title: result.data.title,
            status: result.data.status
          };
          localStorage.setItem("currentMeeting", JSON.stringify(meetingInfo));
          
          // Navigate to waiting room
          navigate("/waiting");
        } else {
          throw new Error(result.message || 'Failed to create meeting');
        }
      } else {
        // Participant automatically finds and joins active meeting
        try {
          // Get active meetings from server
          const activeMeetingsResult = await meetingService.getActiveMeetings();
          
          if (activeMeetingsResult.success && activeMeetingsResult.data.length > 0) {
            // Join the first available active meeting
            const activeMeeting = activeMeetingsResult.data[0];
            console.log("Found active meeting:", activeMeeting);
            
            const meetingInfo = {
              id: activeMeeting.meetingId,
              code: activeMeeting.meetingId,
              title: activeMeeting.title || "Active Meeting",
              status: activeMeeting.status || "started"
            };
            localStorage.setItem("currentMeeting", JSON.stringify(meetingInfo));
            
            // Navigate to waiting room
            navigate("/waiting");
          } else {
            // If no active meeting found, create a demo meeting info
            console.log("No active meeting found, creating demo meeting");
            const meetingInfo = {
              id: "1234",
              code: "1234",
              title: "Demo Meeting",
              status: "waiting"
            };
            localStorage.setItem("currentMeeting", JSON.stringify(meetingInfo));
            
            // Navigate to waiting room
            navigate("/waiting");
          }
        } catch (statusError) {
          console.log("Error getting active meetings, creating demo meeting:", statusError);
          // Create a demo meeting for participant as fallback
          const meetingInfo = {
            id: "1234",
            code: "1234",
            title: "Demo Meeting",
            status: "waiting"
          };
          localStorage.setItem("currentMeeting", JSON.stringify(meetingInfo));
          
          // Navigate to waiting room
          navigate("/waiting");
        }
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src="/img/logo.png" alt="Logo" className="login-logo" />
          <div className="login-title-container">
            <h2 className="login-title">Paperless Conference System</h2>
            <p className="login-subtitle">
              Join or host a paperless conference meeting
            </p>
          </div>
        </div>

        <label className="label-bold">I want to :</label>
        <div className="option-box" role="status" aria-live="polite">
          <img
            src={isHost ? "/img/pc.png" : "/img/pc.png"}
            alt={isHost ? "Host" : "Participant"}
            className="icon"
          />
          <span className="option-text">{intentText}</span>
        </div>

        <p></p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label-bold" htmlFor="username">
              Your Name
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter Your Name"
              className="login-input"
              value={username}
              onChange={handleChangeUsername}
              readOnly={useAccountName}
              required
            />

            <label className="inline-checkbox no-center">
              <input
                type="checkbox"
                checked={useAccountName}
                onChange={handleToggleUseAccountName}
              />
              <span>Use my account name</span>
            </label>
          </div>

          {!isHost && (
            <div className="form-group">
              <div style={{ 
                background: '#f0f9ff', 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid #0ea5e9',
                fontSize: '14px',
                color: '#0369a1'
              }}>
                <strong>ℹ️ Auto-Join Meeting</strong><br/>
                Participant akan otomatis bergabung dengan meeting yang tersedia.
                Tidak perlu input Meeting ID.
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Processing..." : ctaText}
          </button>

          {user && (
            <div className="meta-hint">
              Logged in as{" "}
              <strong>
                {user?.username || user?.name || user?.email || "user"}
              </strong>{" "}
              ({role})
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
