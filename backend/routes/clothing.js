const express     = require('express')
const router      = express.Router()
const multer      = require('multer')
const axios       = require('axios')
const FormData    = require('form-data')
const fs          = require('fs')
const db          = require('../config/db')
const verifyToken = require('../middleware/auth')
require('dotenv').config()

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename:    (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
})
const upload = multer({ storage })

// ─────────────────────────────────────────────────────
// GENDER CORRECTION - Clothing type determines gender
// ─────────────────────────────────────────────────────
function correctGenderByClothing(clothingType, subType, detectedGender) {
    console.log(`  → Correcting gender: type=${clothingType}, subType=${subType}, detected=${detectedGender}`)
    
    // RULE 1: If it's a skirt, ALWAYS female
    if (clothingType === 'Skirt') {
        console.log(`  ✅ Skirt detected → Setting to Female`)
        return 'Female'
    }

    // RULE 2: If sub_type contains "skirt", ALWAYS female
    if (subType && typeof subType === 'string' && subType.toLowerCase().includes('skirt')) {
        console.log(`  ✅ Skirt in sub_type → Setting to Female`)
        return 'Female'
    }

    // RULE 3: If it's a dress, ALWAYS female
    if (clothingType === 'Dress') {
        console.log(`  ✅ Dress detected → Setting to Female`)
        return 'Female'
    }

    // Otherwise keep detected gender
    console.log(`  → Keeping detected gender: ${detectedGender}`)
    return detectedGender
}

// ─────────────────────────────────────────────────────
// ENUM MAPPING FUNCTION - Normalize AI response to DB ENUMs
// ─────────────────────────────────────────────────────
function mapToValidENUMs(aiResult) {
    // Valid ENUM values from database schema
    const validGenders = ['Female', 'Male', 'Unisex']
   const validAgeGroups = ['Children', 'Adult']
    const validClothingTypes = ['Pants', 'Clothes', 'Skirt', 'Dress']
    const validPriorities = ['High', 'Medium', 'Low']

    // Sub-type mapping based on clothing type
    const subTypesByClothing = {
        'Pants': ['Long pants', 'Short pants'],
        'Clothes': ['Long sleeve', 'Short sleeve'],
        'Skirt': ['Long skirt', 'Short skirt'],
        'Dress': []
    }

    // Helper function to find closest match
    function findClosestMatch(value, validList) {
        if (!value || validList.length === 0) return validList[0] || null

        value = String(value).trim()

        // Exact match (case-insensitive)
        const exactMatch = validList.find(v => v.toLowerCase() === value.toLowerCase())
        if (exactMatch) return exactMatch

        // Partial match
        const partialMatch = validList.find(v => 
            value.toLowerCase().includes(v.toLowerCase()) || 
            v.toLowerCase().includes(value.toLowerCase())
        )
        if (partialMatch) return partialMatch

        // Default to first option
        return validList[0] || null
    }

    // Map clothing type (start with AI suggestion)
    let clothingType = findClosestMatch(aiResult.clothing_type, validClothingTypes)
    
    // Defensive override: if the AI's reported sub_type explicitly contains 'suit' or 'jacket',
    // treat it as a top (`Clothes`) and force sleeve mapping to `Long sleeve`.
    // This prevents cases where the model mislabels a suit/jacket as pants but the
    // sub_type clearly indicates an upper-body garment.
    let subType = null
    const originalSubType = String(aiResult.sub_type || '').toLowerCase()

    if (originalSubType.includes('suit') || originalSubType.includes('jacket')) {
        clothingType = 'Clothes'
        subType = 'Long sleeve'
    } else {
        // 🟢 让它回归自由！去匹配包含 short sleeve / long sleeve 的有效列表
        const validSubTypes = subTypesByClothing[clothingType] || []
        if (validSubTypes.length > 0) {
            subType = findClosestMatch(aiResult.sub_type, validSubTypes)
        }
    }

    // Get detected gender
    let gender = findClosestMatch(aiResult.gender, validGenders)
    
    // CORRECT GENDER BASED ON CLOTHING TYPE AND SUB_TYPE
    gender = correctGenderByClothing(clothingType, subType, gender)

    return {
        gender: gender,
        age_group: findClosestMatch(aiResult.age_group, validAgeGroups),
        clothing_type: clothingType,
        sub_type: subType,
        priority: 'Medium' // 👈 这里固定写死一个默认值作为数据库垫背，这样前端就不需要再管它了！
    }
}

// ─────────────────────────────────────────────────────
// Function 3 — Upload image + AI classify
// POST /api/clothing/upload
// ─────────────────────────────────────────────────────
router.post('/upload', verifyToken, upload.single('image'), async (req, res) => {
    try {
        const {
            item_name,
            description,
        } = req.body

        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' })
        }

        const imagePath = req.file.path

        // Send image to Flask AI server
        const formData = new FormData()
        formData.append('image', fs.createReadStream(imagePath))

        const aiResponse = await axios.post(
            `${process.env.AI_URL}/classify`,
            formData,
            { headers: formData.getHeaders() }
        )

        const aiResult = aiResponse.data
        
        // DEBUG: Log AI response
        console.log('🤖 AI Response:', JSON.stringify(aiResult, null, 2))

        // MAP AI RESPONSE TO VALID ENUM VALUES
        const mappedValues = mapToValidENUMs(aiResult)
        
        // DEBUG: Log mapped values
        console.log('✅ Mapped Values:', JSON.stringify(mappedValues, null, 2))

        // Build combined label
        const labels = [mappedValues.gender, mappedValues.age_group, mappedValues.clothing_type]
        if (mappedValues.sub_type) labels.push(mappedValues.sub_type)
        const combinedLabel = labels.join(' + ')

        // Save to database with mapped values
        db.query(
            `INSERT INTO clothing_items
             (item_name, description, gender, age_group,
              clothing_type, sub_type, combined_label,
              priority, image_path)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                item_name || 'Clothing Item',
                description || '',
                mappedValues.gender,
                mappedValues.age_group,
                mappedValues.clothing_type,
                mappedValues.sub_type,
                combinedLabel,
                mappedValues.priority,
                imagePath
            ],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message })

                res.status(201).json({
                    message:   'Clothing uploaded and classified ✅',
                    item_id:   result.insertId,
                    ai_result: mappedValues // Return mapped values to frontend
                })
            }
        )
    } catch (err) {
        console.error('❌ 真正的崩溃原因在这里:', err) // 👈 直接改写成这样
        res.status(500).json({ error: err.message })
    }
})

// ─────────────────────────────────────────────────────
// Function 4 + 9 — Filter and Search
// ─────────────────────────────────────────────────────
router.get('/', verifyToken, (req, res) => {
    const { type, gender, age_group, search } = req.query

    let query  = 'SELECT * FROM clothing_items WHERE 1=1'
    let params = []

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
        query += ` AND (
            item_name      LIKE ? OR
            description   LIKE ? OR
            combined_label LIKE ?
        )`
        params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY created_at DESC'

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message })

        res.status(200).json({
            total: results.length,
            items: results
        })
    })
})

// ─────────────────────────────────────────────────────
// Function 5 — Add new cloth manually (已修正参数位移 Bug)
// ─────────────────────────────────────────────────────
router.post('/', verifyToken, (req, res) => {
    const {
        item_name,
        description,
        gender,
        age_group,
        clothing_type,
        sub_type
    } = req.body

    // Validate
    if (!item_name || !clothing_type) {
        return res.status(400).json({
            error: 'Item name and clothing type are required'
        })
    }

    // Build combined label
    const labels   = [gender || 'Unisex', age_group || 'Adult', clothing_type]
    if (sub_type) labels.push(sub_type)
    const combined = labels.join(' + ')

    db.query(
        `INSERT INTO clothing_items
         (item_name, description, gender, age_group,
          clothing_type, sub_type, combined_label)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            item_name,
            description  || '',
            gender        || 'Unisex',
            age_group     || 'Adult',
            clothing_type,
            sub_type      || null,
            combined      || ''
        ],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message })

            res.status(201).json({
                message: 'Clothing added successfully ✅',
                item_id: result.insertId
            })
        }
    )
})

// ─────────────────────────────────────────────────────
// Function 7 — Edit cloth information
// ─────────────────────────────────────────────────────
router.put('/:id', verifyToken, (req, res) => {
    const {
        item_name,
        description,
        gender,
        age_group,
        clothing_type,
        sub_type
    } = req.body

    const labels   = [gender || 'Unisex', age_group || 'Adult', clothing_type]
    if (sub_type) labels.push(sub_type)
    const combined = labels.join(' + ')

    db.query(
        `UPDATE clothing_items
         SET item_name      = ?,
             description   = ?,
             gender         = ?,
             age_group      = ?,
             clothing_type  = ?,
             sub_type       = ?,
             combined_label = ?
         WHERE cloth_id = ?`, // 🟢 修正为主键名 cloth_id
        [
            item_name,
            description  || '',
            gender        || 'Unisex',
            age_group     || 'Adult',
            clothing_type,
            sub_type      || null,
            combined      || '',
            req.params.id
        ],
        (err) => {
            if (err) return res.status(500).json({ error: err.message })

            res.status(200).json({
                message: 'Clothing updated successfully ✅'
            })
        }
    )
})

// ─────────────────────────────────────────────────────
// Function 6 — Delete cloth record
// ─────────────────────────────────────────────────────
router.delete('/:id', verifyToken, (req, res) => {
    db.query(
        'DELETE FROM clothing_items WHERE cloth_id = ?', // 🟢 修正为主键名 cloth_id
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message })

            res.status(200).json({
                message: 'Clothing deleted successfully ✅'
            })
        }
    )
})

// Expose mapping helper for tests and external use
router.mapToValidENUMs = mapToValidENUMs

module.exports = router