# train.py
import tensorflow as tf
from tensorflow import keras
import numpy as np

print("TensorFlow version:", tf.__version__)
print("Loading Fashion-MNIST dataset...")

# Load dataset
(x_train, y_train), (x_test, y_test) = keras.datasets.fashion_mnist.load_data()

print(f"Training images: {x_train.shape[0]}")
print(f"Testing images:  {x_test.shape[0]}")

# Normalize
x_train = x_train / 255.0
x_test  = x_test  / 255.0

# Reshape for CNN
x_train = x_train.reshape(-1, 28, 28, 1)
x_test  = x_test.reshape(-1, 28, 28, 1)

print("Images prepared ✅")

# Build CNN
model = keras.Sequential([
    keras.layers.Conv2D(32, (3,3), activation='relu',
                        input_shape=(28, 28, 1)),
    keras.layers.MaxPooling2D(2, 2),
    keras.layers.Conv2D(64, (3,3), activation='relu'),
    keras.layers.MaxPooling2D(2, 2),
    keras.layers.Conv2D(64, (3,3), activation='relu'),
    keras.layers.Flatten(),
    keras.layers.Dense(128, activation='relu'),
    keras.layers.Dropout(0.5),
    keras.layers.Dense(10, activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

# Train
print("\nTraining started — please wait 5-10 minutes...\n")
model.fit(
    x_train, y_train,
    epochs=10,
    batch_size=64,
    validation_split=0.2,
    verbose=1
)

# Evaluate
loss, accuracy = model.evaluate(x_test, y_test)
print(f"\nFinal Accuracy: {accuracy * 100:.2f}%")

# Save
model.save('clothing_model.h5')
print("Model saved ✅ → model/clothing_model.h5")