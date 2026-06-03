const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const db      = require('../config/db')
const nodemailer = require('nodemailer')
const verifyToken = require('../middleware/auth')
require('dotenv').config()

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    family: 4,  // ← 强制用 IPv4
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ─────────────────────────────────────
// Function 1 — Register (加入了组织隔离验证)
// POST /api/auth/register
// Body: { username, email, password, organization_name }
// ─────────────────────────────────────
router.post('/register', (req, res) => {
    // 🟢 核心：接收前端传过来的 organization_name
    const { username, email, password, organization_name } = req.body

    // Validate (组织名变成强必填项项)
    if (!username || !email || !password || !organization_name) {
        return res.status(400).json({
            error: 'Username, email, password and Organisation name are required'
        })
    }

    // Check username or email exists
    db.query(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, email],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message })

            if (results.length > 0) {
                return res.status(409).json({
                    error: 'Username or email already exists'
                })
            }

            // Hash password
            const hashed = bcrypt.hashSync(password, 10)

            // Insert user (同时把 organization_name 存入 users 表)
            db.query(
                `INSERT INTO users 
                 (username, email, password, organization_name) 
                 VALUES (?, ?, ?, ?)`,
                [username, email, hashed, organization_name.trim()],
                (err, result) => {
                    if (err) return res.status(500).json({ error: err.message })

                    // 📬 全自动异步系统邮件发信
                    const mailOptions = {
                        from: `"ACDW Platform" <${process.env.EMAIL_USER}>`,
                        to: email,
                        subject: '✨ Welcome to ACDW Clothing Management Platform!',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                                <h2 style="color: #4f46e5; text-align: center;">Account Initialized Successfully! 🎉</h2>
                                <p>Hi <strong>${username}</strong>,</p>
                                <p>Your profile is linked successfully with <strong>${organization_name}</strong>! You can now manage the shared organizational stock pool.</p>
                                <div style="text-align: center; margin: 35px 0;">
                                    <a href="http://localhost:3000/login" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
                                        🚀 Launch Platform & Login
                                    </a>
                                </div>
                                <p style="font-size: 12px; color: #cbd5e1; text-align: center;">© 2026 ACDW Inventory Group. All Rights Reserved.</p>
                            </div>
                        `
                    };

                    transporter.sendMail(mailOptions, (mailErr) => {
                        if (mailErr) console.error('❌ [Nodemailer] Error:', mailErr.message);
                        else console.log('✉️ [Nodemailer] Welcome email dispatched!');
                    });

                    res.status(201).json({
                        success: true,
                        message: 'Registration successful',
                        user_id: result ? result.insertId : 1
                    })
                }
            )
        }
    )
})

// ─────────────────────────────────────────────────────
// Function 2 — Login (升级版：支持用户名或邮箱双重登录，彻底解决修改后的同步问题)
// POST /api/auth/login
// ─────────────────────────────────────────────────────
router.post('/login', (req, res) => {
    const { username, password } = req.body

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' })
    }

    // 🟢 升级 SQL：让用户可以用修改后的 username 登录，也可以用固定的 email 登录，双保险！
    db.query(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, username], // 👈 把传进来的账密池双向匹配
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message })

            if (results.length === 0) {
                return res.status(401).json({ error: 'Invalid username or password' })
            }

            const user = results[0]

            // Check password
            const isMatch = bcrypt.compareSync(password, user.password)
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid username or password' })
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, orgName: user.organization_name },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            )

            res.status(200).json({
                message: 'Login successful',
                token,
                user: {
                    user_id:  user.id, // 👈 完美对齐你们的物理主键 id
                    username: user.username,
                    email:    user.email,
                    organization_name: user.organization_name
                }
            })
        }
    )
})

// ─────────────────────────────────────────────────────
// Function 3 — Forgot & Reset Password 
// POST /api/auth/forgot-password
// Body: { username, email }
// ─────────────────────────────────────────────────────
router.post('/forgot-password', (req, res) => {
    const { username, email } = req.body;

    if (!username || !email) {
        return res.status(400).json({ error: 'Username and email are required' });
    }

    // 1. 去数据库里精确匹配有没有这个用户
    db.query(
        'SELECT * FROM users WHERE username = ? AND email = ?',
        [username, email],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            if (results.length === 0) {
                return res.status(404).json({ error: 'Username and email match not found' });
            }

            // 2. 纯前端/后台小魔术：全自动随机生成 8 位新临时密码
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#';
            let temporaryPassword = '';
            for (let i = 0; i < 8; i++) {
                temporaryPassword += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            // 3. 把这个新临时密码进行加盐 Hash 运算，用于存入数据库
            const hashedTempPassword = bcrypt.hashSync(temporaryPassword, 10);

            // 4. 更新 MySQL 里的密码数据
            db.query(
                'UPDATE users SET password = ? WHERE username = ? AND email = ?',
                [hashedTempPassword, username, email],
                (updateErr) => {
                    if (updateErr) return res.status(500).json({ error: updateErr.message });

                    // 5. 华丽地通过 Nodemailer 异步向用户邮箱发送临时密码信件 🚀
                    const mailOptions = {
                        from: `"ACDW Security" <${process.env.EMAIL_USER}>`,
                        to: email,
                        subject: '🔒 Urgent: Your ACDW Temporary Password Reset',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f1f5f9; border-radius: 12px; background-color: #ffffff;">
                                <h2 style="color: #dc2626; text-align: center;">Password Reset Request</h2>
                                <p style="font-size: 16px; color: #334155;">Hi <strong>${username}</strong>,</p>
                                <p style="font-size: 16px; color: #334155; line-height: 1.6;">We received a request to reset your password. The system has automatically generated a secure temporary password for your account:</p>
                                
                                <div style="text-align: center; margin: 30px 0; background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1;">
                                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: bold; color: #0f172a; letter-spacing: 2px;">
                                        ${temporaryPassword}
                                    </span>
                                </div>
                                
                                <p style="font-size: 14px; color: #475569;">🚀 <strong>Please log in immediately</strong> using this password, and then you can change it inside your panel.</p>
                                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
                                <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you did not make this request, please change your password as soon as possible to secure your account.</p>
                            </div>
                        `
                    };

                    transporter.sendMail(mailOptions, (mailErr) => {
                        if (mailErr) {
                            console.error('❌ [Forgot Mail] Failed:', mailErr.message);
                        } else {
                            console.log('✉️ [Forgot Mail] Temporary password sent to:', email);
                        }
                    });

                    // 给前端一个完美的交代
                    res.status(200).json({
                        success: true,
                        message: 'A temporary password has been successfully dispatched to your mailbox!'
                    });
                }
            );
        }
    );
});


// ─────────────────────────────────────────────────────
// Function 4 — Update Personal Profile (自由组合修改完美无瑕版)
// PUT /api/auth/profile
// ─────────────────────────────────────────────────────
router.put('/profile', verifyToken, (req, res) => {
    const currentUserId = req.userId; // 当前登录用户的真实 id
    const { username, email, password } = req.body;

    if (!username || !email) {
        return res.status(400).json({ error: 'Username and email are required' });
    }

    // 🟢 核心高光改造：校验时，强行排除当前用户自己 (id != ?)，只查有没有「其他人」占用了这个新名字或新Email
    db.query(
        'SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?',
        [username, email, currentUserId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            // 如果查到了结果，说明是「别人」占用了这个用户名或邮箱，这才是真正的冲突！
            if (results.length > 0) {
                const hasMatchingUsername = results.some(user => user.username === username);
                if (hasMatchingUsername) {
                    return res.status(409).json({ error: 'Username is already taken by another account' });
                } else {
                    return res.status(409).json({ error: 'Email Address is already taken by another account' });
                }
            }

            // 2. 动态构建 SQL 语句进行安全更新
            let query = 'UPDATE users SET username = ?, email = ?';
            let params = [username, email];

            if (password && password.trim().length >= 6) {
                const hashed = bcrypt.hashSync(password, 10);
                query += ', password = ?';
                params.push(hashed);
            }

            query += ' WHERE id = ?';
            params.push(currentUserId);

            // 3. 执行更新
            db.query(query, params, (updateErr) => {
                if (updateErr) {
                    console.error("❌ SQL Error Detail:", updateErr);
                    return res.status(500).json({ error: updateErr.message });
                }

                res.status(200).json({
                    success: true,
                    message: 'Profile updated successfully! ✅'
                });
            });
        }
    );
});

module.exports = router