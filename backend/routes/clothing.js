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
// backend/routes/clothing.js

// 👑 终极黄金形态：纯 JSON 接收 + 后端自主物理存图（前台完美显图） + 100% 精准 AI 转发
router.post('/upload', verifyToken, async (req, res) => {
    try {
        const { item_name, description, image, gender, age_group, sub_type } = req.body;
        if (!image) return res.status(400).json({ error: 'No image data received' });

        // 1. 数据清洗：去掉前端附加的 Base64 数据头
        let cleanBase64 = String(image);
        if (cleanBase64.includes(',')) {
            cleanBase64 = cleanBase64.split(',')[1];
        }

        // 2. 💡【复活核心】：后端自主把 Base64 字符串还原并物理写入 uploads/ 文件夹，供前台拉取
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // 生成跟以前 Multer 格式一模一样的安全文件名和相对路径
        const uniqueFilename = `${Date.now()}_cloud_upload.png`;
        const savedImagePath = `${uploadDir}/${uniqueFilename}`;
        
        // 将解密后的二进制流写入服务器硬盘
        fs.writeFileSync(savedImagePath, Buffer.from(cleanBase64, 'base64'));

        // 3. 原封不动地发送给你的云端 Python AI 服务进行 99% 精准看图
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

        // 4. 将新鲜出炉的本地物理图片路径（savedImagePath）狠狠塞进数据库！
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
                savedImagePath, // 👈 这一行让前端页面再次大放异彩！
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