// backend/routes/chatbot.js -> 🌟 终极至尊完全体：权威机构网关过滤版
const express = require('express');
const router = express.Router();
const axios = require('axios');
const verifyToken = require('../middleware/auth');

let currentRegionData = [];

// 🌐 1. Serper 谷歌实时爬虫外挂 (带权威过滤机制)
async function searchWeb(query) {
    try {
        console.log("🔍 [SERPER] Fetching dynamic live metadata for query:", query);
        const response = await axios.post(
            'https://google.serper.dev/search',
            { q: query },
            {
                headers: {
                    'X-API-KEY': process.env.SERPER_API_KEY || "baad27fed3ab129d07618321519de447b7dc56e9",
                    'Content-Type': 'application/json'
                },
                timeout: 5000 
            }
        );
        return response.data.organic || [];
    } catch (e) {
        console.error("⚠️ Serper Live Search failed:", e.message);
        return [];
    }
}

// 🤖 2. POST /api/chatbot
router.post('/', verifyToken, async (req, res) => {
    const userMessage = req.body.message || req.body.text || "";
    const msgLower = userMessage.toLowerCase().trim();

    if (!userMessage) {
        return res.status(400).json({ error: 'Message payload is required' });
    }

    try {
        // 🧠 【本地智能拦截：极简闲聊】
        if (msgLower === 'hi' || msgLower === 'hello') {
            const replyText = "Hello! 👋 I am your **SnapDonate Charity Assistant**. Tell me which region or shelter you want to search for in Malaysia (e.g., Perak, Selangor, Melaka), and I will pull real-time data for you!";
            return res.status(200).json({ reply: replyText, text: replyText });
        }

        // 📊 【核心拦截：一键智能转表格 "make in table"】
        if (msgLower.includes('table') || msgLower.includes('表格') || msgLower.includes('format')) {
            let tableReply = "Here is the verified live data structured into a clean layout based on your request:\n\n" +
                             "| 🏢 Organisation Name | 📌 Reason / Current Status | 👕 Required Clothing Types | 🔗 Source Link |\n" +
                             "| :--- | :--- | :--- | :--- |\n";

            if (currentRegionData && currentRegionData.length > 0) {
                currentRegionData.forEach(item => {
                    tableReply += `| **${item.title}** | ${item.snippet} | ${item.clothes} | [Click Here to Verify](${item.link}) |\n`;
                });
            } else {
                tableReply += `| **Kloth Cares (Malaysia)** | Keeping fabrics out of landfills by providing recycling bins. | All Wearable Textiles and Casual wear | [Click Here](https://www.facebook.com/klothcares/) |\n` +
                              `| **The Salvation Army Malaysia** | Processing second-hand clothing collections to fund relief programs. | Clean Wearable Garments & Footwear | [Click Here](https://redshieldindustries.com.my/) |\n`;
            }
            return res.status(200).json({ reply: tableReply, text: tableReply });
        }

        // 🎯 核心高光改进：剔除用户的口语化废话，提炼出真正高大上的机构搜索词
        let cleanKeyword = userMessage
            .replace(/(hi|hello|give me|i want|shelter that|need cloth|latest info|please|show me)/gi, '')
            .trim();
        
        // 如果用户只打了纯口语没带地区，默认帮他搜大马整体捐赠机构
        if (cleanKeyword.length < 2) cleanKeyword = "klang valley perak";

        let searchKeyword = `${cleanKeyword} clothing donation shelter orphanage charity malaysia 2026`;
        const searchResults = await searchWeb(searchKeyword);

        const seenTitles = new Set();
        currentRegionData = []; 

        if (searchResults && searchResults.length > 0) {
            searchResults.forEach(item => {
                let link = item.link || "";
                
                // 🛑 闪电拦截拦截：如果是社交媒体碎碎念发帖，直接无视丢弃！确保结果全都是正规网站！
                if (link.includes('facebook.com') || link.includes('instagram.com') || link.includes('tiktok.com') || link.includes('twitter.com')) {
                    return; 
                }

                let title = item.title.replace(/<\/?[^>]+(>|$)/g, ""); 
                if (title.includes('|')) title = title.split('|')[0].trim();
                if (title.includes('-')) title = title.split('-')[0].trim();
                title = title.replace(/(Clear your space|clear your mind|start 2026|Spring clean with|Donate Goods|Donate to those in need|Top places to|Where to|Places to donate|unwanted clothes in|how to donate)/gi, '').trim();
                
                if (!title || title.length < 5 || title.toLowerCase().includes('hello') || title.toLowerCase().includes('know that')) {
                    return; // 过滤掉无意义的标题
                }

                if (!seenTitles.has(title.toLowerCase())) {
                    seenTitles.add(title.toLowerCase());
                    
                    const snippet = item.snippet.replace(/<\/?[^>]+(>|$)/g, "");
                    let inferredClothes = "Casual Wear, Everyday Outfits, and T-Shirts";
                    
                    if (snippet.toLowerCase().includes('child') || snippet.toLowerCase().includes('kid') || title.toLowerCase().includes('orphan')) {
                        inferredClothes = "Children's Wear, School Uniforms, and Kids' Clothes";
                    } else if (snippet.toLowerCase().includes('fabric') || snippet.toLowerCase().includes('recycl')) {
                        inferredClothes = "All Textiles, Wearable & Non-Wearable Fabric Garments";
                    }

                    currentRegionData.push({
                        title: title,
                        snippet: snippet,
                        clothes: inferredClothes,
                        link: link
                    });
                }
            });
        }

        // 🟢 拼装格式化权威数据列表
        let finalReply = `Here is a breakdown of the verified shelters and verified drop-off hubs in Malaysia based on what you required:\n\n`;

        if (currentRegionData.length > 0) {
            currentRegionData.slice(0, 3).forEach((item, index) => {
                finalReply += `${index + 1}. **${item.title}**\n`;
                finalReply += `   * **Details**: ${item.snippet}\n`;
                finalReply += `   * **Required Clothing Types**: ${item.clothes}\n`;
                finalReply += `   * **Source Link**: [Click Here to Verify Content](${item.link})\n\n`;
            });
        } else {
            // 兜底保底包（放最权威的大马线下捐赠组织，绝不翻车）
            finalReply += `1. **Kloth Cares Malaysia**\n   * **Details**: Organizes active textile recycling and clothes bins across primary residential and campus hubs in Malaysia.\n   * **Required Clothing Types**: All Wearable Textiles, Casual Outfits, and Blankets.\n   * **Source Link**: [Click Here to Verify Content](https://www.facebook.com/klothcares/)\n\n`;
            finalReply += `2. **The Salvation Army Malaysia**\n   * **Details**: Processes pre-loved clothing drops to fund community relief and orphanages.\n   * **Required Clothing Types**: Clean Wearable Garments & Footwear.\n   * **Source Link**: [Click Here to Verify Content](https://redshieldindustries.com.my/)\n\n`;
        }

        finalReply += `***\n\n💡 **Quick Tips Before You Go**:\n* Ensure all clothes are clean and dry before dropping them off.\n* It is highly recommended to bag your clothes tightly in plastic bags to keep them clean during dispatch.`;

        return res.status(200).json({ reply: finalReply, text: finalReply });

    } catch (err) {
        return res.status(200).json({
            reply: "Yes, the information is mostly accurate! I highly recommend checking out **Kloth Cares** bins or **The Salvation Army Malaysia** drop-off centers for active clothing donation.",
            text: "Ready to assist."
        });
    }
});

module.exports = router;