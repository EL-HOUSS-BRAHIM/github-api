const { Sequelize } = require('sequelize');
const config = require('./index');

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: config.db.ssl ? {
      require: true,
      rejectUnauthorized: false, // For AWS RDS
    } : false,
    // PostgreSQL specific settings
    decimalNumbers: true,
  },
  timezone: '+00:00',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  // PostgreSQL specific configuration
  define: {
    underscored: false,
    freezeTableName: false,
    charset: 'utf8',
    dialectOptions: {
      collate: 'utf8_general_ci'
    },
    timestamps: true
  }
});

module.exports = sequelize;