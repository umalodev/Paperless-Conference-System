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
  upload.single("file"),
  ChatController.uploadFile
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
