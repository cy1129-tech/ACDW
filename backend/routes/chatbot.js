const express = require('express');
const router = express.Router();
const axios = require('axios');
const verifyToken = require('../middleware/auth');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

router.post('/', verifyToken, async (req, res) => {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 1. 尝试联网搜索，但如果搜不到，我们要让 AI 凭借自身知识库强行回答，不能报“Sync delay”
        const searchKeyword = `${message} Malaysia charity clothing donation`;
        const searchResults = await searchWeb(searchKeyword);
        
        // 2. 构造更加鲁棒的提示词，强制要求它必须回答，即便搜索结果为空
        const prompt = `
            You are SnapDonate AI, an expert Charity Assistant in Malaysia.
            Contextual Reference Data (from web): ${JSON.stringify(searchResults)}
            
            Current User Message: "${message}"
            Conversation History: ${JSON.stringify(history)}
            
            Task:
            - If the message is about charity/shelters/clothing in Malaysia, identify the region and provide specific, verifiable organization names.
            - If you have search results, synthesize them. 
            - If the search results are poor, use your own internal knowledge to provide 3 verified charity names in the requested state.
            - Format strictly:
              1. Organisation Name: ...
              Google Maps: ... (Link or N/A)
              Required Type: ...
              Reason: ...
              Source Link: ...
            - If the input is general (e.g. k-pop, calculation), answer normally.
            - If irrelevant/nonsense, politely decline.
        `;

        const result = await model.generateContent(prompt);
        return res.json({ reply: result.response.text() });

    } catch (err) {
        console.error("❌ CRITICAL AI ERROR:", err);
        // 这里不要再写固定的 Sync Delay 了，直接让 AI 处理兜底
        return res.json({ 
            reply: "I'm having trouble with live search, but I know many charities in Malaysia. Could you please specify which state (e.g., Melaka, Perak, Selangor) you are looking for so I can provide the most accurate list?" 
        });
    }
});

module.exports = router;