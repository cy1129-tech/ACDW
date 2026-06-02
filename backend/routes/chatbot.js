const express = require('express');
const router = express.Router();
const axios = require('axios');
const verifyToken = require('../middleware/auth');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 初始化 Gemini (使用最稳定且大吞吐量的基础代号)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// 🌐 1. 高级并发谷歌实时检索网关
// ==========================================
async function searchWeb(query) {
    try {
        console.log(`🔍 [LIVE GOOGLE SEARCH] Query: "${query}"`);
        const response = await axios.post(
            'https://google.serper.dev/search',
            { q: query, num: 8 },
            {
                headers: {
                    'X-API-KEY': process.env.SERPER_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 8000
            }
        );
        return response.data.organic || [];
    } catch (e) {
        console.error("⚠️ Serper error:", e.message);
        return [];
    }
}

// ==========================================
// 🤖 2. 核心智能网关路由
// ==========================================
router.post('/', verifyToken, async (req, res) => {
    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    const userMsgLower = message.toLowerCase().trim();

    try {
        // ------------------------------------------
        // 🧠 A. 极简本地闪电秒回
        // ------------------------------------------
        if (["hi", "hello"].includes(userMsgLower)) {
            return res.json({
                reply: "Hello! 👋 I am your SnapDonate Charity Assistant. Ask me about real shelters or orphanages in any of the 14 states of Malaysia that urgently need clothing donations right now!"
            });
        }

        // ------------------------------------------
        // 🧬 B. 上下文记忆清理与格式化
        // ------------------------------------------
        const validHistory = (history || [])
            .filter(h => h.text?.trim())
            .map(h => ({
                role: h.sender === 'user' ? 'user' : 'model',
                parts: [{ text: h.text }]
            }));
        const finalHistory = validHistory.slice(-6);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // ------------------------------------------
        // 🎯 C. 智能路由判别引擎 (分类用户意图)
        // ------------------------------------------
        const routeCheckPrompt = `
            You are an expert intent classifier. Classify the user's input into one of three categories:
            1. "CHARITY": If the query is related to clothing donation, charity, recycling, finding orphanages/shelters/nursing homes in Malaysia or any of its 14 states (Perlis, Kedah, Penang, Perak, Selangor, Negeri Sembilan, Melaka, Johor, Pahang, Terengganu, Kelantan, Sabah, Sarawak, Kuala Lumpur).
            2. "GENERAL": If the query is a simple calculation, general knowledge topic, K-pop song inquiry, translation, or easy question that can be answered immediately.
            3. "COMPLEX_OFFTOPIC": If the query is completely unrelated to charity AND too difficult, absurd, or out of scope for a general assistant.

            User Input: "${message}"
            Output only the category name ("CHARITY", "GENERAL", or "COMPLEX_OFFTOPIC"). Nothing else.
        `;
        
        const routeResult = await model.generateContent(routeCheckPrompt);
        const selectedRoute = routeResult.response.text().trim().toUpperCase();
        console.log(`🚀 [INTENT ROUTING] Selected Route: ${selectedRoute}`);

        // 👉 分流处理 1: 复杂且不相关的问题，直接按照要求温柔拦截
        if (selectedRoute.includes("COMPLEX_OFFTOPIC")) {
            return res.json({
                reply: "Hi, I am your SnapDonate Charity Assistant. I only specialize in answering questions about clothing donations, NGO shelters, and inventory management in Malaysia. For complex or unrelated topics, please use a general AI tool."
            });
        }

        // 👉 分流处理 2: 简单或通用的常识问题（比如 K-pop、算术），直接扮演 ChatGPT 解答
        if (selectedRoute.includes("GENERAL")) {
            const chatSession = model.startChat({ history: finalHistory });
            const generalPrompt = `You are a helpful AI assistant. Answer the user's general question accurately, directly, and concisely. User Question: ${message}`;
            const result = await chatSession.sendMessage(generalPrompt);
            return res.json({ reply: result.response.text().trim() });
        }

        // ==============================================================
        // 🌐 D. 核心高光：真·大马 14 州属实时深度 RAG 检索体系
        // ==============================================================
        // 建立高宽带并发交叉搜索序列
        const queries = [
            `${message} clothes donation charity 2026`,
            `${message} orphanage shelter home Malaysia`,
            `${message} pusat jagaan orang tua sumbangan baju`
        ];

        const resultsArrays = await Promise.all(queries.map(q => searchWeb(q)));
        let mergedResults = resultsArrays.flat();

        // 内存去重
        const seenLinks = new Set();
        mergedResults = mergedResults.filter(item => {
            if (!item.link || seenLinks.has(item.link)) return false;
            seenLinks.add(item.link);
            return true;
        });

        // 强力摘除社交平台与黄页碎碎念广告噪声，提炼核心事实
        const filteredCleanData = mergedResults
            .filter(item => {
                const link = (item.link || "").toLowerCase();
                return !link.includes("facebook.com")
                    && !link.includes("instagram.com")
                    && !link.includes("tiktok.com")
                    && !link.includes("twitter.com")
                    && !link.includes("yelp.com")
                    && !link.includes("tripadvisor.com");
            })
            .slice(0, 8)
            .map(item => ({
                title: item.title,
                snippet: item.snippet,
                link: item.link
            }));

        // ==============================================================
        // 🧠 E. 极致 Prompt 格式死锁机制 (严防大模型胡言乱语)
        // ==============================================================
        const systemInstruction = `
You are the advanced SnapDonate AI Charity Engine for Malaysia. Your engineering standard matches ChatGPT, Gemini, and Claude.

CRITICAL LAWS:
1. Synthesize the provided SEARCH_RESULTS to find real, legitimate non-profit organisations, orphanages, or old folks homes located in the specific state or region requested by the user.
2. If no valid, verified charity organization name is present or extractable from the SEARCH_RESULTS data, do not hallucinate. You must output exactly: "No verified organisation found for this specific region in our current live directory database."
3. For each valid organization you find, you MUST strictly output using the exact numbered layout format below. Do not omit any field. If no Google Maps link is available, write "Google Maps: N/A".

REQUIRED OUTPUT FORMAT BLUEPRINT:
1. Organisation Name: [Insert Real Name]
Google Maps: [Insert specific Google Maps URL if found in data, else N/A]
Required Type: [State types of garments needed based on snippets, e.g., Children's wear, casual outfits, or Wearable textiles]
Reason: [Extract the reason or background from the snippet indicating why they take donations or what they support]
Source Link: [Insert the exact source URL from SEARCH_RESULTS that verified this item]

2. Organisation Name: ... (Follow the same pattern)

SEARCH_RESULTS RAW DATAPOOL:
${JSON.stringify(filteredCleanData)}
        `;

        // 启动带有历史记忆的真大模型会话
        const chatSession = model.startChat({ history: finalHistory });

        const finalPayload = `
            [SYSTEM MANDATE]: ${systemInstruction}
            [USER INQUIRY]: ${message}
        `;

        const result = await chatSession.sendMessage(finalPayload);
        const reply = result.response.text().trim();

        return res.json({ reply });

    } catch (err) {
        console.error("❌ Chatbot handler error:", err);
        // 保留优雅的容错，但绝不返回假段子
        return res.json({
            reply: "Our real-time intelligence gateway is experiencing a momentary sync delay. Please specify your target Malaysian state and try sending your request again!"
        });
    }
});

module.exports = router;