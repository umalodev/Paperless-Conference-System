// jobs/midnightClearAllChats.js
const cron = require("node-cron");
const fs = require("fs/promises");
const path = require("path");
const { sequelize, MeetingChat } = require("../models");

const UPLOAD_BASE =
  process.env.UPLOAD_BASE || path.resolve("uploads/materials");
// Pastikan ini adalah root tempat chat-file disimpan: uploads/materials/<meetingId>/*

async function removeAllChatFiles() {
  try {
    // Hapus seluruh direktori uploads/materials beserta isinya
    await fs.rm(UPLOAD_BASE, { recursive: true, force: true });
    // Buat ulang folder dasar agar upload berikutnya tidak error
    await fs.mkdir(UPLOAD_BASE, { recursive: true });
  } catch (e) {
    console.error("[midnight-clear] remove files error:", e);
  }
}

async function truncateMeetingChat() {
  // Cara 1 (portable Sequelize):
  await MeetingChat.destroy({ where: {}, truncate: true });

  // Cara 2 (raw SQL, kalau perlu):
  // await sequelize.query('TRUNCATE TABLE meeting_chat');
}

/** Jalankan reset total: hapus file + kosongkan tabel */
async function clearAllChatsNow() {
  console.time("[midnight-clear] total");
  console.log("[midnight-clear] start: wiping ALL chats & files");

  // Urutan aman: hapus file dulu, lalu kosongkan tabel
  await removeAllChatFiles();
  await truncateMeetingChat();

  console.log("[midnight-clear] done");
  console.timeEnd("[midnight-clear] total");
}

function startMidnightClearAllChatsJob() {
  // Eksekusi setiap hari pk 00:00 Asia/Jakarta
  cron.schedule("0 0 * * *", clearAllChatsNow, { timezone: "Asia/Jakarta" });

  // Opsional: jalankan sekali saat boot untuk memastikan konsisten
  // clearAllChatsNow().catch(e => console.error('[midnight-clear] first-run error:', e));
}

module.exports = { startMidnightClearAllChatsJob, clearAllChatsNow };
