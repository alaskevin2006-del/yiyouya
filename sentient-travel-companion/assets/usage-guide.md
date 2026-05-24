# 有灵旅行伴侣 · 使用教程

## 一、这是什么东西

一个四只虚拟宠物陪你旅行的 AI 系统。有两种玩法：

**玩法 A（渐进式旅行）**：一站一站互动游，每站写游记 + 出图。像真的在跟宠物一起旅行。
```
你说："用熊猫去珠海"
     ↓
熊猫："主人！我到珠海渔女像了！海风里有蚝烙的香味……" [出图]
     ↓
你："珠海渔女有什么故事吗？" ← 追问
     ↓
熊猫："传说啊…"
     ↓
你："继续下一站吧" ← 继续
     ↓
熊猫："现在到了日月贝……" [出图]
     ↓
你："结束旅行" ← 结束
     ↓
熊猫："今天去了 3 个地方，最想带给主人的还是那份生蚝……"
```

**玩法 B（一次性手账）**：到达目的地后一次性生成 350-400 字完整游记 + 2-3 张照片。适合朋友圈分享。
```
你说："用熊猫写一篇珠海游记"
     ↓
阶段一：熊猫写完整日记（文字）
     ↓
阶段二：根据日记生成 2-3 张照片
```

---

## 二、四只宠物速查

| 宠物 | 称呼你 | 性格 | 游记风格 |
|------|--------|------|---------|
| 熊猫 | 主人 | 憨厚吃货，老实巴交 | 美食微距描写，总想给你打包带饭 |
| 猫 | 老板 | 清冷矜持，审美挑剔 | 文艺白描，精准打卡，深情的沉默 |
| 蓝龙 | 饲养员 | 社牛冒险，容易逞强 | 意外发现，人情味浓，静下来会想你 |
| 鸭子 | 逸仙学子 | 60岁慈祥教授，风趣幽默 | 通俗讲故事，末尾一句话反焦虑治愈 |

---

## 三、怎么用

### 玩法 A：渐进式旅行（主推 · 互动游）

**输入：**
```
"用[宠物]去[目的地]"
例如："用猫去庐山" / "用蓝龙去江西" / "用教授鸭去广州"
```

**调用方式（后端多轮对话）：**
1. 加载 `references/travel-mode.md` 为 system prompt
2. 注入 `{{destination}}`、`{{current_location}}`（首站）、`travel_state = "arriving"`
3. 大模型返回该站的游记片段 + 生图 prompt
4. 后端调 gpt-image-2 出图（带参考图）
5. 用户交互后，后端更新 `{{travel_state}}` 进入下一轮

**输出（首站 arriving）：**
```json
{
  "travel_state": "arrived",
  "current_location": "庐山含鄱口",
  "reply_text": "老板，含鄱口到了，现在是清晨五点四十分……",
  "journal_snippet": "五点整从牯岭镇出发，沿着松涛阵阵的山路走上来……（120-180字）",
  "extracted_tags": ["含鄱口日出", "云海"],
  "image_prompt_en": "A travel photograph at Hanpokou in Lushan at dawn. The character matching the provided reference image...",
  "ask_continue": true
}
```

**用户操作：**
- 追问 → 后端设 `travel_state = "exploring"`，LLM 用角色身份回答
- 说"继续"/"下一站" → 后端切换 `current_location`，设 `travel_state = "arriving"`
- 说"结束" → 后端设 `travel_state = "ending"`，LLM 输出总结告别

**关键：每站出一张图（prompt + 参考图），角色外貌始终一致。**

---

### 玩法 B：一次性手账（回顾用 · 完整篇）

**输入：**
```
目的地 + 宠物类型
例如："珠海, panda" / "庐山, cat" / "江西, dragon"
```

**调用方式：**
1. **ArkClaw / 大模型直接调：**
   - 先把 `references/journal-templates/{pet_type}-journal.md` 的内容加载为 system prompt
   - 把 `{{location}}`、`{{api_weather_data}}`、`{{current_time}}` 等变量替换成真实数据（`{{current_time}}` 由本地脚本生成，无需外部 API）
   - 让大模型按模板生成

2. **用脚本注入变量（推荐）：**
   ```bash
   python scripts/fetch_api.py -l "珠海" -p "panda" -i 55
   ```
   得到变量 JSON 后，手动拼到模板里再调用大模型。

**输出：**
```json
{
  "greeting_bubble": "主人！珠海的风都是海鲜味的！",
  "journal_content": "原计划沿着情侣路...（350-500字）",
  "extracted_tags": ["透光虾饺", "粉紫日落", ...]
}
```

#### 阶段二：生成旅行照片（参考图注入）

**核心机制：** 宠物角色一致性由三视图参考图保证。提示词不再描述宠物长相，只描述"它在哪、做什么、环境如何"。后端调 gpt-image-2 API 时会把参考图作为 image input 一并传入。

**输入：** 阶段一的 `journal_content` + `pet_type`

**调用方式：**
- 加载 `references/image-generation.md` 为 system prompt
- 把 `{{journal_content}}` 和 `{{pet_type}}` 注入
- 大模型返回照片集（提示词中不含宠物外貌，固定引用 `the character matching the provided reference image`）

**输出：**
```json
{
  "scenes": [
    {
      "scene_summary_zh": "清晨含鄱口，小龙站在观景台石栏边等待日出",
      "final_image_prompt_en": "A travel photograph at Hanpokou Scenic Platform in Lushan at dawn. The character matching the provided reference image stands by a stone railing, gazing up at the horizon where golden light breaks through layered clouds..."
    },
    {
      "scene_summary_zh": "正午三叠泉，小龙在水雾彩虹前张开翅膀",
      "final_image_prompt_en": "A travel photograph at Sandie Spring in Lushan at midday. The character matching the provided reference image spreads its wings in front of the waterfall cascade, rainbow forming in the mist spray..."
    }
  ]
}
```

**出图（后端行为）：**
```
将 final_image_prompt_en + assets/pet-refs/{pet_type}.png（参考图）
一起传给 gpt-image-2 API → 每次出图角色外貌保持一致 ✅
   ↑
   后端自动做，前端不感知
```

---

## 四、如何接入天气和地理数据

#### 方案 A：本地脚本（开发/测试用）

```bash
# 先装依赖
pip install requests

# 查珠海的天气+位置+游记数据
python scripts/fetch_api.py -l "珠海" -p "cat"
```

输出示例：
```
[地理] 珠海市 (22.27, 113.58)
[天气] 多云，气温25°C，风速12km/h，湿度65% (来源: Open-Meteo)
[游记] 珠海情侣路、珠海渔女像、日月贝歌剧院、长隆海洋王国...
```

#### 方案 B：Coze Workflow（上线用）

在扣子 Bot 的后台建一个 Workflow：

```
[开始] → [HTTP请求: 和风天气API]
       → [HTTP请求: 高德地理编码API]
       → [代码节点: 拼装变量JSON]
       → [LLM节点: 加载Skill模板 + 注入变量 → 生成日记]
       → [LLM节点: 加载生图模板 + 注入日记 → 生成照片]
       → [结束: 返回文字 + 图片]
```

#### 方案 C：免 API Key 模式（最快上手）

`fetch_api.py` 已内置：
- **Open-Meteo** —— 永久免费天气 API，无需注册
- **本地游记缓存** —— 珠海/北京/上海/广州/庐山/江西/冰岛/日本，无需联网搜索

直接跑脚本就能出数据，零配置。

---

## 五、日常聊天模式

这是大本营模式，宠物不写游记，而是跟你闲聊。

**调用方式：**
- 加载 `references/daily-chat.md` 为 system prompt
- 注入 `{{pet_type}}`、`{{intimacy_level}}`、`{{past_travel_memories}}`、`{{user_input}}`

**输出：**
```json
{
  "reply_text": "含鄱口的日出倒是不错，凌晨爬山的冷现在还记得。",
  "user_sentiment": "neutral",
  "extracted_preferences": ["喜欢山岳", "对细节好奇"],
  "intimacy_bonus": 1
}
```

---

## 六、完整游玩示例

### 渐进式旅行（玩法 A）：熊猫游珠海

```
用户："用熊猫去珠海"
   ↓
[后端：travel_state=arriving, current_location=珠海渔女像]
熊猫："主人！到珠海了，第一站就是渔女像。海风咸咸的，对岸的日月贝在雾里若隐若现……"
      [出图：熊猫在渔女像前，对应 image_prompt_en]
   ↓
用户："渔女像有什么典故？"
   ↓
[后端：travel_state=exploring]
熊猫："传说啊，渔女是南海龙王女儿，为了爱情化成了石头……"
   ↓
用户："继续下一站"
   ↓
[后端：travel_state=arriving, current_location=日月贝]
熊猫："日月贝到了！这两个贝壳形状的建筑比照片上震撼多了……"
      [出图：熊猫在日月贝前]
   ↓
用户："这里晚上吃什么？"
   ↓
[后端：travel_state=exploring]
熊猫："横琴生蚝！！我查过了，附近就有一家老店，蒜蓉烤生蚝……（咽口水）"
   ↓
用户："继续"
   ↓
[后端：travel_state=arriving, current_location=长隆海洋王国]
熊猫："长隆的鲸鲨馆太震撼了！巨大的玻璃幕墙后面……"
      [出图：熊猫在鲸鲨馆]
   ↓
用户："结束旅行吧"
   ↓
[后端：travel_state=ending]
熊猫："今天一共去了 3 个地方：渔女像、日月贝、长隆。最美的还是渔女像下的晚霞。主人在的话，我一定把蒜蓉生蚝打包给你……"
```

### 一次性手账（玩法 B）：熊猫游珠海

```
第一步：跑脚本拿数据
  $ python scripts/fetch_api.py -l "珠海" -p "panda" -i 55

第二步：生成日记
  1) 加载 references/journal-templates/panda-journal.md 作为 system prompt
  2) 把脚本输出的变量替换模板中的 {{location}} {{api_weather_data}} 等
  3) 大模型返回 journal_content

第三步：生成照片 prompt
  1) 加载 references/image-generation.md 作为 system prompt
  2) 把 journal_content 和 pet_type="panda" 注入
  3) 大模型返回 scenes 数组（提示词用 the character matching the provided reference image 固定指代）

第四步：出图（后端自动）
  后端把 final_image_prompt_en + assets/pet-refs/panda.png（参考图）
  一起传给 gpt-image-2 API → 出图 ✅
  不同日记、不同场景，熊猫都是同一只
```

---

## 七、文件速查

```
sentient-travel-companion/
│
├── SKILL.md                           ← Skill 总入口（给平台/Agent 读的）
│
├── references/                        ← 运行时加载的提示词模板
│   ├── travel-mode.md                 ← 渐进式旅行模板（一站一站互动游）
│   ├── journal-templates/
│   │   ├── panda-journal.md           ← 熊猫手账模板（一次性回顾）
│   │   ├── cat-journal.md             ← 猫咪手账模板（一次性回顾）
│   │   ├── dragon-journal.md          ← 蓝龙手账模板（一次性回顾）
│   │   └── duck-journal.md            ← 教授鸭手账模板（一次性回顾）
│   ├── image-generation.md            ← 旅行照片生成模板（参考图注入）
│   └── daily-chat.md                  ← 日常聊天模板
│
├── scripts/
│   └── fetch_api.py                   ← API数据获取脚本
│
└── assets/
    ├── pet-refs/                       ← 四只宠物的三视图参考图（保证生图一致性）
    │   ├── dragon.png
    │   ├── cat.png
    │   ├── panda.png
    │   └── duck.png
    ├── api-config.md                  ← API详细配置说明
    └── usage-guide.md                 ← 本文件：使用教程
```
