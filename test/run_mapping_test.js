// Simple test harness for mapToValidENUMs
const path = require('path')
const router = require(path.join('..','backend','routes','clothing.js'))
const mapToValidENUMs = router.mapToValidENUMs

const tests = [
  {
    name: 'Suit jacket misclassified as pants',
    input: {
      clothing_type: 'Pants',
      sub_type: 'suit jacket',
      gender: 'Unisex',
      age_group: 'Adult',
      priority: 'Medium'
    }
  },
  {
    name: 'Jeans correctly pants',
    input: {
      clothing_type: 'Pants',
      sub_type: 'jeans',
      gender: 'Unisex',
      age_group: 'Adult'
    }
  },
  {
    name: 'Blazer labelled as clothes',
    input: {
      clothing_type: 'Pants',
      sub_type: 'blazer',
      gender: 'Unisex',
      age_group: 'Adult'
    }
  }
]

for (const t of tests) {
  console.log('---')
  console.log('Test:', t.name)
  console.log('Input:', t.input)
  const out = mapToValidENUMs(t.input)
  console.log('Output:', out)
}
