// src/features/chat/components/MessageItem.jsx
import React from "react";
import { chatApi } from "../services";
import { formatTime } from "../../../../utils/format.js"; // ✅ pakai formatter global

/* 🎨 Warna khas per user (untuk teks & avatar) */
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

/* 🧩 Komponen utama MessageItem */
export default function MessageItem({ msg, isMine }) {
  const handleFileDownload = async () => {
    if (!msg.filePath) return;
    try {
      await chatApi.downloadFile(msg.id, msg.originalName);
    } catch (e) {
      console.error(e);
      alert("Gagal mengunduh file.");
    }
  };

  const name = msg.name || "User";
  const nameColor = stringToColor(name);

  // 🟢 Ambil dua huruf pertama dari dua kata pertama
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

  const isFile = msg.messageType === "file" || msg.messageType === "image";

  return (
    <div className={`bubble-row ${isMine ? "mine" : ""}`}>
      {/* Avatar (hanya untuk pesan orang lain) */}
      {!isMine && (
        <div
          className="bubble-av"
          style={{
            background: "#e5e7eb",
            color: nameColor,
            fontWeight: 700,
            fontSize: 12,
            width: 32,
            height: 32,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            userSelect: "none",
          }}
        >
          {initials}
        </div>
      )}

      {/* Bubble utama */}
      <div
        className="bubble"
        style={{
          background: isMine ? "#0b0b0f" : "#ffffff",
          color: isMine ? "#fff" : "#111",
          border: isMine ? "none" : "1px solid #e5e7eb",
          borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          padding: "8px 12px",
          maxWidth: "75%",
          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          animation: "fadeIn 0.25s ease",
        }}
      >
        {/* Nama pengirim (warna khas per user) */}
        {!isMine && (
          <div
            className="bubble-name"
            style={{
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 4,
              color: nameColor,
            }}
          >
            {name}
          </div>
        )}

        {/* Isi pesan */}
        <div className="bubble-text" style={{ fontSize: 14, lineHeight: 1.4 }}>
          {isFile ? (
            <div
              className="file-message"
              style={{
                background: isMine
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(240,240,240,0.6)",
                borderRadius: 8,
                padding: "6px 8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                className="file-name"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                📎 {msg.originalName}
              </span>
              <button
                className="download-btn"
                onClick={handleFileDownload}
                title="Download file"
                style={{
                  background: "none",
                  border: "none",
                  color: isMine ? "#fff" : "#333",
                  fontSize: 18,
                  cursor: "pointer",
                  transition: "transform 0.12s ease",
                }}
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = "scale(0.9)")
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                ⬇️
              </button>
            </div>
          ) : (
            <span>
              {msg.text}
              {msg._optimistic && (
                <span
                  style={{
                    opacity: 0.7,
                    fontSize: 12,
                    marginLeft: 4,
                  }}
                  className="bubble-status"
                >
                  • sending…
                </span>
              )}
              {msg._error && (
                <span
                  style={{
                    color: "#fee2e2",
                    fontSize: 12,
                    marginLeft: 4,
                  }}
                  className="bubble-status error"
                >
                  • failed
                </span>
              )}
            </span>
          )}
        </div>

        {/* 🕒 Waktu (pakai formatTime global) */}
        <div
          className="bubble-meta"
          style={{
            textAlign: "right",
            fontSize: 11,
            opacity: 0.8,
            marginTop: 4,
            color: isMine ? "#d1fae5" : "#666",
          }}
        >
          {formatTime(msg.ts)}
        </div>
      </div>
    </div>
  );
}

/* animasi halus saat pesan muncul */
const style = document.createElement("style");
style.innerHTML = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}`;
document.head.appendChild(style);
