const mysql = require('mysql2');
require('dotenv').config();

// 建立跟 MySQL 的连接
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// 测试连接并打印结果
db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('👉 Please check your .env file passwords!');
    } else {
        console.log('✅ Successfully connected to MySQL Database!');
    }
});

module.exports = db;