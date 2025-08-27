// src/pages/menu/chat/Chat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../../components/BottomNav.jsx";
import Icon from "../../../components/Icon.jsx";
import { API_URL } from "../../../config.js";
import "./Chating.css";
import useMeetingGuard from "../../../hooks/useMeetingGuard.js";

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

  const listRef = useRef(null);
  const wsRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // Ambil menu dari API buat nav bawah
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMenus(true);
        setErrMenus("");
        const res = await fetch(`${API_URL}/api/menu/user/menus`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
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

  // Ambil pesan awal (ganti endpoint sesuai backend kamu)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingMsg(true);
        setErrMsg("");

        // TODO: ganti ke API kamu, contoh:
        // const res = await fetch(`${API_URL}/api/chat/messages?room=MTG-001`, { credentials: "include" });
        // if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // const json = await res.json();
        // const data = Array.isArray(json?.data) ? json.data : [];

        // demo data
        const data = [
          {
            id: "m1",
            userId: "host-1",
            name: "Host",
            text: "Selamat datang di sesi chat 👋",
            ts: Date.now() - 1000 * 60 * 6,
          },
          {
            id: "m2",
            userId: "p-2",
            name: "Rina",
            text: "Halo semuanya!",
            ts: Date.now() - 1000 * 60 * 4,
          },
          {
            id: "m3",
            userId: "p-3",
            name: "Budi",
            text: "Siap mulai",
            ts: Date.now() - 1000 * 60 * 3,
          },
        ];

        if (!cancel) setMessages(data);
      } catch (e) {
        if (!cancel) setErrMsg(String(e.message || e));
      } finally {
        if (!cancel) setLoadingMsg(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // (Opsional) WebSocket — otomatis konek jika backend siap
  useEffect(() => {
    // Ganti sesuai ws endpoint kamu (contoh):
    // const wsUrl = `${API_URL.replace(/^http/, "ws")}/ws/chat?room=MTG-001`;
    // wsRef.current = new WebSocket(wsUrl);
    // wsRef.current.onmessage = (evt) => {
    //   const data = JSON.parse(evt.data);
    //   if (data?.type === "message") {
    //     setMessages((prev) => [...prev, data.payload]);
    //   }
    // };
    // return () => wsRef.current?.close();
  }, []);

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
      // Kirim ke backend kamu
      // const res = await fetch(`${API_URL}/api/chat/send`, {
      //   method: "POST",
      //   credentials: "include",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ roomId: "MTG-001", text: trimmed }),
      // });
      // if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // const json = await res.json(); // harapkan balikan id final

      // Simulasi berhasil:
      await new Promise((r) => setTimeout(r, 400));
      const serverId = `srv-${Date.now()}`;

      // replace temp msg id -> server id
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, id: serverId, _optimistic: false } : m
        )
      );
    } catch (e) {
      // tandai gagal
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _error: true } : m))
      );
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

  useMeetingGuard({ pollingMs: 5000, showAlert: true });

  return (
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
              <span>Ruang Chat</span>
            </div>
            <div className="chat-actions">
              <button
                className="chat-btn ghost"
                onClick={() => window.location.reload()}
                title="Refresh"
              >
                <RefreshIcon />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {loadingMsg && <div className="pd-empty">Memuat pesan…</div>}
          {errMsg && !loadingMsg && (
            <div className="pd-error">Gagal memuat chat: {errMsg}</div>
          )}

          {!loadingMsg && !errMsg && (
            <>
              <div className="chat-list" ref={listRef}>
                {messages.map((m) => (
                  <MessageItem
                    key={m.id}
                    msg={m}
                    isMine={(user?.id || user?.username) === m.userId}
                  />
                ))}
              </div>

              <div className="chat-composer">
                <div className="composer-left">
                  <button className="chat-iconbtn" title="Lampirkan">
                    <Icon
                      slug="attach"
                      iconUrl="/img/icons/attach.svg"
                      size={20}
                    />
                  </button>
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
                  placeholder="Tulis pesan…"
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
                  <SendIcon />
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
    </div>
  );
}

function MessageItem({ msg, isMine }) {
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
          {msg.text}
          {msg._optimistic && (
            <span className="bubble-status"> • sending…</span>
          )}
          {msg._error && <span className="bubble-status error"> • failed</span>}
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

/* ikon kecil */
function SendIcon() {
  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg
      className="pd-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9" />
      <path d="M3 12l3-3 3 3" />
      <path d="M21 12l-3 3-3-3" />
    </svg>
  );
}
