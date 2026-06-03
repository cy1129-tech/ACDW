@app.route('/classify', methods=['POST'])
def classify_image():
    # 强制打印出请求的基本信息
    print(f"DEBUG: Request Content-Type: {request.content_type}")
    print(f"DEBUG: Files: {list(request.files.keys())}")
    
    try:
        if 'image' not in request.files:
            print("DEBUG: Image key missing in files")
            return jsonify({'error': 'No image file provided'}), 400
            
        file = request.files['image']
        print(f"DEBUG: Filename: {file.filename}")
        
        image_bytes = file.read()
        print(f"DEBUG: Image size: {len(image_bytes)} bytes")
        
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        print("DEBUG: Image opened and converted successfully")
        
        # ... (模型预测代码保持不变) ...
        
        return jsonify({ ... }), 200
        
    except Exception as e:
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("CRITICAL ERROR DETECTED:")
        import traceback
        traceback.print_exc()
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        return jsonify({'error': str(e)}), 500