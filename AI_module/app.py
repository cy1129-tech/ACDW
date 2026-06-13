from flask import Flask, request, jsonify
from classify import classify
import os
import base64
import re
import time
import traceback

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/classify', methods=['POST'])
def classify_route():
    try:
        # 方式1: JSON (base64)
        if request.content_type and 'application/json' in request.content_type:
            data = request.get_json()
            if not data or 'image' not in data:
                return jsonify({'error': 'No image data received'}), 400

            raw_b64 = str(data['image'])
            if ',' in raw_b64:
                raw_b64 = raw_b64.split(',')[1]
            raw_b64 = re.sub(r'\s+', '', raw_b64)
            image_data = base64.b64decode(raw_b64)

            unique_filename = f"upload_{int(time.time() * 1000)}.jpg"
            path = os.path.join(UPLOAD_FOLDER, unique_filename)
            with open(path, 'wb') as f:
                f.write(image_data)

        # 方式2: multipart/form-data (直接文件)
        elif request.files and 'image' in request.files:
            file = request.files['image']
            unique_filename = f"upload_{int(time.time() * 1000)}.jpg"
            path = os.path.join(UPLOAD_FOLDER, unique_filename)
            file.save(path)

        else:
            return jsonify({'error': 'No image provided'}), 400

        result = classify(image_path=path)
        print(f"⚡ Final result: {result}")

        if os.path.exists(path):
            os.remove(path)

        return jsonify(result), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'AI server running'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port, debug=False)