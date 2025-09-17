// src/pages/menu/survey/Survey.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import { API_URL } from "../../../config.js";
import "./Survey.css";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../components/MeetingLayout.jsx";

import SurveyViewer from "./components/SurveyViewer.jsx";
import SurveyEditor from "./components/SurveyEditor.jsx";

import {
  getSurveysByMeeting,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  toggleVisibility,
} from "../../../services/surveyService.js";
import meetingService from "../../../services/meetingService.js";

export default function Survey() {
  const [user, setUser] = useState(null);

  // bottom nav (menus)
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  // meeting
  const meetingId = useMemo(() => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      return cm?.id || cm?.meetingId || null;
    } catch {
      return null;
    }
  }, []);

  // survey data
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // host mode
  const isHost = /^(host|admin)$/i.test(user?.role || "");
  const [manageMode, setManageMode] = useState(false);
  const [editing, setEditing] = useState(null); // survey object being edited
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // load menus
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
              slug: m.slug,
              label: m.displayLabel,
              flag: m.flag ?? "Y",
              iconUrl: m.iconMenu || null,
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

  // load surveys by meeting
  const reload = async () => {
    if (!meetingId) {
      setErr("Meeting belum aktif.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const list = await getSurveysByMeeting(meetingId);
      setSurveys(list);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );
  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  const activeSurvey = useMemo(
    () => surveys.find((s) => (s.isShow || "N") === "Y") || null,
    [surveys]
  );

  // host actions
  const startCreate = () => setEditing({}); // new survey
  const startEdit = (s) => setEditing(s); // existing survey
  const cancelEdit = () => setEditing(null);

  const saveSurvey = async (payload) => {
    try {
      setSaving(true);
      if (editing?.surveyId) {
        await updateSurvey(editing.surveyId, {
          title: payload.title,
          description: payload.description,
          isShow: payload.isShow,
          questions: payload.questions,
        });
      } else {
        await createSurvey(payload); // meetingId sudah ada di payload dari Editor
      }
      setEditing(null);
      await reload();
    } catch (e) {
      alert(`Gagal menyimpan: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const removeSurvey = async (s) => {
    if (!s?.surveyId) return;
    if (!confirm(`Hapus survey "${s.title || s.surveyId}"?`)) return;
    try {
      await deleteSurvey(s.surveyId);
      await reload();
    } catch (e) {
      alert(`Gagal menghapus: ${e.message || e}`);
    }
  };

  const setActive = async (s, flag) => {
    try {
      await toggleVisibility(s.surveyId, flag ? "Y" : "N");
      await reload();
    } catch (e) {
      alert(`Gagal mengubah visibilitas: ${e.message || e}`);
    }
  };

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}

      socket={null}
      mediasoupDevice={null}

    >
      <div className="pd-app">
        {/* topbar */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">Survey</h1>
              <div className="pd-sub">Umpan balik peserta</div>
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

                <div className="pd-user-role">
                  {user?.role || "Participant"}
                </div>

              </div>
            </div>
          </div>
        </header>

        {/* content */}
        <main className="pd-main">

          <section className="svr-wrap">
            <div className="svr-header">
              <div className="svr-title">
                <img src="/img/Survey1.png" alt="" className="svr-title-icon" />
                <span className="svr-title-text">Form Survey</span>
              </div>

              <div className="svr-header-actions">
                {isHost && !editing && (
                  <button
                    className={`svr-btn ${manageMode ? "active" : ""}`}
                    onClick={() => setManageMode((v) => !v)}
                    title={manageMode ? "Tutup Kelola" : "Kelola Survey"}
                  >
                    {/* ganti ke ikon gambar */}
                    <img src="/img/pengaturan.png" alt="" className="pd-icon-img" />
                    <span>{manageMode ? "Tutup Kelola" : "Kelola Survey"}</span>
                  </button>
                )}


                <button
                  className="svr-btn ghost"
                  onClick={reload}
                  disabled={loading}
                  title="Refresh"
                >

                  <img src="/img/refresh.png" alt="" className="pd-icon-img" />

                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {loading && <div className="pd-empty">Memuat survey…</div>}
            {err && !loading && <div className="pd-error">{err}</div>}

            {!loading && !err && (
              <>
                {/* Mode Host: daftar & editor */}
                {isHost && manageMode && !editing && (
                  <div className="svr-item">
                    <div className="svr-qtext" style={{ marginBottom: 8 }}>

                      Kelola Survey
                    </div>


                    {surveys.length === 0 ? (
                      <div className="pd-empty" style={{ marginBottom: 8 }}>
                        Belum ada survey.
                      </div>
                    ) : (
                      <div className="svr-list">
                        {surveys.map((s) => (
                          <div className="svr-item" key={s.surveyId}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>
                              {s.title || "(tanpa judul)"}{" "}
                              {s.isShow === "Y" ? (

                                <span style={{ color: "#059669" }}>• aktif</span>
                              ) : (
                                <span style={{ color: "#6b7280" }}>• draft</span>
                              )}
                            </div>

                            {s.description && (
                              <div style={{ marginBottom: 8 }}>{s.description}</div>
                            )}

                            {/* Aksi per-survey */}
<div
  style={{
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  }}
>
  <button
    className="svr-btn sm"
    onClick={() => startEdit(s)}
    title="Edit survey"
  >
    <img src="/img/edit.png" alt="" className="pd-icon-img" />
    <span>Edit</span>
  </button>

  <button
    className="svr-btn sm"
    onClick={() => setActive(s, s.isShow !== "Y")}
    title={s.isShow === "Y" ? "Sembunyikan dari peserta" : "Tampilkan ke peserta"}
  >
    <img src="/img/eye.png" alt="" className="pd-icon-img" />
    <span>{s.isShow === "Y" ? "Sembunyikan" : "Tampilkan"}</span>
  </button>

  <button
    className="svr-btn sm danger"
    onClick={() => removeSurvey(s)}
    title="Hapus survey"
  >
    <img src="/img/delete.png" alt="" className="pd-icon-img" />
    <span>Hapus</span>
  </button>
</div>


                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: 10 }}>
                      <button className="svr-submit" onClick={startCreate}>

                        <Icon slug="plus" />
                        <span>Buat Survey</span>

                      </button>
                    </div>
                  </div>
                )}

                {isHost && editing && (
                  <SurveyEditor
                    initialSurvey={editing.surveyId ? editing : null}
                    meetingId={meetingId}
                    onCancel={cancelEdit}
                    onSave={saveSurvey}
                    saving={saving}
                  />
                )}


                {/* Mode Viewer (semua role) */}
                {!manageMode && !editing && (
                  <SurveyViewer survey={activeSurvey} meetingId={meetingId} />
                )}
              </>
            )}
          </section>
        </main>

        {/* bottom nav */}
        {!loadingMenus && !errMenus && (
          <BottomNav items={visibleMenus} active="survey" onSelect={handleSelectNav} />
        )}


        <MeetingFooter userRole={user?.role || "participant"} />
      </div>
    </MeetingLayout>
  );
}
