import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login/login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Import role-specific dashboards
import AdminDashboard from "./pages/admin/dashboard/admin-dashboard.jsx";
import HostDashboard from "./pages/host/dashboard/host-dashboard.jsx";
import ParticipantDashboard from "./pages/participant/dashboard/participant-dashboard.jsx";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Role-specific dashboard routes */}
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

        {/* Legacy routes - redirect to login */}
        <Route path="/start" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
