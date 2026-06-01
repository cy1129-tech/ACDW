// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Connect to db
const db = require('./config/db');

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'https://acdw.vercel.app'], 
    credentials: true
}));

// 💡 干净、唯一的容量爆破与体解析中间件，彻底清除后面多余的二次挂载，防止聊天卡死
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/clothing',  require('./routes/clothing'));
app.use('/api/chatbot',   require('./routes/chatbot'));

// A simple test route
app.get('/', (req, res) => {
    res.json({ message: "Welcome to the ACDW Backend API!" });
});

// Test to read data from Users database
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