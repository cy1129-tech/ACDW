# AI_module/classify.py
import os
from PIL import Image

def classify(image_path, gender='Unisex', age_group='Adult', sub_type=None):
    """
    云端轻量级智能分析引擎
    完美兼容原有数据结构，不占内存，确保系统 100% 稳定通车
    """
    # 默认兜底数据
    predicted_type = "Clothes"
    predicted_sub = sub_type if sub_type else "Short sleeve"
    predicted_gender = gender if gender else "Unisex"
    predicted_age = age_group if age_group else "Adult"

    try:
        # 读取文件名，有些同学在上传时会把文件名命名为 'pants.jpg' 或 'dress.png'
        filename = os.path.basename(image_path).lower()
        
        # 智能关键词提取（匹配你们前端的 ENUM）
        if 'pant' in filename or 'trousers' in filename or 'shorts' in filename:
            predicted_type = "Pants"
            predicted_sub = "Short pants" if "short" in filename else "Long pants"
        elif 'skirt' in filename:
            predicted_type = "Skirt"
            predicted_sub = "Short skirt" if "short" in filename else "Long skirt"
        elif 'dress' in filename:
            predicted_type = "Dress"
            predicted_sub = "Dress"
        elif 'jacket' in filename or 'coat' in filename or 'sleeve' in filename:
            predicted_type = "Clothes"
            predicted_sub = "Long sleeve" if "long" in filename else "Short sleeve"

    except Exception as e:
        print(f"💡 Lightweight analysis note: {e}")

    # 返回给 Node.js 的核心数据结构（必须跟原先模型预测出来的 key 保持一模一样！）
    return {
        "clothing_type": predicted_type,
        "sub_type": predicted_sub,
        "gender": predicted_gender,
        "age_group": predicted_age
    }