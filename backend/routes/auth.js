// routes/auth.js
const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const db      = require('../config/db')
require('dotenv').config()

// ─────────────────────────────────────
// Function 1 — Register
// POST /api/auth/register
// Body: { username, email, password }
// ─────────────────────────────────────
router.post('/register', (req, res) => {
    const { username, email, password } = req.body

    // Validate
    if (!username || !email || !password) {
        return res.status(400).json({
            error: 'Username, email and password are required'
        })
    }

    // Check username exists
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

            // Insert user — user_id auto created by database
            db.query(
                `INSERT INTO users 
                 (username, email, password) 
                 VALUES (?, ?, ?)`,
                [username, email, hashed],
                (err, result) => {
                    if (err) return res.status(500).json({ error: err.message })

                    res.status(201).json({
                        message: 'Registration successful',
                        user_id: result.insertId
                    })
                }
            )
        }
    )
})

// ─────────────────────────────────────
// Function 2 — Login
// POST /api/auth/login
// Body: { username, password }
// ─────────────────────────────────────
router.post('/login', (req, res) => {
    const { username, password } = req.body

    // Validate
    if (!username || !password) {
        return res.status(400).json({
            error: 'Username and password are required'
        })
    }

    // Find user by username
    db.query(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message })

            if (results.length === 0) {
                return res.status(401).json({
                    error: 'Invalid username or password'
                })
            }

            const user = results[0]

            // Check password
            const isMatch = bcrypt.compareSync(password, user.password)
            if (!isMatch) {
                return res.status(401).json({
                    error: 'Invalid username or password'
                })
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user.user_id },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            )

            res.status(200).json({
                message: 'Login successful',
                token,
                user: {
                    user_id:  user.user_id,
                    username: user.username,
                    email:    user.email
                }
            })
        }
    )
})

module.exports = router

 