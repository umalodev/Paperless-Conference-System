const express = require("express");
const router = express.Router();
const ChatController = require("../controllers/chatController");
const auth = require("../middleware/auth");
const { upload } = require("../middleware/upload");

// Get chat messages for a meeting
router.get(
  "/meeting/:meetingId/messages",
  auth.isAuthenticated,
  ChatController.getChatMessages
);

// Send a text message
router.post(
  "/meeting/:meetingId/send",
  auth.isAuthenticated,
  ChatController.sendMessage
);

// Upload file for chat
router.post(
  "/meeting/:meetingId/upload",
  auth.isAuthenticated,
  (req, res, next) => {
    upload.single("file")(req, res, function (err) {
      if (err) {
        // error khusus dari filter kita
        if (err.code === "UNSUPPORTED_FILE_TYPE") {
          return res.status(400).json({
            success: false,
            code: "UNSUPPORTED_FILE_TYPE",
            message:
              "Format file tidak didukung. Silakan unggah PDF, DOCX, XLSX, PPTX, gambar (JPG/PNG/WEBP), ZIP, MP4, MP3, dll.",
          });
        }
        // error dari Multer (ukuran, dll)
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              code: "LIMIT_FILE_SIZE",
              message: "Ukuran file terlalu besar (maks 200MB).",
            });
          }
          return res.status(400).json({
            success: false,
            code: "MULTER_ERROR",
            message: "Gagal mengunggah file.",
            detail: err.message,
          });
        }
        // error lain
        return res.status(500).json({
          success: false,
          code: "UPLOAD_ERROR",
          message: "Terjadi kesalahan saat mengunggah file.",
        });
      }
      // lanjut ke controller jika tidak ada error
      return ChatController.uploadFile(req, res, next);
    });
  }
);

// Download file from chat
router.get(
  "/message/:messageId/download",
  auth.isAuthenticated,
  ChatController.downloadFile
);

// Delete message (soft delete)
router.delete(
  "/message/:messageId",
  auth.isAuthenticated,
  ChatController.deleteMessage
);

// Get chat participants
router.get(
  "/meeting/:meetingId/participants",
  auth.isAuthenticated,
  ChatController.getParticipants
);

module.exports = router;
