//This is the brain of our backend.
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows us to receive JSON data from frontend

// A simple test route
app.get('/', (req, res) => {
    res.json({ message: "Welcome to the ACDW Backend API!" });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});