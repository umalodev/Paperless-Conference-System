// src/layouts/ProtectedMediaLayout.jsx
import { Outlet } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import { MediaRoomProvider } from "../contexts/MediaRoomContext.jsx";
import { ScreenShareProvider } from "../contexts/ScreenShareContext";

export default function ProtectedMediaLayout({ requiredRole = "participant" }) {
  return (
    <ProtectedRoute requiredRole={requiredRole}>
      <MediaRoomProvider>
        <ScreenShareProvider>
          <Outlet /> {/* semua halaman anak share provider yang sama */}
        </ScreenShareProvider>
      </MediaRoomProvider>
    </ProtectedRoute>
  );
}
