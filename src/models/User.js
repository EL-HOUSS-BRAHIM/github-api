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
  last_fetched: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    get() {
      const value = this.getDataValue('last_fetched');
      return value instanceof Date ? value : new Date(value);
    }
  },
  last_activity_fetch: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_fetching: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  organizations: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  gists_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  last_gist_fetch: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_org_fetch: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = User;