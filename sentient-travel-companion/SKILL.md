---
name: sentient-travel-companion
description: >
  多角色旅行手账生成与日常陪伴系统。支持四只虚拟宠物实体（精致优雅猫、憨厚吃货熊猫、毛绒蓝龙、慈祥教授鸭）
  根据目的地生成风格各异的文学游记，输出图文一致的生图指令，并在大本营中提供日常对话陪伴。
  当用户想要生成旅行游记、回忆旅行体验、与宠物角色聊天、或需要将旅行数据转为文学化表达时使用。
user-invocable: true
version: 1.0.0
tags:
  - travel
  - journal
  - companion
  - image-generation
  - multi-persona
api_dependencies:
  - weather
  - geolocation
  - travel-search
---

# 有灵旅行伴侣 (Sentient Travel Companion)

## 系统概述

本 Skill 是一个四宠物 × 三模式 × 旅行摄影生图输出的陪伴系统：

| 模式 | 触发条件 | 加载模板 |
|------|---------|---------|
| 渐进式旅行 | 用户说"带[宠物]去[目的地]旅游" | references/travel-mode.md |
| 旅行手账 | 用户指定目的地 + 宠物角色（一次性回顾） | references/journal-templates/ |
| 日常聊天 | 用户在大本营对话 | references/daily-chat.md |
| 旅行摄影生图 | 渐进模式每站自动生成 / 手账完成后独立后处理 | references/image-generation.md |

**核心区别：**
- **渐进式旅行**：一站一站互动游，每到一个新景点写 120-180 字游记片段，用户可随时追问或让其继续。适合实时旅行体验。
- **旅行手账**：一次性生成完整的 350-400 字长篇手账。适合旅行回顾和朋友圈分享。
- 两者都走两阶段流程（文字 → 生图），但渐进模式是每站生一张图，手账模式是全篇后生 2-3 张图。

## 角色说明

- **猫 (cat)**：称呼"老板"，精致优雅，矜持清冷，文学白描，美学优先
- **熊猫 (panda)**：称呼"主人"，憨厚老实，资深老饕，美食微距描写
- **蓝龙 (dragon)**：称呼"饲养员"，随性冒险，社牛逞强，人文奇遇记录
- **鸭子 (duck)**：称呼"逸仙学子"，60岁慈祥老教授，通俗讲故事，末尾一句话反焦虑治愈

## 工作流程

### 模式一：渐进式旅行（主模式 · 一站一站玩）

```
用户说："用[宠物]去[目的地]旅游"
         │
         ▼
读取 references/travel-mode.md
         │
         ▼
后端初始化：获取目的地景点列表 → 设 travel_state = "arriving"
         │
         ▼
第 1 站：大模型生成 journal_snippet (120-180字) + image_prompt_en
         │                           │
         │                           ▼
         │                   后端调 gpt-image-2（prompt + 参考图）→ 出图
         │
         ▼ （展示给用户：游记片段 + 照片）
用户操作：
  ├─ 追问（如"这里有什么典故？"）
  │     → travel_state = "exploring" → 大模型以角色身份回答
  │
  ├─ "继续" / "下一站"
  │     → travel_state = "arriving" + current_location = 下一景点
  │     → 重复第 N 站流程
  │
  └─ "结束" / "回家"
        → travel_state = "ending" → 大模型输出旅行总结+告别
```

### 模式二：旅行手账生成（一次性回顾）

```
用户输入：{{destination}} + {{pet_type}}
         │
         ▼
读取 references/journal-templates/{pet_type}-journal.md
         │
         ▼
注入 API 变量：{{location}}, {{api_weather_data}}, {{travel_case_data}}, {{intimacy_level}}, {{current_time}}
         │
         ▼
大模型按模板约束生成 journal_content + extracted_tags
         │
         ▼ （阶段一结束，输出 journal_content 作为阶段二的输入）
```

### 生图（阶段二 · 独立后处理）

```
输入：阶段一产出的 journal_content + {{pet_type}}
         │
         ▼
读取 references/image-generation.md（旅行摄影专家角色）
         │
         ▼
大模型将日记中每个视觉段落提取为独立场景（通常 2-3 个）
         │
         ▼
输出照片集（prompt 中宠物以 "the character matching the provided reference image" 固定指代，长相由 assets/pet-refs/ 的三视图保证）：
  {
    "scenes": [
      { scene_summary_zh: "...", final_image_prompt_en: "..." },
      { scene_summary_zh: "...", final_image_prompt_en: "..." },
      ...
    ]
  }

### 出图（阶段三 · 参考图注入）
```
阶段二产出的 scenes 数组 + assets/pet-refs/{pet_type}.png（参考图）
         │
         ▼
gpt-image-2 API（image input + text prompt）
         │
         ▼
输出：角色外貌一致的旅行写真照片 ✅
```

### 模式三：日常聊天

```
用户在大本营说话
         │
         ▼
读取 references/daily-chat.md
         │
         ▼
注入 {{pet_type}}, {{intimacy_level}}, {{past_travel_memories}}, {{user_input}}
         │
         ▼
大模型输出 reply_text + user_sentiment + extracted_preferences + intimacy_bonus
```

## API 变量接入说明

本 Skill 内嵌的 `{{}}` 占位符需要由外部脚本或流程注入实时数据。详见 `assets/api-config.md` 和 `scripts/` 目录。

## 文件清单

```
sentient-travel-companion/
├── SKILL.md                                    # 本文件
├── references/
│   ├── journal-templates/
│   │   ├── cat-journal.md                      # 猫咪手账模板
│   │   ├── panda-journal.md                    # 熊猫手账模板
│   │   ├── dragon-journal.md                   # 蓝龙手账模板
│   │   └── duck-journal.md                     # 教授鸭手账模板
│   ├── travel-mode.md                           # 渐进式旅行模板（一站一站互动游）
│   ├── image-generation.md                     # 旅行摄影生图模板（参考图注入，角色一致性）
│   └── daily-chat.md                           # 日常聊天设定
├── scripts/
│   └── fetch_api.py                            # API 数据获取脚本（天气/位置/RAG）
└── assets/
    ├── pet-refs/                                # 四只宠物的三视图参考图（gpt-image-2 参考图注入）
    │   ├── dragon.png
    │   ├── cat.png
    │   ├── panda.png
    │   └── duck.png
    ├── api-config.md                           # API 接入配置指南
    └── usage-guide.md                          # 使用教程
```
