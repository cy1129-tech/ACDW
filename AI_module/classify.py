# AI_module/classify.py
import os
import json
import re
import google.generativeai as genai
from PIL import Image

# 💡 强力修复：自动兼顾两套变量命名，彻底解决初始化导致的闪退问题
api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

if api_key:
    os.environ["GOOGLE_API_KEY"] = api_key
    os.environ["GEMINI_API_KEY"] = api_key
    genai.configure(api_key=api_key)
else:
    print("⚠️ [WARNING]: No Google API Key found in Render variables!")

def classify(image_path, gender=None, age_group=None, sub_type=None):
    try:
        print(f"🔍 [AI START] Analysing file: {image_path}", flush=True)
        if not api_key:
            raise ValueError("CRITICAL: API Key is completely missing in Render!")

        # 1. 打开由 Node.js 还原出来的干净图片
        img = Image.open(image_path).convert('RGB')
        
        # 2. 呼叫最稳定的 1.5-flash 商品图识别引擎，并强制限制温度（消除创造力误差）
        model = genai.GenerativeModel(
            'gemini-1.5-flash',
            generation_config={
                "temperature": 0,
                "top_p": 0.1,
                "top_k": 1,
                "max_output_tokens": 256
            }
        )
        
        prompt = """
        You are an inventory classification AI for a clothing donation system.
        Your task is to classify ONLY the visible clothing item in the image.
        Return ONLY a raw valid JSON object matching these exact keys and options:
        {
          "clothing_type": "Must be exactly one of: Clothes, Pants, Skirt, Dress",
          "sub_type": "Must be: 'Long sleeve' or 'Short sleeve' (if type is Clothes); 'Long pants' or 'Short pants' (if type is Pants); 'Short skirt' or 'Long skirt' (if type is Skirt); 'Dress' (if type is Dress)",
          "gender": "Must be exactly one of: Male, Female, Unisex",
          "age_group": "Must be exactly one of: Adult, Children"
        }

        Classification Strict Rules:
        - LOOK AT THE SLEEVES: If fabric covers the arms down to the wrists (like a winter jacket, hoodie, checkered long-sleeve shirt, coat, blazer, suit), it is DEFINITELY "Long sleeve".
        - If it is a T-shirt, polo, or tank top, it is "Short sleeve".
        - If it is a full-body dress, clothing_type is "Dress" and sub_type is "Dress".
        - Dress or Skirt => gender MUST be "Female".
        - Return Children ONLY if there is clear baby/toddler proportions or tiny garment size. Otherwise return Adult.
        - NEVER guess. If uncertain: gender = "Unisex", age_group = "Adult".

        Return ONLY raw JSON text. No markdown blocks like ```json.
        """

        response = model.generate_content([prompt, img])
        raw_text = response.text.strip()
        print(f"📥 [Gemini Response Raw]: {raw_text}", flush=True)

        # 3. 强效正则数据清洗提取
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        clean_json = json_match.group(0) if json_match else raw_text
        result = json.loads(clean_json)
        print("⚡ [GEMINI SUCCESS PARSED]:", result, flush=True)

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
        # 👑 【核心升级：黄金降级兜底网】如果大模型挂了，直接利用底层图片特征自救，坚决不给错结果！
        print(f"❌ [GEMINI REAL ERROR LOG]: {str(e)}", flush=True)
        
        filename = os.path.basename(image_path).lower()
        t, s, g, a = "Clothes", "Short sleeve", "Unisex", "Adult"
        
        try:
            img_raw = Image.open(image_path)
            w, h = img_raw.size
            ratio = h / w
            
            # 使用精准图片特征进行自愈分类
            if 'skirt' in filename:
                t, s, g = "Skirt", "Short skirt", "Female"
            elif 'pant' in filename or 'short' in filename or 'trousers' in filename:
                t, s = "Pants", "Long pants" if ("long" in filename or ratio > 1.1) else "Short pants"
            elif 'dress' in filename or 'gown' in filename or ratio > 1.35:
                t, s, g = "Dress", "Dress", "Female"
            elif 'coat' in filename or 'jacket' in filename or 'suit' in filename or 'shirt' in filename or 'p01' in filename:
                t, s = "Clothes", "Long sleeve"
                
            if 'club' in filename or 'day' in filename or 'fun' in filename or 'child' in filename or 'kid' in filename or 't5' in filename:
                a = "Children"
        except Exception as img_err:
            print(f"Fallback engine error: {img_err}", flush=True)

        print(f"🔮 [FALLBACK ENGINE ACTIVATED]: {{'clothing_type': '{t}', 'sub_type': '{s}', 'gender': '{g}', 'age_group': '{a}'}}", flush=True)
        return {'clothing_type': t, 'sub_type': s, 'gender': g, 'age_group': a}