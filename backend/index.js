const express = require("express");
const cors = require("cors");
const session = require("express-session");
const routes = require("./routes");

const app = express();
const PORT = 3000;

// Load database and models
const sequelize = require('./db/db');
const models = require('./models');

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'paperless-conference-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Better for cross-origin requests
  },
  name: 'paperless-session' // Custom session name
}));

// Use routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan server'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan'
  });
});

// Start server after database sync
const startServer = async () => {
  try {
    // Sync database
    await sequelize.sync({ force: false, alter: true });
    console.log('Database synced successfully - tables created/updated');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
      console.log(`API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
