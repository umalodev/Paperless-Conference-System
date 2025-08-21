import { useEffect, useState } from "react";
import { API_URL } from "./config.js";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login/login.jsx";
import Start from "./pages/start/start_meeting.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Dashboard from "./pages/dashboard/dashboard.jsx";
import ScreenShare from "./pages/screen-share/screen-share.jsx";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/start"
          element={
            <ProtectedRoute>
              <Start />
            </ProtectedRoute>
          }
        />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/screen-share"
          element={
            <ProtectedRoute>
              <ScreenShare />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
