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
      <MediaRoomProvider>
        <ScreenShareProvider>
          <ModalProvider>
            <Routes>
              <Route path="/" element={<Login />} />

              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/participant/dashboard"
                element={
                  <ProtectedRoute requiredRole="participant">
                    <ParticipantDashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="/start" element={<Start />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/menu/agenda" element={<Agenda />} />
              <Route path="/menu/materials" element={<Materials />} />
              <Route path="/menu/participant" element={<ParticipantsPage />} />
              <Route path="/menu/survey" element={<Survey />} />
              <Route path="/menu/files" element={<Files />} />
              <Route path="/menu/chating" element={<Chat />} />
              <Route path="/menu/notes" element={<Notes />} />
              <Route path="/waiting" element={<WaitingRoom />} />
              <Route path="/setup" element={<SetUp />} />
              <Route path="/menu/services" element={<Services />} />
              <Route path="/menu/screenshare" element={<ScreenSharePage />} />
              <Route path="/menu/whiteboard" element={<Whiteboard />} />
              <Route path="/master-controller" element={<MasterController />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <GlobalAnnotationOverlay />
          </ModalProvider>
        </ScreenShareProvider>
      </MediaRoomProvider>
    </HashRouter>
  );
}

export default App;
