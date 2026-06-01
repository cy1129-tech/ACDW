const express     = require('express');
const router      = express.Router();
const multer      = require('multer');
const axios       = require('axios');
const fs          = require('fs');
const db          = require('../config/db');
const verifyToken = require('../middleware/auth');
require('dotenv').config();

// 保留存储配置防止其他路由使用
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename:    (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});
const upload = multer({ storage });

function correctGenderByClothing(clothingType, subType, detectedGender) {
    if (clothingType === 'Skirt' || clothingType === 'Dress') return 'Female';
    if (subType && typeof subType === 'string' && subType.toLowerCase().includes('skirt')) return 'Female';
    return detectedGender;
}

function mapToValidENUMs(aiResult) {
    const validGenders = ['Female', 'Male', 'Unisex'];
    const validAgeGroups = ['Children', 'Adult'];
    const validClothingTypes = ['Pants', 'Clothes', 'Skirt', 'Dress'];

    const subTypesByClothing = {
        'Pants': ['Long pants', 'Short pants'],
        'Clothes': ['Long sleeve', 'Short sleeve'],
        'Skirt': ['Long skirt', 'Short skirt'],
        'Dress': ['Dress']
    };

    function findClosestMatch(value, validList) {
        if (!value || validList.length === 0) return validList[0] || null;
        value = String(value).trim();
        const exactMatch = validList.find(v => v.toLowerCase() === value.toLowerCase());
        if (exactMatch) return exactMatch;
        const partialMatch = validList.find(v => v.toLowerCase().includes(value.toLowerCase()) || value.toLowerCase().includes(v.toLowerCase()));
        if (partialMatch) return partialMatch;
        return validList[0] || null;
    }

    let clothingType = findClosestMatch(aiResult.clothing_type, validClothingTypes);
    let subType = null;
    const originalSubType = String(aiResult.sub_type || '').toLowerCase();

    if (originalSubType.includes('suit') || originalSubType.includes('jacket')) {
        clothingType = 'Clothes';
        subType = 'Long sleeve';
    } else {
        const validSubTypes = subTypesByClothing[clothingType] || [];
        if (validSubTypes.length > 0) {
            subType = findClosestMatch(aiResult.sub_type, validSubTypes);
        }
    }

    let gender = findClosestMatch(aiResult.gender, validGenders);
    gender = correctGenderByClothing(clothingType, subType, gender);

    return {
        gender: gender,
        age_group: findClosestMatch(aiResult.age_group, validAgeGroups),
        clothing_type: clothingType,
        sub_type: subType,
        priority: 'Medium'
    };
}

// 👑 彻底剔除 Multer，纯 JSON 安全接收
// backend/routes/clothing.js

// 👑 终极完美形态：既保留 Multer 物理存图提供给前端显示，又用 JSON Base64 转发给 AI
router.post('/upload', verifyToken, upload.single('image'), async (req, res) => {
    try {
        const { item_name, description, image, gender, age_group, sub_type } = req.body;
        
        // 1. 优先抓取前端传来的 image，如果没有，则说明前端还是旧表单，直接用物理文件转 base64 兜底
        let finalBase64 = image;
        if (!finalBase64 && req.file) {
            const imageBuffer = fs.readFileSync(req.file.path);
            finalBase64 = imageBuffer.toString('base64');
        }

        if (!finalBase64) return res.status(400).json({ error: 'No image data received' });

        // 数据清洗：去掉前端附加的 data:image/... 头
        let cleanBase64 = String(finalBase64);
        if (cleanBase64.includes(',')) {
            cleanBase64 = cleanBase64.split(',')[1];
        }

        // 2. 呼叫云端 Python AI 服务
        const aiResponse = await axios.post(`${process.env.AI_URL}/classify`, {
            image: cleanBase64,
            gender: gender || 'Unisex',
            age_group: age_group || 'Adult',
            sub_type: sub_type || null
        });

        const aiResult = aiResponse.data;
        const mappedValues = mapToValidENUMs(aiResult);

        const labels = [mappedValues.gender, mappedValues.age_group, mappedValues.clothing_type];
        if (mappedValues.sub_type) labels.push(mappedValues.sub_type);
        const combinedLabel = labels.join(' + ');

        // 💡 核心修复：image_path 绝对不写死 'cloud_upload'，而是存入真实的物理访问路径或相对路径！
        // 如果物理存图成功，存 req.file.path，否则用临时标记
        const savedImagePath = req.file ? req.file.path : 'uploads/default.jpg';

        // 3. 塞进 Aiven 数据库
        db.query(
            `INSERT INTO clothing_items
             (item_name, description, gender, age_group, clothing_type, sub_type, combined_label, priority, image_path, organization_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                item_name || 'Clothing Item', 
                description || '', 
                mappedValues.gender, 
                mappedValues.age_group, 
                mappedValues.clothing_type, 
                mappedValues.sub_type, 
                combinedLabel, 
                mappedValues.priority, 
                savedImagePath, // 👈 存入真实路径，图片瞬间在前台亮起！
                req.orgName
            ],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ 
                    message: 'Clothing uploaded and classified ✅', 
                    item_id: result.insertId, 
                    ai_result: mappedValues 
                });
            }
        );
    } catch (err) {
        console.error("❌ Backend Route Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});
//-------------------

router.get('/', verifyToken, (req, res) => {
    const { type, gender, age_group, search } = req.query;
    let query  = `SELECT * FROM clothing_items WHERE organization_name = ? AND cloth_id NOT IN (SELECT cloth_id FROM distribution_items WHERE organization_name = ?)`;
    let params = [req.orgName, req.orgName]; 
    if (type) { query += ' AND clothing_type = ?'; params.push(type); }
    if (gender) { query += ' AND gender = ?'; params.push(gender); }
    if (age_group) { query += ' AND age_group = ?'; params.push(age_group); }
    if (search) {
        query += ` AND (item_name LIKE ? OR description LIKE ? OR combined_label LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY created_at DESC';
    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ total: results.length, items: results });
    });
});

router.post('/distribute', verifyToken, async (req, res) => {
    const { recipient_name, pic_name, contact, email, note, item_ids } = req.body;
    if (!recipient_name || !item_ids || item_ids.length === 0) return res.status(400).json({ error: 'Recipient name and items are required' });
    db.query('SELECT * FROM clothing_items WHERE cloth_id IN (?) AND organization_name = ?', [item_ids, req.orgName], (err, items) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query(`INSERT INTO distributions (recipient_name, pic_name, contact, email, note, items_count, organization_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed')`, [recipient_name, pic_name || '', contact || '', email || '', note || '', items.length, req.orgName], (err, distResult) => {
            if (err) return res.status(500).json({ error: err.message });
            const distributionId = distResult.insertId;
            const insertValues = items.map(item => [distributionId, item.cloth_id, item.item_name, item.gender, item.age_group, item.clothing_type, req.orgName]);
            db.query(`INSERT INTO distribution_items (distribution_id, cloth_id, item_name, gender, age_group, clothing_type, organization_name) VALUES ?`, [insertValues], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Distribution logged! 🚚', distribution_id: distributionId });
            });
        });
    });
});

router.get('/distributions', verifyToken, (req, res) => {
    db.query('SELECT * FROM distributions WHERE organization_name = ? ORDER BY created_at DESC', [req.orgName], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

router.get('/distributions/:id/items', verifyToken, (req, res) => {
    db.query(`SELECT di.*, ci.image_path FROM distribution_items di LEFT JOIN clothing_items ci ON di.cloth_id = ci.cloth_id WHERE di.distribution_id = ? AND di.organization_name = ?`, [req.params.id, req.orgName], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

router.post('/', verifyToken, (req, res) => {
    const { item_name, description, gender, age_group, clothing_type, sub_type } = req.body;
    if (!item_name || !clothing_type) return res.status(400).json({ error: 'Item name and clothing type are required' });
    const labels = [gender || 'Unisex', age_group || 'Adult', clothing_type];
    if (sub_type) labels.push(sub_type);
    const combined = labels.join(' + ');
    db.query(`INSERT INTO clothing_items (item_name, description, gender, age_group, clothing_type, sub_type, combined_label, organization_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [item_name, description || '', gender || 'Unisex', age_group || 'Adult', clothing_type, sub_type || null, combined || '', req.orgName], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Clothing added successfully ✅', item_id: result.insertId });
    });
});

router.delete('/:id', verifyToken, (req, res) => {
    db.query('DELETE FROM clothing_items WHERE cloth_id = ? AND organization_name = ?', [req.params.id, req.orgName], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Clothing deleted successfully ✅' });
    });
});

router.mapToValidENUMs = mapToValidENUMs;
module.exports = router;