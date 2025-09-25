const express = require('express');
require('./scheduler');
const { json, urlencoded } = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json'); // Your Swagger/OpenAPI definition
const userRoutes = require('./routes/user');
const rankingRoutes = require('./routes/ranking');
const systemRoutes = require('./routes/system');
const { APIError } = require('./utils/errors');
const cors = require('cors');
const config = require('./config');

const app = express();

app.set('trust proxy', 1);

// Observability
if (config.nodeEnv !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.info(`HTTP ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
  });
}

// Middlewares
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cors());

// Rate limiting
const clientHits = new Map();

function rateLimiter(req, res, next) {
  if (config.rateLimit.maxRequests <= 0) {
    next();
    return;
  }

  const windowMs = config.rateLimit.windowMs;
  const limit = config.rateLimit.maxRequests;
  const now = Date.now();
  const key = req.ip;
  let entry = clientHits.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  entry.count += 1;
  clientHits.set(key, entry);

  const remaining = Math.max(0, limit - entry.count);
  res.setHeader('RateLimit-Limit', limit);
  res.setHeader('RateLimit-Remaining', remaining);
  res.setHeader('RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

  if (entry.count > limit) {
    res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
    return;
  }

  next();
}

if (config.nodeEnv !== 'test') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of clientHits.entries()) {
      if (entry.resetAt <= now) {
        clientHits.delete(key);
      }
    }
  }, Math.max(1000, config.rateLimit.windowMs)).unref();
}

app.use('/api', rateLimiter);

// Routes
app.use('/api/user', userRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/system', systemRoutes);

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