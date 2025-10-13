import "./utils/installFetch401Guard.js"; // Pasang guard 401 untuk fetch
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login/login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import LockOverlay from "./components/LockOverlay.jsx";
import "./components/LockOverlay.css";

// Import role-specific dashboards
import AdminDashboard from "./pages/admin/dashboard/admin-dashboard.jsx";
import ParticipantDashboard from "./pages/participant/dashboard/participant-dashboard.jsx";

import Agenda from "./pages/menu/agenda/Agenda.jsx";
import Materials from "./pages/menu/materials/Materials.jsx";
import ParticipantsPage from "./pages/menu/participant/participant.jsx";
import Survey from "./pages/menu/survey/Survey.jsx";
import Files from "./pages/menu/files/Files.jsx";
import Chat from "./pages/menu/chating/Chating.jsx";
import Notes from "./pages/menu/notes/Notes.jsx";
import Start from "./pages/start/Start.jsx";
import WaitingRoom from "./pages/waiting/WaitingRoom.jsx";
import SetUp from "./pages/start/SetUp.jsx";
import Services from "./pages/menu/services/services.jsx";
import ScreenSharePage from "./pages/menu/screenshare/ScreenShare.jsx";
import { MediaRoomProvider } from "./contexts/MediaRoomContext.jsx";
import { ScreenShareProvider } from "./contexts/ScreenShareContext";
import Whiteboard from "./pages/menu/whiteboard/whiteboards.jsx";
import GlobalAnnotationOverlay from "./components/GlobalAnnotationOverlay.jsx";
import MasterController from "./pages/master-controller/MasterController.jsx";
import { ModalProvider } from "./contexts/ModalProvider.jsx";

function App() {
  return (
    <HashRouter>
      <ModalProvider>
        {" "}
        {/* Modal bisa global */}
        <Routes>
          {/* Route publik: Login, Start, Waiting — TANPA MediaRoomProvider */}
          <Route path="/" element={<Login />} />
          <Route path="/start" element={<Start />} />
          <Route path="/waiting" element={<WaitingRoom />} />
          <Route path="/setup" element={<SetUp />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* Route protected: Wrap dengan MediaRoomProvider & ScreenShareProvider */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <MediaRoomProvider>
                  {" "}
                  <ScreenShareProvider>
                    <AdminDashboard />
                  </ScreenShareProvider>
                </MediaRoomProvider>
              </ProtectedRoute>
            }
          />

          <Route
            path="/participant/dashboard"
            element={
              <ProtectedRoute requiredRole="participant">
                <MediaRoomProvider>
                  <ScreenShareProvider>
                    <ParticipantDashboard />
                  </ScreenShareProvider>
                </MediaRoomProvider>
              </ProtectedRoute>
            }
          />

          {/* Route menu: Asumsi butuh media, wrap di ProtectedRoute atau langsung */}
          <Route
            path="/menu/agenda"
            element={
              <ProtectedRoute requiredRole="participant">
                {" "}
                {/* Tambah ProtectedRoute jika belum */}
                <MediaRoomProvider>
                  <ScreenShareProvider>
                    <Agenda />
                  </ScreenShareProvider>
                </MediaRoomProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu/materials"
            element={
              <ProtectedRoute requiredRole="participant">
                <MediaRoomProvider>
                  <ScreenShareProvider>
                    <Materials />
                  </ScreenShareProvider>
                </MediaRoomProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu/participant"
            element={
              <ProtectedRoute requiredRole="participant">
                <MediaRoomProvider>
                  <ScreenShareProvider>
                    <ParticipantsPage />
                  </ScreenShareProvider>
                </MediaRoomProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu/survey"
            element={
              <ProtectedRoute requiredRole="participant">
                <MediaRoomProvider>
                  <ScreenShareProvider>
                    <Survey />
                  </ScreenShareProvider>
                </MediaRoomProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu/files"
            element={
              <ProtectedRoute requiredRole="participant">
                <MediaRoomProvider>
                  <ScreenShareProvider>
                    <Files />
                  </ScreenShareProvider>
                </MediaRoomProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu/chating"
            element={
              <ProtectedRoute requiredRole="participant">
                <MediaRoomProvider>
                  <ScreenShareProvider>
                    <Chat />
                  </ScreenShareProvider>
                </MediaRoomProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu/notes"
            element={
              <ProtectedRoute requiredRole="participant">
                <MediaRoomProvider>
                  <ScreenShareProvider>
                    <Notes />
                  </ScreenShareProvider>
                </MediaRoomProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu/services"
            element={
              <ProtectedRoute requiredRole="participant">
                <MediaRoomProvider>
                  <ScreenShareProvider>
                    <Services />
                  </ScreenShareProvider>
                </MediaRoomProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu/screenshare"
            element={
              <ProtectedRoute requiredRole="participant">
                <MediaRoomProvider>
                  <ScreenShareProvider>
                    <ScreenSharePage />
                  </ScreenShareProvider>
                </MediaRoomProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu/whiteboard"
            element={
              <ProtectedRoute requiredRole="participant">
                <MediaRoomProvider>
                  <ScreenShareProvider>
                    <Whiteboard />
                  </ScreenShareProvider>
                </MediaRoomProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/master-controller"
            element={
              <ProtectedRoute requiredRole="host">
                <MediaRoomProvider>
                  <ScreenShareProvider>
                    <MasterController />
                  </ScreenShareProvider>
                </MediaRoomProvider>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <GlobalAnnotationOverlay /> {/* Global overlay di luar */}
      </ModalProvider>
    </HashRouter>
  );
}

export default App;
