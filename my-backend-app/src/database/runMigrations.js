const { migrator, runPendingMigrations, showMigrationStatus } = require('./migrator');

async function main() {
  const [, , command] = process.argv;

  try {
    if (command === '--status') {
      await showMigrationStatus();
    } else if (command === 'down') {
      const executed = await migrator.executed();
      if (executed.length === 0) {
        console.log('No executed migrations to revert.');
        return;
      }

      const last = executed[executed.length - 1];
      console.log(`Reverting migration ${last.name}...`);
      await migrator.down({ step: 1 });
      console.log('Migration reverted.');
    } else {
      await runPendingMigrations();
    }
  } catch (error) {
    console.error('Migration command failed:', error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().finally(() => {
    migrator.context.sequelize?.close?.();
  });
}

module.exports = {
  runPendingMigrations,
};
