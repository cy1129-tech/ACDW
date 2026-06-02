// ==========================================
// 1. 基础依赖与环境配置导入 (Imports)
// ==========================================
const express = require('express');
const cors = require('cors');
const fs = require('fs');     // 👈 挪到最顶层，确保后面使用时绝不报 undefined！
const path = require('path'); // 👈 挪到最顶层
require('dotenv').config();

// 连接数据库连接池
const db = require('./config/db');

// ====== 👑 终极金身：线上多环境自动创建 uploads 文件夹防御 ======
// 必须在依赖导入之后、业务逻辑运行之前执行
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("📁 [SYSTEM] 'uploads' folder was missing on cloud server. Auto-created successfully! ✅");
}
// ==============================================================

// 初始化 Express 实例
const app = express();

// ==========================================
// 2. 👑 终极坚固的全局 CORS 跨域防御配置
// ==========================================
const corsOptions = {
    origin: '*', // 允许任何前端域名访问
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'], 
    credentials: true,
    optionsSuccessStatus: 200 
};

// 必须放在所有路由和请求解析的前面！
app.use(cors(corsOptions));

// ==========================================
// 3. 全局数据流解析中间件 (Body Parsers)
// ==========================================
app.use(express.json()); // 允许接收来自前端的纯 JSON 数据
app.use(express.urlencoded({ extended: true })); // 强力解析云端 FormData
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
app.get('/', (req, res) => {
    res.json({ message: "Welcome to the ACDW Backend API! 系统线上运行中 ✅" });
});

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