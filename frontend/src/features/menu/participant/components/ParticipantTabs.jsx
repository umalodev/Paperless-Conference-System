// src/features/menu/participants/components/ParticipantTabs.jsx
import React from "react";
import Icon from "../../../../components/Icon.jsx";

export default function ParticipantTabs({
  activeTab,
  onChange,
  onRefreshVideo,
  refreshingVideo,
}) {
  return (
    <div className="prt-tabs-bar">
      <div className="prt-tabs">
        <button
          className={`prt-tab${activeTab === "list" ? " active" : ""}`}
          onClick={() => onChange("list")}
        >
          List
        </button>
        <button
          className={`prt-tab${activeTab === "video" ? " active" : ""}`}
          onClick={() => onChange("video")}
        >
          Camera
        </button>
      </div>

      {/* ✅ Tombol refresh muncul hanya di tab video */}
      {activeTab === "video" && (
        <button
          className={`prt-btn ${refreshingVideo ? "loading" : ""}`}
          onClick={onRefreshVideo}
          disabled={refreshingVideo}
          title="Refresh video feeds"
        >
          <img src="img/refresh.png" alt="Refresh" className="mute-img" />
          <span>{refreshingVideo ? "Refreshing..." : "Refresh Video"}</span>
        </button>
      )}
    </div>
  );
}
