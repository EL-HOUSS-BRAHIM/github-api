const express = require('express');
const { json, urlencoded } = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json'); // Your Swagger/OpenAPI definition
const userRoutes = require('./routes/user');
const { APIError } = require('./utils/errors');

const app = express();

// Middlewares
app.use(json());
app.use(urlencoded({ extended: true }));

// Routes
app.use('/api/user', userRoutes);

// Serve Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Error handling middleware (must be defined after your routes)
app.use((err, req, res, next) => {
  console.error(err.stack); // Log error stack for debugging

  if (err instanceof APIError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ error: 'Validation error', details: errors });
  }

  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;