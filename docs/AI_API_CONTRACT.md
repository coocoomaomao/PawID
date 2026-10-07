# PawID AI Analysis API Contract

PawID 前端不会保存模型密钥。真实视觉识别通过服务端 `POST /api/analyze` 完成。

## Request

`multipart/form-data`

- `photos`: 1–3 张 JPG / PNG / WebP
- `species`: 猫 / 狗
- `name`: 可选

## Response

```json
{
  "breeds": [
    {"name": "英国短毛猫", "similarity": 0.62},
    {"name": "美国短毛猫", "similarity": 0.21},
    {"name": "Domestic Shorthair", "similarity": 0.17}
  ],
  "traits": {
    "coatColor": "黑色",
    "coatLength": "短毛",
    "eyeColor": "金黄色",
    "earShape": "直立耳",
    "faceShape": "圆脸偏楔形",
    "bodyType": "中等"
  },
  "mixAssessment": "存在多品种外观特征",
  "confidence": "medium",
  "disclaimer": "仅基于照片进行外观相似度分析，不代表纯种、混血或血统证明。"
}
```

## Product boundary

照片不能证明血统。PawID 只输出“外观相似度”和“混合外观特征提示”，不能把结果表述为 DNA / 血统鉴定。
