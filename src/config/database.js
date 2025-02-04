const { Sequelize } = require('sequelize');
const config = require('./index'); // Assuming you have database config in index.js

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'mysql',
  logging: false, // Set to true to see SQL queries (useful for debugging)
  dialectOptions: {
    ssl: config.db.ssl,
  },
  // Pool configuration (important for serverless environments)
  pool: {
    max: 5,    // Maximum number of connections in pool
    min: 0,    // Minimum number of connections in pool
    acquire: 30000, // Maximum time (ms) that pool will try to get a connection before throwing error
    idle: 10000,   // Maximum time (ms) that a connection can be idle before being released
  },
});

module.exports = sequelize;