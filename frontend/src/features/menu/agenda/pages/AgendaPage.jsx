// src/pages/menu/agenda/Agenda.jsx
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import BottomNav from "../../../../components/BottomNav.jsx";
import { API_URL } from "../../../../config.js";
import { useNavigate } from "react-router-dom";
import useMeetingGuard from "../../../../hooks/useMeetingGuard.js";
import "../styles/Agenda.css";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import meetingService from "../../../../services/meetingService.js";
import { useMediaRoom } from "../../../../contexts/MediaRoomContext.jsx";
import { useModal } from "../../../../contexts/ModalProvider.jsx";

// ======= modular pieces =======
import AgendaHeader from "../components/AgendaHeader.jsx";
import AgendaFormAdd from "../components/AgendaFormAdd.jsx";
import AgendaFormEdit from "../components/AgendaFormEdit.jsx";
import AgendaItem from "../components/AgendaItem.jsx";
import AgendaHistoryGroup from "../components/AgendaHistoryGroup.jsx";
import AgendaSkeletonList from "../components/AgendaSkeletonList.jsx";

import useAgendas from "../hooks/useAgendas.js";
import useAgendaHistory from "../hooks/useAgendaHistory.js";
import useAgendaBadge from "../hooks/useAgendaBadge.js";
import {
  formatRange,
  toDateInputValue,
  toTimeInputValue,
} from "../../../../utils/format.js";

export default function Agenda() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const { confirm, notify } = useModal();

  // nav menu
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  // bottom nav items dengan badge
  const [navItems, setNavItems] = useState([]);

  // refs untuk add form
  const addJudulRef = useRef(null);
  const addDateRef = useRef(null);
  const addStartRef = useRef(null);
  const addEndRef = useRef(null);

  // add / edit form
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [form, setForm] = useState({
    judul: "",
    deskripsi: "",
    date: "",
    start: "",
    end: "",
  });
  const [editing, setEditing] = useState(null); // { id } | null

  // history
  const [showHistory, setShowHistory] = useState(false);

  const isHost = /^(host|admin)$/i.test(user?.role || "");
  const navigate = useNavigate();

  // meetingId dari localStorage
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

  // jika meeting diakhiri dari tempat lain
  useEffect(() => {
    const handleMeetingEnd = () => {
      localStorage.removeItem("currentMeeting");
      navigate("/start");
    };
    window.addEventListener("meeting-ended", handleMeetingEnd);
    return () => window.removeEventListener("meeting-ended", handleMeetingEnd);
  }, [navigate]);

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

  // ================== MENUS ==================
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
              flag: m.flag ?? "Y",
              iconUrl: m.iconMenu || null,
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

  // FILTER menu tampil
  const visibleMenus = useMemo(
    () => (menus || []).filter((m) => (m?.flag ?? "Y") === "Y"),
    [menus]
  );
  const handleSelect = (item) => navigate(`/menu/${item.slug}`);

  // ================== AGENDAS / HISTORY / BADGE ==================
  const { agendas, loading: agendaLoading, error: agendaErr, loadAgendas } =
    useAgendas(meetingId, { notify, confirm });

  const {
    groups: historyGroups,
    loading: historyLoading,
    error: historyErr,
    loadHistory,
  } = useAgendaHistory(meetingId);

  const { badgeCount, refreshUnread, markAllRead } = useAgendaBadge(meetingId);

  // suntik badge ke nav items
  useEffect(() => {
    // init dari visible menus
    setNavItems(
      (visibleMenus || []).map((m) =>
        (m.slug || "").toLowerCase() === "agenda" ? { ...m, badge: badgeCount } : m
      )
    );
  }, [visibleMenus, badgeCount]);

  // refresh unread setelah menu siap
  useEffect(() => {
    if (visibleMenus && visibleMenus.length) {
      refreshUnread();
    }
  }, [visibleMenus, refreshUnread]);

  // ================== FORM HANDLERS ==================
  const openAdd = () => {
    setEditing(null);
    setFormErr("");
    setShowAdd(true);
  };
  const closeAdd = () => {
    setShowAdd(false);
    setSaving(false);
    setFormErr("");
    setForm({ judul: "", deskripsi: "", date: "", start: "", end: "" });
  };
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    setFormErr("");

    const formEl = e.currentTarget;
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }

    if (!meetingId) return setFormErr("Meeting belum ada. Buat/Join dulu.");
    if (!form.judul.trim()) return setFormErr("Title is required.");
    if (!form.date || !form.start || !form.end)
      return setFormErr("Date, start time, and end time are required.");

    const startDate = new Date(`${form.date}T${form.start}`);
    const endDate = new Date(`${form.date}T${form.end}`);
    if (!(startDate < endDate))
      return setFormErr("End time must be greater than start time.");

    await confirm({
      title: "Save New Agenda?",
      message: `Agenda "${form.judul}" will be saved to this meeting.`,
      okText: "Save",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setSaving(true);
          const body = {
            meetingId,
            judul: form.judul.trim(),
            deskripsi: form.deskripsi?.trim() || null,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            seq: agendas.length + 1,
          };
          const res = await fetch(`${API_URL}/api/agendas`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...meetingService.getAuthHeaders(),
            },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const t = await res.json().catch(() => ({}));
            throw new Error(t?.message || `HTTP ${res.status}`);
          }
          await loadAgendas();
          closeAdd();
          await notify({
            variant: "success",
            title: "Agenda Saved",
            message: "New agenda has been successfully added.",
            autoCloseMs: 2000,
          });
          await refreshUnread(); // update badge
        } catch (e) {
          setFormErr(String(e.message || e));
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const openEdit = (a) => {
    setShowAdd(false);
    setFormErr("");
    setEditing({ id: a.id });
    setForm({
      judul: a.title || "",
      deskripsi: a.desc || "",
      date: toDateInputValue(a.start),
      start: toTimeInputValue(a.start),
      end: toTimeInputValue(a.end),
    });
  };
  const closeEdit = () => {
    setEditing(null);
    setSaving(false);
    setFormErr("");
    setForm({ judul: "", deskripsi: "", date: "", start: "", end: "" });
  };
  const submitEdit = async (e) => {
    e.preventDefault();
    setFormErr("");

    if (!editing?.id) return setFormErr("Invalid agenda data.");
    if (!form.judul.trim()) return setFormErr("Title is required.");
    if (!form.date || !form.start || !form.end)
      return setFormErr("Date, start time, and end time are required.");

    const startDate = new Date(`${form.date}T${form.start}`);
    const endDate = new Date(`${form.date}T${form.end}`);
    if (!(startDate < endDate))
      return setFormErr("End time must be greater than start time.");

    await confirm({
      title: "Save Agenda Changes?",
      message: `Changes to agenda "${form.judul}" will be saved.`,
      okText: "Save Changes",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setSaving(true);
          const body = {
            judul: form.judul.trim(),
            deskripsi: form.deskripsi?.trim() || null,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
          };
          const res = await fetch(
            `${API_URL}/api/agendas/${encodeURIComponent(editing.id)}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                ...meetingService.getAuthHeaders(),
              },
              body: JSON.stringify(body),
            }
          );
          if (!res.ok) {
            const t = await res.json().catch(() => ({}));
            throw new Error(t?.message || `HTTP ${res.status}`);
          }
          await loadAgendas();
          closeEdit();
          await notify({
            variant: "success",
            title: "Agenda Updated",
            message: "Agenda changes have been successfully saved.",
            autoCloseMs: 2000,
          });
          await refreshUnread();
        } catch (e) {
          setFormErr(String(e.message || e));
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const setBadgeLocal = useCallback((slug, value) => {
    try {
      const key = "badge.map";
      const raw = localStorage.getItem(key);
      const map = raw ? JSON.parse(raw) : {};
      map[slug] = value;
      localStorage.setItem(key, JSON.stringify(map));
      window.dispatchEvent(new Event("badge:changed"));
    } catch {}
  }, []);

  // ketika halaman Agenda tampil: load list -> tandai read -> set badge 0
  useEffect(() => {
    (async () => {
      await loadAgendas();
      await markAllRead();
      setBadgeLocal("agenda", 0);
      await refreshUnread();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      socket={null}
      mediasoupDevice={null}
      meetingTitle={(() => {
        try {
          const raw = localStorage.getItem("currentMeeting");
          const cm = raw ? JSON.parse(raw) : null;
          return cm?.title || `Meeting #${meetingId}`;
        } catch {
          return `Meeting #${meetingId}`;
        }
      })()}
    >
      <div className="pd-app agenda-page">
        {/* Top bar */}
        <AgendaHeader displayName={displayName} user={user} />

        {/* Content */}
        <main className="pd-main">
          <section className="agenda-wrap">
            <div className="agenda-header">
              <div className="agenda-title">
                <img
                  src="/img/Agenda1.png"
                  alt=""
                  aria-hidden="true"
                  className="ag-title-icon"
                />
                <span className="ag-title-text">Agenda</span>
              </div>

              <div className="agenda-actions">
                <button
                  className={`ag-btn ${showHistory ? "active" : ""}`}
                  onClick={() => setShowHistory((s) => !s)}
                >
                  <img src="/img/history.png" alt="" className="history-icon" />
                  {showHistory ? "Close History" : "History"}
                </button>

                {isHost && (
                  <button
                    className="agenda-add"
                    title="Add agenda"
                    onClick={openAdd}
                  >
                    <img
                      src="/img/add1.png"
                      alt="Add agenda"
                      className="action-icon"
                    />
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
                addJudulRef={addJudulRef}
                addDateRef={addDateRef}
                addStartRef={addStartRef}
                addEndRef={addEndRef}
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

            {/* ================== CURRENT AGENDAS ================== */}
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
                    onEdit={() => openEdit(a)}
                    onDelete={async () => {
                      // duplicated behavior preserved via fetch + notify
                      const ok = await confirm({
                        title: "Delete Agenda?",
                        message:
                          "This agenda will be deleted from the meeting. This action cannot be undone.",
                        destructive: true,
                        okText: "Delete",
                        cancelText: "Cancel",
                        onConfirm: async () => {
                          try {
                            const res = await fetch(
                              `${API_URL}/api/agendas/${encodeURIComponent(a.id)}`,
                              {
                                method: "DELETE",
                                headers: meetingService.getAuthHeaders(),
                              }
                            );
                            if (!res.ok) {
                              const t = await res.json().catch(() => ({}));
                              throw new Error(t?.message || `HTTP ${res.status}`);
                            }
                            await loadAgendas();
                            await notify({
                              variant: "success",
                              title: "Agenda Deleted",
                              message:
                                "Agenda has been successfully deleted from the meeting.",
                              autoCloseMs: 2000,
                            });
                            await refreshUnread();
                          } catch (e) {
                            await notify({
                              variant: "error",
                              title: "Gagal Menghapus",
                              message: `Error: ${e.message || e}`,
                              autoCloseMs: 3000,
                            });
                          }
                        },
                      });
                      if (!ok) return;
                    }}
                  />
                ))}
              </div>
            )}

            {/* ================== HISTORY ================== */}
            {showHistory && (
              <>
                <div className="ag-divider" />
                <section className="ag-history">
                  <h3 className="ag-history-title">
                    <img
                      src="/img/history.png"
                      alt=""
                      className="history-icon"
                    />
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
                    <div className="pd-empty">There is no agenda history yet.</div>
                  )}

                  {!historyLoading && !historyErr && historyGroups.length > 0 && (
                    <div className="ag-accordion">
                      {historyGroups.map((g) => (
                        <AgendaHistoryGroup key={g.meetingId} group={g} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {errMenus && (
              <div className="pd-error" style={{ marginTop: 12 }}>
                Gagal memuat menu: {errMenus}
              </div>
            )}
          </section>
        </main>

        {/* Bottom nav */}
        {!loadingMenus && !errMenus && (
          <BottomNav items={navItems} active="agenda" onSelect={handleSelect} />
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
