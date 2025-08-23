const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Authentication routes
router.post('/login', authController.login);
router.get('/user/:id', authController.getUser);
router.get('/me', auth.isAuthenticated, authController.getCurrentUser);
router.post('/logout', authController.logout);

module.exports = router;
