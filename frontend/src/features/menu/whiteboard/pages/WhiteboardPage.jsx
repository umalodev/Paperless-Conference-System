import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../../components/BottomNav.jsx";
import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import { useMediaRoom } from "../../../../contexts/MediaRoomContext.jsx";
import { useWhiteboard, useCanvasDrawing, useWhiteboardMenu } from "../hooks";
import { exportCanvasAsPNG, formatInitials } from "../utils";
import "../styles/whiteboard.css";
import { formatTime } from "../../../../utils/format.js";

export default function WhiteboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");

  // ===== Meeting ID dari localStorage =====
  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  }, []);

  // ===== Data user & display name =====
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    const dn = localStorage.getItem("pconf.displayName") || "";
    setDisplayName(dn);
  }, []);

  // ===== Hooks Whiteboard =====
  const {
    tool,
    setTool,
    color,
    setColor,
    size,
    setSize,
    strokes,
    setStrokes,
    saving,
    onUndo,
    onRedo,
    onClear,
    loadBoard,
    saveBoard,
    queueSave,
  } = useWhiteboard(meetingId);

  const { canvasRef, wrapRef, startDraw, moveDraw, endDraw } = useCanvasDrawing({
    tool,
    color,
    size,
    strokes,
    setStrokes,
    queueSave,
  });

  // ===== Menu navigasi =====
  const { visibleMenus, loadingMenus, errMenus } = useWhiteboardMenu();

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  // ===== Load awal whiteboard =====
  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // ===== Mic & Cam (footer) =====
  const {
    ready: mediaReady,
    micOn,
    camOn,
    startMic,
    stopMic,
    startCam,
    stopCam,
  } = useMediaRoom();

  const onToggleMic = () => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  };
  const onToggleCam = () => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  };

  // ===== Export PNG =====
  const handleExport = () => exportCanvasAsPNG(canvasRef);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);


  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
    >
      <div className="pd-app whiteboard-page">
        {/* ===== Header ===== */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">
                {JSON.parse(localStorage.getItem("currentMeeting") || "{}")?.title ||
                  "Meeting Default"}
              </h1>
            </div>
          </div>
          <div className="pd-right">
            <div className="pd-clock" aria-live="polite">
              {formatTime(now)}
            </div>
            <div className="pd-user">
              <div className="pd-avatar">{formatInitials(displayName)}</div>
              <div>
                <div className="pd-user-name">{displayName || "Participant"}</div>
                <div className="pd-user-role">{user?.role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* ===== Content ===== */}
        <main className="pd-main">
          <section className="wb-wrap">
            <div className="wb-toolbar">
              <div className="wb-group">
                <button
                  className={`wb-btn ${tool === "pen" ? "active" : ""}`}
                  onClick={() => setTool("pen")}
                  title="Pen (P)"
                >
                  ✏️ Pen
                </button>
                <button
                  className={`wb-btn ${tool === "eraser" ? "active" : ""}`}
                  onClick={() => setTool("eraser")}
                  title="Eraser (E)"
                >
                  🧽 Eraser
                </button>
              </div>

              <div className="wb-group">
                <label className="wb-label">Color</label>
                <input
                  type="color"
                  className="wb-color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={tool === "eraser"}
                />
              </div>

              <div className="wb-group">
                <label className="wb-label">Size</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                />
                <span className="wb-size">{size}px</span>
              </div>

              <div className="wb-group">
                <button className="wb-btn ghost" onClick={onUndo} title="Undo (Ctrl+Z)">
                  ⟲ Undo
                </button>
                <button className="wb-btn ghost" onClick={onRedo} title="Redo (Ctrl+Y)">
                  ⟳ Redo
                </button>
                <button className="wb-btn danger" onClick={onClear} title="Clear All">
                  🗑️ Clear
                </button>
              </div>

              <div className="wb-group">
                <button className="wb-btn" onClick={() => saveBoard()}>
                  💾 {saving ? "Saving…" : "Save"}
                </button>
                <button className="wb-btn" onClick={handleExport}>
                  🖼️ Export PNG
                </button>
              </div>
            </div>

            <div
              className="wb-canvas-wrap"
              ref={wrapRef}
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onTouchStart={startDraw}
              onTouchMove={moveDraw}
              onTouchEnd={endDraw}
            >
              <canvas ref={canvasRef} className="wb-canvas" />
            </div>

            {errMenus && (
              <div className="pd-error" style={{ marginTop: 12 }}>
                Failed to load menu: {errMenus}
              </div>
            )}
          </section>
        </main>

        {/* ===== Bottom Nav ===== */}
        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="whiteboard"
            onSelect={handleSelectNav}
          />
        )}

        {/* ===== Footer ===== */}
        <MeetingFooter
          userRole={user?.role || "participant"}
          micOn={micOn}
          camOn={camOn}
          onToggleMic={onToggleMic}
          onToggleCam={onToggleCam}
        />
      </div>
    </MeetingLayout>
  );
}
