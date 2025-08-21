const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');

// Use route modules
router.use('/auth', authRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend is running!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
