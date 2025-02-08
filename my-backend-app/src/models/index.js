const User = require('./User');
const Repository = require('./Repository');
const Activity = require('./Activity');
const UserRanking = require('./UserRanking');

// Define associations
User.hasMany(Repository, { foreignKey: 'user_id' });
Repository.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Activity, { foreignKey: 'user_id' });
Activity.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(UserRanking, { foreignKey: 'user_id' });
UserRanking.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  User,
  Repository,
  Activity,
  UserRanking
};