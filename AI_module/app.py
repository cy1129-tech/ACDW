# app.py
from flask import Flask, request, jsonify
from classify   import classify
from rule_based import apply_rules
from heuristic  import recommend
import os

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Route 1 — Classify image
@app.route('/classify', methods=['POST'])
def classify_route():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file      = request.files['image']
    gender    = request.form.get('gender',    'Unisex')
    age_group = request.form.get('age_group', 'Adult')
    sub_type  = request.form.get('sub_type',  None)

    # Save image
    path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(path)

    # Classify
    result = classify(
        image_path = path,
        gender     = gender,
        age_group  = age_group,
        sub_type   = sub_type
    )

    # Apply rules
    result = apply_rules(result)
    
    print("⚡ FLASK RETURNING TO NODEJS:", result)

    return jsonify(result), 200

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