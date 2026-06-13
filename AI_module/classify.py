import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import os

model_name = "openai/clip-vit-base-patch32"
model = CLIPModel.from_pretrained(model_name, local_files_only=True)
processor = CLIPProcessor.from_pretrained(model_name, local_files_only=True)

CLOTHING_PROMPTS = [
    # 0: Clothes - Long sleeve
    "a long sleeve shirt, jacket, blazer, coat, or sweater with sleeves covering the full arm to the wrist",
    # 1: Clothes - Short sleeve  
    "a short sleeve t-shirt, polo shirt, or blouse with sleeves ending above the elbow, showing lower arms",
    # 2: Pants - Long
    "a pair of long trousers, jeans, slacks, or pants covering the full leg down to the ankle",
    # 3: Pants - Short
    "a pair of shorts, short pants, or hot pants ending above the knee, showing bare legs below",
    # 4: Skirt - Long
    "a long maxi skirt or midi skirt worn on the lower body only, no top attached, hem reaching below the knee or ankle",
    # 5: Skirt - Short
    "a short mini skirt worn on the lower body only, no top attached, hem ending above the knee showing thighs",
    # 6: Dress - Long
    "a long dress or maxi dress or gown that covers both the upper and lower body together in one garment, reaching the ankle or floor",
    # 7: Dress - Short
    "a short dress or mini dress that covers both the upper and lower body together in one garment, ending above the knee"
]

PROMPT_MAP = {
    0: {'type': 'Clothes', 'sub_type': 'Long sleeve'},
    1: {'type': 'Clothes', 'sub_type': 'Short sleeve'},
    2: {'type': 'Pants',   'sub_type': 'Long pants'},
    3: {'type': 'Pants',   'sub_type': 'Short pants'},
    4: {'type': 'Skirt',   'sub_type': 'Long skirt'},
    5: {'type': 'Skirt',   'sub_type': 'Short skirt'},
    6: {'type': 'Dress',   'sub_type': 'Dress'},
    7: {'type': 'Dress',   'sub_type': 'Dress'}
}

AGE_PROMPTS = [
    "tiny small children clothes, kids wear, toddler outfit, baby clothing with small proportions and childish print",
    "standard full-size adult clothing, regular adult fashion for grown-ups"
]
AGE_MAP = {0: "Children", 1: "Adult"}

GENDER_PROMPTS = [
    "men's clothing, masculine fashion, menswear, clothes designed for men or boys",
    "women's clothing, feminine fashion, womenswear, clothes designed for women or girls",
    "unisex neutral clothing, plain basic items with no gender-specific design"
]
GENDER_MAP = {0: "Male", 1: "Female", 2: "Unisex"}


def classify(image_path, gender=None, age_group=None, sub_type=None):
    try:
        img = Image.open(image_path).convert('RGB')

        # Step 1: Clothing type
        inputs_c = processor(text=CLOTHING_PROMPTS, images=img, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs_c = model(**inputs_c)
            probs_c = outputs_c.logits_per_image.softmax(dim=-1)
            class_idx = torch.argmax(probs_c).item()
            confidence = float(probs_c[0][class_idx]) * 100

        clothing_map  = PROMPT_MAP[class_idx]
        detected_type = clothing_map['type']
        detected_sub  = clothing_map['sub_type']

        print(f"🎯 CLIP Clothing: idx={class_idx} → {detected_type} / {detected_sub} ({confidence:.1f}%)")
        print(f"   All probs: {[f'{p*100:.1f}%' for p in probs_c[0].tolist()]}")

        # Step 2: Age group
        inputs_a = processor(text=AGE_PROMPTS, images=img, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs_a = model(**inputs_a)
            probs_a   = outputs_a.logits_per_image.softmax(dim=-1)
            age_idx   = torch.argmax(probs_a).item()
        final_age = AGE_MAP[age_idx]

        # Step 3: Gender
        inputs_g = processor(text=GENDER_PROMPTS, images=img, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs_g = model(**inputs_g)
            probs_g   = outputs_g.logits_per_image.softmax(dim=-1)
            gender_idx = torch.argmax(probs_g).item()
        final_gender = GENDER_MAP[gender_idx]

        # Hard rules
        if detected_type in ['Skirt', 'Dress']:
            final_gender = 'Female'

        print(f"✅ Final: {detected_type} | {detected_sub} | {final_gender} | {final_age}")

        return {
            'clothing_type': detected_type,
            'sub_type':      detected_sub,
            'gender':        final_gender,
            'age_group':     final_age,
            'confidence':    confidence,
            'predicted_label': detected_sub
        }

    except Exception as e:
        import traceback
        traceback.print_exc() 
        print(f"❌ CLIP Error: {e}")
        return {
            'clothing_type': 'Clothes', 'sub_type': 'Short sleeve',
            'gender': 'Unisex', 'age_group': 'Adult', 'confidence': 0, 'error': str(e)
        }