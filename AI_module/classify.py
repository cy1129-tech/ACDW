# classify.py
import tensorflow as tf
from tensorflow import keras
import numpy as np
from PIL import Image

# Load saved model
model = keras.models.load_model('model/clothing_model.h5')

# Fashion-MNIST labels
FASHION_LABELS = [
    'T-shirt',    # 0
    'Trouser',    # 1
    'Pullover',   # 2
    'Dress',      # 3
    'Coat',       # 4
    'Sandal',     # 5
    'Shirt',      # 6
    'Sneaker',    # 7
    'Bag',        # 8
    'Ankle boot'  # 9
]

# Map to your categories
CLOTHING_MAP = {
    'T-shirt':    {'type': 'Clothes', 'sub_type': 'Short sleeve'},
    'Trouser':    {'type': 'Pants',   'sub_type': None},
    'Pullover':   {'type': 'Clothes', 'sub_type': 'Long sleeve'},
    'Dress':      {'type': 'Dress',   'sub_type': None},
    'Coat':       {'type': 'Clothes', 'sub_type': 'Long sleeve'},
    'Shirt':      {'type': 'Clothes', 'sub_type': 'Long sleeve'},
    'Sandal':     {'type': 'Other',   'sub_type': None},
    'Sneaker':    {'type': 'Other',   'sub_type': None},
    'Bag':        {'type': 'Other',   'sub_type': None},
    'Ankle boot': {'type': 'Other',   'sub_type': None},
}

def preprocess(image_path):
    img = Image.open(image_path).convert('L')
    img = img.resize((28, 28))
    arr = np.array(img) / 255.0
    arr = arr.reshape(1, 28, 28, 1)
    return arr

def classify(image_path, gender, age_group, sub_type=None):
    # CNN classifies image
    img          = preprocess(image_path)
    predictions  = model.predict(img, verbose=0)
    class_index  = np.argmax(predictions)
    confidence   = float(np.max(predictions)) * 100

    fashion_label = FASHION_LABELS[class_index]
    mapped        = CLOTHING_MAP[fashion_label]
    clothing_type = mapped['type']
    auto_sub_type = mapped['sub_type']

    # Determine sub_type
    final_sub_type = auto_sub_type if auto_sub_type else sub_type

    # Build labels
    labels = [gender, age_group, clothing_type]
    if final_sub_type:
        labels.append(final_sub_type)

    return {
        'cnn_result': {
            'fashion_label': fashion_label,
            'confidence':    round(confidence, 2)
        },
        'labels':        labels,
        'gender':        gender,
        'age_group':     age_group,
        'clothing_type': clothing_type,
        'sub_type':      final_sub_type,
        'combined':      ' + '.join(labels)
    }