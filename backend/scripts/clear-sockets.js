/**
 * clear-sockets.js
 * Script untuk memutus semua koneksi Socket.IO secara otomatis
 */

import axios from "axios";

const CONTROL_URL = process.env.CONTROL_URL || "http://localhost:4000";

(async () => {
  try {
    console.log("🧹 Mengirim request untuk membersihkan semua koneksi Socket.IO...");

    const res = await axios.post(`${CONTROL_URL}/api/control/clear-sockets`);
    console.log(`✅ ${res.data.message || "Semua koneksi Socket.IO sudah diputus."}`);
  } catch (err) {
    console.error("❌ Gagal membersihkan koneksi Socket.IO:", err.message);
  } finally {
    process.exit(0);
  }
})();
