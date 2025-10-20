// src/features/menu/participants/components/ParticipantTabs.jsx
import React from "react";

export default function ParticipantTabs({ activeTab, onChange }) {
  return (
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
  );
}
