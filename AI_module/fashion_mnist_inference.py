"""
Inference helper for a Fashion-MNIST trained model.
Converts input image to grayscale 28x28 and predicts class.
"""
import json
import numpy as np
from PIL import Image
import os
from tensorflow import keras


MODEL_PATH = 'AI_module/model/fashion_mnist_cnn.h5'
LABEL_MAP_PATH = 'AI_module/model/label_map_fashion_mnist.json'


def load():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError('Fashion-MNIST model not found; run train_fashion_mnist.py')
    model = keras.models.load_model(MODEL_PATH)
    with open(LABEL_MAP_PATH, 'r') as f:
        label_map = json.load(f)
    return model, label_map


def preprocess_image(path):
    img = Image.open(path).convert('L')
    img = img.resize((28,28), Image.BILINEAR)
    arr = np.array(img).astype('float32') / 255.0
    arr = arr[None, ..., None]
    return arr


def predict(path, topk=3):
    model, label_map = load()
    x = preprocess_image(path)
    preds = model.predict(x)
    probs = preds[0]
    idxs = probs.argsort()[::-1][:topk]
    return [{'label': label_map[str(int(i))] if isinstance(label_map.get(str(int(i))), str) else label_map[int(i)], 'probability': float(probs[int(i)])} for i in idxs]


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print('Usage: python fashion_mnist_inference.py path/to/image')
        raise SystemExit(1)
    print(predict(sys.argv[1]))
