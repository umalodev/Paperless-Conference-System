import React from "react";
import styles from "./Start.module.css";
import { useNavigate } from "react-router-dom";
import meetingService from "../../services/meetingService.js";

export default function Start() {
  const [user, setUser] = React.useState(null);
  const [role, setRole] = React.useState("participant");
  const [username, setUsername] = React.useState("");
  const [useAccountName, setUseAccountName] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const navigate = useNavigate();

  const getAccountName = React.useCallback(
    () => user?.username || user?.name || user?.full_name || "",
    [user]
  );

  // ===========================================================
  // Load user dari localStorage
  // ===========================================================
  React.useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return;

    try {
      const u = JSON.parse(raw);
      setUser(u);

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
    } catch {
      // ignore
    }

    const savedUse = localStorage.getItem("pconf.useAccountName") === "1";
    const savedName = localStorage.getItem("pconf.displayName") || "";
    setUseAccountName(savedUse);
    if (!savedUse) setUsername(savedName);
  }, []);

  // ===========================================================
  // Update localStorage saat toggle "Use my account name"
  // ===========================================================
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
  const ctaText = isHost ? "Set Meeting" : "Join Meeting";

  const setMeetingLocalName = (meetingId, name) => {
    const n = (name || "").trim();
    localStorage.setItem(`meeting:${meetingId}:displayName`, n);
    localStorage.setItem("displayName", n);
    localStorage.setItem("currentMeetingId", String(meetingId));
  };

  // ===========================================================
  // Handle Submit
  // ===========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Simpan displayName ke localStorage
      localStorage.setItem("pconf.displayName", username || "");
      localStorage.setItem("pconf.useAccountName", useAccountName ? "1" : "0");

      // === Ambil token & user info
      const token = localStorage.getItem("token");
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      if (!token || !userData?.username) {
        console.warn("⚠️ Missing token or user data — skip ControlServer registration");
      } else {
        // Ambil info PC dari preload Electron
        let pcInfo = { hostname: "Browser-Client", os: navigator.platform };
        if (window.electronAPI?.getPCInfo) {
          pcInfo = await window.electronAPI.getPCInfo();
        }

          // ✅ Connect & register ke Control Server (via socket)
          // ✅ Connect & register ke Control Server (via socket)
if (window.electronAPI?.connectToControlServer) {
  window.electronAPI.connectToControlServer(token, username);
  console.log("✅ Connected to Control Server via socket with name:", username);
}

      }

      // === Navigasi meeting
      if (isHost) {
        navigate("/setup");
      } else {
        try {
          const publicActives = await meetingService.getPublicActiveMeetings();
          let picked = null;

          if (publicActives?.success && Array.isArray(publicActives.data)) {
            picked =
              publicActives.data.find((m) => !m.isDefault) ||
              publicActives.data[0] ||
              null;
          }

          if (picked && !picked.isDefault) {
            const meetingInfo = {
              id: picked.meetingId,
              code: picked.meetingId,
              title: picked.title || "Active Meeting",
              status: picked.status || "started",
              isDefault: !!picked.isDefault,
            };
            localStorage.setItem("currentMeeting", JSON.stringify(meetingInfo));
            setMeetingLocalName(meetingInfo.id, username);
            navigate("/waiting");
            return;
          }

          const joinDefault = await meetingService.joinDefaultMeeting();
          if (!joinDefault?.success) {
            throw new Error(
              joinDefault?.message || "Gagal bergabung ke default meeting."
            );
          }

          const defInfo =
            joinDefault.data || (await meetingService.getDefaultMeeting()).data;
          const meetingInfo = {
            id: defInfo.meetingId,
            code: defInfo.meetingId,
            title: defInfo.title || "UP-CONNECT Default Room",
            status: defInfo.status || "started",
            isDefault: true,
          };
          localStorage.setItem("currentMeeting", JSON.stringify(meetingInfo));
          setMeetingLocalName(meetingInfo.id, username);
          navigate("/waiting");
        } catch (statusError) {
          console.log("Error getting active meetings:", statusError);
          setError(statusError?.message || "Gagal memuat meeting aktif.");
        }
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setError(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // ===========================================================
  // UI
  // ===========================================================
  return (
    <div className={styles["login-container"]}>
      <div className={styles["login-box"]}>
        <div className={styles["login-header"]}>
          <img src="/img/logo.png" alt="Logo" className={styles["login-logo"]} />
          <div className="login-title-container">
            <h2 className={styles["login-title"]}>Paperless Conference System</h2>
            <p className={styles["login-subtitle"]}>
              Join or host a paperless conference meeting
            </p>
          </div>
        </div>

        <label className={styles["label-bold"]}>I want to :</label>
        <div className={styles["option-box"]}>
          <img
            src={isHost ? "/img/pc.png" : "/img/pc.png"}
            alt={isHost ? "Host" : "Participant"}
            className={styles["icon"]}
          />
          <span className="option-text">{intentText}</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles["form-group"]}>
            <label className={styles["label-bold"]} htmlFor="username">
              Your Name
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter Your Name"
              className={styles["login-input"]}
              value={username}
              onChange={handleChangeUsername}
              readOnly={useAccountName}
              required
            />
            <label
              className={`${styles["inline-checkbox"]} ${styles["no-center"]}`}
            >
              <input
                type="checkbox"
                checked={useAccountName}
                onChange={handleToggleUseAccountName}
              />
              <span>Use my account name</span>
            </label>
          </div>

          {!isHost && (
            <div className={styles["form-group"]}>
              <div
                style={{
                  background: "#f0f9ff",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #0ea5e9",
                  fontSize: "14px",
                  color: "#0369a1",
                }}
              >
                <strong>ℹ️ Auto-Join Meeting</strong>
                <br />
                Participant akan otomatis bergabung dengan meeting yang tersedia.
              </div>
            </div>
          )}

          {error && <div className={styles["error-message"]}>{error}</div>}

          <button
            type="submit"
            className={styles["login-button"]}
            disabled={loading}
          >
            {loading ? "Processing..." : ctaText}
          </button>

          {user && (
            <div className={styles["meta-hint"]}>
              Logged in as{" "}
              <strong>{user?.username || user?.name || user?.email || "user"}</strong>{" "}
              ({role})
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
