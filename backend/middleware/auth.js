const jwt = require('jsonwebtoken')
require('dotenv').config()

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]

    if (!token) {
        return res.status(401).json({ error: 'No token provided' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        
        // 🟢 核心高光改造：同时解析出用户 ID 和 组织名
        req.userId = decoded.id
        req.orgName = decoded.orgName // 👈 挂在请求管道上，随调随用
        
        next()
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' })
    }
}

module.exports = verifyToken