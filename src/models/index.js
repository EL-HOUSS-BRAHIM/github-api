const User = require('./User');
const Repository = require('./Repository');
const Activity = require('./Activity');

// Define associations here if not already done in individual model files
User.hasMany(Repository, { foreignKey: 'user_id' });
Repository.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Activity, { foreignKey: 'user_id' });
Activity.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  User,
  Repository,
  Activity,
};