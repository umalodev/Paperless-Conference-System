import SurveyLayout from "../layouts/SurveyLayout.jsx";
import { useSurveyManager } from "../hooks";
import { useMediaRoom } from "../../../../contexts/MediaRoomContext.jsx";
import useMeetingGuard from "../../../../hooks/useMeetingGuard.js";
import "../styles/Survey.css";
import {
  SurveyViewer,
  SurveyEditor,
  SurveyResponses,
} from "../components";
import Icon from "../../../../components/Icon.jsx";

export default function SurveyPage() {
  const {
    user,
    displayName,
    meetingId,
    isHost,
    visibleMenus,
    handleSelectNav,
    surveys,
    activeSurvey,
    manageMode,
    setManageMode,
    showResponses,
    setShowResponses,
    editing,
    startCreate,
    startEdit,
    cancelEdit,
    saveSurvey,
    removeSurvey,
    setActive,
    reload,
    loading,
    err,
    loadingMenus,
    errMenus,
    saving,
  } = useSurveyManager();

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

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
    <SurveyLayout
      meetingId={meetingId}
      user={user}
      displayName={displayName}
      visibleMenus={visibleMenus}
      onSelectNav={handleSelectNav}
      micOn={micOn}
      camOn={camOn}
      onToggleMic={onToggleMic}
      onToggleCam={onToggleCam}
      loadingMenus={loadingMenus}
      errMenus={errMenus}
    >
      {/* === Konten Survey === */}
      <section className="svr-wrap">
        <div className="svr-header">
          <div className="svr-title">
            <img src="/img/Survey1.png" alt="" className="svr-title-icon" />
            <span className="svr-title-text">Survey</span>
          </div>

          <div className="svr-header-actions">
            {isHost && !editing && (
              <button
                className={`svr-btn ${manageMode ? "active" : ""}`}
                onClick={() => setManageMode((v) => !v)}
              >
                <img src="/img/pengaturan.png" alt="" className="pd-icon-img" />
                <span>{manageMode ? "Close Manage" : "Manage surveys"}</span>
              </button>
            )}

            {isHost && !editing && activeSurvey && (
              <button
                className={`svr-btn ${showResponses ? "active" : ""}`}
                onClick={() => setShowResponses((v) => !v)}
              >
                <img src="/img/eye.png" alt="" className="pd-icon-img" />
                <span>{showResponses ? "Tutup Jawaban" : "Lihat Jawaban"}</span>
              </button>
            )}

            <button
              className="svr-btn ghost"
              onClick={reload}
              disabled={loading}
            >
              <img src="/img/refresh.png" alt="" className="pd-icon-img" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {loading && <div className="pd-empty">Loading survey...</div>}
        {err && !loading && <div className="pd-error">{err}</div>}

        {!loading && !err && (
          <>
            {isHost && !editing && showResponses && activeSurvey && (
              <SurveyResponses survey={activeSurvey} />
            )}

            {isHost && manageMode && !editing && (
              <div className="svr-item">
                <div className="svr-qtext" style={{ marginBottom: 8 }}>
                  Manage Surveys
                </div>

                {surveys.length === 0 ? (
                  <div className="pd-empty" style={{ marginBottom: 8 }}>
                    There is no survey yet.
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

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            className="svr-btn sm"
                            onClick={() => startEdit(s)}
                          >
                            <img src="/img/edit.png" alt="" className="pd-icon-img" />
                            <span>Edit</span>
                          </button>

                          <button
                            className="svr-btn"
                            onClick={() => setActive(s, s.isShow !== "Y")}
                          >
                            <img src="/img/eye.png" alt="" className="pd-icon-img" />
                            <span>
                              {s.isShow === "Y" ? "Sembunyikan" : "Tampilkan"}
                            </span>
                          </button>

                          <button
                            className="svr-btn sm danger"
                            onClick={() => removeSurvey(s)}
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
                    <span>Create a Survey</span>
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

            {!manageMode && !editing && (
              <SurveyViewer survey={activeSurvey} meetingId={meetingId} />
            )}
          </>
        )}
      </section>
    </SurveyLayout>
  );
}
