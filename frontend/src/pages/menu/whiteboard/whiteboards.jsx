// src/pages/menu/whiteboard/Whiteboard.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import { API_URL } from "../../../config.js";
import { useNavigate } from "react-router-dom";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import meetingService from "../../../services/meetingService.js";
import { useMediaRoom } from "../../../contexts/MediaRoomContext.jsx";
import "./whiteboard.css";

const DEFAULT_COLOR = "#0d0d0d";
const DEFAULT_SIZE = 3;

export default function Whiteboard() {
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [size, setSize] = useState(DEFAULT_SIZE);

  const [strokes, setStrokes] = useState([]);
  const redoRef = useRef([]);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  const canvasRef = useRef(null);
  const baseCanvasRef = useRef(null);
  const cssSizeRef = useRef({ w: 0, h: 0 });
  const wrapRef = useRef(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef(null);

  const navigate = useNavigate();

  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    const dn = localStorage.getItem("pconf.displayName") || "";
    setDisplayName(dn);
  }, []);

  // menus
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
        setErrMenus("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          headers: meetingService.getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json?.data)
          ? json.data.map((m) => ({
              menuId: m.menuId,
              slug: m.slug,
              label: m.displayLabel,
              iconUrl: m.iconMenu || null,
              flag: m.flag ?? "Y",
              seq: m.sequenceMenu,
            }))
          : [];
        if (!cancel) setMenus(list);
      } catch (e) {
        if (!cancel) setErrMenus(String(e.message || e));
      } finally {
        if (!cancel) setLoadingMenus(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );
  const handleSelectNav = (item) => {
    console.log("handleSelectNav called with:", {
      slug: item.slug,
      label: item.label,
      menuId: item.menuId,
    });
    navigate(`/menu/${item.slug}`);
  };

  // ======== Canvas sizing & drawing ========

  // Resize: siapkan visible + base canvas dengan skala DPR yang benar,
  // lalu render base dari strokes dan tampilkan.
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    const cssW = Math.max(320, Math.floor(rect.width));
    const cssH = Math.max(320, Math.floor(rect.height - 8));
    cssSizeRef.current = { w: cssW, h: cssH };

    // visible canvas
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const vctx = canvas.getContext("2d");
    vctx.setTransform(1, 0, 0, 1, 0, 0);
    vctx.scale(dpr, dpr);

    // base canvas
    if (!baseCanvasRef.current) {
      baseCanvasRef.current = document.createElement("canvas");
    }
    const base = baseCanvasRef.current;
    base.width = Math.floor(cssW * dpr);
    base.height = Math.floor(cssH * dpr);
    const bctx = base.getContext("2d");
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.scale(dpr, dpr);

    renderBaseFromStrokes();
    paintBasePlusCurrent();
  }, []); // tidak perlu depend on strokes; rebuild base dipicu useEffect lain

  useEffect(() => {
    const ro = new ResizeObserver(() => resizeCanvas());
    if (wrapRef.current) ro.observe(wrapRef.current);
    resizeCanvas();
    return () => ro.disconnect();
  }, [resizeCanvas]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    return { x, y };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const p = getPos(e);
    drawingRef.current = true;
    redoRef.current = []; // mulai gambar → reset redo stack
    currentStrokeRef.current = {
      tool,
      color,
      size,
      points: [p],
    };
    // tampilkan overlay current stroke (awal)
    paintBasePlusCurrent();
  };

  const moveDraw = (e) => {
    if (!drawingRef.current) return;
    const p = getPos(e);
    const s = currentStrokeRef.current;
    if (!s) return;
    s.points.push(p);
    drawIncremental(s);
  };

  const endDraw = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    const s = currentStrokeRef.current;
    if (!s || s.points.length < 2) {
      currentStrokeRef.current = null;
      paintBasePlusCurrent();
      return;
    }

    // commit ke strokes → akan memicu rebuild base via useEffect([strokes])
    setStrokes((prev) => [...prev, s]);
    currentStrokeRef.current = null;
    queueSave();
  };

  const drawStroke = (ctx, s) => {
    if (!s || !s.points?.length) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = s.size || 2;
    if (s.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = s.color || DEFAULT_COLOR;
    }
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
      const p = s.points[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  };

  // Build ulang base canvas dari strokes “jadi”
  const renderBaseFromStrokes = useCallback(() => {
    const base = baseCanvasRef.current;
    if (!base) return;
    const bctx = base.getContext("2d");
    const { w, h } = cssSizeRef.current;

    // background putih
    bctx.globalCompositeOperation = "source-over";
    bctx.clearRect(0, 0, w, h);
    bctx.fillStyle = "#fff";
    bctx.fillRect(0, 0, w, h);

    for (const s of strokes) drawStroke(bctx, s);
  }, [strokes]);

  // Tampilkan: copy base → overlay current stroke (jika ada)
  const paintBasePlusCurrent = useCallback(() => {
    const canvas = canvasRef.current;
    const base = baseCanvasRef.current;
    if (!canvas || !base) return;

    const vctx = canvas.getContext("2d");
    const { w, h } = cssSizeRef.current;

    vctx.globalCompositeOperation = "source-over";
    vctx.clearRect(0, 0, w, h);
    // drawImage: karena kedua context sudah di-scale dengan DPR yang sama,
    // kita pakai koordinat CSS (w x h)
    vctx.drawImage(base, 0, 0, w, h);

    if (currentStrokeRef.current) {
      drawStroke(vctx, currentStrokeRef.current);
    }
  }, []);

  // Backward compat alias
  const redraw = () => {
    paintBasePlusCurrent();
  };

  // Saat dragging, jangan rebuild semua: cukup base + current
  const drawIncremental = (_s) => {
    paintBasePlusCurrent();
  };

  // Rebuild base & repaint saat daftar strokes berubah (endDraw/undo/redo/clear/load)
  useEffect(() => {
    renderBaseFromStrokes();
    paintBasePlusCurrent();
  }, [strokes, renderBaseFromStrokes, paintBasePlusCurrent]);

  // Kalau ubah tool/warna/size ketika sedang menggambar, perbarui overlay
  useEffect(() => {
    if (currentStrokeRef.current) paintBasePlusCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, color, size]);

  // ======== Undo / Redo / Clear ========
  const onUndo = () => {
    if (!strokes.length) return;
    const last = strokes[strokes.length - 1];
    redoRef.current.push(last);
    setStrokes((prev) => prev.slice(0, -1));
    queueSave();
  };
  const onRedo = () => {
    const item = redoRef.current.pop();
    if (!item) return;
    setStrokes((prev) => [...prev, item]);
    queueSave();
  };
  const onClear = () => {
    if (!strokes.length) return;
    redoRef.current = [];
    setStrokes([]);
    queueSave(true); // force clear
  };

  // ======== Load/Save (REST) ========
  const loadBoard = useCallback(async () => {
    if (!meetingId) return;
    const res = await fetch(
      `${API_URL}/api/whiteboard?meetingId=${encodeURIComponent(meetingId)}`,
      { headers: meetingService.getAuthHeaders() }
    );
    if (!res.ok) return;
    const json = await res.json().catch(() => ({}));
    const data = json?.data?.data;
    if (data?.strokes)
      setStrokes(Array.isArray(data.strokes) ? data.strokes : []);
  }, [meetingId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const saveBoard = async (forceEmpty = false) => {
    if (!meetingId) return;
    setSaving(true);
    try {
      const payload = {
        meetingId,
        data: { strokes: forceEmpty ? [] : strokes },
      };
      const res = await fetch(`${API_URL}/api/whiteboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      await res.json().catch(() => ({}));
    } catch (_) {
      // no-op
    } finally {
      setSaving(false);
    }
  };

  const queueSave = (forceEmpty = false) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveBoard(forceEmpty), 800);
  };

  const onExportPNG = () => {
    const canvas = canvasRef.current;
    // ekspor dari visible canvas (sudah berisi base + current/none)
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `whiteboard-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  // ======== Pointer events ========
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onDown = (e) => startDraw(e);
    const onMove = (e) => moveDraw(e);
    const onUp = () => endDraw();
    c.addEventListener("pointerdown", onDown);
    c.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    // touch-friendly
    c.addEventListener("touchstart", onDown, { passive: false });
    c.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp, { passive: false });

    return () => {
      c.removeEventListener("pointerdown", onDown);
      c.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      c.removeEventListener("touchstart", onDown);
      c.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, color, size]);

  // keyboard shortcut
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        onUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        onRedo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [strokes]);

  // footer mic/cam (konsisten)
  const {
    ready: mediaReady,
    micOn,
    camOn,
    startMic,
    stopMic,
    startCam,
    stopCam,
  } = useMediaRoom();
  const onToggleMic = useCallback(() => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  }, [mediaReady, micOn, startMic, stopMic]);
  const onToggleCam = useCallback(() => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  }, [mediaReady, camOn, startCam, stopCam]);

  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
      socket={null}
      mediasoupDevice={null}
    >
      <div className="pd-app whiteboard-page">
        {/* Top bar */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">
                {localStorage.getItem("currentMeeting")
                  ? JSON.parse(localStorage.getItem("currentMeeting"))?.title ||
                    "Meeting Default"
                  : "Default"}
              </h1>
            </div>
          </div>
          <div className="pd-right">
            <div className="pd-clock" aria-live="polite">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="pd-user">
              <div className="pd-avatar">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="pd-user-name">
                  {displayName || "Participant"}
                </div>
                <div className="pd-user-role">{user?.role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
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
                <button
                  className="wb-btn ghost"
                  onClick={onUndo}
                  title="Undo (Ctrl/Cmd+Z)"
                >
                  ⟲ Undo
                </button>
                <button
                  className="wb-btn ghost"
                  onClick={onRedo}
                  title="Redo (Ctrl/Cmd+Y)"
                >
                  ⟳ Redo
                </button>
                <button
                  className="wb-btn danger"
                  onClick={onClear}
                  title="Clear"
                >
                  🗑️ Clear
                </button>
              </div>

              <div className="wb-group">
                <button className="wb-btn" onClick={() => saveBoard()}>
                  💾 {saving ? "Saving…" : "Save"}
                </button>
                <button className="wb-btn" onClick={onExportPNG}>
                  🖼️ Export PNG
                </button>
              </div>
            </div>

            <div className="wb-canvas-wrap" ref={wrapRef}>
              <canvas ref={canvasRef} className="wb-canvas" />
            </div>

            {errMenus && (
              <div className="pd-error" style={{ marginTop: 12 }}>
                Gagal memuat menu: {errMenus}
              </div>
            )}
          </section>
        </main>

        {/* Bottom nav */}
        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="whiteboard"
            onSelect={handleSelectNav}
          />
        )}

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
