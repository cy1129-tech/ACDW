# AI_module/app.py
from flask import Flask, request, jsonify
from classify   import classify
from rule_based import apply_rules
from heuristic  import recommend
import os
import base64
import time
import re

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/classify', methods=['POST'])
def classify_route():
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({'error': 'No image data received'}), 400

    try:
        raw_b64 = str(data['image'])
        
        # 💡 【无敌清洗点】：自动砍掉类似 "data:image/jpeg;base64," 的前端包裹头
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",")[1]
            
        # 移除非法空格和换行
        raw_b64 = re.sub(r'\s+', '', raw_b64)
        
        # 解码无损二进制流
        image_data = base64.b64decode(raw_b64)
        
        unique_filename = f"cloud_upload_{int(time.time() * 1000)}.jpg"
        path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        with open(path, "wb") as f:
            f.write(image_data)
            
    except Exception as e:
        print(f"❌ CRITICAL DECODE ERROR: {e}")
        return jsonify({'error': f'Python Base64 Decode Failed: {e}'}), 400

    # 顺利进入真实大模型，绝不走任何假兜底
    result = classify(
        image_path = path,
        gender     = data.get('gender', 'Unisex'),
        age_group  = data.get('age_group', 'Adult'),
        sub_type   = data.get('sub_type', None)
    )

    result = apply_rules(result)
    
    if os.path.exists(path):
        os.remove(path)
        
    print("⚡ AI SERVER TRULY ANALYZED:", result)
    return jsonify(result), 200

@app.route('/recommend', methods=['POST'])
def recommend_route():
    data         = request.get_json()
    inventory    = data.get('inventory',    {})
    region_needs = data.get('region_needs', {})
    result       = recommend(inventory, region_needs)
    return jsonify({'recommendations': result}), 200

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'AI server running'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)