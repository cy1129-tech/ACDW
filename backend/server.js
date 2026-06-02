//server.js

//This is the brain of our backend.
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 连接数据库
const db = require('./config/db');

// 初始化 Express 实例
const app = express();

// ==========================================
// 2. 👑 终极坚固的全局 CORS 跨域防御配置
// ==========================================
const corsOptions = {
    origin: '*', // 允许任何前端域名（包括你们各种测试、生产的 Vercel 链接）访问
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 必须包含 OPTIONS 探测方法
    allowedHeaders: ['Content-Type', 'Authorization'], // 允许前端携带的头
    credentials: true,
    optionsSuccessStatus: 200 // 确保旧版浏览器或部分网关面对 OPTIONS 请求时也吐回 200 OK
};

// 必须放在所有路由和请求解析的前面！
app.use(cors(corsOptions));


// ==========================================
// 3. 全局数据流解析中间件 (Body Parsers)
// ==========================================
app.use(express.json()); // 允许接收来自前端的纯 JSON 数据
app.use(express.urlencoded({ extended: true })); // 强力解析云端 FormData 带来的混合表单字段
app.use('/uploads', express.static('uploads')); // 静态托管上传的图片夹

// ==========================================
// 4. 系统业务路由挂载 (Routes)
// ==========================================
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/clothing', require('./routes/clothing'));
app.use('/api/chatbot',  require('./routes/chatbot'));

// ==========================================
// 5. 测试与保障接口 (Debug Routes)
// ==========================================
// 简单的后端存活测试接口
app.get('/', (req, res) => {
    res.json({ message: "Welcome to the ACDW Backend API! 系统线上运行中 ✅" });
});

// 测试读取用户数据库的接口
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

// ==========================================
// 6. 启动网关服务 (Server Bootstrap)
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 ACDW Server is smoothly running on port: ${PORT}`);
});