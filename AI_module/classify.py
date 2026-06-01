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
            raise ValueError("GEMINI_API_KEY not found in environment variables")

        # 1. 打开刚刚从 Base64 还原出来的干净无损图片
        img = Image.open(image_path).convert('RGB')
        model = genai.GenerativeModel('gemini-2.5-flash')

        # 2. 严厉指挥官 Prompt：死死卡住时装分类标准
        prompt = """
        You are a fashion expert cataloging warehouse clothing inventory. Analyze this image.
        You MUST output a valid raw JSON object with these EXACT keys and allowed values:
        {
          "clothing_type": "Must be exactly one of: Clothes, Pants, Skirt, Dress",
          "sub_type": "Must be: 'Long sleeve' or 'Short sleeve' (if type is Clothes); 'Long pants' or 'Short pants' (if type is Pants); 'Short skirt' or 'Long skirt' (if type is Skirt); 'Dress' (if type is Dress)",
          "gender": "Must be exactly one of: Male, Female, Unisex",
          "age_group": "Must be exactly one of: Adult, Children"
        }
        
        CRITICAL RULES FOR ACCURACY:
        - Look closely at the sleeves: if it has long sleeves, jacket, coat, or cheongsam top with sleeves covering arms, it is 'Long sleeve'. If it's a short sleeve t-shirt, it's 'Short sleeve'.
        - If it's a skirt or full dress, gender MUST be 'Female'.
        - If it's children/baby clothing, cartoons/rabbit prints on tiny tops, age_group MUST be 'Children'. Otherwise, standard clothes are 'Adult'.
        
        Respond with ONLY the JSON object, do not wrap in markdown like ```json or any explanations.
        """

        response = model.generate_content([prompt, img])
        raw_text = response.text.strip()
        print("📥 Gemini Cloud Raw Response:", raw_text)

        # 3. 强效正则提取大括号内容，粉碎一切格式误报
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        clean_json = json_match.group(0) if json_match else raw_text
        
        result = json.loads(clean_json)

        # 4. 纠正大小写与前后端 ENUM 对齐
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
        print(f"❌ Gemini Real-time Analysis Error: {e}")
        # 如果大模型偶然超时，安全降级回文件名关键词判断，确保系统永不崩溃
        filename = os.path.basename(image_path).lower()
        t, s, g, a = "Clothes", "Short sleeve", "Unisex", "Adult"
        if 'skirt' in filename: t, s, g = "Skirt", "Short skirt", "Female"
        elif 'pant' in filename or 'short' in filename: t, s = "Pants", "Long pants" if "long" in filename else "Short pants"
        elif 'dress' in filename: t, s, g = "Dress", "Dress", "Female"
        elif 'kid' in filename or 'baby' in filename or 'child' in filename: a = "Children"
        return {'clothing_type': t, 'sub_type': s, 'gender': g, 'age_group': a}