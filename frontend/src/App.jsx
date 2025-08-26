import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login/login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Import role-specific dashboards
import AdminDashboard from "./pages/admin/dashboard/admin-dashboard.jsx";
import HostDashboard from "./pages/host/dashboard/host-dashboard.jsx";
import ParticipantDashboard from "./pages/participant/dashboard/participant-dashboard.jsx";

import Agenda from "./pages/menu/agenda/Agenda.jsx";
import Materials from "./pages/menu/materials/Materials.jsx";
import ParticipantsPage from "./pages/menu/participant/participant.jsx";
import Survey from "./pages/menu/survey/Survey.jsx";
import Files from "./pages/menu/files/Files.jsx";
import Chat from "./pages/menu/chating/Chating.jsx";
import Notes from "./pages/menu/notes/Notes.jsx";
import Start from "./pages/start/Start.jsx";

function App() {
  return (
    <HashRouter>
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
          path="/host/dashboard"
          element={
            <ProtectedRoute requiredRole="host">
              <HostDashboard />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
