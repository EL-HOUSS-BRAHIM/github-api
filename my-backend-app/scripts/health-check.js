#!/usr/bin/env node

/**
 * Health check script for Docker containers and load balancers
 */

const http = require('http');
const process = require('process');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/system/health',
  method: 'GET',
  timeout: 3000,
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.error(`Health check failed with status code: ${res.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error(`Health check failed: ${err.message}`);
  process.exit(1);
});

request.on('timeout', () => {
  console.error('Health check timed out');
  request.destroy();
  process.exit(1);
});

request.setTimeout(3000);
request.end();