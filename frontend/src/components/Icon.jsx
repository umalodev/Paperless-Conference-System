// src/components/Icon.jsx
import React, { useMemo, useState } from "react";
import { publicUrl } from "../utils/publicUrl.js";

export default function Icon({
  iconUrl,
  slug = "",
  name, // alias optional
  size = 22,
  alt = "",
  strokeWidth = 1.8,
  className = "",
  ...rest
}) {
  const [failed, setFailed] = useState(false);
  const src = useMemo(() => (iconUrl ? publicUrl(iconUrl) : null), [iconUrl]);

  // pilih node SVG berdasarkan slug/name
  const key = (slug || name || "default").toLowerCase();
  const Node = ICONS[key] || ICONS.default;

  // Jika pakai gambar dan berhasil load → tampilkan <img>
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt || slug || ""}
        width={size}
        height={size}
        className={`pd-icon-img ${className}`}
        onError={() => setFailed(true)}
        {...rest}
      />
    );
  }

  // Fallback: pakai ikon SVG berdasarkan slug
  const aria = alt
    ? { role: "img", "aria-label": alt }
    : { "aria-hidden": true };

  return (
    <svg
      className={`pd-svg ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...aria}
      {...rest}
    >
      <Node />
    </svg>
  );
}

const ICONS = {
  materials: () => (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  files: () => (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  file: () => (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8l6-6V4a2 2 0 0 0-2-2z" />
      <path d="M14 2v6h6" />
    </>
  ),
  chat: () => (
    <>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </>
  ),
  annotate: () => (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  whiteboard: () => (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  agenda: () => (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  survey: () => (
    <>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5l-4 3V6a2 2 0 0 1 2-2h11" />
    </>
  ),
  evaluation: () => (
    <>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5l-4 3V6a2 2 0 0 1 2-2h11" />
    </>
  ),
  camera: () => (
    <>
      <rect x="3" y="6" width="13" height="12" rx="3" />
      <path d="M16 10l5-3v10l-5-3z" />
    </>
  ),
  service: () => (
    <>
      <path d="M10.325 4.317a4.5 4.5 0 1 1 6.364 6.364L7 20H3v-4z" />
    </>
  ),
  documents: () => (
    <>
      <rect x="4" y="2" width="8" height="14" rx="2" />
      <rect x="12" y="8" width="8" height="14" rx="2" />
    </>
  ),
  mic: () => (
    <>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
      <path d="M12 19v3" />
    </>
  ),
  search: () => (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  users: () => (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  hand: () => (
    <>
      <path d="M8 13V7a2 2 0 0 1 4 0v6" />
      <path d="M12 13V6a2 2 0 1 1 4 0v7" />
      <path d="M16 13V8a2 2 0 1 1 4 0v5" />
      <path d="M6 13v-1a2 2 0 1 1 4 0v1" />
      <path d="M5 22h10a4 4 0 0 0 4-4v-5" />
    </>
  ),
  pin: () => (
    <>
      <path d="M16 2l6 6-8 8-4 2 2-4 8-8z" />
      <path d="M2 22l10-10" />
    </>
  ),
  dots: () => (
    <>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </>
  ),
  invite: () => (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </>
  ),
  sort: () => (
    <>
      <path d="M3 6h14" />
      <path d="M3 12h10" />
      <path d="M3 18h6" />
    </>
  ),
  download: () => (
    <>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  upload: () => (
    <>
      <path d="M12 21V9" />
      <path d="M7 14l5-5 5 5" />
      <path d="M5 3h14" />
    </>
  ),
  filter: () => (
    <>
      <path d="M22 3H2l8 9v7l4 2v-9z" />
    </>
  ),
  eye: () => (
    <>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  plus: () => (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  settings: () => (
    <>
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 3.21 17l.06-.06A1.65 1.65 0 0 0 3.6 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.09c.67 0 1.28-.39 1.51-1 .28-.68.14-1.35-.33-1.82l-.06-.06A2 2 0 1 1 6.04 3.21l.06.06c.47.47 1.14.61 1.82.33.61-.23 1-.84 1.09-1.51V2a2 2 0 1 1 4 0v.09c0 .67.39 1.28 1 1.51.68.28 1.35.14 1.82-.33l.06-.06A2 2 0 1 1 20.79 6.04l-.06.06c-.47.47-.61 1.14-.33 1.82.23.61.84 1 1.51 1.09H22a2 2 0 1 1 0 4h-.09c-.67 0-1.28.39-1.51 1z" />
    </>
  ),
  default: () => <rect x="4" y="4" width="16" height="16" rx="4" />,
};
