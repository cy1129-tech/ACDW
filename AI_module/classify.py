# AI_module/classify.py
import os
import json
import re
import google.generativeai as genai
from PIL import Image

GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

def classify(image_path, gender=None, age_group=None, sub_type=None):
    try:
        if not GOOGLE_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured")

        img = Image.open(image_path).convert('RGB')
        model = genai.GenerativeModel('gemini-2.5-flash')

        # 1. 极其严厉、毫无歧义的 Prompt 指挥官
        prompt = """
        Analyze this clothing image as a standard fashion catalog inventory system.
        You must output EXACTLY a valid JSON object matching these options:
        - clothing_type: Must be exactly one of: 'Clothes', 'Pants', 'Skirt', 'Dress'
        - sub_type: Must be 'Short sleeve' or 'Long sleeve' (if type is Clothes); 'Long pants' or 'Short pants' (if type is Pants); 'Short skirt' or 'Long skirt' (if type is Skirt); 'Dress' (if type is Dress)
        - gender: Must be 'Male', 'Female', or 'Unisex'. (If it is a Skirt or Dress, gender MUST be 'Female')
        - age_group: Must be 'Adult' or 'Children'. (If it is small kids/baby clothing with cartoon designs, choose 'Children')

        Output format example:
        {"clothing_type": "Skirt", "sub_type": "Short skirt", "gender": "Female", "age_group": "Adult"}
        
        Respond with ONLY the raw JSON object. Do not include markdown blocks like ```json.
        """

        response = model.generate_content([prompt, img])
        raw_text = response.text.strip()
        print("📥 Raw Gemini Output:", raw_text)

        # 2. 【核心升级】强效正则表达式清洗，直接抠出大括号内的 JSON 内容
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if json_match:
            clean_json = json_match.group(0)
        else:
            clean_json = raw_text

        result = json.loads(clean_json)

        # 3. 严格大小写修正，防止后端 findClosestMatch 认不出来
        final_type = str(result.get('clothing_type', 'Clothes')).strip().capitalize()
        if final_type not in ['Clothes', 'Pants', 'Skirt', 'Dress']:
            final_type = 'Clothes'

        return {
            'clothing_type': final_type,
            'sub_type': str(result.get('sub_type', 'Short sleeve')).strip(),
            'gender': str(result.get('gender', 'Unisex')).strip().capitalize(),
            'age_group': str(result.get('age_group', 'Adult')).strip().capitalize()
        }

    except Exception as e:
        print(f"❌ Smart Cloud Fallback activated due to error: {e}")
        # 降级回精准关键词判断，兜底也不至于全错
        filename = os.path.basename(image_path).lower()
        t, s, g, a = "Clothes", "Short sleeve", "Unisex", "Adult"
        if 'skirt' in filename:
            t, s, g = "Skirt", "Short skirt", "Female"
        elif 'pant' in filename or 'short' in filename:
            t, s = "Pants", "Long pants" if "long" in filename else "Short pants"
        elif 'dress' in filename:
            t, s, g = "Dress", "Dress", "Female"
        elif 'kid' in filename or 'baby' in filename or 'child' in filename:
            a = "Children"
        return {'clothing_type': t, 'sub_type': s, 'gender': g, 'age_group': a}