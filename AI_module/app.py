# AI_module/app.py
from flask import Flask, request, jsonify
from classify   import classify
from rule_based import apply_rules
from heuristic  import recommend
import os
import base64

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==================== 🛠️ 这里就是被整体升级的 Classify 路由 ====================
@app.route('/classify', methods=['POST'])
def classify_route():
    # 1. 放弃原先的 request.files 接收方式，改用安全的 JSON 接收 Base64 字符串
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({'error': 'No image data received'}), 400

    try:
        # 2. 将无损的 Base64 字符串解码回图片二进制数据
        image_data = base64.b64decode(data['image'])
        
        # 3. 在云端服务器生成一张临时图片文件，供后面的 PIL 和 Gemini 引擎读取
        path = os.path.join(UPLOAD_FOLDER, "cloud_upload.jpg")
        with open(path, "wb") as f:
            f.write(image_data)
            
    except Exception as e:
        print(f"❌ Python Base64 Decode Error: {e}")
        return jsonify({'error': f'Failed to process image bytes: {e}'}), 400

    # 4. 安全提取其他携带参数
    gender    = data.get('gender',    'Unisex')
    age_group = data.get('age_group', 'Adult')
    sub_type  = data.get('sub_type',  None)

    # 5. 呼叫真正的 AI 核心（走我们之前写好的高精度正则清洗 Gemini 大模型逻辑）
    result = classify(
        image_path = path,
        gender     = gender,
        age_group  = age_group,
        sub_type   = sub_type
    )

    # 6. 执行你们原有的规则修正引擎
    result = apply_rules(result)
    
    print("⚡ AI SERVER TRULY ANALYZED & RETURNING TO NODEJS:", result)
    return jsonify(result), 200
# ==============================================================================

# Route 2 — Recommendations
@app.route('/recommend', methods=['POST'])
def recommend_route():
    data         = request.get_json()
    inventory    = data.get('inventory',    {})
    region_needs = data.get('region_needs', {})
    result       = recommend(inventory, region_needs)
    return jsonify({'recommendations': result}), 200

# Route 3 — Health check
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'AI server running'}), 200

if __name__ == '__main__':
    # 自动读取 Render 分配的端口，如果没有（比如在本地）则默认用 8000
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)