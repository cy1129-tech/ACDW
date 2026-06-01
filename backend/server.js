//This is the brain of our backend.
const express = require('express');
const cors = require('cors');
require('dotenv').config();

//connect to db
const db = require('./config/db');

//express
const app = express();

// Middleware
// 找到这行并替换
app.use(cors({
    origin: ['http://localhost:3000', 'https://acdw.vercel.app'], // 允许本地测试和Vercel线上版
    credentials: true
}));
app.use(express.json()); // Allows us to receive JSON data from frontend
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth',      require('./routes/auth'))
app.use('/api/clothing',  require('./routes/clothing'))
app.use('/api/chatbot',   require('./routes/chatbot'))

// A simple test route
app.get('/', (req, res) => {
    res.json({ message: "Welcome to the ACDW Backend API!" });
});

//Test to read data from Users database
app.get('/api/users', (req, res) => {
    const sql = "SELECT * FROM users";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching users:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});