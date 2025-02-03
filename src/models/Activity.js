const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Activity = sequelize.define('Activity', {
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
  date: {
    type: DataTypes.DATEONLY, // Use DATEONLY for just the date part
    allowNull: false,
  },
  commits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  pull_requests: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  issues_opened: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  // Optional: Add indexes for faster querying on frequently accessed columns
  indexes: [
    { fields: ['user_id'] },
    { fields: ['date'] },
  ],
});

// Define the association between User and Activity (one-to-many)
User.hasMany(Activity, { foreignKey: 'user_id' });
Activity.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Activity;