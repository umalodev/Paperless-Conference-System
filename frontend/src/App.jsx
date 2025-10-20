import "./utils/installFetch401Guard.js";
import ProtectedMediaLayout from "./layouts/ProtectedMediaLayout.jsx";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./features/auth/pages/Login.jsx";
import "./components/LockOverlay.css";

// Import role-specific dashboards
import AdminDashboard from "./features/admin/dashboard/pages/AdminDashboard.jsx";
import ParticipantDashboard from "./features/participant/pages/ParticipantDashboard.jsx";

import Agenda from "./features/menu/agenda/pages/AgendaPage.jsx";
import Materials from "./features/menu/materials/pages/MaterialsPage.jsx";
import ParticipantsPage from "./pages/menu/participant/participant.jsx";
import Survey from "./pages/menu/survey/Survey.jsx";
import Files from "./features/menu/files/pages/FilesPage.jsx";
import Chat from "./features/menu/chating/pages/ChatPage.jsx";
import Notes from "./features/menu/notes/pages/NotesPage.jsx";
import Start from "./pages/start/Start.jsx";
import WaitingRoom from "./pages/waiting/WaitingRoom.jsx";
import SetUp from "./pages/start/SetUp.jsx";
import Services from "./features/menu/services/pages/ServicesPage.jsx";
import ScreenSharePage from "./pages/menu/screenshare/ScreenShare.jsx";
import Whiteboard from "./features/menu/whiteboard/pages/WhiteboardPage.jsx";
import GlobalAnnotationOverlay from "./components/GlobalAnnotationOverlay.jsx";
import MasterController from "./features/master-controller/pages/MasterController.jsx";
import { ModalProvider } from "./contexts/ModalProvider.jsx";
import GlobalAuthEvents from "./components/GlobalAuthEvents.jsx";

function App() {
  return (
    <HashRouter>
      <ModalProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Login />} />
          <Route path="/start" element={<Start />} />
          <Route path="/waiting" element={<WaitingRoom />} />
          <Route path="/setup" element={<SetUp />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* Admin: punya media juga? Kalau ya, pakai layout ini */}
          <Route element={<ProtectedMediaLayout requiredRole="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Participant: semua menu berbagi 1 instance provider */}
          <Route element={<ProtectedMediaLayout requiredRole="participant" />}>
            <Route
              path="/participant/dashboard"
              element={<ParticipantDashboard />}
            />
            <Route path="/menu/agenda" element={<Agenda />} />
            <Route path="/menu/materials" element={<Materials />} />
            <Route path="/menu/participant" element={<ParticipantsPage />} />
            <Route path="/menu/survey" element={<Survey />} />
            <Route path="/menu/files" element={<Files />} />
            <Route path="/menu/chating" element={<Chat />} />
            <Route path="/menu/notes" element={<Notes />} />
            <Route path="/menu/services" element={<Services />} />
            <Route path="/menu/screenshare" element={<ScreenSharePage />} />
            <Route path="/menu/whiteboard" element={<Whiteboard />} />
          </Route>

          {/* Host khusus */}
          <Route element={<ProtectedMediaLayout requiredRole="host" />}>
            <Route path="/master-controller" element={<MasterController />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <GlobalAuthEvents />
        <GlobalAnnotationOverlay />
      </ModalProvider>
    </HashRouter>
  );
}

export default App;
