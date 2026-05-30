"""
Prepare dataset folders for training from a CSV of image paths and labels.

CSV format (accepted):
  image,label[,split]

If `split` column present it should be `train` or `val`. Otherwise `--val-ratio` is used to split randomly.

Example usage:
  python prepare_dataset_from_csv.py \
    --images-dir /path/to/images \
    --annotations annotations.csv \
    --output-dir ./dataset \
    --val-ratio 0.1

This will create `output_dir/train/<label>/...` and `output_dir/val/<label>/...`.
"""

import argparse
import csv
import os
import random
import shutil
from pathlib import Path


def ensure_dir(p):
    os.makedirs(p, exist_ok=True)


def main(args):
    images_dir = Path(args.images_dir)
    ann_file = Path(args.annotations)
    out_dir = Path(args.output_dir)

    if not images_dir.exists():
        raise SystemExit(f"Images dir not found: {images_dir}")
    if not ann_file.exists():
        raise SystemExit(f"Annotations file not found: {ann_file}")

    rows = []
    with ann_file.open('r', newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = None
        # Peek first row to detect header
        first = next(reader, None)
        if first is None:
            raise SystemExit('Empty annotations file')

        if any(h.lower() in ('image','img','filename','file') for h in first) and any(h.lower() in ('label','class') for h in first):
            headers = [h.lower() for h in first]
        else:
            # treat first as data row
            rows.append(first)

        for r in reader:
            rows.append(r)

    # Normalize rows to tuples (image_path, label, split)
    normalized = []
    for r in rows:
        if headers:
            row = {k: r[i] if i < len(r) else '' for i, k in enumerate(headers)}
            img = row.get('image') or row.get('img') or row.get('filename') or row.get('file')
            label = row.get('label') or row.get('class')
            split = row.get('split')
        else:
            # expect at least image,label
            if len(r) < 2:
                continue
            img, label = r[0], r[1]
            split = r[2] if len(r) > 2 else None

        if not img or not label:
            continue

        normalized.append((img.strip(), label.strip(), (split.strip().lower() if split else None)))

    random.seed(args.seed)

    counts = {'train': 0, 'val': 0, 'skipped': 0}

    for img_rel, label, split in normalized:
        src = images_dir / img_rel
        if not src.exists():
            counts['skipped'] += 1
            continue

        if split not in ('train', 'val'):
            # decide by ratio
            split = 'val' if random.random() < args.val_ratio else 'train'

        dest_dir = out_dir / split / label
        ensure_dir(dest_dir)
        dest = dest_dir / src.name
        shutil.copy2(src, dest)
        counts[split] += 1

    print('Done. Summary:')
    print(f"  train: {counts['train']}")
    print(f"  val:   {counts['val']}")
    print(f"  skipped (missing files): {counts['skipped']}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--images-dir', required=True, help='Root directory containing source images')
    parser.add_argument('--annotations', required=True, help='CSV file listing image path and label')
    parser.add_argument('--output-dir', default='dataset', help='Output dataset root (train/ and val/ created)')
    parser.add_argument('--val-ratio', type=float, default=0.1, help='Fraction of data to use for validation when split not provided')
    parser.add_argument('--seed', type=int, default=42)

    args = parser.parse_args()
    main(args)
