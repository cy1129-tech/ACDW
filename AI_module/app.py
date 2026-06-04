from flask import Flask, request, jsonify
from PIL import Image
import io
import traceback
import torch
# 如果你有 model 和 processor，请在这里取消注释并初始化
# from transformers import CLIPProcessor, CLIPModel 

# 1. 初始化 Flask 应用 (确保这一行在最前面，防止 NameError)
app = Flask(__name__)

# 2. 如果你有模型加载需求，放在这里（在应用启动时只加载一次）
# model = ... 
# processor = ...

@app.route('/classify', methods=['POST'])
def classify_image():
    """
    接收 POST 请求，从 request.files 获取图片，返回 AI 分类结果
    """
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
            
        file = request.files['image']
        image_bytes = file.read()
        
        # 将二进制流转为图片对象
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # --- 在这里插入你原来的模型推理逻辑 ---
        # 示例：
        ai_result = {
            'clothing_type': 'Clothes',
            'sub_type': 'Short sleeve',
            'gender': 'Unisex',
            'age_group': 'Adult'
        }
        # ------------------------------------
        
        return jsonify(ai_result), 200
        
    except Exception as e:
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("CRITICAL ERROR DETECTED:")
        traceback.print_exc()
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "alive"}), 200

# 3. 运行服务器
if __name__ == '__main__':
    # host='0.0.0.0' 允许外部访问，port=10000 是你在本地运行和云端隧道的监听端口
    app.run(host='0.0.0.0', port=10000, debug=True)