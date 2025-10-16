// routes/files.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();
const auth = require("../middleware/auth");
const db = require("../models");
const filesControllerFactory = require("../controllers/filesController");

const uploadDir = path.join(__dirname, "..", "uploads", "files");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, base + ext);
  },
});

// ✅ Whitelist MIME & ekstensi, blacklist executable + double-ext
const allowedMimes = new Set([
  // Docs
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  // Archives
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  // Video
  "video/mp4",
  "video/avi",
  "video/mov",
  "video/wmv",
  // Audio
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
]);

// untuk kasus mimetype "application/octet-stream", izinkan jika ekstensi aman
const allowedExts = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "zip",
  "rar",
  "7z",
  "mp4",
  "avi",
  "mov",
  "wmv",
  "webm",
  "mkv",
  "mp3",
  "wav",
  "ogg",
]);

const bannedExts = new Set([
  "exe",
  "msi",
  "bat",
  "cmd",
  "sh",
  "ps1",
  "psm1",
  "vbs",
  "js",
  "mjs",
  "jar",
  "com",
  "scr",
  "cpl",
  "dll",
  "so",
  "dylib",
  "php",
  "phar",
  "pl",
  "py",
  "rb",
]);

const bannedMimes = new Set([
  "application/x-msdownload",
  "application/x-dosexec",
  "application/x-executable",
]);

function fileFilter(req, file, cb) {
  try {
    const name = (file.originalname || "").toLowerCase();
    const ext = (path.extname(name).slice(1) || "").toLowerCase(); // tanpa titik
    const base = name.slice(0, name.length - (ext.length ? ext.length + 1 : 0));
    const secondExt = (path.extname(base).slice(1) || "").toLowerCase(); // double-ext

    // ❌ blokir ekstensi terlarang (termasuk double-ext)
    if (bannedExts.has(ext) || (secondExt && bannedExts.has(secondExt))) {
      const err = new Error("Format file tidak didukung");
      err.code = "UNSUPPORTED_FILE_TYPE";
      return cb(err, false);
    }

    const mime = (file.mimetype || "").toLowerCase();

    // ❌ blokir MIME executable
    if (bannedMimes.has(mime)) {
      const err = new Error("Format file tidak didukung");
      err.code = "UNSUPPORTED_FILE_TYPE";
      return cb(err, false);
    }

    // ✅ izinkan: MIME whitelisted
    if (allowedMimes.has(mime)) return cb(null, true);

    // Kasus umum: browser kirim application/octet-stream → cek dari ekstensi aman
    if (mime === "application/octet-stream" && allowedExts.has(ext)) {
      return cb(null, true);
    }

    // default tolak
    const err = new Error("Format file tidak didukung");
    err.code = "UNSUPPORTED_FILE_TYPE";
    return cb(err, false);
  } catch (e) {
    return cb(e);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
});

const controller = filesControllerFactory(db, {
  uploadBaseUrl: "/uploads/files",
});

// helper agar error multer dipetakan rapi
function handleUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "UNSUPPORTED_FILE_TYPE") {
        return res
          .status(415)
          .json({ success: false, message: "Format file tidak didukung" });
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(413)
          .json({ success: false, message: "Ukuran file terlalu besar" });
      }
      if (err.name === "MulterError") {
        return res
          .status(400)
          .json({ success: false, message: `Gagal upload: ${err.code}` });
      }
      return res
        .status(400)
        .json({ success: false, message: err.message || "Gagal upload" });
    }
    next();
  });
}

router.get("/unread-count", auth.isAuthenticated, controller.unreadCount);
router.post("/mark-all-read", auth.isAuthenticated, controller.markAllRead);
router.patch("/:fileId/read", auth.isAuthenticated, controller.markRead);
router.patch("/:fileId/unread", auth.isAuthenticated, controller.markUnread);

router.get("/history", auth.isAuthenticated, controller.history);
router.get("/", auth.isAuthenticated, controller.list);

// 🔐 pakai handler upload dengan filter & mapping error
router.post("/", auth.isAuthenticated, handleUpload, controller.create);

router.delete("/:fileId", auth.isAuthenticated, controller.remove);

module.exports = router;
