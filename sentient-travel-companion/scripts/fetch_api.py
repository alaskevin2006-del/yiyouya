"""
旅行伴侣 Skill 的 API 数据获取脚本。
用于从外部 API 拉取天气、地理、游记数据，并注入到 Skill 模板的占位符中。

使用方法:
    python fetch_api.py --location "珠海" --pet_type "cat" --intimacy 55

依赖安装:
    pip install requests
"""

import json
import argparse
import os
from datetime import datetime
from typing import Optional

# ============================================================
# 配置区：在这里填你的 API Key
# ============================================================

# 和风天气 (免费注册: https://dev.qweather.com/)
QWEATHER_KEY = os.getenv("QWEATHER_KEY", "")

# 高德地图 (免费注册: https://lbs.amap.com/)
AMAP_KEY = os.getenv("AMAP_KEY", "")

# Open-Meteo 无需 Key，永久免费
OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast"

# 如果不想调外部 RAG，就在这里写常用目的地的简介
FALLBACK_TRAVEL_DATA = {
    "珠海": "珠海情侣路、珠海渔女像、日月贝歌剧院、长隆海洋王国。特色美食：横琴生蚝、斗门重壳蟹。",
    "北京": "故宫、天安门、长城、颐和园、天坛。特色美食：北京烤鸭、涮羊肉、炸酱面、豆汁。",
    "上海": "外滩、陆家嘴、豫园、田子坊、武康路。特色美食：小笼包、生煎、油爆虾、本帮红烧肉。",
    "广州": "珠江新城、陈家祠、沙面、永庆坊、中山大学南校区。特色美食：早茶、白切鸡、煲仔饭、双皮奶。",
    "庐山": "含鄱口、五老峰、三叠泉、牯岭镇、花径。特色美食：庐山石鸡、鄱阳湖银鱼。",
    "江西": "三清山、龙虎山、婺源篁岭、滕王阁、景德镇。特色美食：瓦罐汤、藜蒿炒腊肉、南昌拌粉。",
    "冰岛": "雷克雅未克、黑沙滩、蓝湖温泉、黄金瀑布、冰河湖。特色美食：龙虾汤、发酵鲨鱼肉、冰岛热狗。",
    "日本": "东京、京都、大阪、富士山、清水寺。特色美食：寿司、拉面、章鱼烧、烤团子。",
}


def geocode_city(city: str) -> Optional[dict]:
    """
    高德地图：城市名 → 经纬度 + 行政区划
    返回: {"lat": 22.27, "lon": 113.58, "adcode": "440400", "city_name": "珠海市"}
    """
    if not AMAP_KEY:
        print("[警告] AMAP_KEY 未设置，使用默认珠海坐标")
        return {"lat": 22.27, "lon": 113.58, "adcode": "440400", "city_name": city}

    try:
        import requests
        url = "https://restapi.amap.com/v3/config/district"
        resp = requests.get(url, params={
            "key": AMAP_KEY,
            "keywords": city,
            "subdistrict": 0,
            "extensions": "base"
        }, timeout=10)
        data = resp.json()
        if data.get("status") == "1" and data.get("districts"):
            district = data["districts"][0]
            center = district["center"].split(",")
            return {
                "lat": float(center[1]),
                "lon": float(center[0]),
                "adcode": district.get("adcode", ""),
                "city_name": district["name"]
            }
    except Exception as e:
        print(f"[错误] 高德地理编码失败: {e}")
    return None


def fetch_weather_open_meteo(lat: float, lon: float) -> dict:
    """
    Open-Meteo：经纬度 → 实时天气（免费无限量，无需 Key）
    """
    try:
        import requests
        params = {
            "latitude": lat,
            "longitude": lon,
            "current_weather": True,
            "hourly": "relativehumidity_2m",
            "timezone": "Asia/Shanghai",
        }
        resp = requests.get(OPEN_METEO_BASE, params=params, timeout=10)
        data = resp.json()
        cw = data.get("current_weather", {})

        weather_code_text = {
            0: "晴", 1: "大部晴", 2: "多云", 3: "阴",
            45: "雾", 48: "雾凇",
            51: "小雨", 53: "中雨", 55: "大雨",
            61: "阵雨", 63: "中阵雨", 65: "大阵雨",
            71: "小雪", 73: "中雪", 75: "大雪",
            95: "雷暴",
        }

        return {
            "temperature": cw.get("temperature", 20),
            "windspeed": cw.get("windspeed", 10),
            "weather": weather_code_text.get(cw.get("weathercode", 0), "多云"),
            "humidity": "适中",
            "source": "Open-Meteo"
        }
    except Exception as e:
        print(f"[错误] Open-Meteo 请求失败: {e}")
        return {"temperature": 20, "windspeed": 10, "weather": "晴", "humidity": "适中", "source": "fallback"}


def fetch_weather_qweather(city: str) -> dict:
    """
    和风天气：城市名 → 实时天气（国内精细）
    """
    if not QWEATHER_KEY:
        return {}

    try:
        import requests
        # 先查城市 ID
        geo_url = "https://geoapi.qweather.com/v2/city/lookup"
        geo_resp = requests.get(geo_url, params={
            "location": city, "key": QWEATHER_KEY
        }, timeout=10)
        geo_data = geo_resp.json()
        if geo_data.get("code") != "200":
            return {}

        city_id = geo_data["location"][0]["id"]

        # 再查实时天气
        weather_url = "https://devapi.qweather.com/v7/weather/now"
        w_resp = requests.get(weather_url, params={
            "location": city_id, "key": QWEATHER_KEY
        }, timeout=10)
        w_data = w_resp.json()
        if w_data.get("code") != "200":
            return {}

        now = w_data["now"]
        return {
            "temperature": now["temp"],
            "weather": now["text"],
            "windspeed": now.get("windSpeed", "未知"),
            "humidity": now.get("humidity", "适中"),
            "source": "QWeather"
        }
    except Exception as e:
        print(f"[错误] 和风天气请求失败: {e}")
        return {}


def format_weather_text(weather_data: dict) -> str:
    """把天气 JSON 变成 Skill 模板可用的自然语言"""
    return (
        f"{weather_data.get('weather', '多云')}，"
        f"气温{weather_data.get('temperature', '未知')}°C，"
        f"风速{weather_data.get('windspeed', '未知')}km/h，"
        f"湿度{weather_data.get('humidity', '适中')}"
    )


def get_travel_data(city: str) -> str:
    """获取游记/景点数据（先用本地缓存，后续可替换为 RAG 搜索）"""
    for key in FALLBACK_TRAVEL_DATA:
        if key in city or city in key:
            return FALLBACK_TRAVEL_DATA[key]
    # 没有缓存时返回空，大模型会用自己的知识
    return f"{city}的景点和美食信息（需接入搜索API或知识库补全）。"


def get_current_time() -> str:
    """
    生成中文格式的当前时间字符串。
    示例: "2026年5月23日，周六，下午三点十五分"
    """
    now = datetime.now()

    # 日期部分
    year = now.year
    month = now.month
    day = now.day

    # 星期
    weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    weekday_str = weekdays[now.weekday()]

    # 时段的汉字数字
    hour_numerals = {
        0: "十二", 1: "一", 2: "二", 3: "三", 4: "四",
        5: "五", 6: "六", 7: "七", 8: "八", 9: "九",
        10: "十", 11: "十一", 12: "十二"
    }

    # 确定时段
    hour = now.hour
    minute = now.minute

    if 0 <= hour < 6:
        period = "凌晨"
        display_hour = hour if hour != 0 else 12
    elif 6 <= hour < 12:
        period = "上午"
        display_hour = hour
    elif 12 <= hour < 13:
        period = "中午"
        display_hour = 12
    elif 13 <= hour < 18:
        period = "下午"
        display_hour = hour - 12
    else:
        period = "晚上"
        display_hour = hour - 12

    hour_str = hour_numerals.get(display_hour, str(display_hour))

    # 分钟转中文
    digit_map = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"]

    def _minute_to_chinese(m: int) -> str:
        if m == 0:
            return "整"
        if m < 10:
            return digit_map[m] + "分"
        if m < 20:
            return "十" + (digit_map[m - 10] if m > 10 else "") + "分"
        tens = m // 10
        ones = m % 10
        if ones == 0:
            return digit_map[tens] + "十分"
        return digit_map[tens] + "十" + digit_map[ones] + "分"

    minute_str = _minute_to_chinese(minute)

    return f"{year}年{month}月{day}日，{weekday_str}，{period}{hour_str}点{minute_str}"


def main(location: str, pet_type: str, intimacy: int):
    # 1. 地理位置
    geo = geocode_city(location)
    lat, lon = 22.27, 113.58  # 默认珠海
    if geo:
        lat, lon = geo["lat"], geo["lon"]
        print(f"[地理] {geo['city_name']} ({lat}, {lon})")

    # 2. 天气（优先和风，备用 Open-Meteo）
    weather = fetch_weather_qweather(location)
    if not weather:
        weather = fetch_weather_open_meteo(lat, lon)
    weather_text = format_weather_text(weather)
    print(f"[天气] {weather_text} (来源: {weather.get('source')})")

    # 3. 游记数据
    travel_data = get_travel_data(location)
    print(f"[游记] {travel_data[:80]}...")

    # 4. 当前时间
    current_time = get_current_time()
    print(f"[时间] {current_time}")

    # 5. 组装成 Skill 模板需要的变量
    skill_variables = {
        "location": location,
        "api_weather_data": weather_text,
        "travel_case_data": travel_data,
        "intimacy_level": intimacy,
        "pet_type": pet_type,
        "user_preferences": "无（从日常聊天中积累）",
        "pet_ref_url_placeholder": "https://your-supabase-storage/pet-refs/{pet_type}.png",
        "current_time": current_time,
    }

    print("\n=== 注入 Skill 模板的变量 ===")
    print(json.dumps(skill_variables, ensure_ascii=False, indent=2))
    return skill_variables


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="旅行伴侣 API 数据获取")
    parser.add_argument("--location", "-l", required=True, help="目的地城市，如 珠海")
    parser.add_argument("--pet_type", "-p", default="cat", choices=["cat", "panda", "dragon", "duck"])
    parser.add_argument("--intimacy", "-i", type=int, default=55)
    args = parser.parse_args()
    main(args.location, args.pet_type, args.intimacy)
