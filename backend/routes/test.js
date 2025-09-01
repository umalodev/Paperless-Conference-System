const express = require('express');
const router = express.Router();

// Simple test endpoint
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Test database connection
router.get('/db', async (req, res) => {
  try {
    const { sequelize } = require('../db/db');
    await sequelize.authenticate();
    
    res.json({
      success: true,
      message: 'Database connection is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

module.exports = router;
