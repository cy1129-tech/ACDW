const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const db      = require('../config/db')
const verifyToken = require('../middleware/auth')
require('dotenv').config()

router.post('/register', (req, res) => {
    const { username, email, password, organization_name } = req.body
    if (!username || !email || !password || !organization_name) {
        return res.status(400).json({ error: 'Username, email, password and Organisation name are required' })
    }
    db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message })
        if (results.length > 0) return res.status(409).json({ error: 'Username or email already exists' })
        const hashed = bcrypt.hashSync(password, 10)
        db.query(
            `INSERT INTO users (username, email, password, organization_name) VALUES (?, ?, ?, ?)`,
            [username, email, hashed, organization_name.trim()],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message })
                resend.emails.send({
                    from: 'onboarding@resend.dev',
                    to: email,
                    subject: '✨ Welcome to ACDW Clothing Management Platform!',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                            <h2 style="color: #4f46e5; text-align: center;">Account Initialized Successfully! 🎉</h2>
                            <p>Hi <strong>${username}</strong>,</p>
                            <p>Your profile is linked successfully with <strong>${organization_name}</strong>! You can now manage the shared organizational stock pool.</p>
                            <p style="font-size: 12px; color: #cbd5e1; text-align: center;">© 2026 ACDW Inventory Group. All Rights Reserved.</p>
                        </div>
                    `
                }).then(() => console.log('✉️ Welcome email sent!'))
                  .catch(e => console.error('❌ Email error:', e));
                res.status(201).json({ success: true, message: 'Registration successful', user_id: result.insertId })
            }
        )
    })
})

router.post('/login', (req, res) => {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' })
    db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message })
        if (results.length === 0) return res.status(401).json({ error: 'Invalid username or password' })
        const user = results[0]
        if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid username or password' })
        const token = jwt.sign({ id: user.id, orgName: user.organization_name }, process.env.JWT_SECRET, { expiresIn: '24h' })
        res.status(200).json({ message: 'Login successful', token, user: { user_id: user.id, username: user.username, email: user.email, organization_name: user.organization_name } })
    })
})

router.post('/forgot-password', (req, res) => {
    const { username, email } = req.body;
    if (!username || !email) return res.status(400).json({ error: 'Username and email are required' });
    db.query('SELECT * FROM users WHERE username = ? AND email = ?', [username, email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Username and email match not found' });
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#';
        let temporaryPassword = '';
        for (let i = 0; i < 8; i++) temporaryPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        const hashedTempPassword = bcrypt.hashSync(temporaryPassword, 10);
        db.query('UPDATE users SET password = ? WHERE username = ? AND email = ?', [hashedTempPassword, username, email], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            resend.emails.send({
                from: 'onboarding@resend.dev',
                to: email,
                subject: '🔒 Your ACDW Temporary Password Reset',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f1f5f9; border-radius: 12px;">
                        <h2 style="color: #dc2626; text-align: center;">Password Reset Request</h2>
                        <p>Hi <strong>${username}</strong>, your temporary password is:</p>
                        <div style="text-align: center; margin: 30px 0; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1;">
                            <span style="font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${temporaryPassword}</span>
                        </div>
                        <p>Please login and change your password immediately.</p>
                    </div>
                `
            }).then(() => console.log('✉️ Reset email sent!'))
              .catch(e => console.error('❌ Reset email error:', e));
            res.status(200).json({ success: true, message: 'A temporary password has been dispatched to your mailbox!' });
        });
    });
});

router.put('/profile', verifyToken, (req, res) => {
    const currentUserId = req.userId;
    const { username, email, password } = req.body;
    if (!username || !email) return res.status(400).json({ error: 'Username and email are required' });
    db.query('SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?', [username, email, currentUserId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            const hasMatchingUsername = results.some(user => user.username === username);
            return res.status(409).json({ error: hasMatchingUsername ? 'Username is already taken' : 'Email is already taken' });
        }
        let query = 'UPDATE users SET username = ?, email = ?';
        let params = [username, email];
        if (password && password.trim().length >= 6) {
            query += ', password = ?';
            params.push(bcrypt.hashSync(password, 10));
        }
        query += ' WHERE id = ?';
        params.push(currentUserId);
        db.query(query, params, (updateErr) => {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            res.status(200).json({ success: true, message: 'Profile updated successfully! ✅' });
        });
    });
});

module.exports = router