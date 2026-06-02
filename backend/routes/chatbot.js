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
            { q: query, num: 6 },
            { headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' }, timeout: 8000 }
        );
        return response.data.organic || [];
    } catch (e) {
        return [];
    }
}

router.post('/', verifyToken, async (req, res) => {
    const { message, history } = req.body;
    
    // 1. 意图提取：把用户的口语提取成搜索关键词
    const searchResults = await searchWeb(`${message} Malaysia charity clothing donation shelters`);
    
    // 2. 清洗数据：剔除无效社交链接
    const cleanData = searchResults
        .filter(item => !/facebook|instagram|tiktok|twitter/.test(item.link))
        .slice(0, 5)
        .map(i => ({ title: i.title, link: i.link, snippet: i.snippet }));

    // 3. AI 重构排版 (这是保证格式完美的核心)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
        You are an expert Charity Assistant in Malaysia.
        Please structure your response in this exact format for each organization found:
        
        Where to Donate Clothes in [State/Region Name]
        
        1. Organisation Name: [Name]
           Address: [Location or "Check website"]
           Details: [Brief summary from source]
           Required Type: [What clothes they need]
           Source Link: ${"{url}"}
        
        [Repeat for up to 3 organizations]

        💡 Quick Tips Before You Go:
        • Ensure all clothes are clean and dry before dropping them off.
        • It is highly recommended to bag your clothes tightly in plastic bags to keep them clean during dispatch.

        Data to use: ${JSON.stringify(cleanData)}
        User's Request: ${message}
    `;

    try {
        const result = await model.generateContent(prompt);
        const reply = result.response.text();
        res.status(200).json({ reply });
    } catch (err) {
        res.status(500).json({ error: "Pipeline failure" });
    }
});

module.exports = router;