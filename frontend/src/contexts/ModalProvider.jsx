// src/contexts/ModalProvider.jsx  (atau path-mu)
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import "./modal.css";

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [stack, setStack] = useState([]);
  const resolverRef = useRef([]);

  // lock scroll saat ada modal
  useEffect(() => {
    if (stack.length > 0) document.body.classList.add("kp-modal-open");
    else document.body.classList.remove("kp-modal-open");
  }, [stack.length]);

  const open = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setStack((p) => [...p, opts]);
        resolverRef.current.push(resolve);
      }),
    []
  );

  const resolveTop = useCallback((value) => {
    setStack((prev) => {
      if (!prev.length) return prev;
      const next = prev.slice(0, -1);
      const resolve = resolverRef.current.pop();
      resolve?.(value);
      return next;
    });
  }, []);

  const confirm = useCallback(
    async (opts) => {
      const res = await open({ variant: "confirm", ...opts });
      return res === "confirm";
    },
    [open]
  );

  const notify = useCallback(
    async (opts) => {
      await open({ variant: opts?.variant ?? "info", ...opts });
    },
    [open]
  );

  const value = useMemo(
    () => ({ open, confirm, notify }),
    [open, confirm, notify]
  );

  return (
    <ModalContext.Provider value={value}>
      {children}
      {stack.map((opts, idx) => (
        <ModalInstance
          key={idx}
          isTop={idx === stack.length - 1}
          options={opts}
          onResolve={resolveTop}
        />
      ))}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within <ModalProvider>");
  return ctx;
}

/* -------- Renderer -------- */
function ModalInstance({ options, isTop, onResolve }) {
  const {
    variant = "confirm",
    title,
    message,
    okText,
    cancelText,
    destructive = false,
    onConfirm,
    autoCloseMs,
    hideCancel,
    actions,
  } = options || {};

  const [loading, setLoading] = useState(false);
  const overlayRef = useRef(null);
  const okBtnRef = useRef(null);

  const isNotif = ["success", "error", "warning", "info"].includes(variant);
  const showCancel = !isNotif && !hideCancel;

  useEffect(() => {
    const t = setTimeout(() => okBtnRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!isTop) return;
    const onKey = (e) => {
      if (e.key === "Escape") onResolve(isNotif ? "ok" : "cancel");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isTop, isNotif, onResolve]);
  const onOverlayClick = (e) => {
    if (e.target === overlayRef.current) onResolve(isNotif ? "ok" : "cancel");
  };
  useEffect(() => {
    if (isNotif && autoCloseMs && isTop) {
      const t = setTimeout(() => onResolve("ok"), autoCloseMs);
      return () => clearTimeout(t);
    }
  }, [isNotif, autoCloseMs, isTop, onResolve]);

  const variantClass =
    variant === "success"
      ? "kp-success"
      : variant === "error"
      ? "kp-error"
      : variant === "warning"
      ? "kp-warning"
      : variant === "info"
      ? "kp-info"
      : "kp-confirm";

  const handleConfirm = async () => {
    if (loading) return;
    if (typeof onConfirm === "function") {
      try {
        setLoading(true);
        await onConfirm();
        onResolve(isNotif ? "ok" : "confirm");
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    } else {
      onResolve(isNotif ? "ok" : "confirm");
    }
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={onOverlayClick}
      className="kp-modal-overlay"
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`kp-modal ${variantClass} ${
          destructive ? "kp-destructive" : ""
        }`}
      >
        <div className="kp-modal__header">
          <span className="kp-modal__icon" aria-hidden>
            {getIconByVariant(variant)}
          </span>
          <div className="kp-modal__header-text">
            <div className="kp-modal__title">
              {title ?? getDefaultTitle(variant)}
            </div>
            {message ? <div className="kp-modal__desc">{message}</div> : null}
          </div>
        </div>

        <div className="kp-modal__actions">
          {Array.isArray(actions) && actions.length > 0 ? (
            actions.map((btn, i) => (
              <button
                key={i}
                onClick={async () => {
                  const res = await btn.onClick?.();
                  if (btn.closes !== false) onResolve(res ?? "ok");
                }}
                className={btn.className ?? "kp-btn kp-btn--secondary"}
              >
                {btn.label}
              </button>
            ))
          ) : (
            <>
              {!isNotif && !hideCancel && (
                <button
                  type="button"
                  onClick={() => onResolve("cancel")}
                  className="kp-btn kp-btn--secondary"
                >
                  {cancelText ?? "Cancel"}
                </button>
              )}
              <button
                type="button"
                ref={okBtnRef}
                onClick={handleConfirm}
                disabled={loading}
                className={
                  "kp-btn " +
                  (isNotif
                    ? variant === "warning"
                      ? "kp-btn--warning"
                      : variant === "error"
                      ? "kp-btn--danger"
                      : "kp-btn--primary"
                    : destructive
                    ? "kp-btn--danger"
                    : "kp-btn--primary")
                }
              >
                {loading
                  ? "Processing..."
                  : okText ?? (isNotif ? "OK" : "Confirm")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* --- helpers (ikon & title) --- */
function getDefaultTitle(v) {
  return v === "confirm"
    ? "Are you sure?"
    : v === "success"
    ? "Success"
    : v === "error"
    ? "Something went wrong"
    : v === "warning"
    ? "Please confirm"
    : v === "info"
    ? "Information"
    : "Notice";
}
function getIconByVariant(v) {
  const cls = "kp-modal__icon";
  if (v === "success")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path
          d="M9 12.75l2 2 4-4.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  if (v === "error")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path
          d="M15 9l-6 6m0-6l6 6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  if (v === "warning")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 8v5m0 3h.01"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.3 4.6L2.7 17.4a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 4.6a2 2 0 00-3.4 0z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 8h.01M11 12h1v5h1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
