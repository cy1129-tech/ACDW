const express = require('express');
const router = express.Router();
const axios = require('axios');
const verifyToken = require('../middleware/auth');
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

    const userMsgLower = message.toLowerCase();

    try {

        // ======================
        // SIMPLE CHAT
        // ======================
        if (["hi", "hello"].includes(userMsgLower)) {
            return res.json({
                reply: "Hello 🤖 Ask me: shelters in Malaysia needing clothing donations."
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
        // MULTI QUERY SEARCH (FIXED)
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
                    && !link.includes("yelp");
            })
            .slice(0, 12)
            .map(item => ({
                title: item.title,
                snippet: item.snippet,
                link: item.link
            }));

        // ======================
        // GEMINI MODEL (FIXED)
        // ======================
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest"
        });

        // ======================
        // STRICT PROMPT (IMPORTANT FIX)
        // ======================
        const systemInstruction = `
You are SnapDonate AI.

CRITICAL RULES:
- DO NOT invent organisations
- ONLY use SEARCH_RESULTS data
- If not found, say "No verified organisation found"
- NEVER guess clothing requirements

OUTPUT FORMAT:

1. Organisation Name:
Google Maps:
Required Type:
Reason:
Source Link:

SEARCH_RESULTS:
${JSON.stringify(cleanData)}
        `;

        const chat = model.startChat({
            history: finalHistory
        });

        const result = await chat.sendMessage(
            `[USER]: ${message}\n\n${systemInstruction}`
        );

        const reply = result.response.text();

        return res.json({ reply });

    } catch (err) {
        console.error(err);

        return res.json({
            reply: "System temporarily unavailable. Please try again."
        });
    }
});

module.exports = router;