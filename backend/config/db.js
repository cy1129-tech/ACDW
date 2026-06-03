// config/db.js
// MySQL database connection

const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err)
        return
    }
    console.log('MySQL connected ✅')
});

module.exports = db;

console.log("Current connected db host is：", process.env.DB_HOST);