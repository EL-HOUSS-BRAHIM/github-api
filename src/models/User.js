const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  avatar_url: {
    type: DataTypes.STRING, // Consider TEXT if URLs might be very long
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  company: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING, // Or TEXT for URLs
    allowNull: true,
  },
  followers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  following: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  public_repos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  social: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
  // Consider adding a last_fetched or similar timestamp to track data freshness
});

module.exports = User;