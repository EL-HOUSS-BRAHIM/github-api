const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  // ... (Define fields as in the SQL table, using DataTypes)
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  // ... other fields
});

module.exports = User;
