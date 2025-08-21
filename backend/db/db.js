const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test connection and sync database
sequelize.authenticate()
  .then(() => {
    console.log('Database connection established successfully.');
    // Load models first, then sync database
    require('../models/index.js');
    return sequelize.sync({ force: false, alter: true });
  })
  .then(() => {
    console.log('Database synced successfully - tables created/updated');
  })
  .catch(err => {
    console.error('Database error:', err);
  });

module.exports = sequelize;