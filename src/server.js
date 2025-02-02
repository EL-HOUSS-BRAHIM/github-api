const http = require('http');
const app = require('./app');
const config = require('./config');
const sequelize = require('./config/database');

const server = http.createServer(app);

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // Sync models with the database (create tables if they don't exist)
    // In production, consider using migrations instead of sync({ force: true })
    await sequelize.sync();

    server.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

startServer();
