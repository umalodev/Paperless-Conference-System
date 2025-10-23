import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useModal } from "./ModalProvider.jsx";

export default function GlobalAuthEvents() {
  const { notify } = useModal();
  const routerLocation = useLocation();

  // Dengarkan event global dari fetch guard / socket
  useEffect(() => {
    function onLogout(e) {
      const msg = e.detail?.message || "Sesi berakhir. Silakan login kembali.";
      if (typeof notify === "function") {
        notify({
          variant: e.detail?.type === "error" ? "error" : "warning",
          title: "Sesi Berakhir",
          message: msg,
          autoCloseMs: 4000, // auto-close notifikasi
          hideCancel: true, // notifikasi tanpa tombol Cancel
        });
      } else {
        alert(msg);
      }
    }
    window.addEventListener("global-logout", onLogout);
    return () => window.removeEventListener("global-logout", onLogout);
  }, [notify]);

  // Saat mendarat di halaman login, tampilkan reason sekali
  useEffect(() => {
    const atLogin =
      window.location.hash === "#/" ||
      window.location.hash === "" ||
      routerLocation.pathname === "/";

    if (!atLogin) return;

    const msg = sessionStorage.getItem("logout_reason");
    if (msg) {
      if (typeof notify === "function") {
        notify({
          variant: "warning",
          title: "Sesi Berakhir",
          message: msg,
          autoCloseMs: 4000,
          hideCancel: true,
        });
      } else {
        alert(msg);
      }
      sessionStorage.removeItem("logout_reason");
    }
  }, [routerLocation, notify]);

  return null;
}
