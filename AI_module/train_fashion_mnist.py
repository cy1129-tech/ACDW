import tensorflow as tf
from tensorflow.keras import layers, models
import numpy as np
import json
import os

print("🚀 [Step 1] 正在从云端下载标准 Fashion-MNIST 服装数据集 (共70,000张衣服图片)...")
(train_images, train_labels), (test_images, test_labels) = tf.keras.datasets.fashion_mnist.load_data()

# 归一化处理
train_images = train_images.astype('float32') / 255.0
test_images = test_images.astype('float32') / 255.0

# 调整维度以符合 CNN 输入要求
train_images = np.expand_dims(train_images, -1)
test_images = np.expand_dims(test_images, -1)

print("🚀 [Step 2] 正在构建纯衣服专属卷积神经网络 (CNN)...")
model = models.Sequential([
    layers.Conv2D(32, (3, 3), activation='relu', input_shape=(28, 28, 1)),
    layers.MaxPooling2D((2, 2)),
    layers.Conv2D(64, (3, 3), activation='relu'),
    layers.MaxPooling2D((2, 2)),
    layers.Flatten(),
    layers.Dense(64, activation='relu'),
    layers.Dense(10, activation='softmax') # 严格限制输出只有 10 种衣服
])

model.compile(optimizer='adam',
              loss='sparse_categorical_crossentropy',
              metrics=['accuracy'])

print("🚀 [Step 3] 衣服模型开始原地进化训练 (共 5 轮，大约需要 1-2 分钟)...")
model.fit(train_images, train_labels, epochs=5, batch_size=64, validation_split=0.1)

# 创建并确保 model 文件夹存在
model_dir = os.path.join(os.path.dirname(__file__), 'model')
os.makedirs(model_dir, exist_ok=True)

# 🟢 保存全新的完整衣服模型
model.save(os.path.join(model_dir, 'clothing_model.h5'))

# 🟢 把最新的、完整的 10 服装标签映射表写入 label_map_resnet.json
fashion_labels = {
    "0": "T-shirt/top",
    "1": "Trouser",
    "2": "Pullover",
    "3": "Dress",
    "4": "Coat",
    "5": "Sandal",
    "6": "Shirt",
    "7": "Sneaker",
    "8": "Bag",
    "9": "Ankle boot"
}

with open(os.path.join(model_dir, 'label_map_resnet.json'), 'w', encoding='utf-8') as f:
    json.dump(fashion_labels, f, indent=2)

print("🎉 [SUCCESS] 你的专属衣服模型与完整标签成功落座 'model/' 目录！")