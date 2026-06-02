const express = require('express');
const router = express.Router();
const axios = require('axios');
const verifyToken = require('../middleware/auth');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 初始化 Gemini (请确保 .env 中设置了 GEMINI_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🌐 实时搜索函数
async function searchWeb(query) {
    try {
        const response = await axios.post(
            'https://google.serper.dev/search',
            { q: query },
            {
                headers: { 
                    'X-API-KEY': process.env.SERPER_API_KEY, 
                    'Content-Type': 'application/json' 
                },
                timeout: 5000 
            }
        );
        return response.data.organic || [];
    } catch (e) {
        return [];
    }
}

// 🤖 2. POST /api/chatbot (升级版：多轮对话 + 真实 RAG 审核)
// ...前面的代码保持不变

router.post('/', verifyToken, async (req, res) => {
    const { message, history } = req.body;
    
    if (!message) return res.status(400).json({ error: 'Message is required' });

    try {
        const searchKeyword = `${message} Malaysia charity clothing donation 2026`;
        const searchResults = await searchWeb(searchKeyword);

        const cleanData = searchResults
            .filter(item => !/facebook|instagram|tiktok|twitter/.test(item.link))
            .slice(0, 3)
            .map(item => ({ title: item.title, snippet: item.snippet, link: item.link }));

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // 🟢 核心修复：在这里过滤掉 history 开头的所有 model 消息，并确保以 user 开头
        const validHistory = history
            .filter(h => h.text && h.text.trim().length > 0) // 过滤空消息
            .map(h => ({
                role: h.sender === 'user' ? 'user' : 'model',
                parts: [{ text: h.text }]
            }));

        // 确保第一个角色必须是 user，如果是 model 则切掉它
        const startIdx = validHistory.findIndex(h => h.role === 'user');
        const finalHistory = startIdx !== -1 ? validHistory.slice(startIdx) : [];

        const chat = model.startChat({
            history: finalHistory,
        });

        const prompt = `
            You are a helpful Charity Assistant for Malaysia.
            Reference Information: ${JSON.stringify(cleanData)}
            Instructions: 
            - Answer accurately based on the reference. 
            - If the user asks for a table, format it cleanly in Markdown.
            - Keep it professional and helpful.
            User's Current Question: ${message}
        `;

        const result = await chat.sendMessage(prompt);
        const reply = result.response.text();

        res.status(200).json({ reply });
    } catch (err) {
        console.error("AI Error:", err);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

module.exports = router;