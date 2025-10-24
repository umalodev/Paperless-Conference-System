// src/pages/menu/agenda/Agenda.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import MeetingHeader from "../../../../components/MeetingHeader.jsx";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import BottomNav from "../../../../components/BottomNav.jsx";

import { useMediaRoom } from "../../../../contexts/MediaRoomContext.jsx";
import { useModal } from "../../../../contexts/ModalProvider.jsx";
import useMeetingGuard from "../../../../hooks/useMeetingGuard.js";

import useMeetingInfo from "../../../../hooks/useMeetingInfo.js";
import useMeetingMenus from "../../../../hooks/useMeetingMenus.js";
import useAgendas from "../hooks/useAgendas.js";
import useAgendaBadge from "../hooks/useAgendaBadge.js";
import useAgendaHistory from "../hooks/useAgendaHistory.js";
import HistoryAccordion from "../../../../components/HistoryAccordion.jsx";
import useAgendaForm from "../hooks/useAgendaForm.js";

import {
  formatRange,
  toDateInputValue,
  toTimeInputValue,
} from "../../../../utils/format.js";

import AgendaFormAdd from "../components/AgendaFormAdd.jsx";
import AgendaFormEdit from "../components/AgendaFormEdit.jsx";
import AgendaItem from "../components/AgendaItem.jsx";
import AgendaSkeletonList from "../components/AgendaSkeletonList.jsx";

import "../styles/Agenda.css";
import "../../../../components/history-accordion.css";


export default function AgendaPage() {
  const navigate = useNavigate();
  const { confirm, notify } = useModal();
  const { user, displayName, meetingId, meetingTitle } = useMeetingInfo();

  const { menus, visibleMenus, loading: loadingMenus, error: errMenus } =
    useMeetingMenus();

  const {
    agendas,
    loading: agendaLoading,
    error: agendaErr,
    loadAgendas,
    deleteAgenda,
  } = useAgendas(meetingId, { notify, confirm });

  const {
    groups: historyGroups,
    loading: historyLoading,
    error: historyErr,
    loadHistory,
  } = useAgendaHistory(meetingId);

  const { badgeCount, refreshUnread, markAllRead } = useAgendaBadge(meetingId);

  const {
    form,
    editing,
    saving,
    formErr,
    showAdd,
    setShowAdd,
    showEdit,
    setShowEdit,
    handleFormChange,
    openAdd,
    closeAdd,
    openEdit,
    closeEdit,
    submitAdd,
    submitEdit,
  } = useAgendaForm(meetingId, { loadAgendas, notify, confirm, refreshUnread });

  const { ready: mediaReady, micOn, camOn, startMic, stopMic, startCam, stopCam } =
    useMediaRoom();

  const [showHistory, setShowHistory] = useState(false);
  const isHost = /^(host|admin)$/i.test(user?.role || "");

  // 🧠 Mic / Cam toggler
  const onToggleMic = () => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  };
  const onToggleCam = () => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  };

  // 🧠 Nav menu handler
  const handleSelect = (item) => navigate(`/menu/${item.slug}`);
  const navItems = visibleMenus.map((m) =>
    (m.slug || "").toLowerCase() === "agenda" ? { ...m, badge: badgeCount } : m
  );

  // 🧠 Load data awal
  useEffect(() => {
    (async () => {
      await loadAgendas();
      await markAllRead();
      await refreshUnread();
    })();
  }, []);

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory, loadHistory]);

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
    <MeetingLayout
      meetingId={meetingId}
      userId={user?.id}
      userRole={user?.role || "participant"}
      meetingTitle={meetingTitle}
    >
      <div className="pd-app agenda-page">
        {/* Header */}
        <MeetingHeader displayName={displayName} user={user} />

        {/* MAIN */}
        <main className="pd-main">
          <section className="agenda-wrap">
            <div className="agenda-header">
              <div className="agenda-title">
                <img
                  src="/img/Agenda1.png"
                  alt="Agenda"
                  className="ag-title-icon"
                />
                <span className="ag-title-text">Agenda</span>
              </div>

              <div className="agenda-actions">
                <button
                  className={`ag-btn ${showHistory ? "active" : ""}`}
                  onClick={() => setShowHistory((s) => !s)}
                >
                  <img src="/img/history.png" alt="History" className="history-icon" />
                  {showHistory ? "Close History" : "History"}
                </button>

                {isHost && (
                  <button
                    className="agenda-add"
                    title="Add agenda"
                    onClick={openAdd}
                  >
                    <img src="/img/add1.png" alt="Add" className="action-icon" />
                  </button>
                )}
              </div>
            </div>

            {/* ADD FORM */}
            {showAdd && (
              <AgendaFormAdd
                form={form}
                formErr={formErr}
                saving={saving}
                handleFormChange={handleFormChange}
                submitAdd={submitAdd}
                closeAdd={closeAdd}
              />
            )}

            {/* EDIT FORM */}
            {editing && (
              <AgendaFormEdit
                form={form}
                formErr={formErr}
                saving={saving}
                handleFormChange={handleFormChange}
                submitEdit={submitEdit}
                closeEdit={closeEdit}
              />
            )}

            {/* LIST */}
            {agendaLoading && <AgendaSkeletonList />}

            {agendaErr && !agendaLoading && (
              <div className="pd-error">Failed to load agenda: {agendaErr}</div>
            )}

            {!agendaLoading && !agendaErr && agendas.length === 0 && (
              <div className="ag-empty">
                <div className="ag-empty-icon">🗒️</div>
                <div className="ag-empty-copy">
                  <div className="ag-empty-title">No agenda yet</div>
                </div>
              </div>
            )}

            {!agendaLoading && !agendaErr && agendas.length > 0 && (
              <div className="agenda-list">
                {agendas.map((a) => (
                  <AgendaItem
                    key={a.id}
                    id={a.id}
                    title={a.title}
                    time={formatRange(a.start, a.end)}
                    desc={a.desc}
                    canEdit={isHost}
                    onEdit={() =>
                      openEdit({
                        id: a.id,
                        title: a.title,
                        desc: a.desc,
                        start: a.start,
                        end: a.end,
                      })
                    }
                    onDelete={() => deleteAgenda(a.id)}
                  />
                ))}
              </div>
            )}

            {/* HISTORY */}
            {showHistory && (
              <section className="ag-history">
                <h3 className="ag-history-title">
                  <img src="/img/history.png" alt="" className="history-icon" />
                  Agenda History
                  <span className="ag-chip ghost">
                    {historyGroups.length} meeting
                  </span>
                </h3>

                {historyLoading && (
                  <div className="pd-empty">Memuat riwayat…</div>
                )}
                {historyErr && !historyLoading && (
                  <div className="pd-error">
                    Gagal memuat riwayat: {historyErr}
                  </div>
                )}
                {!historyLoading && !historyErr && historyGroups.length === 0 && (
                  <div className="pd-empty">
                    There is no agenda history yet.
                  </div>
                )}
                {!historyLoading && !historyErr && historyGroups.length > 0 && (
                  <div className="ag-accordion">
                    {historyGroups.map((g) => (
                      <HistoryAccordion
                        key={g.meetingId}
                        title={g.title || `Meeting #${g.meetingId}`}
                        status={g.status}
                        startTime={g.startTime}
                        endTime={g.endTime}
                        count={g.agendas?.length || 0}
                        classPrefix="ag"
                        emptyText="No agenda available."
                      >
                        {g.agendas.map((a) => (
                          <div className="ag-item" key={a.id}>
                            <div className="ag-item-left">
                              <span className="ag-dot" />
                              <div className="ag-item-title">{a.judul}</div>
                            </div>
                            <div className="ag-item-right">
                              <div className="ag-item-time">{formatRange(a.startTime, a.endTime)}</div>
                            </div>
                            {a.deskripsi && <div className="ag-item-desc">{a.deskripsi}</div>}
                          </div>
                        ))}
                      </HistoryAccordion>
                    ))}
                  </div>
                )}
              </section>
            )}

            {errMenus && (
              <div className="pd-error" style={{ marginTop: 12 }}>
                Gagal memuat menu: {errMenus}
              </div>
            )}
          </section>
        </main>

        {/* Bottom Nav */}
        {!loadingMenus && !errMenus && (
          <BottomNav items={navItems} active="agenda" onSelect={handleSelect} />
        )}

        {/* Footer */}
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
