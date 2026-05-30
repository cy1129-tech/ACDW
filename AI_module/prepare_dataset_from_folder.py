"""
Prepare dataset folders for training from a source folder organized by label.

Source layout:
  source_dir/<label>/*.jpg
  source_dir/<label>/*.png

Output layout:
  output_dir/train/<label>/*
  output_dir/val/<label>/*

Example:
  python prepare_dataset_from_folder.py --source-dir ../labeled_images --output-dir ../dataset --val-ratio 0.1
"""

import argparse
import os
import random
import shutil
from pathlib import Path


def ensure_dir(path):
    path.mkdir(parents=True, exist_ok=True)


def copy_split(source_dir, output_dir, val_ratio, seed):
    random.seed(seed)
    source_dir = Path(source_dir)
    output_dir = Path(output_dir)

    if not source_dir.exists():
        raise SystemExit(f"Source folder not found: {source_dir}")

    classes = [p for p in source_dir.iterdir() if p.is_dir()]
    if not classes:
        raise SystemExit(f"No label subfolders found under {source_dir}")

    counts = {'train': 0, 'val': 0}
    for class_dir in classes:
        label = class_dir.name
        files = [p for p in class_dir.iterdir() if p.is_file()]
        random.shuffle(files)
        for path in files:
            split = 'val' if random.random() < val_ratio else 'train'
            dest_dir = output_dir / split / label
            ensure_dir(dest_dir)
            shutil.copy2(path, dest_dir / path.name)
            counts[split] += 1

    return counts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', required=True, help='Source directory with label subfolders')
    parser.add_argument('--output-dir', default='../dataset', help='Output dataset root')
    parser.add_argument('--val-ratio', type=float, default=0.1, help='Validation split ratio')
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    counts = copy_split(args.source_dir, args.output_dir, args.val_ratio, args.seed)
    print('Done.')
    print(f"  train files: {counts['train']}")
    print(f"  val files:   {counts['val']}")


if __name__ == '__main__':
    main()
