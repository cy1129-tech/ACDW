import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import os


# 🟢 全自动：直接加载 OpenAI 在几十亿张全彩网页时装图上预训练好的大模型
model_name = "openai/clip-vit-base-patch32"
model = CLIPModel.from_pretrained(model_name, local_files_only=True)
processor = CLIPProcessor.from_pretrained(model_name, local_files_only=True)




# 🟢 服装款式提示词
CLOTHING_PROMPTS = [
    "a photo of a shirt, jacket, or blazer with sleeves ending at the wrist (long sleeve)",
    "a photo of a t-shirt, polo, or top with sleeves ending above the elbow (short sleeve) or top with no sleeve extension",
    "a photo of full-length trousers, jeans, or pants reaching the ankles",
    "a photo of shorts, cargo shorts, or hot pants ending above the knee",
    "a photo of a long maxi skirt reaching the ankles, touching the ground",
    "a photo of a mini skirt or short skirt ending above the mid-thigh or knee, showing legs",
    "a photo of a full-length elegant long dress or gown reaching the floor",
    "a photo of a casual short dress or mini dress ending above the knee"
]


PROMPT_MAP = {
    0: {'type': 'Clothes', 'sub_type': 'long sleeve'},
    1: {'type': 'Clothes', 'sub_type': 'short sleeve'},
    2: {'type': 'Pants',   'sub_type': 'long pants'},
    3: {'type': 'Pants',   'sub_type': 'short pants'},
    4: {'type': 'Skirt',   'sub_type': 'long skirt'},
    5: {'type': 'Skirt',   'sub_type': 'short skirt'},
    6: {'type': 'Dress',   'sub_type': 'long dress'},
    7: {'type': 'Dress',   'sub_type': 'short dress'}
}






def classify(image_path, gender=None, age_group=None, sub_type=None):
    """基于 CLIP 的全自动服装款式 + 年龄段 + 性别全能识别引擎"""
    try:
        img = Image.open(image_path).convert('RGB')
       
        # 1. 👕 第一轮：判断衣服款式
        inputs_clothing = processor(text=CLOTHING_PROMPTS, images=img, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs_c = model(**inputs_clothing)
            probs_c = outputs_c.logits_per_image.softmax(dim=-1)
            class_idx = torch.argmax(probs_c).item()
       
        clothing_map = PROMPT_MAP[class_idx]
        detected_type = clothing_map['type']
        detected_sub_type = clothing_map['sub_type']
       
        # 2. 👶 第二轮：全自动看图猜年龄段！
        # 🟢 提示词放大对比度 + 强制由 AI 独立预测
        AGE_PROMPTS = [
            "a photo of small tiny baby clothes, kids wear, children outfit, toddler outfit, clothing for small kids",
            "a photo of standard adult clothing, regular sized fashion clothes for mature adults and grown-ups"
        ]
        AGE_MAP = {0: "Children", 1: "Adult"}
       
        inputs_age = processor(text=AGE_PROMPTS, images=img, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs_a = model(**inputs_age)
            probs_a = outputs_a.logits_per_image.softmax(dim=-1)
            age_idx = torch.argmax(probs_a).item()
       
        final_age_group = AGE_MAP[age_idx]
       
        # 3. 🚻 第三轮：全自动看图猜性别！
        # 🟢 强制由 AI 独立预测
        GENDER_PROMPTS = ["clothing for men, male style", "clothing for women, female style, lady fashion", "unisex clothes"]
        GENDER_MAP = {0: "Male", 1: "Female", 2: "Unisex"}
       
        inputs_gender = processor(text=GENDER_PROMPTS, images=img, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs_g = model(**inputs_gender)
            probs_g = outputs_g.logits_per_image.softmax(dim=-1)
            gender_idx = torch.argmax(probs_g).item()
           
        final_gender = GENDER_MAP[gender_idx]
       
        # 裙子连衣裙强开 Female 保护
        if detected_type in ['Skirt', 'Dress']:
            final_gender = 'Female'


        print(f"🕵️‍♂️ [CLIP Summary] Style: {detected_sub_type} | Age: {final_age_group} | Gender: {final_gender}")




        SPORT_PROMPTS = [
            "a sports jersey, athletic wear, esports shirt, polo shirt with geometric pattern",
            "a casual everyday clothing item"
        ]
        inputs_sport = processor(text=SPORT_PROMPTS, images=img, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs_s = model(**inputs_sport)
            probs_s = outputs_s.logits_per_image.softmax(dim=-1)
            is_sport = torch.argmax(probs_s).item() == 0


        # sport short=unisex
        if is_sport and final_gender == 'Female' and detected_type == 'Clothes':
            final_gender = 'Unisex'


        return {
            'clothing_type': detected_type,
            'sub_type': detected_sub_type,
            'gender': final_gender,
            'age_group': final_age_group,
            'confidence': float(probs_c[0][class_idx]) * 100,
            'predicted_label': detected_sub_type
        }
    except Exception as e:
        print(f"CLIP AI Error: {e}")
        return {
            'clothing_type': 'Clothes', 'sub_type': 'short sleeve',
            'gender': 'Unisex', 'age_group': 'Adult', 'confidence': 0, 'error': str(e)
        }
 



