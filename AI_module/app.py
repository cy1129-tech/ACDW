import os
from flask import Flask, request, jsonify
import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import io

app = Flask(__name__)

# 👑 核心：直接在云端内存中加载 OpenAI 几十亿图库喂出来的标准 CLIP 模型
print("🚀 Loading OpenAI CLIP Model inside Render container...")
model_name = "openai/clip-vit-base-patch32"
model = CLIPModel.from_pretrained(model_name)
processor = CLIPProcessor.from_pretrained(model_name)

CLOTHING_PROMPTS = [
    "a photo of a long sleeve upper clothing, jacket, coat, or blazer with long sleeves",
    "a photo of a summer short sleeve t-shirt, polo, or top with short sleeves",
    "a photo of long trousers, jeans, or pants covering full legs",
    "a photo of short pants, cargo shorts, or hot pants showing legs",
    "a photo of a long maxi skirt or half-body long skirt covering legs",
    "a photo of a short mini skirt or sexy short skirt showing thighs",
    "a photo of a full body elegant long dress, gown, or evening dress",
    "a photo of a casual short dress, mini dress, or summer short dress"
]

PROMPT_MAP = {
    0: {'clothing_type': 'Clothes', 'sub_type': 'Short sleeve'},  # 即使是长袖也先保底映射
    1: {'clothing_type': 'Clothes', 'sub_type': 'Short sleeve'},
    2: {'clothing_type': 'Pants',   'sub_type': 'Long pants'},
    3: {'clothing_type': 'Pants',   'sub_type': 'Short pants'},
    4: {'clothing_type': 'Skirt',   'sub_type': 'Long skirt'},
    5: {'clothing_type': 'Skirt',   'sub_type': 'Short skirt'},
    6: {'clothing_type': 'Dress',   'sub_type': 'Dress'},
    7: {'clothing_type': 'Dress',   'sub_type': 'Dress'}
}

@app.route('/classify', methods=['POST'])
def classify_image():
    print("FILES RECEIVED:", request.files.keys())
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
            
        file = request.files['image']
        image_bytes = file.read()
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # 👕 1. 衣服款式预测
        inputs = processor(text=CLOTHING_PROMPTS, images=img, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs = model(**inputs)
            probs = outputs.logits_per_image.softmax(dim=-1)
            class_idx = torch.argmax(probs).item()
            
        mapped = PROMPT_MAP[class_idx]
        
        # 👶 2. 年龄段预测
        AGE_PROMPTS = ["clothing for small kids, children wear", "clothing for adults and grown-ups"]
        inputs_age = processor(text=AGE_PROMPTS, images=img, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs_a = model(**inputs_age)
            age_idx = torch.argmax(outputs_a.logits_per_image.softmax(dim=-1)).item()
        age_group = "Children" if age_idx == 0 else "Adult"
        
        # 🚻 3. 性别预测
        GENDER_PROMPTS = ["clothing for men, male wear", "clothing for women, female fashion", "unisex clothes"]
        inputs_gender = processor(text=GENDER_PROMPTS, images=img, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs_g = model(**inputs_gender)
            gender_idx = torch.argmax(outputs_g.logits_per_image.softmax(dim=-1)).item()
        gender = "Male" if gender_idx == 0 else ("Female" if gender_idx == 1 else "Unisex")
        
        # 强开裙子连衣裙 Female 保护机制
        if mapped['clothing_type'] in ['Skirt', 'Dress']:
            gender = 'Female'
            
        return jsonify({
            'clothing_type': mapped['clothing_type'],
            'sub_type': mapped['sub_type'],
            'gender': gender,
            'age_group': age_group
        }), 200
        
    except Exception as e:
            import traceback
            traceback.print_exc() 
            return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 10000)))