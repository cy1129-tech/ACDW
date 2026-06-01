const express     = require('express')
const router      = express.Router()
const multer      = require('multer')
const axios       = require('axios')
const FormData    = require('form-data')
const fs          = require('fs')
const db          = require('../config/db')
const verifyToken = require('../middleware/auth')
require('dotenv').config()

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename:    (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
})
const upload = multer({ storage })

function correctGenderByClothing(clothingType, subType, detectedGender) {
    if (clothingType === 'Skirt') return 'Female'
    if (subType && typeof subType === 'string' && subType.toLowerCase().includes('skirt')) return 'Female'
    if (clothingType === 'Dress') return 'Female'
    return detectedGender
}

function mapToValidENUMs(aiResult) {
    const validGenders = ['Female', 'Male', 'Unisex']
    const validAgeGroups = ['Children', 'Adult']
    const validClothingTypes = ['Pants', 'Clothes', 'Skirt', 'Dress']
    const validPriorities = ['High', 'Medium', 'Low']

    const subTypesByClothing = {
        'Pants': ['Long pants', 'Short pants'],
        'Clothes': ['Long sleeve', 'Short sleeve'],
        'Skirt': ['Long skirt', 'Short skirt'],
        'Dress': []
    }

    function findClosestMatch(value, validList) {
        if (!value || validList.length === 0) return validList[0] || null
        value = String(value).trim()
        const exactMatch = validList.find(v => v.toLowerCase() === value.toLowerCase())
        if (exactMatch) return exactMatch
        const partialMatch = validList.find(v => v.toLowerCase().includes(value.toLowerCase()) || value.toLowerCase().includes(v.toLowerCase()))
        if (partialMatch) return partialMatch
        return validList[0] || null
    }

    let clothingType = findClosestMatch(aiResult.clothing_type, validClothingTypes)
    let subType = null
    const originalSubType = String(aiResult.sub_type || '').toLowerCase()

    if (originalSubType.includes('suit') || originalSubType.includes('jacket')) {
        clothingType = 'Clothes'
        subType = 'Long sleeve'
    } else {
        const validSubTypes = subTypesByClothing[clothingType] || []
        if (validSubTypes.length > 0) {
            subType = findClosestMatch(aiResult.sub_type, validSubTypes)
        }
    }

    let gender = findClosestMatch(aiResult.gender, validGenders)
    gender = correctGenderByClothing(clothingType, subType, gender)

    return {
        gender: gender,
        age_group: findClosestMatch(aiResult.age_group, validAgeGroups),
        clothing_type: clothingType,
        sub_type: subType,
        priority: 'Medium'
    }
}

// ─────────────────────────────────────────────────────
// Function 3 — Upload image + AI classify (带组织隔离入库)
// POST /api/clothing/upload
// ─────────────────────────────────────────────────────
router.post('/upload', verifyToken, upload.single('image'), async (req, res) => {
    try {
        const { item_name, description } = req.body

        if (!req.file) return res.status(400).json({ error: 'No image uploaded' })
        const imagePath = req.file.path

        const formData = new FormData()
        formData.append('image', fs.createReadStream(imagePath))

        const aiResponse = await axios.post(`${process.env.AI_URL}/classify`, formData, { headers: formData.getHeaders() })
        const aiResult = aiResponse.data
        const mappedValues = mapToValidENUMs(aiResult)

        const labels = [mappedValues.gender, mappedValues.age_group, mappedValues.clothing_type]
        if (mappedValues.sub_type) labels.push(mappedValues.sub_type)
        const combinedLabel = labels.join(' + ')

        // 🟢 核心高光改造：入库时，把当前用户的组织名 req.orgName 强行砸进表里！
        db.query(
            `INSERT INTO clothing_items
             (item_name, description, gender, age_group,
              clothing_type, sub_type, combined_label,
              priority, image_path, organization_name)
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
                imagePath,
                req.orgName // 👈 绑定当前操作者的组织
            ],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message })

                res.status(201).json({
                    message: 'Clothing uploaded and classified ✅',
                    item_id: result.insertId,
                    ai_result: mappedValues
                })
            }
        )
    } catch (err) {
        console.error('❌ Error in upload:', err)
        res.status(500).json({ error: err.message })
    }
})

// ─────────────────────────────────────────────────────
// Function 4 + 9 — Filter and Search (核心隔离：只准查自己组织的私有库存)
// ─────────────────────────────────────────────────────
router.get('/', verifyToken, (req, res) => {
    const { type, gender, age_group, search } = req.query

    // 🟢 终极必杀：强制加上 organization_name = ?，别组的物资看都别想看到
    let query  = 'SELECT * FROM clothing_items WHERE organization_name = ?'
    let params = [req.orgName] // 👈 锁死当前组织

    if (type) {
        query += ' AND clothing_type = ?'
        params.push(type)
    }
    if (gender) {
        query += ' AND gender = ?'
        params.push(gender)
    }
    if (age_group) {
        query += ' AND age_group = ?'
        params.push(age_group)
    }
    if (search) {
        query += ` AND (item_name LIKE ? OR description LIKE ? OR combined_label LIKE ?)`
        params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY created_at DESC'

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message })
        res.status(200).json({ total: results.length, items: results })
    })
})

// ─────────────────────────────────────────────────────
// Function 5 — Add new cloth manually (带组织隔离入库)
// ─────────────────────────────────────────────────────
router.post('/', verifyToken, (req, res) => {
    const { item_name, description, gender, age_group, clothing_type, sub_type } = req.body

    if (!item_name || !clothing_type) return res.status(400).json({ error: 'Item name and clothing type are required' })

    const labels = [gender || 'Unisex', age_group || 'Adult', clothing_type]
    if (sub_type) labels.push(sub_type)
    const combined = labels.join(' + ')

    // 🟢 核心改造：手动添加时，同样强行绑定当前组织名 req.orgName
    db.query(
        `INSERT INTO clothing_items
         (item_name, description, gender, age_group,
          clothing_type, sub_type, combined_label, organization_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            item_name,
            description || '',
            gender || 'Unisex',
            age_group || 'Adult',
            clothing_type,
            sub_type || null,
            combined || '',
            req.orgName // 👈 绑定组织
        ],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message })
            res.status(201).json({ message: 'Clothing added successfully ✅', item_id: result.insertId })
        }
    )
})

// ─────────────────────────────────────────────────────
// Function 7 — Edit cloth information (加入安全屏障：只能改自己组的物资)
// ─────────────────────────────────────────────────────
router.put('/:id', verifyToken, (req, res) => {
    const { item_name, description, gender, age_group, clothing_type, sub_type } = req.body

    const labels = [gender || 'Unisex', age_group || 'Adult', clothing_type]
    if (sub_type) labels.push(sub_type)
    const combined = labels.join(' + ')

    // 🟢 核心防御：除了匹配 cloth_id，还必须阻断非本组的恶意越权
    db.query(
        `UPDATE clothing_items
         SET item_name = ?, description = ?, gender = ?, age_group = ?,
             clothing_type = ?, sub_type = ?, combined_label = ?
         WHERE cloth_id = ? AND organization_name = ?`,
        [item_name, description || '', gender || 'Unisex', age_group || 'Adult', clothing_type, sub_type || null, combined || '', req.params.id, req.orgName],
        (err) => {
            if (err) return res.status(500).json({ error: err.message })
            res.status(200).json({ message: 'Clothing updated successfully ✅' })
        }
    )
})

// ─────────────────────────────────────────────────────
// Function 6 — Delete cloth record (加入安全屏障：只能删自己组的物资)
// ─────────────────────────────────────────────────────
router.delete('/:id', verifyToken, (req, res) => {
    // 🟢 核心防御：双保险锁死组织名，防止越权删除别组数据
    db.query(
        'DELETE FROM clothing_items WHERE cloth_id = ? AND organization_name = ?',
        [req.params.id, req.orgName],
        (err) => {
            if (err) return res.status(500).json({ error: err.message })
            res.status(200).json({ message: 'Clothing deleted successfully ✅' })
        }
    )
})

router.mapToValidENUMs = mapToValidENUMs
module.exports = router