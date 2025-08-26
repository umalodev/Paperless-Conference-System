import React from "react";
import "./start.css";
import { useNavigate } from "react-router-dom";

export default function Start() {
  const [user, setUser] = React.useState(null);
  const [role, setRole] = React.useState("participant"); // default aman
  const [username, setUsername] = React.useState("");
  const [useAccountName, setUseAccountName] = React.useState(false);
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

  const handleSubmit = (e) => {
    e.preventDefault();

    localStorage.setItem("pconf.displayName", username || "");
    localStorage.setItem("pconf.useAccountName", useAccountName ? "1" : "0");

    navigate(isHost ? "/host/dashboard" : "/participant/dashboard");
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

          <button type="submit" className="login-button">
            {ctaText}
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
