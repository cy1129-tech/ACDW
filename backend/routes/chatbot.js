// backend/routes/chatbot.js
const express = require('express');
const router = express.Router();
const axios = require('axios'); 
const { GoogleGenerativeAI } = require('@google/generative-ai');
const verifyToken = require('../middleware/auth');
require('dotenv').config();

// 初始化 Gemini 引擎 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🌐 Serper 谷歌爬虫外挂
async function searchWeb(query) {
    try {
        const response = await axios.post(
            'https://google.serper.dev/search',
            { q: query },
            {
                headers: {
                    'X-API-KEY': process.env.SERPER_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data.organic || [];
    } catch (e) {
        console.error("Serper API error, falling back to empty results.");
        return [];
    }
}

// ─────────────────────────────────────────────────────
// 🤖 AI Chatbot 智能全栈接口 (修复 Gemini 历史顺序 Bug 版)
// POST /api/chatbot
// ─────────────────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
    const { message, history } = req.body; 

    if (!message) {
        return res.status(400).json({ error: 'Message payload is required' });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash", 
            systemInstruction: `You are the ACDW Charity Assistant.

            Rules:
            1. Base your recommendations on the provided web search results or the ongoing chat history context.
            2. Never invent shelters or charity homes.
            3. Never claim an organisation urgently needs clothes unless explicitly stated by the source context.
            4. Always preserve the exact source links provided in the context next to the organization name so they remain clickable.
            5. Always remind users to verify current needs directly with the organisation.
            6. If the user asks to format information (like creating a table), maintain the EXACT same shelters and details previously discussed in the chat history.`
        });

        // 🟢 核心修复盾牌：过滤历史记录，找到用户第一次说话的索引，把前面的 AI 欢迎语安全切掉！
        // 这样可以确保 formattedHistory 的第一条绝对是 'user'，彻底消灭 500 报错崩溃
        const firstUserIdx = (history || []).findIndex(msg => msg.sender === 'user');
        const validHistory = firstUserIdx !== -1 ? history.slice(firstUserIdx) : [];

        // 判断如果只是简短的画表命令，就不去重复爬网
        const isFormattingRequest = Array.isArray(history) && history.length > 0 && 
            (/table|format|summarize|list the above|in table/i.test(message) && message.length < 50);

        let prompt = "";

        if (isFormattingRequest) {
            prompt = `The user wants you to reformat or answer a follow-up request based strictly on your previous response. Do NOT use new external web results. Format the existing information into the requested structure (e.g., a table) exactly as requested.
            
            USER FOLLOW-UP COMMAND:
            ${message}`;
        } else {
            const searchResults = await searchWeb(`${message} Malaysia charity home clothing donation`);

            const webContext = searchResults
                .slice(0, 5)
                .map(item => `Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}\n`)
                .join('\n');

            prompt = `
            IMPORTANT:
            - Use the web search results below to answer the user's question.
            - Do NOT invent shelters.
            - Do NOT fabricate urgency levels.
            - Mention source links when possible.

            WEB SEARCH RESULTS:
            ${webContext}

            USER QUESTION:
            ${message}
            `;
        }

        // 将历史记录翻译成 Gemini 认识的结构 (使用过滤安全后的 validHistory)
        const formattedHistory = validHistory.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // 拉起带记忆保护的官方 Chat 引擎会话
        const chat = model.startChat({
            history: formattedHistory
        });

        const result = await chat.sendMessage(prompt);
        const aiReply = result.response.text();

        res.status(200).json({
            reply: aiReply
        });

    } catch (err) {
        console.error('❌ Gemini Engine Crashing:', err);
        res.status(500).json({ 
            error: 'Gemini AI pipeline encountered an issue.',
            details: err.message 
        });
    }
});

module.exports = router;