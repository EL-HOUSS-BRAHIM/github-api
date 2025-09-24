const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RankingSnapshot = sequelize.define('RankingSnapshot', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  followers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  public_repos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  global_rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  country_rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ranking_calculated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  job_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  recorded_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = RankingSnapshot;
