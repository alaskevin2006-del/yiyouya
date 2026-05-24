# API 接入配置指南

## 你需要接通的外部 API

Skill 模板中的 `{{}}` 占位符需要运行时注入真实数据。以下是每个变量的数据来源和免费的 API 方案：

### 1. {{location}} — 目的地地理信息 → "广东省珠海市"

| 方案 | API | 免费额度 |
|------|-----|---------|
| **推荐** | 高德地图地理编码 API | 每日 5000 次 |
| 备用 | 百度地图地点搜索 API | 每日 5000 次 |
| 国际 | Google Maps Geocoding | 每月 $200 额度 |

### 2. {{api_weather_data}} — 实时天气 → "晴，15°C，湿度60%，微风"

| 方案 | API | 免费额度 |
|------|-----|---------|
| **推荐** | 和风天气 (QWeather) | 每日 1000 次 |
| 备用 | Open-Meteo (全球) | 无限免费，无需 Key |
| 国外 | OpenWeatherMap | 每分钟 60 次免费 |

### 3. {{travel_case_data}} — 游记/RAG 数据 → "中山大学南校区有怀士堂、乙丑进士牌坊..."

| 方案 | API | 说明 |
|------|-----|------|
| **推荐** | ArkClaw 内置 RAG / 火山方舟知识库 | 上传目的地文档后自动检索 |
| 备用 | 搜索 API（如 Bing Search / Google Custom Search） | 实时搜索游记攻略 |
| 最低配 | 硬编码常用目的地的简要介绍 | 不需要 API，但内容有限 |

### 4. {{intimacy_level}} — 亲密度 → 65

| 来源 | 说明 |
|------|------|
| **Supabase / 本地数据库** | 根据用户与宠物的历史交互次数计算 |
| 简单规则 | 每聊一轮 +1，每生成一篇日记 +3 |

### 5. {{user_preferences}} — 用户偏好 → ["爱吃辣", "喜欢山"]

| 来源 | 说明 |
|------|------|
| 从日常聊天的 `extracted_preferences` 字段持续积累 |
| 存入 Supabase 用户画像表 |

### 6. {{current_time}} — 当前系统时间

| 来源 | 说明 |
|------|------|
| **本地生成** | 由 `fetch_api.py` 脚本在运行时通过 Python `datetime` 模块生成 |
| 格式示例 | `2026年5月23日，周六，下午三点十五分` |
| 无需 API Key | 纯本地计算，不依赖任何外部服务 |

### 7. {{pet_ref_url_placeholder}} — 宠物参考图

| 来源 | 说明 |
|------|------|
| 用户上传 | 让用户上传一张宠物的照片作为生图参考 |
| 预设图库 | 在 Supabase Storage 预存三只宠物的默认参考图 |

---

## 工作流：从 API 到 Skill 调用

```
[外部 API]                     [你的脚本]                  [Skill 模板]
    │                              │                           │
和风天气 → 返回 JSON    →   fetch_api.py   →   {{api_weather_data}}
高德地图 → 返回 JSON    →   解析并格式化 →   {{location}}
RAG 搜索 → 返回文本     →   拼接为摘要   →   {{travel_case_data}}
Supabase → 返回数值     →   传原值       →   {{intimacy_level}}
用户画像 → 返回标签     →   传原值       →   {{user_preferences}}
本地时间 → datetime.now() →   格式化为中文 →   {{current_time}}
                             │
                             └──→ 拼装成完整 Prompt 发给大模型
```

## 如何在扣子中实现 API 注入

扣子 Bot 不直接支持变量注入，但你可以在 **Workflow** 中实现：

1. 扣子 Workflow → 添加"HTTP 请求"节点 → 调天气/地图 API
2. 扣子 Workflow → 用"代码节点"处理 JSON 返回
3. 把处理好的数据拼成最终 Prompt → 调用 LLM 节点生成日记
4. (如果绑定了 ArkClaw Skill) → 把气象/位置数据作为参数传给 Skill
