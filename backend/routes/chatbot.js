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
router.post('/', verifyToken, async (req, res) => {
    const { message, history } = req.body; // 🟢 接收前端的历史记录
    
    if (!message) return res.status(400).json({ error: 'Message is required' });

    try {
        // 1. 联网搜索：结合上下文优化关键词
        // 如果 history 存在，我们可以让模型在提示词中知道这是一个延续的话题
        const searchKeyword = `${message} real charity organizations and clothing donation shelters in Malaysia 2026`;
        const searchResults = await searchWeb(searchKeyword);

        // 2. 清洗数据：初步剔除社交媒体，只留干货 (确保来源权威性)
        const cleanData = searchResults
            .filter(item => !/facebook|instagram|tiktok|twitter/.test(item.link))
            .slice(0, 4)
            .map(item => ({ title: item.title, snippet: item.snippet, link: item.link }));

        // 3. 构造 Gemini 多轮对话 + RAG (检索增强生成)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // 转换历史记录格式
        const chatContext = history.map(h => ({
            role: h.sender === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
        }));

        const chat = model.startChat({ history: chatContext });

        // 🟢 关键 Prompt：命令 AI 进行二次“审计”
        const prompt = `
            You are a professional Charity Assistance AI for Malaysia.
            Here is verified reference data from the web: ${JSON.stringify(cleanData)}
            
            Instructions:
            1. ONLY provide real, verifiable charity organization names from the reference data.
            2. If the user asks for "more in [Location]" or refers to previous info, use the context.
            3. FORBIDDEN: Do not suggest social media posts, ads, or Yelp/Tripadvisor directory links.
            4. If the user asks for a table, format it in Markdown with columns: Organization, Purpose, Location/Details, Link.
            5. Provide real links from the data.
            6. Tone: Professional, warm, and accurate.
            
            Current User Query: ${message}
        `;

        const result = await chat.sendMessage(prompt);
        const reply = result.response.text();

        res.status(200).json({ reply });
    } catch (err) {
        console.error("AI Chatbot Error:", err);
        res.status(500).json({ error: 'Failed to process AI query' });
    }
});

module.exports = router;