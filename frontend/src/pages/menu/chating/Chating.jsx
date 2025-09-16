// src/pages/menu/chat/Chat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import { API_URL } from "../../../config.js";
import "./Chating.css";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";
import MeetingFooter from "../../../components/MeetingFooter.jsx";
import MeetingLayout from "../../../components/MeetingLayout.jsx";
import meetingService from "../../../services/meetingService.js";
// Removed inline screen share usage; viewing is moved to dedicated page

export default function Chat() {
  const [user, setUser] = useState(null);

  // bottom nav
  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errMenus, setErrMenus] = useState("");

  // chat
  const [messages, setMessages] = useState([]);
  const [loadingMsg, setLoadingMsg] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // input
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // Screen sharing UI moved to dedicated page

  // chat mode
  const [chatMode, setChatMode] = useState("global"); // 'global' or 'private'
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const listRef = useRef(null);
  const wsRef = useRef(null);
  const navigate = useNavigate();

  // Helper function to get meeting ID
  const getMeetingId = () => {
    try {
      const raw = localStorage.getItem("currentMeeting");
      console.log("=== MEETING ID DEBUG ===");
      console.log("Raw currentMeeting from localStorage:", raw);
      const cm = raw ? JSON.parse(raw) : null;
      console.log("Parsed currentMeeting object:", cm);
      console.log("Meeting ID from cm.id:", cm?.id);
      console.log("Meeting ID from cm.meetingId:", cm?.meetingId);
      const meetingId = cm?.id || cm?.meetingId || null;
      console.log("Final extracted meeting ID:", meetingId);
      console.log("Meeting ID type:", typeof meetingId);
      return meetingId;
    } catch (error) {
      console.error("Error parsing currentMeeting:", error);
      return null;
    }
  };

  // Load participants for private chat
  const loadParticipants = async () => {
    const meetingId = getMeetingId();
    console.log("=== LOAD PARTICIPANTS DEBUG ===");
    console.log("Loading participants for meeting:", meetingId);
    console.log("Meeting ID type:", typeof meetingId);
    if (!meetingId) {
      console.log("No meeting ID found, returning early");
      return;
    }

    try {
      setLoadingParticipants(true);
      const url = `${API_URL}/api/chat/meeting/${meetingId}/participants`;
      console.log("=== API CALL DEBUG ===");
      console.log("API_URL:", API_URL);
      console.log("Meeting ID for API:", meetingId);
      console.log("Full API URL:", url);

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...meetingService.getAuthHeaders(),
        },
      });

      console.log("=== API RESPONSE DEBUG ===");
      console.log("Response status:", res.status);
      console.log("Response ok:", res.ok);
      console.log("Response headers:", res.headers);

      if (res.ok) {
        const json = await res.json();
        console.log("=== API RESPONSE DATA ===");
        console.log("Full response:", json);
        console.log("Response success:", json.success);
        console.log("Response message:", json.message);
        console.log("Response data:", json.data);
        console.log("Data type:", typeof json.data);
        console.log("Data length:", json.data?.length);
        console.log("Data is array:", Array.isArray(json.data));

        if (json.success && json.data) {
          // Filter out current user
          console.log("=== USER FILTERING DEBUG ===");
          const currentUserId = user?.id;
          console.log("Current user ID:", currentUserId);
          console.log("Current user ID type:", typeof currentUserId);
          console.log("Current user object:", user);
          console.log("All participants before filtering:", json.data);
          console.log(
            "Number of participants before filtering:",
            json.data.length
          );

          const filteredParticipants = json.data.filter((p) => {
            const participantUserId = p.userId; // Use userId from transformed data
            const currentUserIdNum = parseInt(currentUserId);
            const participantUserIdNum = parseInt(participantUserId);
            console.log(`=== FILTERING COMPARISON ===`);
            console.log(`Participant: ${p.name} (ID: ${participantUserId})`);
            console.log(
              `Current user ID: ${currentUserId} -> parsed: ${currentUserIdNum}`
            );
            console.log(
              `Participant user ID: ${participantUserId} -> parsed: ${participantUserIdNum}`
            );
            console.log(
              `Comparison: ${participantUserIdNum} !== ${currentUserIdNum} = ${
                participantUserIdNum !== currentUserIdNum
              }`
            );
            const shouldInclude = participantUserIdNum !== currentUserIdNum;
            console.log(`Should include in list: ${shouldInclude}`);
            return shouldInclude;
          });
          console.log("=== FILTERING RESULT ===");
          console.log("Filtered participants:", filteredParticipants);
          console.log(
            "Number of participants after filtering:",
            filteredParticipants.length
          );
          setParticipants(filteredParticipants);
        }
      } else {
        const errorText = await res.text();
        console.log("=== API ERROR ===");
        console.error("Participants API error:", res.status, errorText);
        console.log("Error response text:", errorText);
      }
    } catch (error) {
      console.error("Error loading participants:", error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // Load participants when component mounts or user changes
  useEffect(() => {
    console.log("=== USEEFFECT DEBUG ===");
    console.log("useEffect triggered - user:", user);
    console.log("User ID:", user?.id);
    if (user?.id) {
      console.log("Loading participants because user is available");
      loadParticipants();
    } else {
      console.log("User not available yet");
    }
  }, [user]);

  // Ambil menu dari API buat nav bawah
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

  // Load messages based on chat mode
  const loadMessages = async (
    mode = chatMode,
    participantId = selectedParticipant?.userId
  ) => {
    try {
      setLoadingMsg(true);
      setErrMsg("");

      const meetingId = getMeetingId();
      if (!meetingId) {
        throw new Error("Meeting ID tidak ditemukan");
      }

      let url = `${API_URL}/api/chat/meeting/${meetingId}/messages?limit=50`;

      // Add userReceiveId for private chat
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
        const data = json.data.messages.map((msg) => ({
          id: msg.meetingChatId,
          userId: msg.userId,
          name: msg.Sender?.username || "Unknown",
          text: msg.textMessage || "",
          ts: new Date(msg.sendTime).getTime(),
          messageType: msg.messageType,
          filePath: msg.filePath,
          originalName: msg.originalName,
          mimeType: msg.mimeType,
          userReceiveId: msg.userReceiveId,
        }));

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

  // Load messages when component mounts or chat mode changes
  useEffect(() => {
    loadMessages();
  }, [chatMode, selectedParticipant]);

  // WebSocket connection untuk real-time chat
  useEffect(() => {
    const meetingId = getMeetingId();

    if (!meetingId) return;

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      // Clear any existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      const token = localStorage.getItem("token") || "";
      const wsUrl = `${API_URL.replace(
        /^http/,
        "ws"
      )}/meeting/${meetingId}?token=${encodeURIComponent(token)}`;
      console.log("Connecting to WebSocket:", wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected for chat");
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection

        // Send participant identification
        if (user?.id) {
          wsRef.current.send(
            JSON.stringify({
              type: "participant_joined",
              participantId: user.id,
              username: user.username,
            })
          );
        }
      };

      wsRef.current.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          console.log("WebSocket message received:", data);

          if (data?.type === "chat_message") {
            const newMessage = {
              id: data.messageId,
              userId: data.userId,
              name: data.username,
              text: data.message,
              ts: data.timestamp,
              messageType: data.messageType,
              filePath: data.filePath,
              originalName: data.originalName,
              mimeType: data.mimeType,
              userReceiveId: data.userReceiveId,
            };

            // Filter messages based on current chat mode
            let shouldAddMessage = false;

            if (chatMode === "global") {
              // In global mode, only show messages without userReceiveId (global messages)
              shouldAddMessage = !data.userReceiveId;
              console.log(
                "Global mode: message has userReceiveId?",
                !!data.userReceiveId,
                "should add:",
                shouldAddMessage
              );
            } else if (chatMode === "private" && selectedParticipant) {
              // In private mode, only show messages between current user and selected participant
              const isFromSelectedParticipant =
                data.userId === selectedParticipant.userId;
              const isToSelectedParticipant =
                data.userReceiveId === selectedParticipant.userId;
              const isFromCurrentUser = data.userId === user?.id;
              const isToCurrentUser = data.userReceiveId === user?.id;

              shouldAddMessage =
                (isFromSelectedParticipant && isToCurrentUser) ||
                (isFromCurrentUser && isToSelectedParticipant);

              console.log(
                "Private mode: from selected?",
                isFromSelectedParticipant,
                "to current?",
                isToCurrentUser,
                "should add:",
                shouldAddMessage
              );
            }

            if (!shouldAddMessage) {
              console.log("Message filtered out based on chat mode");
              return;
            }

            // Prevent duplicate messages
            setMessages((prev) => {
              const isDuplicate = prev.some(
                (msg) =>
                  msg.id === newMessage.id ||
                  (msg.userId === newMessage.userId &&
                    msg.text === newMessage.text &&
                    Math.abs(msg.ts - newMessage.ts) < 1000)
              );

              if (isDuplicate) {
                console.log("Duplicate message prevented:", newMessage);
                return prev;
              }

              console.log("Adding new message:", newMessage);
              return [...prev, newMessage];
            });
          }

          // Handle screen sharing events
          else if (data.type === "screen-share-started") {
            console.log("Screen share started by:", data.userId);
            // Dispatch event for screen share components
            window.dispatchEvent(
              new CustomEvent("screen-share-started", {
                detail: data,
              })
            );
          } else if (data.type === "screen-share-stopped") {
            console.log("Screen share stopped by:", data.userId);
            // Dispatch event for screen share components
            window.dispatchEvent(
              new CustomEvent("screen-share-stopped", {
                detail: data,
              })
            );
          } else if (data.type === "screen-share-producer-created") {
            console.log("Screen share producer created:", data);
            // Dispatch event for screen share components
            window.dispatchEvent(
              new CustomEvent("screen-share-producer-created", {
                detail: data,
              })
            );
          } else if (data.type === "screen-share-producer-closed") {
            console.log("Screen share producer closed:", data);
            // Dispatch event for screen share components
            window.dispatchEvent(
              new CustomEvent("screen-share-producer-closed", {
                detail: data,
              })
            );
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);

        // Don't reconnect for normal closure
        if (event.code === 1000) {
          return;
        }

        // Retry connection with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Max 10 seconds

          console.log(
            `WebSocket reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`
          );

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

    // Initial connection
    connectWebSocket();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
    };
  }, [user, getMeetingId]);

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

  // aktifkan slug 'chat' atau 'exchange' (tergantung data DB)
  const activeSlug = useMemo(
    () => (visibleMenus.some((m) => m.slug === "chat") ? "chat" : "exchange"),
    [visibleMenus]
  );

  const handleSelectNav = (item) => navigate(`/menu/${item.slug}`);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const meetingId = getMeetingId();

    if (!meetingId) {
      setErrMsg("Meeting ID tidak ditemukan");
      return;
    }

    const me = user || { username: "You", id: "me" };
    const tempId = `temp-${Date.now()}`;
    const newMsg = {
      id: tempId,
      userId: me.id || me.username,
      name: me.username || "You",
      text: trimmed,
      ts: Date.now(),
      _optimistic: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setText("");
    setSending(true);

    try {
      // Prepare request body
      const requestBody = { textMessage: trimmed };

      // Add userReceiveId for private chat
      if (chatMode === "private" && selectedParticipant?.userId) {
        requestBody.userReceiveId = selectedParticipant.userId;
      }

      // Kirim ke backend API
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
        // replace temp msg id -> server id
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: json.data.meetingChatId, _optimistic: false }
              : m
          )
        );

        // Note: WebSocket is only for receiving messages from other users
        // Our own message is already added to the list above
      } else {
        throw new Error(json.message || "Gagal mengirim pesan");
      }
    } catch (e) {
      // tandai gagal
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

    const meetingId = getMeetingId();

    if (!meetingId) {
      setErrMsg("Meeting ID tidak ditemukan");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    // Add userReceiveId for private chat
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
          name: user?.username || "You",
          text: "",
          ts: new Date(json.data.sendTime).getTime(),
          messageType: json.data.messageType,
          filePath: json.data.filePath,
          originalName: json.data.originalName,
          mimeType: json.data.mimeType,
        };

        setMessages((prev) => [...prev, newMessage]);

        // Note: WebSocket is only for receiving messages from other users
        // Our own file message is already added to the list above
      } else {
        throw new Error(json.message || "Gagal mengupload file");
      }
    } catch (e) {
      setErrMsg(String(e.message || e));
    } finally {
      setSending(false);
      // Reset file input
      event.target.value = "";
    }
  };

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  // Screen sharing controls handled elsewhere

  return (
    <MeetingLayout
      meetingId={getMeetingId()}
      userId={user?.id}
      userRole={user?.role || "participant"}
      socket={wsRef.current}
      mediasoupDevice={null} // MediaSoup will be auto-initialized by simpleScreenShare
    >
      <div className="pd-app">
        {/* Top bar */}
        <header className="pd-topbar">
          <div className="pd-left">
            <span className="pd-live" aria-hidden />
            <div>
              <h1 className="pd-title">Chat</h1>
              <div className="pd-sub">Diskusi selama meeting</div>
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

        {/* Chat content */}
        <main className="pd-main">
          <section className="chat-wrap">
            <div className="chat-header">
              <div className="chat-title">
                <Icon slug="chat" iconUrl="/img/chat.svg" size={22} />
                <span>
                  {chatMode === "global"
                    ? "Ruang Chat"
                    : `Chat dengan ${
                        selectedParticipant?.name || "Participant"
                      }`}
                </span>
              </div>
              <div className="chat-mode-buttons">
                <button
                  className={`chat-mode-btn ${
                    chatMode === "private" ? "active" : ""
                  }`}
                  onClick={() => {
                    console.log("=== PRIVATE CHAT BUTTON CLICKED ===");
                    setChatMode("private");
                    setSelectedParticipant(null);
                    // Load participants when switching to private mode
                    if (user?.id) {
                      console.log("User available, loading participants");
                      loadParticipants();
                    } else {
                      console.log(
                        "User not available for loading participants"
                      );
                    }
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
                    {participants.map((participant) => (
                      <button
                        key={participant.id}
                        className="participant-item"
                        onClick={() => {
                          console.log("=== PARTICIPANT CLICKED ===");
                          console.log("Selected participant:", participant);
                          setSelectedParticipant(participant);
                          // Load messages for private chat with this participant
                          loadMessages("private", participant.userId);
                        }}
                      >
                        <div className="participant-avatar">
                          {(participant.name || "U").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="participant-info">
                          <div className="participant-name">
                            {participant.name}
                          </div>
                          <div className="participant-role">
                            {participant.role}
                          </div>
                          <div className="participant-seat">
                            {participant.seat}
                          </div>
                          <div className="participant-status">
                            <span
                              className={`status-dot ${participant.status}`}
                            ></span>
                            {participant.status}
                          </div>
                        </div>
                        <div className="participant-controls">
                          <div
                            className={`control-icon mic ${
                              participant.mic ? "active" : "inactive"
                            }`}
                          >
                            🎤
                          </div>
                          <div
                            className={`control-icon cam ${
                              participant.cam ? "active" : "inactive"
                            }`}
                          >
                            📹
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
                        isMine={(user?.id || user?.username) === m.userId}
                      />
                    ))}
                  </div>

                  <div className="chat-composer">
                    <div className="composer-left">
                      <label className="chat-iconbtn" title="Lampirkan File">
                        <Icon
                          slug="attach"
                          iconUrl="/img/icons/attach.svg"
                          size={20}
                        />
                        <input
                          type="file"
                          style={{ display: "none" }}
                          onChange={handleFileUpload}
                          accept="*/*"
                        />
                      </label>
                      <button className="chat-iconbtn" title="Emoji">
                        <Icon
                          slug="emoji"
                          iconUrl="/img/icons/emoji.svg"
                          size={20}
                        />
                      </button>
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

        <MeetingFooter userRole={user?.role || "participant"} />
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
