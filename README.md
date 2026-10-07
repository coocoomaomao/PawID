# PawID 毛球身份卡

喵造实验室 008。一个以隐私优先为核心的宠物身份卡、品种外观相似度与 AI 证件照工具。

## v0.2

- 上传 1–3 张猫 / 狗照片
- **真实本地 AI**：浏览器内运行 ONNX 模型，照片不上传
- 综合多张照片输出 Top 3 品种外观相似度
- 37 个 Oxford-IIIT Pet 已知品种
- 猫 / 狗物种判断
- 低置信度 / 陌生分布提示
- 基于宠物分割 mask 的自动抠图
- 白 / 蓝 / 粉 / 薄荷绿四色 1024×1024 证件照
- 900×1200 毛球身份卡
- 被毛主色的简单像素估算
- PWA 基础支持

## 重要边界

PawID **不会**把照片结果表述成血统鉴定。

照片只能用于“外观相似度”判断，无法证明：
- 是否纯种
- 是否混血
- 父母品种
- DNA / 血统关系

界面中的“外观特征较集中 / 相似度较分散”只描述模型的概率分布，不等于纯种或混血结论。

## AI 模型

v0.2 使用 `rafiazarin/multitask-unet-oxford-pets` 的 EfficientNet-B0 U-Net ONNX 模型，在浏览器通过 ONNX Runtime Web 本地运行。

模型能力包括：
- 37 类宠物品种分类
- 宠物 / 背景分割
- 输入分布基础检查

模型作者报告的 held-out test：
- breed top-1 accuracy: 92.4%
- pet IoU: 0.924
- species accuracy: 99.6%

这些数字只代表该模型在其测试集上的表现，不代表真实用户照片一定达到同等准确率。

### Attribution / License

Model / demo code source:
- https://github.com/rafiazarin/multitask-unet-oxford-pets
- code license: MIT

Training dataset:
- Oxford-IIIT Pet
- CC BY-SA 4.0; original image copyright remains with image owners

The model card states that no separate license is declared for the model weights. PawID loads the hosted ONNX weights from the model repository at runtime and documents the upstream source here.

## 隐私

宠物照片直接在浏览器里处理。PawID v0.2 不把上传照片发送到 PawID 服务端。

首次使用会从 Hugging Face 下载约 30MB 的 ONNX 模型，并从 jsDelivr 加载 ONNX Runtime Web。

## 下一步

- v0.3：更细致的毛色 / 眼睛 / 耳型 / 脸型视觉特征模型
- 身份卡主题模板
- AI 背景与宠物护照风
- 成长时间线


## GitHub Pages 首次开启

由于仓库的 GitHub App 权限不能创建 Pages site，第一次需要仓库所有者手动开启：

1. 打开 Repository **Settings**
2. 进入 **Pages**
3. 在 **Build and deployment** 中将 Source 选择为 **GitHub Actions**
4. 回到 **Actions → Deploy Pages → Run workflow**

首次开启完成后，可再把 Pages workflow 恢复为 main 分支自动发布。
