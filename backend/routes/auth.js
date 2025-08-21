const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Authentication routes
router.post('/login', authController.login);
router.get('/user/:id', authController.getUser);
router.post('/logout', authController.logout);

module.exports = router;
