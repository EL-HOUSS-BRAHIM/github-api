// src/models/UserRanking.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const UserRanking = sequelize.define('UserRanking', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  total_commits: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  total_contributions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  followers: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  public_repos: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  global_rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  country_rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  last_calculated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  }
});

User.hasOne(UserRanking, { foreignKey: 'user_id' });
UserRanking.belongsTo(User, { foreignKey: 'user_id' });

module.exports = UserRanking;