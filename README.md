# PawID 毛球身份卡

喵造实验室 008。一个以隐私优先为核心的宠物身份卡、品种外观相似度、视觉档案与 AI 证件照工具。

## v0.3

在 v0.2 的真实本地 AI 基础上，新增一整套“毛球身份鉴定报告”：

- 上传 1–3 张猫 / 狗照片
- 浏览器本地运行 ONNX 模型，照片不上传 PawID 服务器
- 37 个 Oxford-IIIT Pet 已知品种的 Top 3 外观相似度
- 多图综合分析
- **多图一致性分数**：比较不同照片的模型概率分布是否稳定
- **被毛视觉色板**：只从宠物分割区域提取主色，不把背景颜色算进去
- **被毛纹理复杂度**：基于宠物区域的局部亮度边缘统计
- 每张上传照片单独显示最相似品种、宠物区域比例与低置信度状态
- **主人补充特征**：毛长、眼睛、耳型、脸型，明确标注不是 AI 推断
- **900×1200 3:4 毛球身份鉴定报告**
- 900×1200 毛球身份卡
- 宠物 / 背景分割
- 白 / 蓝 / 粉 / 薄荷绿四色 1024×1024 证件照
- PWA 基础支持
- GitHub Pages 自动部署（仓库 Pages 首次开启后）

## 重要边界

PawID **不会**把照片结果表述成血统鉴定。

照片只能用于“外观相似度”和视觉统计，无法证明：
- 是否纯种
- 是否混血
- 父母品种
- DNA / 血统关系

PawID 中：
- “外观特征较集中 / 相似度较分散”描述的是模型概率分布
- “多图一致性”描述的是同一只宠物不同照片的模型结果稳定程度
- “被毛色板 / 纹理复杂度”来自图像像素统计
- “主人补充特征”由用户自己确认

这些都不等于 DNA 或血统结论。

## AI 模型

v0.3 延续使用 `rafiazarin/multitask-unet-oxford-pets` 的 EfficientNet-B0 U-Net ONNX 模型，在浏览器通过 ONNX Runtime Web 本地运行。

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

The upstream model card states that no separate license is declared for the model weights. PawID loads the hosted ONNX weights from the upstream model repository at runtime and documents the source here.

## 隐私

宠物照片直接在浏览器里处理。PawID 不把上传照片发送到 PawID 服务器。

首次使用会从 Hugging Face 下载 ONNX 模型，并从 jsDelivr 加载 ONNX Runtime Web。浏览器通常会缓存这些资源。

## 下一步候选

- v0.4：专门的眼睛颜色 / 耳型 / 脸型视觉模型
- 更多身份报告模板
- 宠物护照风格
- 成长时间线
- 可选本地历史档案
