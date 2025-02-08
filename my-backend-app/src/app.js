const express = require('express');
require('./scheduler');
const { json, urlencoded } = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json'); // Your Swagger/OpenAPI definition
const userRoutes = require('./routes/user');
const rankingRoutes = require('./routes/ranking');
const { APIError } = require('./utils/errors');
const cors = require('cors');

const app = express();

// Middlewares
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cors());

// Routes
app.use('/api/user', userRoutes);
app.use('/api/ranking', rankingRoutes);

// Serve Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Error handling middleware (must be defined after your routes)
app.use((err, req, res, next) => {
  console.error('Error Stack:', err.stack);
  console.error('Error Message:', err.message);
  console.error('Error Name:', err.name);

  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      error: err.message,
      status: err.statusCode
    });
  }

  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ error: 'Validation error', details: errors });
  }

  // Generic error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;