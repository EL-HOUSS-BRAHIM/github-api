// ... similar structure
const Activity = sequelize.define('Activity', {
    // ... fields
  });
  User.hasMany(Activity);
  Activity.belongsTo(User);

module.exports = Activity;
