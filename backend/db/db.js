const { Sequelize } = require('sequelize');
require('dotenv').config();

// Default database configuration for development
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'paperless_conference',
  dialect: 'mysql',
  logging: console.log,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

console.log('Database configuration:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  dialect: dbConfig.dialect
});

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.user,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool
  }
);

// Test connection
sequelize.authenticate()
  .then(() => {
    console.log('Database connection established successfully.');
  })
  .catch(err => {
    console.error('Database error:', err);
  });

module.exports = sequelize;