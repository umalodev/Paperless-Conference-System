import { useEffect, useState } from "react";
import { API_URL } from "./config.js";
import { HashRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login/login.jsx";
import Start from "./pages/start/start_meeting.jsx"

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/start" element ={<Start/>} /> 
      </Routes>
    </HashRouter>
  );
}

export default App;
