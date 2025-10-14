(function installFetch401Guard() {
  if (window.__fetch401GuardInstalled__) return;
  window.__fetch401GuardInstalled__ = true;

  const origFetch = window.fetch;

  // Endpoint publik yang tak perlu token / tak mau di-intercept
  const PUBLIC_PATHS = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
  ];

  // Debounce agar notifikasi 401 tidak muncul bertubi-tubi
  const SHOW_ONCE_MS = 3000;
  let lastShownAt = 0;

  // Helper: tampilkan pesan global via CustomEvent (ditangkap di root App)
  function notifyGlobal(message, type = "warning") {
    const now = Date.now();
    if (now - lastShownAt < SHOW_ONCE_MS) return; // debounce
    lastShownAt = now;

    // Simpan juga ke sessionStorage agar halaman login bisa baca
    try {
      sessionStorage.setItem("logout_reason", message);
    } catch {}

    console.debug("[401-guard] broadcasting global-logout");

    // Sebar event; di FE kamu tinggal dengarkan dan tampilkan toast/modal
    window.dispatchEvent(
      new CustomEvent("global-logout", {
        detail: { message, type },
      })
    );
  }

  // Helper: ekstrak pesan dari response (JSON / text), aman untuk dipanggil sekali
  async function extractMessageFromResponse(res) {
    try {
      const clone = res.clone();
      const ctype = clone.headers.get("content-type") || "";
      if (ctype.includes("application/json")) {
        const data = await clone.json();
        return data?.message || "Sesi berakhir. Silakan login kembali.";
      }
      const text = await clone.text();
      return text?.trim() || "Sesi berakhir. Silakan login kembali.";
    } catch {
      return "Sesi berakhir. Silakan login kembali.";
    }
  }

  window.fetch = async function guardedFetch(input, init = {}) {
    // Normalisasi URL agar bisa dicek dengan includes()
    const url = typeof input === "string" ? input : input?.url || "";

    const isPublic = PUBLIC_PATHS.some((p) => url.includes(p));
    const headers = new Headers(init.headers || {});
    const token = localStorage.getItem("token");

    // Sisipkan Authorization bila ada token & bukan public path
    if (!isPublic && token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Jangan set Content-Type untuk FormData
    const isFormData = init?.body instanceof FormData;
    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    try {
      const res = await origFetch(input, { ...init, headers });

      // Tangani 401 / 403 secara global
      if (!isPublic && (res.status === 401 || res.status === 403)) {
        const msg = await extractMessageFromResponse(res);

        // Bersihkan kredensial lokal
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        } catch {}

        // Beri tahu seluruh app
        notifyGlobal(
          res.status === 403
            ? msg || "Akses ditolak."
            : msg || "Sesi berakhir. Silakan login kembali.",
          res.status === 403 ? "error" : "warning"
        );

        // Redirect ke login (hindari loop jika sudah di login)
        const isAtLogin =
          location.hash === "#/" ||
          location.hash === "" ||
          /\/login$/.test(location.pathname);
        if (!isAtLogin && res.status === 401) {
          // HashRouter:
          if ("hash" in location) {
            window.location.hash = "#/"; // halaman login
          } else {
            // BrowserRouter:
            window.location.assign("/login");
          }
        }
      }

      return res;
    } catch (err) {
      // error jaringan: biarkan caller yang tangani
      throw err;
    }
  };
})();
