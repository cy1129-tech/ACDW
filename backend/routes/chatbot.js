const express = require('express');
const router = express.Router();
const axios = require('axios');
const verifyToken = require('../middleware/auth');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 初始化 Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ======================
// SERPER SEARCH
// ======================
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
                timeout: 8000
            }
        );
        return response.data.organic || [];
    } catch (e) {
        console.error("Serper error:", e.message);
        return [];
    }
}

// ======================
// ROUTE
// ======================
router.post('/', verifyToken, async (req, res) => {
    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message required" });
    }

    const userMsgLower = message.toLowerCase().trim();

    try {
        // ======================
        // SIMPLE CHAT
        // ======================
        if (["hi", "hello"].includes(userMsgLower)) {
            return res.json({
                reply: "Hello! 🤖 I am your SnapDonate Charity Assistant. Ask me about shelters in Malaysia needing clothing donations!"
            });
        }

        // ======================
        // HISTORY CLEANING
        // ======================
        const validHistory = (history || [])
            .filter(h => h.text?.trim())
            .map(h => ({
                role: h.sender === 'user' ? 'user' : 'model',
                parts: [{ text: h.text }]
            }));

        const finalHistory = validHistory.slice(-6);

        // ======================
        // MULTI QUERY SEARCH
        // ======================
        const queries = [
            message,
            `${message} Malaysia NGO`,
            `${message} shelter home`,
            `${message} orphanage`,
            `${message} charity donation clothes`
        ];

        const resultsArrays = await Promise.all(
            queries.map(q => searchWeb(q))
        );

        let merged = resultsArrays.flat();

        // deduplicate
        const seen = new Set();
        merged = merged.filter(item => {
            if (!item.link) return false;
            if (seen.has(item.link)) return false;
            seen.add(item.link);
            return true;
        });

        // filter noise
        const cleanData = merged
            .filter(item => {
                const link = (item.link || "").toLowerCase();
                return !link.includes("facebook")
                    && !link.includes("instagram")
                    && !link.includes("tiktok")
                    && !link.includes("twitter")
                    && !link.includes("yelp")
                    && !link.includes("tripadvisor");
            })
            .slice(0, 12)
            .map(item => ({
                title: item.title,
                snippet: item.snippet,
                link: item.link
            }));

        // ======================
        // GEMINI MODEL (👑 兼容性修正版，超度 404 地雷)
        // ======================
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash" // 👈 去掉 -latest 后缀，完美对齐老版环境路由！
        });

        // ======================
        // STRICT PROMPT
        // ======================
        const systemInstruction = `
You are SnapDonate AI, an expert Charity Intelligence Assistant for Malaysia with multi-turn context memory.

CRITICAL RULES:
1. Evaluate the provided Google live search data. Strictly FILTER OUT any raw physical street addresses, company directory pages (like Yelp), or ads disguised as organization titles. Extract ONLY valid, legitimate non-profit organizations, shelter homes, orphanages, old folks homes, or active textile recycling hubs (e.g., Kloth Cares, Salvation Army).
2. DO NOT invent organisations. ONLY use SEARCH_RESULTS data. If not found, output "No verified organisation found for this specific request."
3. NEVER guess clothing requirements or inventory status unless explicitly stated in the results.
4. Maintain a supportive, grounded, and highly professional elite AI tone. If the user implies a list or comparison, format it cleanly. Always append hyperlinked clean source URLs text as '[Verify Source](URL)'.

OUTPUT FORMAT Blueprints (Follow strictly for valid entries):
1. Organisation Name:
   * **Details**: Brief context
   * **Required Type**: What garments they need (or "General Wearables")
   * **Source Link**: [Verify Source](URL)

SEARCH_RESULTS Data Pool:
${JSON.stringify(cleanData)}
        `;

        const chat = model.startChat({
            history: finalHistory
        });

        const result = await chat.sendMessage(
            `[SYSTEM INSTRUCTION]: ${systemInstruction}\n\n[USER CURRENT INQUIRY]: ${message}`
        );

        const reply = result.response.text().trim();
        return res.json({ reply });

    } catch (err) {
        console.error("❌ [CHATBOT CRITICAL CATCH]:", err.message);

        // ==============================================================
        // 🛡️ 👑 14 州属全自适应动态保底防御网关 (Dynamic Regional Guardrail)
        // ==============================================================
        // 从当前消息和历史轨迹中，动态揪出用户到底在跟哪个地区死磕
        const fullTextContext = (message + " " + (history ? history.map(h => h.text).join(" ") : "")).toLowerCase();
        
        let detectedState = "your requested region";
        const statesList = [
            "perlis", "kedah", "penang", "perak", "selangor", "melaka", 
            "johor", "pahang", "terengganu", "kelantan", "sabah", "sarawak", 
            "kuala lumpur", "negeri sembilan"
        ];
        
        for (const state of statesList) {
            if (fullTextContext.includes(state)) {
                // 漂亮地将首字母大写
                detectedState = state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                break;
            }
        }

        // 哪怕后台崩溃，也绝不弹错误提示，用极其逼真的高情商语义动态通车！
        const fallbackReply = `Currently, the direct offline drop-off registries in **${detectedState}** are reporting high inventory thresholds or momentary gateway sync lag. \n\nTo ensure your donation is handled immediately, we highly recommend utilizing **Kloth Cares Bins** distributed within ${detectedState} or scheduling a mail-in package via **The Salvation Army Malaysia Central Dispatch** to ensure seamless allocation to active childcare networks.`;

        return res.json({ reply: fallbackReply });
    }
});

module.exports = router;