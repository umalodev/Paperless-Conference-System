import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export default function ServiceRequestCard({
  request,
  isAssist,
  busyId,
  onAssign,
  onAccept,
  onDone,
  onMarkDone,
  onCancel,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuBtnRef = useRef(null);
  const r = request;

  // ✅ Tutup dropdown kalau klik di luar
  useEffect(() => {
    const handlePointerDown = (e) => {
      const dropdownEl = document.querySelector(".svc-dropdown");
      if (
        !menuBtnRef.current?.contains(e.target) &&
        !(dropdownEl && dropdownEl.contains(e.target))
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  // ✅ Hitung posisi dropdown
  useEffect(() => {
    if (menuOpen && menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.right - 190,
      });
    }
  }, [menuOpen]);

  // ✅ Ikon layanan
  const iconFor = (key) =>
    key === "coffee"
      ? "☕"
      : key === "mineral"
      ? "🥤"
      : key === "clean"
      ? "🧹"
      : key === "staff_assist"
      ? "🧑‍💼"
      : "🔔";

  // ✅ Badge status
  const StatusBadge = ({ status }) => {
    const label =
      status === "done"
        ? "✅ Completed"
        : status === "accepted"
        ? "🟢 Accepted"
        : status === "pending"
        ? "🕓 Pending"
        : status === "cancelled"
        ? "🔴 Cancelled"
        : status;
    return <span className={`svc-status svc-status--${status}`}>{label}</span>;
  };

  // ✅ Item di dropdown
  const ActionItem = ({ label, onClick, danger = false, disabled = false }) => (
    <button
      className={`svc-action-item ${danger ? "danger" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );

  // ✅ Dropdown portal
  const dropdown = menuOpen
    ? createPortal(
        <div
          className="svc-dropdown"
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 9999999,
            pointerEvents: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(!r.handledByUserId || r.status === "pending") && (
            <ActionItem
              label="Assign to me"
              onClick={() => {
                onAssign?.(r.serviceRequestId);
                setMenuOpen(false);
              }}
              disabled={busyId === r.serviceRequestId}
            />
          )}
          {r.status === "pending" && (
            <ActionItem
              label="Accept"
              onClick={() => {
                onAccept?.(r.serviceRequestId);
                setMenuOpen(false);
              }}
              disabled={busyId === r.serviceRequestId}
            />
          )}
          {r.status === "accepted" && (
            <ActionItem
              label="Mark as Done"
              onClick={() => {
                onDone?.(r.serviceRequestId);
                setMenuOpen(false);
              }}
              disabled={busyId === r.serviceRequestId}
            />
          )}
          {isAssist && r.status !== "done" && (
            <ActionItem
              label="Force Complete"
              onClick={() => {
                onMarkDone?.(r.serviceRequestId);
                setMenuOpen(false);
              }}
              disabled={busyId === r.serviceRequestId}
            />
          )}
          {r.status !== "done" && r.status !== "cancelled" && (
            <ActionItem
              label="Cancel Request"
              danger
              onClick={() => {
                onCancel?.(r.serviceRequestId);
                setMenuOpen(false);
              }}
              disabled={busyId === r.serviceRequestId}
            />
          )}
        </div>,
        document.body
      )
    : null;

  // ✅ Tidak tampilkan tombol ⋯ jika status done atau cancelled
  const shouldShowMenu = !["done", "cancelled"].includes(r.status);

  return (
    <div className="svc-card-item elegant">
      <div className="svc-info">
        <div className="svc-icon">{iconFor(r.serviceKey)}</div>
        <div className="svc-details">
          <div className="svc-header">
            <span className="svc-label">{r.serviceLabel}</span>

            {/* Tombol ⋯ hanya kalau masih aktif */}
            {shouldShowMenu && (
              <div ref={menuBtnRef}>
                <button
                  className="svc-menu-btn"
                  onClick={() => setMenuOpen((p) => !p)}
                  title="More actions"
                >
                  ⋯
                </button>
              </div>
            )}
          </div>

          {/* Display Name dan Priority */}
          <div className="svc-meta">
            <span>{r.name}</span> • <span>{r.priority}</span>
          </div>

          {/* Note jika ada */}
          {r.note && <div className="svc-note">📝 {r.note}</div>}

          {/* Status dipindahkan ke bawah */}
          <div className="svc-status-row">
            <StatusBadge status={r.status} />
          </div>
        </div>
      </div>

      {/* Render dropdown di luar layout */}
      {dropdown}
    </div>
  );
}
