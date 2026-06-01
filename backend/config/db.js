// config/db.js
// MySQL database connection

const mysql = require('mysql2');
require('dotenv').config();

// 1. 升级为自带复活甲的 createPool (连接池)，并补上 Aiven 必须的 port
const db = mysql.createPool({
    host:             process.env.DB_HOST,
    user:             process.env.DB_USER,
    password:         process.env.DB_PASSWORD,
    database:         process.env.DB_NAME,
    port:             process.env.DB_PORT || 25514, // 极其重要！Aiven 默认是 25514，本地是 3306
    waitForConnections: true,
    connectionLimit:  10,
    queueLimit:       0
});


db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed ❌:', err);
        return;
    }
    console.log('MySQL Cloud Connection Pool connected Successfully! ✅');
    connection.release(); // 测试成功后，把连接放回池子里给系统后续使用
});

module.exports = db;