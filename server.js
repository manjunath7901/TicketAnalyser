const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// For any other route, serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🎯 Frontend server running on http://localhost:${PORT}`);
    console.log(`🔧 Make sure to start the backend server on port 3001`);
    console.log(`📱 Open your browser to http://localhost:${PORT}`);
});
