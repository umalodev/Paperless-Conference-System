// src/features/whiteboard/components/WhiteboardToolbar.jsx
import React from "react";
import Icon from "../../../components/Icon.jsx";

export default function WhiteboardToolbar({
  tool,
  color,
  size,
  saving,
  setTool,
  setColor,
  setSize,
  onUndo,
  onRedo,
  onClear,
  onSave,
  onExport,
}) {
  return (
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
        <button className="wb-btn ghost" onClick={onUndo} title="Undo (Ctrl/Cmd+Z)">
          ⟲ Undo
        </button>
        <button className="wb-btn ghost" onClick={onRedo} title="Redo (Ctrl/Cmd+Y)">
          ⟳ Redo
        </button>
        <button className="wb-btn danger" onClick={onClear} title="Clear">
          🗑️ Clear
        </button>
      </div>

      <div className="wb-group">
        <button className="wb-btn" onClick={onSave}>
          💾 {saving ? "Saving…" : "Save"}
        </button>
        <button className="wb-btn" onClick={onExport}>
          🖼️ Export PNG
        </button>
      </div>
    </div>
  );
}
