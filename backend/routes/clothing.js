// backend/routes/clothing.js
const express     = require('express');
const router      = express.Router();
const multer      = require('multer');
const axios       = require('axios');
const FormData    = require('form-data');
const fs          = require('fs');
const db          = require('../config/db');
const verifyToken = require('../middleware/auth');
require('dotenv').config();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename:    (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});
const upload = multer({ storage });

// Database Auto-Initialization Engine
db.query(`
    CREATE TABLE IF NOT EXISTS distributions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_name VARCHAR(255) NOT NULL,
        pic_name VARCHAR(255),
        contact VARCHAR(100),
        email VARCHAR(255),
        note TEXT,
        items_count INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        organization_name VARCHAR(255) NOT NULL
    )
`, (err) => { if (err) console.error("Error building distributions table:", err); });

db.query(`
    CREATE TABLE IF NOT EXISTS distribution_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        distribution_id INT NOT NULL,
        cloth_id INT NOT NULL,
        item_name VARCHAR(255),
        gender VARCHAR(50),
        age_group VARCHAR(50),
        clothing_type VARCHAR(50),
        organization_name VARCHAR(255) NOT NULL
    )
`, (err) => { if (err) console.error("Error building distribution_items table:", err); });


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
    const validPriorities = ['High', 'Medium', 'Low'];

    const subTypesByClothing = {
        'Pants': ['Long pants', 'Short pants'],
        'Clothes': ['Long sleeve', 'Short sleeve'],
        'Skirt': ['Long skirt', 'Short skirt'],
        'Dress': []
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

// Route 1: Upload image + AI classify

// Route 1: Upload image + AI classify
router.post('/upload', upload.single('image'), verifyToken, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }

        // 🛡️ 双保险兜底
        const bodyData = req.body || {};
        
        const itemNameRaw = bodyData.item_name || bodyData.itemName || 'Clothing Item';
        const descriptionRaw = bodyData.description || '';
        const gender = bodyData.gender || 'Unisex';
        const age_group = bodyData.age_group || 'Adult';
        const sub_type = bodyData.sub_type || null;

        const item_name = itemNameRaw;
        const description = descriptionRaw;

        console.log("🚀 [ONLINE SUCCESS] FormData safely parsed. Forwarding real stream to Flask CLIP...");

        // 🟢 打包真正的 FormData 物理文件流
        const form = new FormData();
        form.append('image', fs.createReadStream(req.file.path), {
            filename: req.file.filename,
            contentType: req.file.mimetype,
        });
        form.append('gender', gender);
        form.append('age_group', age_group);
        if (sub_type) form.append('sub_type', sub_type);

        // 发送请求给你的 Flask CLIP 服务
        const aiResponse = await axios.post(`${process.env.AI_URL}/classify`, form, {
            headers: {
                ...form.getHeaders()
            }
        });

        const aiResult = aiResponse.data;
        const mappedValues = mapToValidENUMs(aiResult);

        const labels = [mappedValues.gender, mappedValues.age_group, mappedValues.clothing_type];
        if (mappedValues.sub_type) labels.push(mappedValues.sub_type);
        const combinedLabel = labels.join(' + ');

        // 👑 终极黄金修正：数据库里【只存纯文件名】，不要把 uploads/ 路径前缀带进去！
        const finalFileName = req.file.filename; 

        // 存入云端/本地数据库
        db.query(
            `INSERT INTO clothing_items
             (item_name, description, gender, age_group, clothing_type, sub_type, combined_label, priority, image_path, organization_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                item_name,
                description,
                mappedValues.gender,
                mappedValues.age_group,
                mappedValues.clothing_type,
                mappedValues.sub_type,
                combinedLabel,
                mappedValues.priority,
                finalFileName, // 👈 核心改变：以前是 req.file.path，现在换成纯文件名 finalFileName！
                req.orgName 
            ],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ 
                    message: 'Clothing uploaded and classified via CLIP ✅', 
                    item_id: result.insertId, 
                    ai_result: mappedValues 
                });
            }
        );
    } catch (err) {
        console.error("❌ Online Backend Route Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});
// Route 2: Filter and Search Inventory Pooled Items
router.get('/', verifyToken, (req, res) => {
    const { type, gender, age_group, search } = req.query;
    
    // 🟢 FIXED: Removed the trailing semicolon (;) from inside the template string below
    let query  = `SELECT * FROM clothing_items 
                  WHERE organization_name = ? 
                  AND cloth_id NOT IN (SELECT cloth_id FROM distribution_items WHERE organization_name = ?)`;
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

// Route 3: Process Bulk Material Distribution Order
router.post('/distribute', verifyToken, async (req, res) => {
    const { recipient_name, pic_name, contact, email, note, item_ids } = req.body;
    if (!recipient_name || !item_ids || item_ids.length === 0) {
        return res.status(400).json({ error: 'Recipient name and items are required' });
    }
    db.query(
        'SELECT * FROM clothing_items WHERE cloth_id IN (?) AND organization_name = ?',
        [item_ids, req.orgName],
        (err, items) => {
            if (err) return res.status(500).json({ error: err.message });
            db.query(
                `INSERT INTO distributions (recipient_name, pic_name, contact, email, note, items_count, organization_name, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed')`,
                [recipient_name, pic_name || '', contact || '', email || '', note || '', items.length, req.orgName],
                (err, distResult) => {
                    if (err) return res.status(500).json({ error: err.message });
                    const distributionId = distResult.insertId;

                    const insertValues = items.map(item => [
                        distributionId, item.cloth_id, item.item_name, item.gender, item.age_group, item.clothing_type, req.orgName
                    ]);
                    db.query(
                        `INSERT INTO distribution_items (distribution_id, cloth_id, item_name, gender, age_group, clothing_type, organization_name)
                         VALUES ?`,
                        [insertValues],
                        (err) => {
                            if (err) return res.status(500).json({ error: err.message });
                            res.status(201).json({ message: 'Distribution logged! 🚚', distribution_id: distributionId });
                        }
                    );
                }
            );
        }
    );
});

// Route 4: Fetch Historical Outbound Distribution Master Logs
router.get('/distributions', verifyToken, (req, res) => {
    db.query(
        'SELECT * FROM distributions WHERE organization_name = ? ORDER BY created_at DESC',
        [req.orgName],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(200).json(results);
        }
    );
});

// Route 5: Fetch Specific Items Bound to an Outbound Order via Inner Join Blueprint
router.get('/distributions/:id/items', verifyToken, (req, res) => {
    db.query(
        `SELECT di.*, ci.image_path 
         FROM distribution_items di
         LEFT JOIN clothing_items ci ON di.cloth_id = ci.cloth_id
         WHERE di.distribution_id = ? AND di.organization_name = ?`,
        [req.params.id, req.orgName],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(200).json(results);
        }
    );
});

// Route 6: Update Recipient Profile Ledger Information Inline
router.put('/distributions/:id', verifyToken, (req, res) => {
    const { recipient_name, pic_name, contact, email, note } = req.body;
    if (!recipient_name) return res.status(400).json({ error: 'Recipient name is required' });

    db.query(
        `UPDATE distributions 
         SET recipient_name = ?, pic_name = ?, contact = ?, email = ?, note = ?
         WHERE id = ? AND organization_name = ?`,
        [recipient_name, pic_name || '', contact || '', email || '', note || '', req.params.id, req.orgName],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(200).json({ message: 'Distribution record updated successfully! ✅' });
        }
    );
});

// Route 7: Robust Two-Stage Distribution Cancellation and Stock Pool Rollback
router.post('/distributions/:id/cancel', verifyToken, (req, res) => {
    const distId = req.params.id;
    const orgName = req.orgName;

    db.query(
        'SELECT cloth_id FROM distribution_items WHERE distribution_id = ? AND organization_name = ?',
        [distId, orgName],
        (err, items) => {
            if (err) {
                console.error('❌ Cancel Error Stage 1:', err.message);
                return res.status(500).json({ error: err.message });
            }

            db.query(
                `UPDATE distributions SET status = 'Cancelled' WHERE id = ? AND organization_name = ?`,
                [distId, orgName],
                (err) => {
                    if (err) {
                        console.error('❌ Cancel Error Stage 2:', err.message);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    db.query(
                        `DELETE FROM distribution_items WHERE distribution_id = ? AND organization_name = ?`,
                        [distId, orgName],
                        (err) => {
                            if (err) {
                                console.error('❌ Cancel Error Stage 3:', err.message);
                                return res.status(500).json({ error: err.message });
                            }
                            
                            res.status(200).json({ 
                                message: 'Distribution cancelled successfully. All items rolled back to active inventory! ↩️' 
                            });
                        }
                    );
                }
            );
        }
    );
});

// Route 8: Manual Add Inventory Item
router.post('/', verifyToken, (req, res) => {
    const { item_name, description, gender, age_group, clothing_type, sub_type } = req.body;
    if (!item_name || !clothing_type) return res.status(400).json({ error: 'Item name and clothing type are required' });
    const labels = [gender || 'Unisex', age_group || 'Adult', clothing_type];
    if (sub_type) labels.push(sub_type);
    const combined = labels.join(' + ');
    db.query(
        `INSERT INTO clothing_items (item_name, description, gender, age_group, clothing_type, sub_type, combined_label, organization_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item_name, description || '', gender || 'Unisex', age_group || 'Adult', clothing_type, sub_type || null, combined || '', req.orgName],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Clothing added successfully ✅', item_id: result.insertId });
        }
    );
});

// Route 9: Manual Edit Inventory Item Metrics
router.put('/:id', verifyToken, (req, res) => {
    const { item_name, description, gender, age_group, clothing_type, sub_type } = req.body;
    const labels = [gender || 'Unisex', age_group || 'Adult', clothing_type];
    if (sub_type) labels.push(sub_type);
    const combined = labels.join(' + ');
    db.query(
        `UPDATE clothing_items SET item_name = ?, description = ?, gender = ?, age_group = ?, clothing_type = ?, sub_type = ?, combined_label = ? WHERE cloth_id = ? AND organization_name = ?`,
        [item_name, description || '', gender || 'Unisex', age_group || 'Adult', clothing_type, sub_type || null, combined || '', req.params.id, req.orgName],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(200).json({ message: 'Clothing updated successfully ✅' });
        }
    );
});

// Route 10: Delete Inventory Item Permanently From Registry
router.delete('/:id', verifyToken, (req, res) => {
    db.query('DELETE FROM clothing_items WHERE cloth_id = ? AND organization_name = ?', [req.params.id, req.orgName], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Clothing deleted successfully ✅' });
    });
});

router.mapToValidENUMs = mapToValidENUMs;
module.exports = router;