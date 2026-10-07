# PawID 毛球身份卡

喵造实验室 008。一个以隐私优先为核心的宠物身份档案、品种外观相似度、视觉报告、毛球护照与证件照工具。

## v0.4

v0.4 在 v0.3 的真实本地 AI 身份档案上新增两块更适合分享和长期使用的功能：

### 毛球护照

- 900×1200 3:4 毛球护照
- 自动写入：
  - PawID 编号
  - 名字
  - 猫 / 狗
  - 年龄 / 体重
  - Top 1 品种外观相似度
  - 被毛主色
  - 主人补充的毛长 / 眼睛 / 耳型 / 脸型
  - 性格称号
- 使用 AI 抠图后的宠物照片
- 明确标注为 **非官方纪念分享卡**
- 不能替代旅行、航空、检疫、疫苗或血统证件

### 主人观察性格问卷

v0.4 不做“AI 看脸猜性格”。

用户根据日常观察完成 10 个 1–5 分问题，再计算五个维度：

- 亲人度
- 活力
- 好奇心
- 吃货指数
- 胆量

根据五维结果生成：
- 五维雷达图
- 五维分数
- 趣味性格称号
- 900×1200 毛球性格卡

目前包含的称号逻辑包括：
- 罐头鉴赏家
- 夜间跑酷选手
- 黏人小尾巴
- 社牛小队长
- 好奇探险家
- 高冷观察家
- 谨慎小侦探
- 温柔陪伴家
- 五边形小明星

这些结果来自 **主人观察问卷**，不是医学、兽医行为学诊断，也不是 AI 从照片推断性格。

## 继承自 v0.3

- 上传 1–3 张猫 / 狗照片
- 浏览器本地运行 ONNX 模型
- 照片不上传 PawID 服务器
- 37 个 Oxford-IIIT Pet 已知品种的 Top 3 外观相似度
- 多图综合分析
- 多图一致性分数
- 被毛视觉色板
- 被毛纹理复杂度
- 每张照片独立结果与低置信度状态
- 主人补充特征
- 900×1200 毛球身份鉴定报告
- 900×1200 毛球身份卡
- 宠物 / 背景分割
- 白 / 蓝 / 粉 / 薄荷绿四色 1024×1024 证件照
- PWA
- GitHub Pages 自动部署

## 重要边界

PawID **不会**把照片结果表述成血统鉴定。

照片只能用于外观相似度和视觉统计，无法证明：
- 是否纯种
- 是否混血
- 父母品种
- DNA / 血统关系

PawID 中：
- “外观特征较集中 / 相似度较分散”描述的是模型概率分布
- “多图一致性”描述的是同一只宠物不同照片的模型结果稳定程度
- “被毛色板 / 纹理复杂度”来自图像像素统计
- “主人补充特征”由用户自己确认
- “性格画像”来自主人观察问卷

以上都不等于 DNA、血统、医疗或行为学结论。

## AI 模型

PawID v0.4 延续使用 `rafiazarin/multitask-unet-oxford-pets` 的 EfficientNet-B0 U-Net ONNX 模型，在浏览器通过 ONNX Runtime Web 本地运行。

模型能力：
- 37 类宠物品种分类
- 宠物 / 背景分割
- 输入分布基础检查

上游作者报告的 held-out test：
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

The upstream model card states that no separate license is declared for the model weights. PawID loads the hosted ONNX weights from the upstream repository at runtime and documents the source here.

## 隐私

宠物照片直接在浏览器本地处理。

性格问卷分数使用浏览器 localStorage 保存，以便刷新后保留设置。PawID 不会把这些分数发送到 PawID 服务器。

## 下一步候选

- v0.5：本地宠物档案库 / 多宠物切换
- 护照主题模板
- 成长时间线
- 可选纪念日与生日卡
- 商用前替换或自训许可更明确的品种模型
