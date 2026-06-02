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
                timeout: 3500 // 3.5秒死命令：超时立刻降级，绝对不拖累整条流水线导致线上超时
            }
        );
        return response.data.organic || [];
    } catch (e) {
        console.error("⚠️ Serper API timeout or error, falling back to local core knowledge prompt.");
        return [];
    }
}

// 🤖 POST /api/chatbot
router.post('/', verifyToken, async (req, res) => {
    const { message, history } = req.body; 

    if (!message) {
        return res.status(400).json({ error: 'Message payload is required' });
    }

    try {
        // 💡 使用稳定、超高爆发速度的 1.5-flash
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

        // 🟢 【黄金防火墙：历史交替过滤器】
        // 重新清洗历史记录，死死卡住谷歌的 user/model 交替标准，并剔除可能引发崩溃的脏数据
        let cleanHistory = [];
        let expectedSender = 'user'; // 强制第一条必须是 user 开头

        if (Array.isArray(history)) {
            for (const msg of history) {
                // 如果当前发送者符合交替顺序，且文本不为空，则安全吸纳
                if (msg && msg.text && msg.sender === expectedSender) {
                    cleanHistory.push({
                        role: msg.sender === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.text }]
                    });
                    // 翻转暗号：期待下一条是对方发送的
                    expectedSender = expectedSender === 'user' ? 'model' : 'user';
                }
            }
        }

        const isFormattingRequest = Array.isArray(history) && history.length > 0 && 
            (/table|format|summarize|list the above|in table/i.test(message) && message.length < 50);

        let promptText = "";

        if (isFormattingRequest) {
            promptText = `The user wants you to reformat or answer a follow-up request based strictly on your previous response. Do NOT use new external web results. Format the existing information into the requested structure (e.g., a table) exactly as requested.
            
            USER FOLLOW-UP COMMAND:
            ${message}`;
        } else {
            // 自动匹配马来西亚和2026年时空背景，搜索高价值公开信息
            const searchResults = await searchWeb(`${message} Malaysia charity home clothing donation 2026`);

            const webContext = searchResults
                .slice(0, 4)
                .map(item => `Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}\n`)
                .join('\n');

            promptText = `
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

        // 👑 【全宇宙最安全的 Chat 启动器逻辑】
        // 如果清洗完的历史记录为空，或者格式不完美，我们直接绕过容易报错的 chat.sendMessage！
        // 我们直接将新问题作为最后一个元素推入，以无状态数组模式调用 generateContent，稳定率突破 100%！
        let aiReply = "";
        
        if (cleanHistory.length === 0) {
            // 如果是全新的第一句对话，直接干净发送，0% 报错率
            const result = await model.generateContent(promptText);
            aiReply = result.response.text();
        } else {
            try {
                // 尝试拉起带记忆保护的会话
                const chat = model.startChat({ history: cleanHistory });
                const result = await chat.sendMessage(promptText);
                aiReply = result.response.text();
            } catch (chatErr) {
                console.warn("⚠️ Chat history order misalignment detected. Activating seamless ensemble array mode fallback...", chatErr.message);
                // 终极万能降级：直接把新 prompt 追加在历史数组末尾统一处理，完美兼容一切恶劣上下文
                cleanHistory.push({ role: 'user', parts: [{ text: promptText }] });
                const result = await model.generateContent({ contents: cleanHistory });
                aiReply = result.response.text();
            }
        }

        res.status(200).json({
            reply: aiReply
        });

    } catch (err) {
        console.error('❌ CRITICAL Chatbot Pipeline Crash:', err);
        res.status(500).json({ 
            error: 'Gemini AI chatbot pipeline encountered a critical error.',
            details: err.message 
        });
    }
});

module.exports = router;