import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ChatHeader,
  ChatList,
  ChatComposer,
  ParticipantSelector,
  PrivateChatHeader,
} from "../components";
import ChatLayout from "../layouts/ChatLayout.jsx";
import { useModal } from "../../../../contexts/ModalProvider.jsx";
import { useMediaRoom } from "../../../../contexts/MediaRoomContext.jsx";
import meetingService from "../../../../services/meetingService.js";
import meetingSocketService from "../../../../services/meetingSocketService.js";
import useMeetingGuard from "../../../../hooks/useMeetingGuard.js";
import { API_URL } from "../../../../config.js";
import {
  validateFile,
  showUploadError,
  getMeetingId,
} from "../utils";

import { formatTime } from "../../../../utils/format.js";


import "../styles/chat.css";
/**
 * ChatPage — Halaman Chat utama (global & private)
 * Modular clean architecture version
 */
export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const { notify } = useModal();
  const navigate = useNavigate();

  // === Menus ===
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  // === Chat data ===
  const [messages, setMessages] = useState([]);
  const [loadingMsg, setLoadingMsg] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // === Input ===
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // === Chat Mode ===
  const [chatMode, setChatMode] = useState("global"); // "global" | "private"
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  // === Participants ===
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantsLoaded, setParticipantsLoaded] = useState(false);

  const listRef = useRef(null);
  const wsRef = useRef(null);

  const meetingIdMemo = useMemo(() => getMeetingId(), []);

  const [firstLoadDone, setFirstLoadDone] = useState(false);


  // === Media Controls ===
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

  // === Load user ===
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    const dn = localStorage.getItem("pconf.displayName") || "";
    setDisplayName(dn);
  }, []);

  // === Load participants ===
  const loadParticipants = async () => {
    const meetingId = meetingIdMemo || getMeetingId();
    if (!meetingId) return;
    try {
      setLoadingParticipants(true);
      setParticipantsLoaded(false);

      const qs = `?meetingId=${encodeURIComponent(meetingId)}`;
      const res = await fetch(`${API_URL}/api/participants/list${qs}`, {
        headers: {
          "Content-Type": "application/json",
          ...(meetingService.getAuthHeaders?.() || {}),
        },
        credentials: "include",
      });

      const json = await res.json();
      if (json.success) {
        const normalized = (json.data || []).map((p) => ({
          ...p,
          id: String(p.id ?? p.participantId ?? p.userId),
          userId: String(p.userId ?? p.id ?? p.participantId),
          displayName: p.displayName || p.name || p.username || "Participant",
        }));
        setParticipants(normalized);
      } else setParticipants([]);
    } catch (err) {
      console.error("Error loading participants:", err);
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
      setParticipantsLoaded(true);
    }
  };

  // === Load menus ===
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

  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );

  const activeSlug = useMemo(
    () =>
      visibleMenus.some((m) => m.slug === "chat")
        ? "chat"
        : visibleMenus[0]?.slug || "",
    [visibleMenus]
  );

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  // === Map userId -> displayName ===
  const nameByUserId = useMemo(() => {
    const m = new Map();
    participants.forEach((p) => {
      if (p.userId) m.set(String(p.userId), p.displayName);
    });
    return m;
  }, [participants]);

  // === Load messages ===
  const loadMessages = async (
    mode = chatMode,
    participantId = selectedParticipant?.userId
  ) => {
    try {
      setLoadingMsg(true);
      setErrMsg("");
      const meetingId = meetingIdMemo || getMeetingId();
      if (!meetingId) throw new Error("Meeting ID tidak ditemukan");

      let url = `${API_URL}/api/chat/meeting/${meetingId}/messages?limit=50`;
      if (mode === "private" && participantId)
        url += `&userReceiveId=${participantId}`;

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
      });
      const json = await res.json();
      if (json.success && json.data?.messages) {
        const data = json.data.messages.map((msg) => ({
          id: msg.meetingChatId,
          userId: msg.userId,
          name:
            nameByUserId.get(String(msg.userId)) ||
            msg.Sender?.displayName ||
            msg.Sender?.username ||
            "Participant",
          text: msg.textMessage || "",
          ts: new Date(msg.sendTime).getTime(),
          messageType: msg.messageType,
          filePath: msg.filePath,
          originalName: msg.originalName,
          mimeType: msg.mimeType,
          userReceiveId: msg.userReceiveId,
        }));
        setMessages(data);
      } else setMessages([]);
    } catch (e) {
      setErrMsg(String(e.message || e));
    } finally {
      setLoadingMsg(false);
    }
  };

  useEffect(() => {
    if (!participantsLoaded) return;
    loadMessages();
    // eslint-disable-next-line
  }, [participantsLoaded, chatMode, selectedParticipant]);

  // === WebSocket ===
  useEffect(() => {
    const meetingId = meetingIdMemo || getMeetingId();
    if (!meetingId || !user?.id) return;

    meetingSocketService.connect(meetingId, user.id, API_URL);

    const handleChatMessage = (data) => {
      if (data?.type !== "chat_message") return;

      const senderName =
        data.displayName ||
        nameByUserId.get(String(data.userId)) ||
        data.name ||
        data.username ||
        "Participant";

      const newMessage = {
        id: data.messageId,
        userId: data.userId,
        name: senderName,
        text: data.message,
        ts: data.timestamp,
        messageType: data.messageType,
        filePath: data.filePath,
        originalName: data.originalName,
        mimeType: data.mimeType,
        userReceiveId: data.userReceiveId,
      };

      let shouldAdd = false;
      if (chatMode === "global") shouldAdd = !data.userReceiveId;
      else if (chatMode === "private" && selectedParticipant) {
        const isFromSelected =
          String(data.userId) === String(selectedParticipant.userId);
        const isToSelected =
          String(data.userReceiveId) === String(selectedParticipant.userId);
        const isFromMe = String(data.userId) === String(user?.id);
        const isToMe = String(data.userReceiveId) === String(user?.id);
        shouldAdd = (isFromSelected && isToMe) || (isFromMe && isToSelected);
      }

      if (!shouldAdd) return;

      setMessages((prev) => {
        const isDup = prev.some(
          (msg) =>
            msg.id === newMessage.id ||
            (String(msg.userId) === String(newMessage.userId) &&
              msg.text === newMessage.text &&
              Math.abs(msg.ts - newMessage.ts) < 1000)
        );
        if (isDup) return prev;
        return [...prev, newMessage];
      });
    };

    meetingSocketService.on("chat_message", handleChatMessage);
    return () => meetingSocketService.off("chat_message", handleChatMessage);
  }, [user?.id, chatMode, selectedParticipant, nameByUserId]);

  // === Auto-scroll ===
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loadingMsg]);

  // === Send message ===
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const meetingId = meetingIdMemo || getMeetingId();
    if (!meetingId) return setErrMsg("Meeting ID tidak ditemukan");

    const me = user || { username: "You", id: "me" };
    const tempId = `temp-${Date.now()}`;
    const newMsg = {
      id: tempId,
      userId: me.id,
      name: displayName || me.username,
      text: trimmed,
      ts: Date.now(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setText("");
    setSending(true);

    try {
      const body = { textMessage: trimmed };
      if (chatMode === "private" && selectedParticipant?.userId)
        body.userReceiveId = selectedParticipant.userId;

      const res = await fetch(`${API_URL}/api/chat/meeting/${meetingId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: json.data.meetingChatId, _optimistic: false }
              : m
          )
        );
      } else throw new Error(json.message || "Failed to send");
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _error: true } : m))
      );
      setErrMsg(String(e.message || e));
    } finally {
      setSending(false);
    }
  };

  // === Upload file ===
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const { valid, message } = validateFile(file);
    if (!valid) {
      showUploadError(notify, message);
      event.target.value = "";
      return;
    }

    const meetingId = meetingIdMemo || getMeetingId();
    if (!meetingId) {
      setErrMsg("Meeting ID tidak ditemukan");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (chatMode === "private" && selectedParticipant?.userId)
      formData.append("userReceiveId", selectedParticipant.userId);

    setSending(true);
    try {
      const authHeaders = meetingService.getAuthHeaders();
      delete authHeaders["Content-Type"];

      const res = await fetch(
        `${API_URL}/api/chat/meeting/${meetingId}/upload`,
        {
          method: "POST",
          headers: authHeaders,
          body: formData,
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "Gagal mengunggah file.");
    } catch (e) {
      setErrMsg(String(e.message || e));
    } finally {
      setSending(false);
      event.target.value = "";
    }
  };

  useMeetingGuard({ pollingMs: 5000, showAlert: true });


  // Load participants langsung ketika user sudah ada
useEffect(() => {
  if (user?.id) {
    loadParticipants();
  }
}, [user?.id]);

// === First load: tampilkan chat global setelah peserta siap ===
useEffect(() => {
  if (participantsLoaded && !firstLoadDone) {
    loadMessages("global");
    setChatMode("global");
    setSelectedParticipant(null);
    setFirstLoadDone(true);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [participantsLoaded]);

  // === Render ===
  return (
    <ChatLayout
      meetingId={meetingIdMemo}
      user={user}
      displayName={displayName}
      menus={visibleMenus}
      activeSlug={activeSlug}
      onSelectNav={handleSelectNav}
      micOn={micOn}
      camOn={camOn}
      onToggleMic={onToggleMic}
      onToggleCam={onToggleCam}
    >
      <ChatHeader
        chatMode={chatMode}
        selectedParticipant={selectedParticipant}
        onSwitchToPrivate={() => {
          setChatMode("private");
          setSelectedParticipant(null);
          if (user?.id) loadParticipants();
        }}
        onSwitchToGlobal={() => {
          setChatMode("global");
          setSelectedParticipant(null);
        }}
        user={user}
        loadParticipants={loadParticipants}
      />

      {chatMode === "private" && !selectedParticipant && (
        <ParticipantSelector
          participants={participants}
          user={user}
          loading={loadingParticipants}
          onSelectParticipant={(p) => {
            setSelectedParticipant(p);
            loadMessages("private", p.userId);
          }}
        />
      )}

      {chatMode === "private" && selectedParticipant && (
        <PrivateChatHeader
          onBack={() => {
            setSelectedParticipant(null);
            setMessages([]);
          }}
        />
      )}

      {loadingMsg && <div className="pd-empty">Memuat pesan…</div>}
      {errMsg && !loadingMsg && (
        <div className="pd-error">Gagal memuat chat: {errMsg}</div>
      )}

      {!loadingMsg &&
        !errMsg &&
        (chatMode === "global" || selectedParticipant) && (
          <>
            <ChatList messages={messages} userId={user?.id} listRef={listRef} />
            <ChatComposer
              text={text}
              setText={setText}
              onSend={handleSend}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onFileUpload={handleFileUpload}
              sending={sending}
            />
          </>
        )}
    </ChatLayout>
  );
}
