(function installFetch401Guard() {
  if (window.__fetch401GuardInstalled__) return; // hindari double install
  window.__fetch401GuardInstalled__ = true;

  const origFetch = window.fetch;

  // daftar endpoint publik yang tak perlu token / tak mau di-intercept
  const PUBLIC_PATHS = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
  ];

  window.fetch = async function guardedFetch(input, init = {}) {
    try {
      // Normalisasi URL agar bisa dicek dengan includes()
      const url = typeof input === "string" ? input : input?.url || "";

      // Sisipkan Authorization bila ada token & bukan public path
      const isPublic = PUBLIC_PATHS.some((p) => url.includes(p));
      const headers = new Headers(init.headers || {});
      const token = localStorage.getItem("token");

      if (!isPublic && token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      // HATI-HATI: jangan set Content-Type jika body itu FormData
      const isFormData = init?.body instanceof FormData;
      if (!isFormData && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const res = await origFetch(input, { ...init, headers });

      // Jika token expired/invalid -> hapus & redirect login
      if (res.status === 401 && !isPublic) {
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        } catch (_) {}
        // Hindari loop: jika sudah di / (login), jangan redirect lagi
        const isAtLogin = location.hash === "#/" || location.hash === "";
        if (!isAtLogin) {
          // HashRouter → arahkan ke root (halaman Login kamu)
          window.location.hash = "#/";
        }
      }

      return res;
    } catch (err) {
      // Kalau error jaringan, tetap lempar agar caller bisa tangani
      throw err;
    }
  };
})();
