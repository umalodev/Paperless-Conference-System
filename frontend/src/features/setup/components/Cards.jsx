import React from "react";

/** Quick Start card */
export function CardQuickStart({ creating, onOpenQuickStart }) {
  return (
    <div className="hd-card">
      <div className="hd-card-head">
        <span className="hd-card-ic">▶</span>
        <div>
          <div className="hd-card-title">Quick Start</div>
          <div className="hd-card-sub">Start an instant meeting right now</div>
        </div>
      </div>
      <button
        className="hd-btn hd-primary"
        onClick={onOpenQuickStart}
        disabled={creating}
      >
        {creating ? "Starting…" : "Start Meeting"}
      </button>
    </div>
  );
}

/** Join Default Room card */
export function CardJoinDefault({
  joiningDefault,
  err,
  onJoinDefault,
  onClearError,
}) {
  return (
    <div className="hd-card">
      <div className="hd-card-head">
        <span className="hd-card-ic">🏠</span>
        <div>
          <div className="hd-card-title">Join Default Room</div>
          <div className="hd-card-sub">
            Masuk ke lobby default yang selalu aktif
          </div>
        </div>
      </div>
      <button
        className="hd-btn hd-outline"
        onClick={onJoinDefault}
        disabled={joiningDefault}
        title="Bergabung ke default meeting (tanpa membuat meeting baru)"
      >
        {joiningDefault ? "Joining…" : "Join Default Room"}
      </button>
      {err && (
        <div className="hd-error" style={{ marginTop: 8 }}>
          Error: {err}
          <button
            className="hd-btn hd-outline"
            onClick={onClearError}
            style={{ marginLeft: 8, padding: "4px 8px" }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

/** Schedule Meeting card + modal reuse lewat prop */
export function CardSchedule({
  onOpenSchedule,
  WizardComponent,
  showWizard,
  isQuickStart,
  onCloseWizard,
  onSave,
  errCreate,
  onClearCreateErr,
}) {
  return (
    <div className="hd-card">
      <div className="hd-card-head">
        <span className="hd-card-ic">⚙</span>
        <div>
          <div className="hd-card-title">Schedule Meeting</div>
          <div className="hd-card-sub">Plan a meeting for later</div>
        </div>
      </div>

      <button className="hd-btn hd-outline" onClick={onOpenSchedule}>
        Schedule
      </button>

      <WizardComponent
        open={showWizard}
        onClose={onCloseWizard}
        onSave={onSave}
        isQuickStart={isQuickStart}
      />

      {errCreate && (
        <div className="hd-error" style={{ marginTop: 8 }}>
          Error: {errCreate}
          <button
            className="hd-btn hd-outline"
            onClick={onClearCreateErr}
            style={{ marginLeft: 8, padding: "4px 8px" }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

/** History card */
export function CardHistory({ onViewHistory }) {
  return (
    <div className="hd-card">
      <div className="hd-card-head">
        <span className="hd-card-ic">👥</span>
        <div>
          <div className="hd-card-title">Meeting History</div>
          <div className="hd-card-sub">See past sessions</div>
        </div>
      </div>
      <button className="hd-btn hd-outline" onClick={onViewHistory}>
        View History
      </button>
    </div>
  );
}
