const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Get chat messages for a meeting
router.get('/meeting/:meetingId/messages', authenticateToken, ChatController.getChatMessages);

// Send a text message
router.post('/meeting/:meetingId/send', authenticateToken, ChatController.sendMessage);

// Upload file for chat
router.post('/meeting/:meetingId/upload', authenticateToken, upload.single('file'), ChatController.uploadFile);

// Download file from chat
router.get('/message/:messageId/download', authenticateToken, ChatController.downloadFile);

// Delete message (soft delete)
router.delete('/message/:messageId', authenticateToken, ChatController.deleteMessage);

// Get chat participants
router.get('/meeting/:meetingId/participants', authenticateToken, ChatController.getParticipants);

module.exports = router;
