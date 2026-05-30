"""
Train a MobileNetV2-based classifier on a DeepFashion-style dataset.

Dataset layout (example expected):
  dataset/
    train/
      Clothes_Long sleeve/
      Pants_Long pants/
      Skirt_Long skirt/
      Dress_Dress/
    val/
      ...

This script performs transfer learning and saves a model and label map.
"""
import argparse
import json
import os
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers


def build_model(num_classes, input_shape=(224, 224, 3)):
    base = keras.applications.MobileNetV2(
        input_shape=input_shape, include_top=False, weights='imagenet')
    base.trainable = False

    inputs = keras.Input(shape=input_shape)
    x = keras.applications.mobilenet_v2.preprocess_input(inputs)
    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)

    model = keras.Model(inputs, outputs)
    model.compile(
        optimizer=keras.optimizers.Adam(1e-4),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    return model


def main(args):
    train_dir = os.path.join(args.dataset_dir, 'train')
    val_dir = os.path.join(args.dataset_dir, 'val')

    if not os.path.isdir(train_dir):
        raise SystemExit(f"Train dir not found: {train_dir}")

    train_ds = tf.keras.preprocessing.image_dataset_from_directory(
        train_dir, labels='inferred', label_mode='int', image_size=(224,224), batch_size=args.batch_size)

    val_ds = None
    if os.path.isdir(val_dir):
        val_ds = tf.keras.preprocessing.image_dataset_from_directory(
            val_dir, labels='inferred', label_mode='int', image_size=(224,224), batch_size=args.batch_size)

    class_names = train_ds.class_names
    num_classes = len(class_names)
    print('Classes:', class_names)

    model = build_model(num_classes)

    # simple callbacks
    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(args.output_model, save_best_only=True),
        tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)
    ]

    model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, callbacks=callbacks)

    # Save label map
    label_map = {i: name for i, name in enumerate(class_names)}
    with open(args.output_label_map, 'w') as f:
        json.dump(label_map, f, indent=2)

    print('Training finished. Model saved to', args.output_model)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset-dir', required=True, help='Path to dataset root (with train/ and optional val/)')
    parser.add_argument('--epochs', type=int, default=20)
    parser.add_argument('--batch-size', type=int, default=32)
    parser.add_argument('--output-model', default='model/deepfashion_mobilenetv2.h5')
    parser.add_argument('--output-label-map', default='model/label_map.json')

    args = parser.parse_args()

    os.makedirs(os.path.dirname(args.output_model), exist_ok=True)
    main(args)
