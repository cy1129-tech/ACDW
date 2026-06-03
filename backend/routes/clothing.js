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
    
    let sql = `SELECT * FROM clothing_items WHERE organization_name = ? `;
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
// Route 3: Distribute items
router.post('/distribute', verifyToken, (req, res) => {
    const { recipient_name, pic_name, contact, email, note, item_ids } = req.body;
    if (!recipient_name || !item_ids || item_ids.length === 0) {
        return res.status(400).json({ error: 'recipient_name and item_ids are required' });
    }
    db.query(
        `INSERT INTO distributions (recipient_name, pic_name, contact, email, note, organization_name, status) VALUES (?,?,?,?,?,?,'Completed')`,
        [recipient_name, pic_name || null, contact || null, email || null, note || null, req.orgName],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            const distId = result.insertId;
            const values = item_ids.map((id) => [distId, id]);
            db.query(`INSERT INTO distribution_items (distribution_id, cloth_id) VALUES ?`, [values], (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.status(201).json({ distribution_id: distId });
            });
        }
    );
});

// Route 4: GET all distributions
router.get('/distributions', verifyToken, (req, res) => {
    db.query(
        `SELECT d.*, COUNT(di.cloth_id) as items_count FROM distributions d 
         LEFT JOIN distribution_items di ON d.id = di.distribution_id 
         WHERE d.organization_name = ? 
         GROUP BY d.id ORDER BY d.created_at DESC`,
        [req.orgName],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// Route 5: GET items in a distribution
router.get('/distributions/:id/items', verifyToken, (req, res) => {
    db.query(
        `SELECT ci.* FROM clothing_items ci 
         JOIN distribution_items di ON ci.cloth_id = di.cloth_id 
         WHERE di.distribution_id = ?`,
        [req.params.id],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// Route 6: PUT update distribution
router.put('/distributions/:id', verifyToken, (req, res) => {
    const { recipient_name, pic_name, contact, email, note } = req.body;
    db.query(
        `UPDATE distributions SET recipient_name=?, pic_name=?, contact=?, email=?, note=? WHERE id=? AND organization_name=?`,
        [recipient_name, pic_name, contact, email, note, req.params.id, req.orgName],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Route 7: Cancel distribution
router.post('/distributions/:id/cancel', verifyToken, (req, res) => {
    db.query(
        `UPDATE distributions SET status='Cancelled' WHERE id=? AND organization_name=?`,
        [req.params.id, req.orgName],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Route 8: DELETE item
router.delete('/:id', verifyToken, (req, res) => {
    db.query(
        `DELETE FROM clothing_items WHERE cloth_id=? AND organization_name=?`,
        [req.params.id, req.orgName],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Route 9: PUT update item
router.put('/:id', verifyToken, (req, res) => {
    const { item_name, description, gender, age_group, clothing_type, sub_type } = req.body;
    db.query(
        `UPDATE clothing_items SET item_name=?, description=?, gender=?, age_group=?, clothing_type=?, sub_type=? WHERE cloth_id=? AND organization_name=?`,
        [item_name, description, gender, age_group, clothing_type, sub_type, req.params.id, req.orgName],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

router.mapToValidENUMs = mapToValidENUMs;
module.exports = router;