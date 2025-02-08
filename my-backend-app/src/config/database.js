const { Sequelize } = require('sequelize');
const config = require('./index');

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    ssl: config.db.ssl,
    // Add this to handle timestamps
    dateStrings: true,
    typeCast: true,
    // Add this line to allow invalid dates
    flags: '-DATE_INVALID_DATES',
  },
  timezone: '+00:00', // Add this to handle timezone consistently
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

module.exports = sequelize;