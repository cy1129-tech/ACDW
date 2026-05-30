"""
Fine-tune ResNet50 on a DeepFashion-style dataset using PyTorch.

Expect dataset layout produced by `prepare_dataset_from_csv.py`:
  dataset/train/<label>/*.jpg
  dataset/val/<label>/*.jpg

Saves model to `AI_module/model/deepfashion_resnet50.pt` and label map.
"""
import argparse
import json
import os
from pathlib import Path
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models


def train(args):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    data_dir = Path(args.dataset_dir)
    train_dir = data_dir / 'train'
    val_dir = data_dir / 'val'

    if not train_dir.exists():
        raise SystemExit(f"Train dir not found: {train_dir}")

    # Data transforms
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    val_tf = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    train_ds = datasets.ImageFolder(train_dir, transform=train_tf)
    val_ds = datasets.ImageFolder(val_dir, transform=val_tf) if val_dir.exists() else None

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=4) if val_ds else None

    num_classes = len(train_ds.classes)
    print('Classes:', train_ds.classes)

    # Model
    model = models.resnet50(pretrained=True)
    for param in model.parameters():
        param.requires_grad = False

    # Replace final layer
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.fc.parameters(), lr=args.lr)

    best_acc = 0.0
    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = 0.0
        running_corrects = 0
        total = 0

        for images, labels in train_loader:
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            preds = outputs.argmax(dim=1)
            running_corrects += (preds == labels).sum().item()
            total += images.size(0)

        epoch_loss = running_loss / total
        epoch_acc = running_corrects / total
        print(f"Epoch {epoch}/{args.epochs} - loss: {epoch_loss:.4f} acc: {epoch_acc:.4f}")

        # Validate
        if val_loader:
            model.eval()
            val_corrects = 0
            val_total = 0
            with torch.no_grad():
                for images, labels in val_loader:
                    images = images.to(device)
                    labels = labels.to(device)
                    outputs = model(images)
                    preds = outputs.argmax(dim=1)
                    val_corrects += (preds == labels).sum().item()
                    val_total += images.size(0)
            val_acc = val_corrects / val_total if val_total > 0 else 0
            print(f"  Validation acc: {val_acc:.4f}")
            if val_acc > best_acc:
                best_acc = val_acc
                # save best
                out_path = Path(args.output_model)
                out_path.parent.mkdir(parents=True, exist_ok=True)
                torch.save(model.state_dict(), out_path)
                print('Saved best model to', out_path)

    # Save label map
    label_map = {i: name for i, name in enumerate(train_ds.classes)}
    with open(args.output_label_map, 'w') as f:
        json.dump(label_map, f, indent=2)

    print('Training complete. Best val acc:', best_acc)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset-dir', required=True)
    parser.add_argument('--epochs', type=int, default=10)
    parser.add_argument('--batch-size', type=int, default=32)
    parser.add_argument('--lr', type=float, default=1e-4)
    parser.add_argument('--output-model', default='model/deepfashion_resnet50.pt')
    parser.add_argument('--output-label-map', default='model/label_map_resnet.json')

    args = parser.parse_args()
    train(args)
