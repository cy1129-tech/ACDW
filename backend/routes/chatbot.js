// backend/routes/chatbot.js
const express = require('express');
const router = express.Router();
const axios = require('axios'); 
const { GoogleGenerativeAI } = require('@google/generative-ai');
const verifyToken = require('../middleware/auth');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🌐 Serper 谷歌爬虫外挂 + 3.5秒超时防御隔离罩
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
                timeout: 3500 // 💡 3.5秒死命令：超时立刻降级，绝对不拖累整条流水线导致线上超时
            }
        );
        return response.data.organic || [];
    } catch (e) {
        console.error("⚠️ Serper API timeout or error, falling back to local core knowledge prompt.");
        return [];
    }
}

// POST /api/chatbot
router.post('/', verifyToken, async (req, res) => {
    const { message, history } = req.body; 

    if (!message) {
        return res.status(400).json({ error: 'Message payload is required' });
    }

    try {
        // 💡 换用云端高响应、极速通行的官方 1.5-flash 大模型
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash", 
            systemInstruction: `You are the ACDW Charity Assistant.

            Rules:
            1. Base your recommendations on the provided web search results or the ongoing chat history context.
            2. Never invent shelters or charity homes in Malaysia.
            3. Never claim an organisation urgently needs clothes unless explicitly stated by the source context.
            4. Always preserve the exact source links provided in the context next to the organization name so they remain clickable.
            5. Always remind users to verify current needs directly with the organisation.
            6. If the user asks to format information (like creating a table), maintain the EXACT same shelters and details previously discussed in the chat history.`
        });

        const firstUserIdx = (history || []).findIndex(msg => msg.sender === 'user');
        const validHistory = firstUserIdx !== -1 ? history.slice(firstUserIdx) : [];

        const isFormattingRequest = Array.isArray(history) && history.length > 0 && 
            (/table|format|summarize|list the above|in table/i.test(message) && message.length < 50);

        let prompt = "";

        if (isFormattingRequest) {
            prompt = `The user wants you to reformat or answer a follow-up request based strictly on your previous response. Do NOT use new external web results. Format the existing information into the requested structure (e.g., a table) exactly as requested.
            
            USER FOLLOW-UP COMMAND:
            ${message}`;
        } else {
            // 自动化加上当下具体的年份和地点校准，让搜索结果极其精准
            const searchResults = await searchWeb(`${message} Malaysia charity home clothing donation 2026`);

            const webContext = searchResults
                .slice(0, 4) // 优化为4条，体积更小，传输快一倍
                .map(item => `Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}\n`)
                .join('\n');

            prompt = `
            IMPORTANT:
            - Use the web search results below to answer the user's question.
            - Do NOT invent shelters.
            - Do NOT fabricate urgency levels.
            - Mention source links when possible.

            WEB SEARCH RESULTS:
            ${webContext || "No current web results found. Please use your internal database for real Malaysian charity shelters."}

            USER QUESTION:
            ${message}
            `;
        }

        const formattedHistory = validHistory.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        const chat = model.startChat({
            history: formattedHistory
        });

        const result = await chat.sendMessage(prompt);
        const aiReply = result.response.text();

        res.status(200).json({
            reply: aiReply
        });

    } catch (err) {
        console.error('❌ Gemini Chatbot Pipeline Error:', err);
        res.status(500).json({ 
            error: 'Gemini AI chatbot pipeline encountered an issue.',
            details: err.message 
        });
    }
});

module.exports = router;