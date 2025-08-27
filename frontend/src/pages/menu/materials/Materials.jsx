import React, { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "../../../components/BottomNav.jsx";
import "./materials.css";
import { API_URL } from "../../../config.js";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/Icon.jsx";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";

export default function Materials() {
  const [user, setUser] = useState(null);

  // bottom nav
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  // materials
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [errItems, setErrItems] = useState("");

  // upload
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // Ambil meetingId dari localStorage
  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || cm?.code || null;
    } catch {
      return null;
    }
  }, []);

  // Helper header auth (JWT opsional) + cookie session
  const authHeaders = useMemo(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // ===== NAV menus =====
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
        setErrMenus("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          credentials: "include",
          headers: { "Content-Type": "application/json", ...authHeaders },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json?.data)
          ? json.data.map((m) => ({
              slug: m.slug,
              label: m.displayLabel,
              iconUrl: m.iconMenu || null,
              flag: m.flag ?? "Y",
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
  }, [authHeaders]);

  const visibleMenus = useMemo(
    () => (menus || []).filter((m) => (m?.flag ?? "Y") === "Y"),
    [menus]
  );
  const handleSelect = (item) => navigate(`/menu/${item.slug}`);

  // ===== Materials API =====
  const loadMaterials = async () => {
    if (!meetingId) {
      setItems([]);
      setErrItems("Meeting belum dipilih/aktif");
      setLoadingItems(false);
      return;
    }
    setLoadingItems(true);
    setErrItems("");
    try {
      const res = await fetch(
        `${API_URL}/api/materials/meeting/${encodeURIComponent(meetingId)}`,
        {
          credentials: "include",
          headers: { ...authHeaders },
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const arr = Array.isArray(json?.data) ? json.data : [];

      // Normalisasi — backend kamu biasanya kirim: { id, meetingId, path, url?, createdAt }
      const list = arr.map((x) => ({
        id: x.id,
        path: x.path,
        url: x.url || toAbsolute(API_URL, x.path),
        name: guessName(x.path),
        createdAt: x.createdAt,
      }));
      setItems(list);
    } catch (e) {
      setErrItems(String(e.message || e));
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  // Upload
  const onClickUpload = () => fileRef.current?.click();

  const onFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !meetingId) return;
    setUploading(true);
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f); // field-name HARUS "file" sesuai routes kamu
        const res = await fetch(
          `${API_URL}/api/materials/upload/${encodeURIComponent(meetingId)}`,
          {
            method: "POST",
            body: fd,
            credentials: "include",
            headers: { ...authHeaders }, // Authorization ikut terkirim
          }
        );
        if (!res.ok) {
          const t = await res.json().catch(() => ({}));
          throw new Error(t?.message || `Upload gagal (HTTP ${res.status})`);
        }
      }
      await loadMaterials();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setUploading(false);
      e.target.value = ""; // reset file input
    }
  };

  // Preview → fetch blob (pakai Authorization), lalu buka tab baru
  const handlePreview = async (it) => {
    try {
      // kalau backend kirim url statis & bisa diakses cookie, bisa langsung window.open(it.url)
      // tapi untuk JWT-only, pakai fetch blob dari download endpoint atau path langsung
      // prefer endpoint download supaya Content-Type/Disposition benar:
      const blob = await fetchBlobWithAuth(
        `${API_URL}/api/materials/${it.id}/download`,
        authHeaders
      );
      openBlobInNewTab(blob, it.name);
    } catch (e) {
      // fallback: coba open direct url (bisa gagal jika butuh header)
      try {
        window.open(it.url, "_blank", "noopener,noreferrer");
      } catch {}
    }
  };

  // Download → fetch blob + buat link unduh
  const handleDownload = async (it) => {
    try {
      const blob = await fetchBlobWithAuth(
        `${API_URL}/api/materials/${it.id}/download`,
        authHeaders
      );
      downloadBlob(blob, it.name);
    } catch (e) {
      alert(`Gagal download: ${e.message || e}`);
    }
  };

  // Delete (soft)
  const handleDelete = async (it) => {
    if (!confirm(`Hapus material "${it.name}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/materials/${it.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { ...authHeaders },
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.message || `HTTP ${res.status}`);
      }
      await loadMaterials();
    } catch (e) {
      alert(`Gagal menghapus: ${e.message || e}`);
    }
  };

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
    <div className="pd-app">
      {/* Top bar */}
      <header className="pd-topbar">
        <div className="pd-left">
          <span className="pd-live" aria-hidden />
          <div>
            <h1 className="pd-title">Materials</h1>
            <div className="pd-sub">All meeting files</div>
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
              {(user?.username || "US").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="pd-user-name">
                {user?.username || "Participant"}
              </div>
              <div className="pd-user-role">Participant</div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pd-main">
        <section className="mtl-wrap">
          <div className="mtl-header">
            <div className="mtl-title">
              <Icon slug="materials" /> <span>Materials</span>
            </div>
            <div className="mtl-actions">
              <button
                className="mtl-btn"
                onClick={onClickUpload}
                disabled={!meetingId || uploading}
              >
                <Icon slug="upload" />{" "}
                <span>{uploading ? "Uploading…" : "Upload"}</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={onFilesSelected}
              />
            </div>
          </div>

          {/* List */}
          {loadingItems && <div className="pd-empty">Loading materials…</div>}
          {errItems && !loadingItems && (
            <div className="pd-error">Gagal memuat materials: {errItems}</div>
          )}
          {!loadingItems && !errItems && items.length === 0 && (
            <div className="pd-empty">Belum ada materials.</div>
          )}

          {!loadingItems && !errItems && items.length > 0 && (
            <div className="mtl-grid">
              {items.map((it) => (
                <MaterialCard
                  key={it.id}
                  name={it.name}
                  meta={formatMeta(it)}
                  onPreview={() => handlePreview(it)}
                  onDownload={() => handleDownload(it)}
                  onDelete={() => handleDelete(it)}
                />
              ))}
            </div>
          )}

          {/* error menu nav bila ada */}
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
          active="materials"
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}

function MaterialCard({ name, meta, onPreview, onDownload, onDelete }) {
  return (
    <div className="mtl-card">
      <div className="mtl-fileicon">
        <Icon slug="file" />
      </div>
      <div className="mtl-info">
        <div className="mtl-name" title={name}>
          {name}
        </div>
        <div className="mtl-meta">{meta}</div>
      </div>
      <div className="mtl-actions-right">
        <button className="mtl-act" title="Preview" onClick={onPreview}>
          <Icon slug="eye" />
        </button>
        <button className="mtl-act" title="Download" onClick={onDownload}>
          <Icon slug="download" />
        </button>
        <button className="mtl-act danger" title="Delete" onClick={onDelete}>
          <Icon slug="trash" />
        </button>
      </div>
    </div>
  );
}

/* ====================== utils kecil ====================== */
function guessName(p = "") {
  try {
    const s = p.split("?")[0];
    return s.split("/").pop() || "file";
  } catch {
    return "file";
  }
}
function toAbsolute(base, rel) {
  if (!rel) return "";
  if (/^https?:\/\//i.test(rel)) return rel;
  if (rel.startsWith("/")) return base + rel;
  return `${base}/${rel}`;
}
function formatMeta(it) {
  // kamu bisa menambah size/type jika backend kirim
  return it.createdAt ? new Date(it.createdAt).toLocaleString() : "—";
}
async function fetchBlobWithAuth(url, authHeaders = {}) {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { ...authHeaders },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.blob();
}
function openBlobInNewTab(blob, filename = "file") {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  // fallback simpan kalau popup diblok
  if (!win) downloadBlob(blob, filename);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function downloadBlob(blob, filename = "file") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
