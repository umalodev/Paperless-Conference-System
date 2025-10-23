import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../../components/BottomNav";
import MeetingLayout from "../../../../components/MeetingLayout.jsx";
import MeetingFooter from "../../../../components/MeetingFooter.jsx";
import "../styles/services.css";
import { formatTime } from "../../../../utils/format.js";

import { useMediaRoom } from "../../../../contexts/MediaRoomContext.jsx";
import { useModal } from "../../../../contexts/ModalProvider.jsx";
import {
  fetchUserMenus,
  fetchServices,
  sendServiceRequest,
  assignService,
  updateServiceStatus,
  cancelService,
  markSeen,
} from "../services";
import {
  resolveMeetingId,
  getMeetingDisplayName,
  setBadgeLocal,
} from "../utils";
import { ServiceQuickOptions, ServiceForm, ServiceList } from "../components";

export default function ServicesPage() {
  // ====================== STATES ======================
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  const [selectedService, setSelectedService] = useState(null);
  const [priority, setPriority] = useState("Normal");
  const [note, setNote] = useState("");

  const [myRequests, setMyRequests] = useState([]);
  const [teamRequests, setTeamRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(false);
  const [errReq, setErrReq] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [showSendHint, setShowSendHint] = useState(false);
  const hintTimerRef = useRef(null);
  const navigate = useNavigate();
  const { notify } = useModal();

  // ====================== HOOKS ======================
  const {
    ready: mediaReady,
    micOn,
    camOn,
    startMic,
    stopMic,
    startCam,
    stopCam,
  } = useMediaRoom();


  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);


  // ====================== INIT USER ======================
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
      const dn = localStorage.getItem("pconf.displayName");
      if (dn) setDisplayName(dn);
    } catch {}
  }, []);

  // ====================== LOAD MENUS ======================
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
        const list = await fetchUserMenus();
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

  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );

  // ====================== UTILS ======================
  const isAssist = String(user?.role || "").toLowerCase() === "assist";
  const canSend = !!selectedService;

  const showSuccess = (msg, opts = {}) => {
    notify({
      variant: "success",
      title: "Request Sent",
      message: msg || "Your service request has been submitted.",
      autoCloseMs: opts.autoCloseMs ?? 3000,
    });
  };

  const showError = (msg, opts = {}) => {
    notify({
      variant: "error",
      title: "Failed",
      message: msg || "An error occurred while sending the request.",
      autoCloseMs: opts.autoCloseMs ?? 5000,
    });
  };

  const onToggleMic = useCallback(() => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  }, [mediaReady, micOn, startMic, stopMic]);

  const onToggleCam = useCallback(() => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  }, [mediaReady, camOn, startCam, stopCam]);

  // ====================== LOAD REQUESTS ======================
  const loadRequests = useCallback(async () => {
    if (!user) return;
    setLoadingReq(true);
    setErrReq("");
    try {
      const { myRequests, teamRequests } = await fetchServices({
        user,
        isAssist,
      });
      setMyRequests(myRequests);
      setTeamRequests(teamRequests);
    } catch (e) {
      setErrReq(String(e.message || e));
    } finally {
      setLoadingReq(false);
    }
  }, [user, isAssist]);

  useEffect(() => {
    const mid = resolveMeetingId();
    if (!mid) return;

    if (isAssist) {
      (async () => {
        try {
          await markSeen(mid);
        } catch {}
        setBadgeLocal("services", 0);
      })();
    } else {
      setBadgeLocal("services", 0);
    }
  }, [isAssist]);

  useEffect(() => {
    loadRequests();
    const t = setInterval(loadRequests, 10000);
    return () => clearInterval(t);
  }, [loadRequests]);

  // ====================== ACTIONS ======================
  const onSend = async () => {
    if (!canSend || !user) return;
    try {
      await sendServiceRequest({
        user,
        service: selectedService,
        priority,
        note,
      });
      showSuccess(`"${selectedService.label}" (${priority})`);
      setNote("");
      setSelectedService(null);
      await loadRequests();
    } catch (e) {
      showError(`Failed: ${e.message || e}`);
      console.error(e);
    }
  };

  const onClickSend = async (e) => {
    if (!canSend) {
      e.preventDefault();
      e.stopPropagation();
      setShowSendHint(true);
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setShowSendHint(false), 1800);
      return;
    }
    await onSend();
  };

  const doAssign = async (id) => {
    setBusyId(id);
    try {
      await assignService(id);
      await loadRequests();
    } catch (e) {
      showError(`Assign failed: ${String(e.message || e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const doUpdateStatus = async (id, status) => {
    setBusyId(id);
    try {
      await updateServiceStatus(id, status);
      await loadRequests();
    } catch (e) {
      showError(`Update failed: ${String(e.message || e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const markDone = async (id) => await doUpdateStatus(id, "done");

  const doCancel = async (id) => {
    setBusyId(id);
    try {
      await cancelService(id);
      await loadRequests();
    } catch (e) {
      showError(`Cancel failed: ${String(e.message || e)}`);
    } finally {
      setBusyId(null);
    }
  };

  // ====================== UI ======================
  const quickOptions = [
    { key: "staff_assist", label: "Staff Assist", icon: "🧑‍💼" },
    { key: "mineral", label: "Mineral/Tea", icon: "🥤" },
    { key: "coffee", label: "Coffee", icon: "☕" },
    { key: "clean", label: "Clean Up", icon: "🧹" },
  ];

  const handleSelectNav = (item) => {
    navigate(`/menu/${item.slug}`);
  };

  return (
    <MeetingLayout
      meetingId={resolveMeetingId()}
      userId={user?.id || user?.userId || null}
      userRole={user?.role || "participant"}
      meetingTitle={(() => {
        try {
          const raw = localStorage.getItem("currentMeeting");
          const cm = raw ? JSON.parse(raw) : null;
          return cm?.title || `Meeting #${resolveMeetingId()}`;
        } catch {
          return `Meeting #${resolveMeetingId()}`;
        }
      })()}
    >
      <div className="pd-app services-page">
        {/* Top Bar */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">
                {localStorage.getItem("currentMeeting")
                  ? JSON.parse(localStorage.getItem("currentMeeting"))?.title ||
                    "Meeting Default"
                  : "Default"}
              </h1>
              <div className="pd-sub">
                {isAssist
                  ? "Assist console — handle participants' requests"
                  : ""}
              </div>
            </div>
          </div>
          <div className="pd-right">
            <div className="pd-clock" aria-live="polite">
              {formatTime(now)}
            </div>
            <div className="pd-user">
              <div className="pd-avatar">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="pd-user-name">{displayName || "User"}</div>
                <div className="pd-user-role">
                  {user?.role || "Participant"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="pd-main">
          <div className={`svc-grid ${isAssist ? "is-assist" : ""}`}>
            <ServiceList
              title={isAssist ? "All requests (others)" : "My Requests"}
              requests={isAssist ? teamRequests : myRequests}
              loading={loadingReq}
              error={errReq}
              isAssist={isAssist}
              busyId={busyId}
              onAssign={doAssign}
              onAccept={(id) => doUpdateStatus(id, "accepted")}
              onDone={(id) => doUpdateStatus(id, "done")}
              onMarkDone={markDone}
              onCancel={doCancel}
            />

            {!isAssist && (
              <section className="svc-card svc-main">
                <div className="svc-card-title">Quick Services</div>
                <ServiceQuickOptions
                  quickOptions={quickOptions}
                  selectedService={selectedService}
                  onSelect={setSelectedService}
                  canSend={canSend}
                  showSendHint={showSendHint}
                />
                <ServiceForm
                  selectedService={selectedService}
                  priority={priority}
                  note={note}
                  setPriority={setPriority}
                  setNote={setNote}
                  canSend={canSend}
                  onClickSend={onClickSend}
                />
              </section>
            )}
          </div>
        </main>

        {/* Bottom Navigation */}
        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active="services"
            onSelect={handleSelectNav}
          />
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
