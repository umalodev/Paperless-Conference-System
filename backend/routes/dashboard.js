const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

// Get dashboard statistics
router.get('/stats', auth.isAuthenticated, dashboardController.getDashboardStats);

module.exports = router;
