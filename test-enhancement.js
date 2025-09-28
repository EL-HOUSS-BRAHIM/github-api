// Test file for AI enhancement
const express = require('express');
const app = express();

// Add new user authentication middleware
const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // Verify token logic here
  next();
};

app.use('/api', authenticateUser);

// New endpoint for user profile
app.get('/api/profile', (req, res) => {
  res.json({ 
    id: req.user.id, 
    name: req.user.name,
    email: req.user.email 
  });
});

module.exports = app;