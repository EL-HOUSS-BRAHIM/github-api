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
    references: {
      model: User,
      key: 'id',
    },
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  total_commits: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  total_contributions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  country_rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  global_rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  last_calculated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  }
}, {
  indexes: [
    { fields: ['user_id'] },
    { fields: ['country'] },
    { fields: ['score'] },
    { fields: ['country_rank'] },
    { fields: ['global_rank'] }
  ]
});

User.hasOne(UserRanking, { foreignKey: 'user_id' });
UserRanking.belongsTo(User, { foreignKey: 'user_id' });

module.exports = UserRanking;