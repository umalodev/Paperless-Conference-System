import React from "react";
import styles from "../styles/Start.module.css";
import useStartPage from "../hooks/useStartPage";

export default function StartForm() {
  const {
    user,
    role,
    username,
    useAccountName,
    loading,
    error,
    handleChangeUsername,
    setUseAccountName,
    handleSubmit,
    intentText,
    ctaText,
  } = useStartPage();

  const isHost = role === "host";

  return (
    <div className={styles["login-container"]}>
      <div className={styles["login-box"]}>
        <div className={styles["login-header"]}>
          <img
            src="/img/logo.png"
            alt="Logo"
            className={styles["login-logo"]}
          />{" "}
          <div className="login-title-container">
            <h2 className={styles["login-title"]}>
              Paperless Conference System
            </h2>
            <p className={styles["login-subtitle"]}>
              Join or host a paperless conference meeting{" "}
            </p>{" "}
          </div>{" "}
        </div>
        <label className={styles["label-bold"]}>I want to :</label>
        <div className={styles["option-box"]}>
          <img
            src="/img/pc.png"
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
                onChange={(e) => setUseAccountName(e.target.checked)}
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
                Participant akan otomatis bergabung dengan meeting yang
                tersedia.
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
