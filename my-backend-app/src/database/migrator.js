const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');

let migrator = null;

async function createMigrator() {
  if (migrator) {
    return migrator;
  }

  // Import sequelize after configuration is potentially initialized
  const sequelize = require('../config/database');
  
  migrator = new Umzug({
    migrations: {
      glob: path.join(__dirname, '../../migrations/*.js'),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });

  return migrator;
}

async function runPendingMigrations() {
  console.log('Checking for pending migrations...');
  
  try {
    const migratorInstance = await createMigrator();
    const pending = await migratorInstance.pending();
    
    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    console.log(`Running ${pending.length} pending migrations...`);
    const migrations = await migratorInstance.up();
    console.log(`Successfully applied ${migrations.length} migrations:`);
    migrations.forEach(migration => {
      console.log(`  ✓ ${migration.name}`);
    });
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function showMigrationStatus() {
  console.log('Migration status:');
  
  try {
    const migratorInstance = await createMigrator();
    const executed = await migratorInstance.executed();
    const pending = await migratorInstance.pending();

    console.log('\nExecuted migrations:');
    if (executed.length === 0) {
      console.log('  (none)');
    } else {
      executed.forEach(migration => {
        console.log(`  ✓ ${migration.name}`);
      });
    }

    console.log('\nPending migrations:');
    if (pending.length === 0) {
      console.log('  (none)');
    } else {
      pending.forEach(migration => {
        console.log(`  ○ ${migration.name}`);
      });
    }
  } catch (error) {
    console.error('Failed to get migration status:', error);
    throw error;
  }
}

async function getMigrator() {
  return await createMigrator();
}

module.exports = {
  getMigrator,
  runPendingMigrations,
  showMigrationStatus,
};
