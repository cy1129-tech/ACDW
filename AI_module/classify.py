# AI_module/classify.py
import os
import json
import re
import google.generativeai as genai
from PIL import Image

GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# ─────────────────────────────────────────────
#  Hard-coded post-processing rules (bulletproof)
# ─────────────────────────────────────────────
def post_process(clothing_type, sub_type, gender, age_group):

    # 1. Force valid clothing_type
    TYPE_MAP = {
        'dress': 'Dress', 'gown': 'Dress', 'tutu': 'Dress',
        'skirt': 'Skirt',
        'pants': 'Pants', 'trousers': 'Pants', 'shorts': 'Pants', 'jeans': 'Pants',
        'clothes': 'Clothes', 'shirt': 'Clothes', 'top': 'Clothes',
        'jacket': 'Clothes', 'coat': 'Clothes', 'blouse': 'Clothes',
    }
    ct = clothing_type.strip().lower()
    final_type = next((v for k, v in TYPE_MAP.items() if k in ct), 'Clothes')

    # 2. Force valid sub_type per clothing_type
    VALID_SUBS = {
        'Dress':   ['Dress'],
        'Skirt':   ['Long skirt', 'Short skirt'],
        'Pants':   ['Long pants', 'Short pants'],
        'Clothes': ['Long sleeve', 'Short sleeve'],
    }
    raw_sub = sub_type.strip().lower()
    allowed = VALID_SUBS[final_type]
    matched_sub = next(
        (s for s in allowed if s.lower() in raw_sub or raw_sub in s.lower()),
        allowed[0]
    )

    # 3. Force valid gender
    raw_g = gender.strip().lower()
    if 'female' in raw_g or 'woman' in raw_g or 'girl' in raw_g:
        final_gender = 'Female'
    elif 'male' in raw_g or 'man' in raw_g or 'boy' in raw_g:
        final_gender = 'Male'
    else:
        final_gender = 'Unisex'

    # 4. Dress/Skirt ALWAYS Female (hard rule)
    if final_type in ['Dress', 'Skirt']:
        final_gender = 'Female'

    # 5. Force valid age_group
    raw_a = age_group.strip().lower()
    final_age = 'Children' if any(k in raw_a for k in ['child', 'kid', 'baby', 'girl', 'boy', 'toddler', 'infant']) else 'Adult'

    return final_type, matched_sub, final_gender, final_age


def classify(image_path, gender=None, age_group=None, sub_type=None):
    try:
        if not GOOGLE_API_KEY:
            raise ValueError("GEMINI_API_KEY not found")

        img   = Image.open(image_path).convert('RGB')
        model = genai.GenerativeModel('gemini-2.5-flash')

        prompt = """
You are a warehouse clothing classifier. Your ONLY job is to look at the image and return a JSON with 4 fields.

ALLOWED VALUES (you must use EXACTLY these):
- clothing_type: "Clothes" | "Pants" | "Skirt" | "Dress"
- sub_type:      "Long sleeve" | "Short sleeve" (if Clothes)
                 "Long pants"  | "Short pants"  (if Pants)
                 "Long skirt"  | "Short skirt"  (if Skirt)
                 "Dress"                         (if Dress)
- gender:        "Male" | "Female" | "Unisex"
- age_group:     "Adult" | "Children"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — clothing_type (most important step)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ask yourself: Does the garment cover BOTH the upper body AND lower body in one piece?
  YES → "Dress"  (ball gown, tutu, sundress, maxi dress, mini dress, baby dress, qipao full-length)
  NO  → Is it ONLY a bottom garment (skirt, tulle skirt, A-line)?
           YES → "Skirt"
           NO  → Does it cover LEGS (trousers, jeans, shorts, leggings)?
                    YES → "Pants"
                    NO  → It is a TOP only → "Clothes"  (t-shirt, polo, shirt, jacket, coat, blouse, cheongsam top, tang suit top, cardigan, hoodie)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — sub_type
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For "Clothes": Look at the SLEEVES.
  - Sleeves reach the wrist/elbow → "Long sleeve"
  - Short or no sleeves           → "Short sleeve"
  (Jackets, coats, cheongsam tops, tang suit tops with long sleeves → ALWAYS "Long sleeve")
  (Polo shirts with short sleeves → "Short sleeve")
For "Pants":  Covers full leg → "Long pants" | Cut above knee → "Short pants"
For "Skirt":  Hem below knee  → "Long skirt" | Hem above knee → "Short skirt"
For "Dress":  Always "Dress"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — gender
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- "Female" → clearly feminine design: dresses, skirts, blouses, floral feminine cuts, embroidered feminine cheongsam, pink/frilly garments
- "Male"   → clearly masculine: polo shirts, men's button shirts, men's tang suit (with mandarin collar + frog buttons), men's suits
- "Unisex" → plain t-shirts, hoodies, basic neutral items with no gender-specific features

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — age_group
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- "Children" → tiny garment proportions, cartoon/cute prints, clearly made for a child under 12
- "Adult"    → standard adult size and cut

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLES (use these as reference):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pink layered tutu dress (small, childish) → {"clothing_type":"Dress","sub_type":"Dress","gender":"Female","age_group":"Children"}
Red polo shirt (short sleeves, men's cut) → {"clothing_type":"Clothes","sub_type":"Short sleeve","gender":"Male","age_group":"Adult"}
Red silk tang suit (mandarin collar, long sleeves, frog buttons) → {"clothing_type":"Clothes","sub_type":"Long sleeve","gender":"Male","age_group":"Adult"}
Plaid flannel long-sleeve shirt → {"clothing_type":"Clothes","sub_type":"Long sleeve","gender":"Unisex","age_group":"Adult"}
Gold embroidered cheongsam jacket (feminine, long sleeves) → {"clothing_type":"Clothes","sub_type":"Long sleeve","gender":"Female","age_group":"Adult"}
Blue jeans → {"clothing_type":"Pants","sub_type":"Long pants","gender":"Unisex","age_group":"Adult"}
Pleated mini skirt → {"clothing_type":"Skirt","sub_type":"Short skirt","gender":"Female","age_group":"Adult"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT: Return ONLY the raw JSON object. No markdown. No explanation.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

        response = model.generate_content(
            [prompt, img],
            generation_config=genai.GenerationConfig(
                temperature=0.1,   # low = more deterministic
                top_p=0.8,
            )
        )
        raw_text = response.text.strip()
        print("📥 Gemini Raw:", raw_text)

        json_match = re.search(r'\{.*?\}', raw_text, re.DOTALL)
        clean_json = json_match.group(0) if json_match else raw_text
        result     = json.loads(clean_json)

        # Run hard post-processing rules
        final_type, final_sub, final_gender, final_age = post_process(
            result.get('clothing_type', 'Clothes'),
            result.get('sub_type',      'Short sleeve'),
            result.get('gender',        'Unisex'),
            result.get('age_group',     'Adult'),
        )

        final_result = {
            'clothing_type': final_type,
            'sub_type':      final_sub,
            'gender':        final_gender,
            'age_group':     final_age,
        }
        print("✅ Final:", final_result)
        return final_result

    except Exception as e:
        print(f"❌ Gemini Error: {e}")
        # Fallback by filename keywords only
        fn = os.path.basename(image_path).lower()
        t, s, g, a = 'Clothes', 'Short sleeve', 'Unisex', 'Adult'
        if any(k in fn for k in ['dress','gown','tutu','ballet']):  t,s,g = 'Dress','Dress','Female'
        elif 'skirt' in fn:                                          t,s,g = 'Skirt','Short skirt','Female'
        elif any(k in fn for k in ['pant','jean','trouser']):        t,s   = 'Pants','Long pants'
        elif 'short' in fn:                                          t,s   = 'Pants','Short pants'
        if any(k in fn for k in ['kid','baby','child','toddler']):   a     = 'Children'
        return {'clothing_type': t, 'sub_type': s, 'gender': g, 'age_group': a}