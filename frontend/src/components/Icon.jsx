import React, { useMemo, useState } from "react";
import { publicUrl } from "../utils/publicUrl.js";

export default function Icon({ iconUrl, slug = "", size = 22, alt = "" }) {
  const [failed, setFailed] = useState(false);
  const src = useMemo(() => (iconUrl ? publicUrl(iconUrl) : null), [iconUrl]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt || slug}
        width={size}
        height={size}
        className="pd-icon-img"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="4" />
    </svg>
  );
}
