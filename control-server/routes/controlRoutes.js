const express = require("express");
const router = express.Router();
const controller = require("../controllers/controlController");

// Ambil semua peserta aktif
router.get("/participants", controller.getParticipants);

// Kirim perintah ke participant tertentu
router.post("/command/:action", controller.sendCommand);

// Sinkronisasi login dari backend utama
router.post("/sync-login", controller.syncLogin);

module.exports = router;
