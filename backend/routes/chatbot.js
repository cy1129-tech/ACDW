const express = require('express');
const router = express.Router();
const axios = require('axios');
const verifyToken = require('../middleware/auth');
require('dotenv').config();

// 核心：直接使用 Google 的 REST API，不再依赖容易 404 的 SDK 版本
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

// 🌐 Serper 谷歌搜索
async function searchWeb(query) {
    try {
        const response = await axios.post(
            'https://google.serper.dev/search',
            { q: query },
            {
                headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
                timeout: 5000
            }
        );
        return response.data.organic || [];
    } catch (e) {
        console.error("⚠️ Serper error:", e.message);
        return [];
    }
}

// 🤖 POST /api/chatbot
router.post('/', verifyToken, async (req, res) => {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    try {
        // 1. 搜索数据
        const searchResults = await searchWeb(`${message} Malaysia charity clothing donation 2026`);
        const webContext = searchResults
            .slice(0, 4)
            .map(item => `Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}`)
            .join('\n');

        // 2. 构造 Prompt (强制约束输出格式)
        const prompt = `
            You are the ACDW Charity Assistant.
            Rules:
            - Based on search results: ${webContext}
            - NEVER invent shelters.
            - Format: 
              1. Organisation Name: ...
              Google Maps: ...
              Required Type: ...
              Reason: ...
              Source Link: ...
            - If user asks for table, use Markdown table format.
            - User: ${message}
        `;

        // 3. 🟢 使用 axios 直连 Google API (这是绕过 404 的万能写法)
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        const aiReply = response.data.candidates[0].content.parts[0].text;
        res.status(200).json({ reply: aiReply });

    } catch (err) {
        console.error('❌ CRITICAL Chatbot Pipeline Crash:', err.response?.data || err.message);
        res.status(500).json({ 
            reply: "Our real-time intelligence gateway is experiencing a sync delay. Please specify your target Malaysian state and try again."
        });
    }
});

module.exports = router;