// ==========================================================
// 📄 ParticipantDashboard.jsx
// ==========================================================
import React from "react";
import { useParticipantDashboard } from "../hooks/useParticipantDashboard.js";
import ParticipantDashboardLayout from "../components/ParticipantDashboardLayout.jsx";

export default function ParticipantDashboard() {
  const data = useParticipantDashboard();
  return <ParticipantDashboardLayout {...data} />;
}
