# PawID v0.2 AI Architecture

PawID v0.2 不再依赖服务端 `/api/analyze`。

## Current architecture

```
User photo
   ↓
Browser
   ↓
ONNX Runtime Web
   ↓
EfficientNet-B0 U-Net
   ├─ 37-breed classification
   └─ pet/background segmentation
   ↓
PawID result + passport photo
```

照片不上传 PawID 服务端。

## Model source

`rafiazarin/multitask-unet-oxford-pets`

Runtime ONNX asset:
`pets_unet.onnx`

## Result semantics

PawID uses these terms:
- 品种**外观相似度**
- 外观特征较集中
- 外观相似度较分散
- 低置信度 / 陌生分布提示

PawID does **not** claim:
- purebred status
- mixed-breed proof
- parent breeds
- DNA ancestry

## Future server API

A server API may be added later for optional richer visual traits, but it must remain opt-in and must never expose provider keys in frontend code.
