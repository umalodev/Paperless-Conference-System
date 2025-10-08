// src/pages/menu/chat/Chat.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import { API_URL } from "../../../config.js";
import "./Chating.css";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import meetingService from "../../../services/meetingService.js";
import { useMediaRoom } from "../../../contexts/MediaRoomContext.jsx";

export default function Chat() {
  const [user, setUser] = useState(null);

  // bottom nav
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");
  const [displayName, setDisplayName] = useState("");

  // chat
  const [messages, setMessages] = useState([]);
  const [loadingMsg, setLoadingMsg] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // input
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // chat mode
  const [chatMode, setChatMode] = useState("global"); // 'global' or 'private'
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  // participants (sumber kebenaran nama dari DB)
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantsLoaded, setParticipantsLoaded] = useState(false);

  const listRef = useRef(null);
  const wsRef = useRef(null);
  const navigate = useNavigate();

  const {
    ready: mediaReady,
    error: mediaError,
    micOn,
    camOn,
    startMic,
    stopMic,
    startCam,
    stopCam,
    muteAllOthers,
  } = useMediaRoom();

  const onToggleMic = useCallback(() => {
    if (!mediaReady) return;
    micOn ? stopMic() : startMic();
  }, [mediaReady, micOn, startMic, stopMic]);

  const onToggleCam = useCallback(() => {
    if (!mediaReady) return;
    camOn ? stopCam() : startCam();
  }, [mediaReady, camOn, startCam, stopCam]);

  // Helper function to get meeting ID
  const getMeetingId = () => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      const cm = raw ? JSON.parse(raw) : null;
      const meetingId = cm?.id || cm?.meetingId || null;
      return meetingId;
    } catch {
      return null;
    }
  };

  // Cache meetingId (menghindari panggilan berulang)
  const meetingIdMemo = useMemo(() => getMeetingId(), []);

  // Fallback display name lokal (jaga2 bila DB belum tersedia)
  const fallbackLocalName = useMemo(() => {
    return (
      (localStorage.getItem("pconf.displayName") || "").trim() ||
      user?.username ||
      "Participant"
    );
  }, [user]);

  // === Ambil daftar peserta dari API yang sama seperti halaman Participants
  const loadParticipants = async () => {
    const meetingId = meetingIdMemo || getMeetingId();
    if (!meetingId) return;
    try {
      setLoadingParticipants(true);
      setParticipantsLoaded(false);

      const qs = `?meetingId=${encodeURIComponent(meetingId)}`;
      let res = await fetch(`${API_URL}/api/participants/list${qs}`, {
        headers: {
          "Content-Type": "application/json",
          ...(meetingService.getAuthHeaders?.() || {}),
        },
        credentials: "include",
      });

      // fallback dev-only (menyerupai ParticipantsPage)
      if (!res.ok) {
        res = await fetch(`${API_URL}/api/participants/test-data`, {
          headers: { "Content-Type": "application/json" },
        });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (json.success) {
        const raw = Array.isArray(json.data) ? json.data : [];
        const normalized = raw.map((p) => ({
          ...p,
          id: String(p.id ?? p.participantId ?? p.userId),
          userId: String(p.userId ?? p.id ?? p.participantId),
          displayName: p.displayName || p.name || p.username || "Participant",
          mic: p.mic ?? !!p.isAudioEnabled,
          cam: p.cam ?? !!p.isVideoEnabled,
        }));
        // JANGAN filter diri sendiri di state (agar peta nama mencakup user saat ini)
        setParticipants(normalized);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error("Error loading participants:", error);
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
      setParticipantsLoaded(true);
    }
  };

  // who am I
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    const dn = localStorage.getItem("pconf.displayName") || "";
    setDisplayName(dn);
  }, []);

  // Load participants when user changes
  useEffect(() => {
    if (user?.id) {
      loadParticipants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // BottomNav menus
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

  // === Peta nama berdasarkan daftar participants (userId -> displayName)
  const nameByUserId = useMemo(() => {
    const m = new Map();
    (participants || []).forEach((p) => {
      const nm = p.displayName || p.name || p.username || "Participant";
      if (p.userId != null) m.set(String(p.userId), nm);
    });
    return m;
  }, [participants]);

  // Nama saya dari DB
  const myDbDisplayName = useMemo(() => {
    if (!user?.id) return "";
    return nameByUserId.get(String(user.id)) || "";
  }, [nameByUserId, user?.id]);

  // Load messages (setelah participants siap agar nama terpetakan dari DB)
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
      if (mode === "private" && participantId) {
        url += `&userReceiveId=${participantId}`;
      }

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.success && json.data?.messages) {
        const data = json.data.messages.map((msg) => {
          const senderName =
            nameByUserId.get(String(msg.userId)) ||
            msg.Sender?.displayName ||
            msg.Sender?.name ||
            msg.Sender?.fullName ||
            msg.Sender?.username ||
            "Unknown";

          return {
            id: msg.meetingChatId,
            userId: msg.userId,
            name: senderName,
            text: msg.textMessage || "",
            ts: new Date(msg.sendTime).getTime(),
            messageType: msg.messageType,
            filePath: msg.filePath,
            originalName: msg.originalName,
            mimeType: msg.mimeType,
            userReceiveId: msg.userReceiveId,
          };
        });
        setMessages(data);
      } else {
        setMessages([]);
      }
    } catch (e) {
      setErrMsg(String(e.message || e));
    } finally {
      setLoadingMsg(false);
    }
  };

  // TUNDA loadMessages sampai participantsLoaded
  useEffect(() => {
    if (!participantsLoaded) return;
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantsLoaded, chatMode, selectedParticipant]);

  // Remap nama pesan lama ketika daftar participants berubah
  useEffect(() => {
    if (!participants.length) return;
    setMessages((prev) =>
      prev.map((m) => ({
        ...m,
        name: nameByUserId.get(String(m.userId)) || m.name,
      }))
    );
  }, [participants, nameByUserId]);

  // WebSocket connection untuk real-time chat
  useEffect(() => {
    const meetingId = meetingIdMemo || getMeetingId();
    if (!meetingId) return;

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const token = localStorage.getItem("token") || "";
      const wsUrl = `${API_URL.replace(
        /^http/,
        "ws"
      )}/meeting/${meetingId}?token=${encodeURIComponent(token)}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        reconnectAttempts = 0;

        // Kirim identitas dengan displayName dari DB (jika ada)
        if (user?.id) {
          wsRef.current.send(
            JSON.stringify({
              type: "participant_joined",
              participantId: user.id,
              displayName: myDbDisplayName || fallbackLocalName,
            })
          );
        }
      };

      wsRef.current.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);

          if (data?.type === "chat_message") {
            const senderName =
              nameByUserId.get(String(data.userId)) ||
              data.displayName ||
              data.name ||
              data.username ||
              "Unknown";

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

            // Filter messages berdasarkan mode
            let shouldAddMessage = false;
            if (chatMode === "global") {
              shouldAddMessage = !data.userReceiveId;
            } else if (chatMode === "private" && selectedParticipant) {
              const isFromSelectedParticipant =
                String(data.userId) === String(selectedParticipant.userId);
              const isToSelectedParticipant =
                String(data.userReceiveId) ===
                String(selectedParticipant.userId);
              const isFromCurrentUser =
                String(data.userId) === String(user?.id);
              const isToCurrentUser =
                String(data.userReceiveId) === String(user?.id);

              shouldAddMessage =
                (isFromSelectedParticipant && isToCurrentUser) ||
                (isFromCurrentUser && isToSelectedParticipant);
            }

            if (!shouldAddMessage) return;

            // Prevent duplicate messages
            setMessages((prev) => {
              const isDuplicate = prev.some(
                (msg) =>
                  msg.id === newMessage.id ||
                  (String(msg.userId) === String(newMessage.userId) &&
                    msg.text === newMessage.text &&
                    Math.abs(msg.ts - newMessage.ts) < 1000)
              );
              if (isDuplicate) return prev;
              return [...prev, newMessage];
            });
          }

          // Forward event lain
          else if (data.type === "screen-share-started") {
            window.dispatchEvent(
              new CustomEvent("screen-share-started", { detail: data })
            );
          } else if (data.type === "screen-share-stopped") {
            window.dispatchEvent(
              new CustomEvent("screen-share-stopped", { detail: data })
            );
          } else if (data.type === "screen-share-producer-created") {
            window.dispatchEvent(
              new CustomEvent("screen-share-producer-created", { detail: data })
            );
          } else if (data.type === "screen-share-producer-closed") {
            window.dispatchEvent(
              new CustomEvent("screen-share-producer-closed", { detail: data })
            );
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        if (event.code === 1000) return; // normal close
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000);
          reconnectTimeout = setTimeout(() => {
            if (
              !wsRef.current ||
              wsRef.current.readyState === WebSocket.CLOSED
            ) {
              connectWebSocket();
            }
          }, delay);
        } else {
          console.error("WebSocket max reconnection attempts reached");
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close(1000, "Component unmounting");
    };
    // Sertakan dependensi yang mempengaruhi identitas & filter
  }, [
    user?.id,
    meetingIdMemo,
    chatMode,
    selectedParticipant,
    nameByUserId,
    myDbDisplayName,
    fallbackLocalName,
  ]);

  // Auto scroll ke bawah saat ada pesan baru
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loadingMsg]);

  const visibleMenus = useMemo(
    () =>
      (menus || [])
        .filter((m) => (m?.flag ?? "Y") === "Y")
        .sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999)),
    [menus]
  );

  const activeSlug = useMemo(
    () => (visibleMenus.some((m) => m.slug === "chat") ? "chat" : "exchange"),
    [visibleMenus]
  );

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const meetingId = meetingIdMemo || getMeetingId();
    if (!meetingId) {
      setErrMsg("Meeting ID tidak ditemukan");
      return;
    }

    const me = user || { username: "You", id: "me" };
    const tempId = `temp-${Date.now()}`;
    const newMsg = {
      id: tempId,
      userId: me.id || me.username,
      name: myDbDisplayName || fallbackLocalName, // pakai nama DB
      text: trimmed,
      ts: Date.now(),
      _optimistic: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setText("");
    setSending(true);

    try {
      const requestBody = { textMessage: trimmed };
      if (chatMode === "private" && selectedParticipant?.userId) {
        requestBody.userReceiveId = selectedParticipant.userId;
      }

      const res = await fetch(`${API_URL}/api/chat/meeting/${meetingId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: json.data.meetingChatId, _optimistic: false }
              : m
          )
        );
      } else {
        throw new Error(json.message || "Gagal mengirim pesan");
      }
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _error: true } : m))
      );
      setErrMsg(String(e.message || e));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const meetingId = meetingIdMemo || getMeetingId();
    if (!meetingId) {
      setErrMsg("Meeting ID tidak ditemukan");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    if (chatMode === "private" && selectedParticipant?.userId) {
      formData.append("userReceiveId", selectedParticipant.userId);
    }

    setSending(true);

    try {
      const res = await fetch(
        `${API_URL}/api/chat/meeting/${meetingId}/upload`,
        {
          method: "POST",
          headers: meetingService.getAuthHeaders(),
          body: formData,
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.success) {
        const newMessage = {
          id: json.data.meetingChatId,
          userId: user?.id,
          name: myDbDisplayName || fallbackLocalName, // pakai nama DB
          text: "",
          ts: new Date(json.data.sendTime).getTime(),
          messageType: json.data.messageType,
          filePath: json.data.filePath,
          originalName: json.data.originalName,
          mimeType: json.data.mimeType,
        };
        setMessages((prev) => [...prev, newMessage]);
      } else {
        throw new Error(json.message || "Gagal mengupload file");
      }
    } catch (e) {
      setErrMsg(String(e.message || e));
    } finally {
      setSending(false);
      event.target.value = "";
    }
  };

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
    <MeetingLayout
      meetingId={meetingIdMemo}
      userId={user?.id}
      userRole={user?.role || "participant"}
      socket={wsRef.current}
      mediasoupDevice={null}
    >
      <div className="pd-app">
        {/* Top bar */}
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
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="pd-user-name">
                  {displayName || "Participant"}
                </div>
                <div className="pd-user-role">
                  {user?.role || "Participant"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Chat content */}
        <main className="pd-main">
          <section className="chat-wrap">
            <div className="chat-header">
              <div className="chat-title">
                <img
                  src="/img/Chating1.png"
                  alt=""
                  className="chat-title-icon"
                />
                <span className="chat-title-text">
                  {chatMode === "global"
                    ? "Ruang Chat"
                    : `Chat dengan ${
                        selectedParticipant?.displayName || "Participant"
                      }`}
                </span>
              </div>
              <div className="chat-mode-buttons">
                <button
                  className={`chat-mode-btn ${
                    chatMode === "private" ? "active" : ""
                  }`}
                  onClick={() => {
                    setChatMode("private");
                    setSelectedParticipant(null);
                    if (user?.id) loadParticipants();
                  }}
                  title="Chat Pribadi"
                >
                  <Icon slug="users" iconUrl="/img/participant.png" size={20} />
                </button>
                <button
                  className={`chat-mode-btn ${
                    chatMode === "global" ? "active" : ""
                  }`}
                  onClick={() => {
                    setChatMode("global");
                    setSelectedParticipant(null);
                  }}
                  title="Chat Global"
                >
                  <Icon slug="chat" iconUrl="/img/chat.svg" size={20} />
                </button>
              </div>
            </div>

            {/* Participant selector for private chat */}
            {chatMode === "private" && !selectedParticipant && (
              <div className="participant-selector">
                <h3>Pilih Participant untuk Chat Pribadi:</h3>
                {loadingParticipants ? (
                  <div className="pd-empty">Memuat participants...</div>
                ) : participants.length > 0 ? (
                  <div className="participant-list">
                    {participants
                      .filter((p) => String(p.userId) !== String(user?.id)) // sembunyikan diri sendiri di daftar
                      .map((participant) => (
                        <button
                          key={participant.id}
                          className="participant-item"
                          onClick={() => {
                            setSelectedParticipant(participant);
                            loadMessages("private", participant.userId);
                          }}
                        >
                          <div className="participant-avatar">
                            {(participant.displayName || "U")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="participant-info">
                            <div className="participant-name">
                              {participant.displayName}
                            </div>
                            <div className="participant-role">
                              {participant.role}
                            </div>
                            <div className="participant-status">
                              <span
                                className={`status-dot ${participant.status}`}
                              ></span>
                              {participant.status}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="pd-empty">Tidak ada participant lain</div>
                )}
              </div>
            )}

            {/* Back button when in private chat */}
            {chatMode === "private" && selectedParticipant && (
              <div className="chat-back-button">
                <button
                  className="back-btn"
                  onClick={() => {
                    setSelectedParticipant(null);
                    setMessages([]);
                  }}
                >
                  ← Kembali ke Daftar Participant
                </button>
              </div>
            )}

            {loadingMsg && <div className="pd-empty">Memuat pesan…</div>}
            {errMsg && !loadingMsg && (
              <div className="pd-error">Gagal memuat chat: {errMsg}</div>
            )}

            {!loadingMsg &&
              !errMsg &&
              (chatMode === "global" || selectedParticipant) && (
                <>
                  <div className="chat-list" ref={listRef}>
                    {messages.map((m, index) => (
                      <MessageItem
                        key={`${m.id}-${m.userId}-${m.ts}-${index}`}
                        msg={m}
                        isMine={String(user?.id) === String(m.userId)}
                      />
                    ))}
                  </div>

                  <div className="chat-composer">
                    <div className="composer-left">
                      {/* <label className="chat-iconbtn" title="Lampirkan File">
                        <Icon
                          slug="attach"
                          iconUrl="/img/icons/attach.svg"
                          size={20}
                        />
                        <input
                          type="file"
                          style={{ display: "none" }}
                          onChange={handleFileUpload}
                          
                        />
                      </label> */}
                    </div>
                    <textarea
                      className="chat-input"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={onKeyDown}
                      rows={1}
                    />
                    <button
                      className="chat-send"
                      onClick={handleSend}
                      disabled={sending || !text.trim()}
                      title="Kirim"
                    >
                      <Icon slug="send" />
                    </button>
                  </div>
                </>
              )}
          </section>
        </main>

        {/* Bottom nav (ikon dari database) */}
        {!loadingMenus && !errMenus && (
          <BottomNav
            items={visibleMenus}
            active={activeSlug}
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

function MessageItem({ msg, isMine }) {
  const handleFileDownload = async () => {
    if (!msg.filePath) return;
    try {
      const res = await fetch(
        `${API_URL}/api/chat/message/${msg.id}/download`,
        {
          headers: { ...meetingService.getAuthHeaders() },
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = msg.originalName || `file-${msg.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Gagal mengunduh file.");
    }
  };

  return (
    <div className={`bubble-row ${isMine ? "mine" : ""}`}>
      {!isMine && (
        <div className="bubble-av">
          {(msg.name || "?").slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="bubble">
        {!isMine && <div className="bubble-name">{msg.name || "User"}</div>}
        <div className="bubble-text">
          {msg.messageType === "file" || msg.messageType === "image" ? (
            <div className="file-message">
              <div className="file-info">
                <span className="file-name">{msg.originalName}</span>
                <button
                  className="download-btn"
                  onClick={handleFileDownload}
                  title="Download file"
                >
                  📥
                </button>
              </div>
              {msg.text && <div className="file-caption">{msg.text}</div>}
            </div>
          ) : (
            <span>
              {msg.text}
              {msg._optimistic && (
                <span className="bubble-status"> • sending…</span>
              )}
              {msg._error && (
                <span className="bubble-status error"> • failed</span>
              )}
            </span>
          )}
        </div>
        <div className="bubble-meta">{formatTime(msg.ts)}</div>
      </div>
    </div>
  );
}

/* util kecil */
function formatTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
