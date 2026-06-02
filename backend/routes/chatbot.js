const express = require('express');
const router = express.Router();
const axios = require('axios');
const verifyToken = require('../middleware/auth');
require('dotenv').config();

// 核心：直接使用生产环境 REST API，完全绕过 SDK 的版本兼容性地雷
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

// 🌐 Serper 搜索
async function searchWeb(query) {
    try {
        const response = await axios.post(
            'https://google.serper.dev/search',
            { q: query, num: 5 },
            { headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' }, timeout: 8000 }
        );
        return response.data.organic || [];
    } catch (e) {
        return [];
    }
}

// 🤖 POST /api/chatbot
router.post('/', verifyToken, async (req, res) => {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    try {
        // 1. 联网搜索最新资讯
        const searchResults = await searchWeb(`${message} Malaysia charity clothing donation 2026`);
        const webContext = searchResults
            .slice(0, 4)
            .map(item => `Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}`)
            .join('\n');

        // 2. 构造 Prompt
        const prompt = `
            You are SnapDonate AI, an expert Charity Assistant in Malaysia.
            Context: ${webContext}
            
            Rules:
            - If user asks for real shelters, use the context. DO NOT invent them.
            - Format strictly:
              1. Organisation Name: ...
              Google Maps: ...
              Required Type: ...
              Reason: ...
              Source Link: ...
            - If simple general question, answer concisely.
            - User: ${message}
        `;

        // 3. 🟢 使用 axios 直连 Google API (彻底解决 404 困局)
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        const aiReply = response.data.candidates[0].content.parts[0].text;
        res.status(200).json({ reply: aiReply });

    } catch (err) {
        console.error('❌ API Error:', err.response?.data || err.message);
        res.status(500).json({ 
            reply: "The intelligence gateway is currently refreshing. Please try again with a specific Malaysian state (e.g., Perak, Selangor) and I will provide the live registry." 
        });
    }
});

module.exports = router;