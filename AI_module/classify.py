# AI_module/classify.py
import os
import json
import re
import google.generativeai as genai
from PIL import Image

# 💡 【核心暴力修复】：不管 Render 变量叫 GEMINI 还是 GOOGLE，全塞给 SDK，彻底杜绝初始化失败！
api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

if api_key:
    # 强制同时对齐两套标准，堵死 SDK 的所有底层漏洞
    os.environ["GOOGLE_API_KEY"] = api_key
    os.environ["GEMINI_API_KEY"] = api_key
    genai.configure(api_key=api_key)
else:
    print("⚠️ [WARNING]: No API Key found in Environment Variables!")

def classify(image_path, gender=None, age_group=None, sub_type=None):
    try:
        print(f"🔍 [AI START] Analysing file: {image_path}")
        
        if not api_key:
            raise ValueError("CRITICAL: API Key is missing!")

        # 1. 读取由 Node 端还原出来的干净物理图片
        img = Image.open(image_path).convert('RGB')
        
        # 2. 呼叫大模型进行高精度看图
        generation_config = {
            "temperature": 0,
            "top_p": 0.1,
            "top_k": 1,
            "max_output_tokens": 256
        }

        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            generation_config=generation_config
        )
        prompt = """
                You are an inventory classification AI for a clothing donation system.

                Your task is to classify ONLY the visible clothing item in the image.

                Return ONLY valid JSON.

                {
                "clothing_type":"",
                "sub_type":"",
                "gender":"",
                "age_group":""
                }

                Allowed clothing_type values:
                - Clothes
                - Pants
                - Skirt
                - Dress

                Allowed gender values:
                - Male
                - Female
                - Unisex

                Allowed age_group values:
                - Adult
                - Children

                Classification Rules:

                STEP 1: Determine clothing_type.

                Dress:
                - Full-body one-piece garment

                Skirt:
                - Lower-body garment only

                Pants:
                - Long pants or shorts

                Clothes:
                - T-shirt
                - Shirt
                - Polo
                - Hoodie
                - Jacket
                - Sweater
                - Coat
                - Blazer

                STEP 2: Determine sub_type.

                For Clothes:
                - Long sleeve
                - Short sleeve

                For Pants:
                - Long pants
                - Short pants

                For Skirt:
                - Long skirt
                - Short skirt

                For Dress:
                - Dress

                Rules:

                - Jackets are Long sleeve
                - Hoodies are Long sleeve
                - Sweaters are Long sleeve
                - Blazers are Long sleeve
                - Coats are Long sleeve
                - Checkered shirts with sleeves reaching wrists are Long sleeve

                STEP 3: Determine gender.

                Rules:

                - Dress => Female
                - Skirt => Female

                If gender cannot be confidently determined:
                return Unisex

                STEP 4: Determine age_group.

                Return Children ONLY if there is strong visual evidence:
                - toddler proportions
                - baby clothing
                - clearly children's garment

                Otherwise return Adult.

                IMPORTANT:

                Never guess.

                When uncertain:
                - gender = Unisex
                - age_group = Adult

                Return ONLY raw JSON.
                """

        # 💡 【高稳定适配器】：使用最新 SDK 标准语法生成内容
        response = model.generate_content([prompt, img])
        raw_text = response.text.strip()
        print(f"📥 [Gemini Response Raw]: {raw_text}", flush=True)

        # 3. 强效正则解包，防止大模型吐出多余的胡话
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        clean_json = json_match.group(0) if json_match else raw_text
        result = json.loads(clean_json)
        print("⚡ AI SERVER SUCCESS RETURN:", result, flush=True)

        # 4. 纠正大小写与前端数据格式对齐
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
        print(f"❌ [GEMINI ERROR LOG]: {e}", flush=True)

        return {
            "clothing_type": "ERROR",
            "sub_type": "ERROR",
            "gender": "ERROR",
            "age_group": "ERROR"
        }
        
       