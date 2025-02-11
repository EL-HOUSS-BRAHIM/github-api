// server.js
const express = require('express');
const path = require('path');

const app = express();
const port = 3000; // You can change this port if needed

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Main route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});