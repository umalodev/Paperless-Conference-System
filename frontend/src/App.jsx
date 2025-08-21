import { useEffect, useState } from "react";
import { API_URL } from "./config.js";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login/login.jsx";
import Start from "./pages/start/start_meeting.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

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
        {/* Redirect any unknown routes to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
