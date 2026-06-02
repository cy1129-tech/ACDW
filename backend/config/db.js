// backend/config/db.js
const mysql = require('mysql2');
require('dotenv').config();

// 👑 大厂标准：使用 createPool 代替 createConnection，解决一切断线死锁问题！
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10, // 自动维持 10 个活连接，随调随用，断线自动掐灭重开
    queueLimit: 0,
    connectTimeout: 10000
});

// 自动化智能断线重连与测试握手
pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ [AIVEN MYSQL] Database initial connection failed:", err.message);
    } else {
        console.log("✅ [AIVEN MYSQL] Pool connection established successfully! Tunnel is bulletproof.");
        connection.release(); // 释放回池里，别占着
    }
});

// 👑 保底导出：让老代码里的 db.query(...) 依然能够完美无缝运行
module.exports = pool;