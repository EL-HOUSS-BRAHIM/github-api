const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const sequelize = require('../config/database');

const migrator = new Umzug({
  migrations: {
    glob: path.join(__dirname, '../../migrations/*.js'),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

async function runPendingMigrations() {
  const pending = await migrator.pending();
  if (pending.length === 0) {
    console.log('No pending database migrations found.');
    return;
  }

  console.log(`Applying ${pending.length} pending database migration(s)...`);
  await migrator.up();
  console.log('Database migrations completed.');
}

async function showMigrationStatus() {
  const [executed, pending] = await Promise.all([
    migrator.executed(),
    migrator.pending(),
  ]);

  console.log('Executed migrations:');
  executed.forEach((migration) => console.log(`  - ${migration.name}`));

  if (executed.length === 0) {
    console.log('  (none)');
  }

  console.log('Pending migrations:');
  pending.forEach((migration) => console.log(`  - ${migration.name}`));

  if (pending.length === 0) {
    console.log('  (none)');
  }
}

module.exports = {
  migrator,
  runPendingMigrations,
  showMigrationStatus,
};
