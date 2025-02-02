// ... similar structure to User.js
const Repository = sequelize.define('Repository', {
  // ... fields
});
User.hasMany(Repository);
Repository.belongsTo(User);

module.exports = Repository;
