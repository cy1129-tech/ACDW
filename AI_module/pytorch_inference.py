"""
Simple inference helper using the fine-tuned PyTorch ResNet50 model.
"""
import json
from pathlib import Path
import torch
from torchvision import transforms, models
from PIL import Image


MODEL_PATH = Path('AI_module/model/deepfashion_resnet50.pt')
LABEL_MAP_PATH = Path('AI_module/model/label_map_resnet.json')


def load_model(device=None):
    device = device or (torch.device('cuda') if torch.cuda.is_available() else torch.device('cpu'))
    if not MODEL_PATH.exists() or not LABEL_MAP_PATH.exists():
        raise FileNotFoundError('Model or label map not found. Train model first.')

    with open(LABEL_MAP_PATH, 'r') as f:
        label_map = json.load(f)

    num_classes = len(label_map)
    model = models.resnet50(pretrained=False)
    model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    model.to(device)
    model.eval()
    return model, label_map, device


def predict(image_path, topk=1):
    model, label_map, device = load_model()
    tf = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],[0.229,0.224,0.225])
    ])

    img = Image.open(image_path).convert('RGB')
    x = tf(img).unsqueeze(0).to(device)

    with torch.no_grad():
        out = model(x)
        probs = torch.nn.functional.softmax(out, dim=1)[0]
        top_probs, top_idxs = probs.topk(topk)

    results = []
    for p, idx in zip(top_probs.cpu().numpy(), top_idxs.cpu().numpy()):
        label = label_map.get(str(int(idx))) or label_map.get(int(idx))
        results.append({'label': label, 'probability': float(p)})

    return results


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print('Usage: python pytorch_inference.py /path/to/image.jpg')
        raise SystemExit(1)
    print(predict(sys.argv[1], topk=3))
