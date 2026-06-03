const express = require('express');
const router = express.Router();
const axios = require('axios');
const verifyToken = require('../middleware/auth');

let currentRegionData = [];

/* =========================
   CONFIG
========================= */
const STATES = [
    'perlis',
    'kedah',
    'penang',
    'pulau pinang',
    'perak',
    'selangor',
    'kuala lumpur',
    'wp kuala lumpur',
    'kl',
    'negeri sembilan',
    'melaka',
    'johor',
    'kelantan',
    'terengganu',
    'pahang',
    'sabah',
    'sarawak'
];

const BAD_SOURCES = [
    'reddit.com',
    'yelp.com',
    'tripadvisor.com'
];

const GOOD_KEYWORDS = [
    'donation',
    'donate',
    'charity',
    'orphanage',
    'shelter',
    'clothing',
    'clothes',
    'textile',
    'fabric',
    'recycle',
    'recycling',
    'thrift',
    'welfare',
    'children'
];

/* =========================
   SERPER SEARCH
========================= */

async function searchWeb(query) {
    try {
        const response = await axios.post(
            'https://google.serper.dev/search',
            { q: query },
            {
                headers: {
                    'X-API-KEY':
                        process.env.SERPER_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 7000
            }
        );

        return response.data.organic || [];
    } catch (err) {
        console.error(
            '⚠️ Serper Search Error:',
            err.message
        );
        return [];
    }
}

/* =========================
   REGION DETECTION
========================= */

function extractRegion(message) {
    const lower = message.toLowerCase();

    return (
        STATES.find(region =>
            lower.includes(region)
        ) || null
    );
}

/* =========================
   DONATION TYPE
========================= */

function determineNeed(text) {
    const s = text.toLowerCase();

    if (
        s.includes('clothing') ||
        s.includes('textile') ||
        s.includes('fabric') ||
        s.includes('garment')
    ) {
        return 'Accepts Clothing Donations';
    }

    return 'Need Status Not Publicly Stated';
}

/* =========================
   TRUST SCORE
========================= */

function getScore(item) {
    const url = (item.link || '').toLowerCase();

    if (url.includes('salvationarmy'))
        return 100;

    if (url.includes('hati.my'))
        return 95;

    if (url.includes('kloth'))
        return 90;

    if (url.includes('hopeww.org'))
        return 90;

    if (url.includes('hopesmalaysia'))
        return 85;

    if (url.includes('facebook'))
        return 80;

    if (url.includes('instagram'))
        return 75;

    return 50;
}

/* =========================
   FILTER
========================= */

function isBadSource(url) {
    const lower = url.toLowerCase();

    return BAD_SOURCES.some(source =>
        lower.includes(source)
    );
}

/* =========================
   ROUTE
========================= */

router.post('/', verifyToken, async (req, res) => {
    try {
        const userMessage =
            req.body.message ||
            req.body.text ||
            '';

        if (!userMessage) {
            return res.status(400).json({
                error: 'Message required'
            });
        }

        const msgLower =
            userMessage.toLowerCase().trim();

        /* =====================
           GREETING
        ===================== */

        if (
            msgLower === 'hi' ||
            msgLower === 'hello' ||
            msgLower === 'hey'
        ) {
            return res.status(200).json({
                reply:
                    'Hello! 🤖 I am your SnapDonate Charity Assistant. Ask me which real shelters or orphanages in Malaysia accept clothing donations.'
            });
        }

        /* =====================
           TABLE VIEW
        ===================== */

        if (
            msgLower.includes('table') ||
            msgLower.includes('表格')
        ) {
            let table =
                '| Organisation | Details | Status | Link |\n';
            table +=
                '| --- | --- | --- | --- |\n';

            currentRegionData.forEach(item => {
                table += `| ${item.title} | ${item.snippet} | ${item.status} | ${item.link} |\n`;
            });

            return res.status(200).json({
                reply: table,
                text: table
            });
        }

        /* =====================
           REGION
        ===================== */

        const region =
            extractRegion(userMessage);

        if (!region) {
            return res.status(200).json({
                reply:
                    'Sorry, I currently support clothing donation searches within Malaysia only. Example: Melaka, Selangor, Perak, Sabah, Sarawak.'
            });
        }

        let queries = [];

        if (region) {
            queries = [
                `${region} shelter accepting clothing donations Malaysia`,
                `${region} orphanage clothing donation Malaysia`,
                `${region} charity clothes donation centre Malaysia`
            ];
        } else {
            queries = [
                `${userMessage} clothing donation Malaysia`
            ];
        }

        /* =====================
           SEARCH
        ===================== */

        let searchResults = [];

        for (const q of queries) {
            const result =
                await searchWeb(q);

            searchResults.push(...result);
        }

        currentRegionData = [];

        const seen = new Set();

        for (const item of searchResults) {
            const title =
                (item.title || '')
                    .replace(/<\/?[^>]+>/g, '')
                    .trim();

            const snippet =
                (item.snippet || '')
                    .replace(/<\/?[^>]+>/g, '')
                    .trim();

            const link =
                item.link || '';

            if (!title || !link)
                continue;

            if (isBadSource(link))
                continue;

            const combined =
            (
                title +
                ' ' +
                snippet +
                ' ' +
                link
            ).toLowerCase();

            const regionLower =
                region.toLowerCase();


            if (
                combined.includes('top 10') ||
                combined.includes('best charity')
            ) {
    continue;
}
            
            const malaysiaWide =
            link.includes('salvationarmy') ||
            link.includes('kloth') ||
            link.includes('hati.my') ||
            link.includes('hopesmalaysia');

                const regionMatched =
                    combined.includes(regionLower);

                if (
                    !regionMatched &&
                    !malaysiaWide
                ) {
                    continue;
                }

                const hasDonationIntent =
                    GOOD_KEYWORDS.some(keyword =>
                        combined.includes(keyword)
                 );

        if (
            !hasDonationIntent &&
            !malaysiaWide
        ) {
            continue;
        }


    const uniqueKey =
        (
            title +
            link
        ).toLowerCase();

            if (seen.has(uniqueKey))
                continue;

            seen.add(uniqueKey);

            currentRegionData.push({
                title,
                snippet:
                    snippet.substring(
                        0,
                        180
                    ) + '...',
                status:
                    determineNeed(
                        combined
                    ),
                link,
                score:
                    getScore(item)
            });
        }

        /* =====================
           SORT
        ===================== */

        currentRegionData.sort(
            (a, b) =>
                b.score - a.score
        );

        /* =====================
           FALLBACK
        ===================== */

        if (
            currentRegionData.length === 0
        ) {
            currentRegionData.push({
                title:
                    'Kloth Cares',
                snippet:
                    'National textile recycling and clothing donation initiative.',
                status:
                    'Accepts Clothing Donations',
                link:
                    'https://www.klothcircularity.com/bin-map',
                score: 90
            });
        }

        /* =====================
           OUTPUT
        ===================== */

      let reply =
`📍 Donation Centres in ${region.toUpperCase()}

`;

currentRegionData
.slice(0,5)
.forEach((item,index)=>{

reply +=
`${index + 1}. ${item.title}

📍 ${item.snippet}

✅ ${item.status}

🔗 ${item.link}


`;
});

        reply +=
`💡 Tips:
• Ensure clothes are clean and dry.
• Pack items in sealed bags.
• Contact the organisation before visiting to confirm current donation needs.`;

        return res.status(200).json({
            reply,
            text: reply
        });

    } catch (err) {
        console.error(
            'Chatbot Error:',
            err
        );

        return res.status(200).json({
            reply:
                'System temporarily unavailable. Please try again.'
        });
    }
});

module.exports = router;