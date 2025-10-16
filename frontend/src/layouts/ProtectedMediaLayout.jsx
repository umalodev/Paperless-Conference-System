// src/layouts/ProtectedMediaLayout.jsx
import { Outlet } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import { MediaRoomProvider } from "../contexts/MediaRoomContext.jsx";
import { ScreenShareProvider } from "../contexts/ScreenShareContext";

// ✅ Versi perbaikan: admin tidak ikut MediaRoomProvider
export default function ProtectedMediaLayout({ requiredRole = "participant" }) {
  // 🔹 Jika role = admin → tidak butuh koneksi mediasoup
  if (requiredRole === "admin") {
    return (
      <ProtectedRoute requiredRole="admin">
        <Outlet /> {/* langsung render dashboard admin */}
      </ProtectedRoute>
    );
  }

  // 🔹 Role lain (host, participant) → butuh provider
  return (
    <ProtectedRoute requiredRole={requiredRole}>
      <MediaRoomProvider>
        <ScreenShareProvider>
          <Outlet />
        </ScreenShareProvider>
      </MediaRoomProvider>
    </ProtectedRoute>
  );
}
