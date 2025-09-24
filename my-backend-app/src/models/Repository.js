const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Repository = sequelize.define('Repository', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User, // This should be the User model, not a string
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  topics: {
    type: DataTypes.JSON, // Store topics as JSON array
    allowNull: true,
  },
  primary_language: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  license: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stars: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  forks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  issues: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  last_commit: {
    type: DataTypes.DATE, // DATE is usually sufficient
    allowNull: true,
  },
  commit_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  pull_request_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  watchers: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  homepage: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  default_branch: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  source_created_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  source_updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  // Optional: Add indexes for faster querying
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'name'],
      name: 'repositories_user_id_name'
    },
    { fields: ['stars'] }
  ]
});

// Define the association between User and Repository (one-to-many)
User.hasMany(Repository, { foreignKey: 'user_id' });
Repository.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Repository;