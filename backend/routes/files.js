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
    const ext = path.extname(file.originalname);
    const base = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, base + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

const controller = filesControllerFactory(db, {
  uploadBaseUrl: "/uploads/files",
});

router.get("/history", auth.isAuthenticated, controller.history);

// list + create + delete
router.get("/", auth.isAuthenticated, controller.list); // ?meetingId=...
router.post(
  "/",
  auth.isAuthenticated,
  upload.single("file"),
  controller.create
);
router.delete("/:fileId", auth.isAuthenticated, controller.remove);

module.exports = router;
