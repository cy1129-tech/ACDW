//backend/routes/clothing.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const db = require('../config/db');
const verifyToken = require('../middleware/auth');
require('dotenv').config();

// 1. 统一配置 Multer (内存存储用于 AI, 硬盘存储用于前端展示)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});
const upload = multer({ storage: storage });

// 辅助函数
function correctGenderByClothing(clothingType, subType, detectedGender) {
    if (clothingType === 'Skirt') return 'Female';
    if (subType && typeof subType === 'string' && subType.toLowerCase().includes('skirt')) return 'Female';
    if (clothingType === 'Dress') return 'Female';
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
        'Dress': []
    };

    function findClosestMatch(value, validList) {
        if (!value) return validList[0];
        const v = String(value).toLowerCase();
        return validList.find(item => item.toLowerCase().includes(v) || v.includes(item.toLowerCase())) || validList[0];
    }

    let clothingType = findClosestMatch(aiResult.clothing_type, validClothingTypes);
    let subType = findClosestMatch(aiResult.sub_type, subTypesByClothing[clothingType] || []);
    let gender = correctGenderByClothing(clothingType, subType, findClosestMatch(aiResult.gender, validGenders));

    return {
        gender,
        age_group: findClosestMatch(aiResult.age_group, validAgeGroups),
        clothing_type: clothingType,
        sub_type: subType,
        priority: 'Medium'
    };
}

// Route 1: Upload (单文件上传)
router.post('/upload', upload.single('image'), verifyToken, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded.' });
        }

        // AI 识别需要二进制 Buffer
        const fileBuffer = fs.readFileSync(req.file.path);
        
        const form = new FormData();
        form.append('image', fileBuffer, { filename: req.file.originalname });
        
        const { item_name, description, gender, age_group, sub_type } = req.body;
        if (gender) form.append('gender', gender);
        if (age_group) form.append('age_group', age_group);
        if (sub_type) form.append('sub_type', sub_type);

        const aiResponse = await axios.post(`${process.env.AI_URL}/classify`, form, {
            headers: { ...form.getHeaders() },
            timeout: 60000
        });

        const mapped = mapToValidENUMs(aiResponse.data);
        const combinedLabel = [mapped.gender, mapped.age_group, mapped.clothing_type, mapped.sub_type].join(' + ');

        db.query(
            `INSERT INTO clothing_items (item_name, description, gender, age_group, clothing_type, sub_type, combined_label, priority, image_path, organization_name) VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [item_name || 'Item', description || '', mapped.gender, mapped.age_group, mapped.clothing_type, mapped.sub_type, combinedLabel, mapped.priority, req.file.filename, req.orgName],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ item_id: result.insertId, ai_result: mapped });
            }
        );
    } catch (err) {
        console.error("❌ Upload Error:", err.message);
        return res.status(500).json({ error: err.message || 'Unknown Server Error' });
    }
});

// Route 2: GET all clothing items
router.get('/', verifyToken, (req, res) => {
    const { type, gender, age_group, search } = req.query;
    
    let sql = `SELECT * FROM clothing_items WHERE organization_name = ? AND distributed = 0`;
    let params = [req.orgName];

    if (type) { sql += ` AND clothing_type = ?`; params.push(type); }
    if (gender) { sql += ` AND gender = ?`; params.push(gender); }
    if (age_group) { sql += ` AND age_group = ?`; params.push(age_group); }
    if (search) { sql += ` AND item_name LIKE ?`; params.push(`%${search}%`); }

    sql += ` ORDER BY created_at DESC`;

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ items: results });
    });
});

router.mapToValidENUMs = mapToValidENUMs;
module.exports = router;