# -*- coding: utf-8 -*-
"""world_dump.json을 읽어 전체 지도 PNG 생성 (게임 타일 색상 + 존 이름 라벨)"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SCALE = 5  # px per tile -> 1920 x 2000

with open(os.path.join(HERE, "world_dump.json"), encoding="utf-8") as f:
    data = json.load(f)

W, H = data["w"], data["h"]
rows = data["rows"]

# game.js drawTile 기준 대표 색
COLOR = {
    ",": (126, 200, 80),   # 평지 잔디 #7ec850
    ".": (232, 213, 163),  # 길 #e8d5a3
    "G": (78, 166, 59),    # 풀숲 #4ea63b
    "g": (84, 71, 57),     # 동굴 인카운터 바닥
    "c": (74, 62, 51),     # 동굴길 #4a3e33
    "R": (125, 108, 88),   # 바위벽 #7d6c58
    "T": (46, 109, 50),    # 나무 캐노피 #2e7d32 근사
    "W": (61, 140, 240),   # 물 #3d8cf0
    "s": (232, 219, 163),  # 모래 #e8dba3
    "F": (168, 120, 68),   # 울타리 #a87844
    "B": (192, 98, 60),    # 건물 지붕 #c0623c
    "H": (240, 154, 170),  # 회복센터 (흰바탕+적십자 근사)
    "M": (125, 166, 216),  # 상점 (파란 간판 근사)
    "h": (176, 90, 54),    # 민가문
    "D": (90, 58, 138),    # 체육관문 #5a3a8a
    "E": (59, 47, 110),    # 리그문 #3b2f6e
    "S": (196, 154, 108),  # 표지판 #c49a6c
    "f": (216, 138, 160),  # 꽃
    "I": (224, 57, 47),    # 아이템 (몬스터볼 빨강)
    "L": (255, 210, 77),   # 전설 #ffd24d
}
CHECKER = {",": (121, 193, 75)}  # 잔디 체커 보조색 #79c14b

img = Image.new("RGB", (W * SCALE, H * SCALE))
px = img.load()
for y in range(H):
    row = rows[y]
    for x in range(W):
        ch = row[x]
        col = COLOR.get(ch, (46, 109, 50))
        if ch == "," and (x + y) % 2:
            col = CHECKER[","]
        for dy in range(SCALE):
            for dx in range(SCALE):
                px[x * SCALE + dx, y * SCALE + dy] = col

draw = ImageDraw.Draw(img)

# 전설 포켓몬 위치 마커 (금색 링)
for key in data["legends"]:
    lx, ly = map(int, key.split(","))
    cx, cy = lx * SCALE + SCALE // 2, ly * SCALE + SCALE // 2
    r = SCALE * 2
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 210, 77), width=3)

# 시작 위치 마커 (빨간 점 + 흰 테두리)
sx, sy = data["start"]["x"], data["start"]["y"]
cx, cy = sx * SCALE + SCALE // 2, sy * SCALE + SCALE // 2
r = SCALE * 2
draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(224, 57, 47), outline=(255, 255, 255), width=2)

# 존 이름 라벨
try:
    font_town = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 26)
    font_route = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 20)
except OSError:
    font_town = font_route = ImageFont.load_default()

def halo_text(cx, cy, text, font, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = cx - tw / 2, cy - th / 2 - bbox[1]
    tx = max(4, min(tx, W * SCALE - tw - 4))
    ty = max(4, min(ty, H * SCALE - th - 4))
    for ox in (-2, -1, 0, 1, 2):
        for oy in (-2, -1, 0, 1, 2):
            if ox or oy:
                draw.text((tx + ox, ty + oy), text, font=font, fill=(255, 255, 255))
    draw.text((tx, ty), text, font=font, fill=fill)

TOWN_FILL = (40, 30, 90)
ROUTE_FILL = (60, 50, 40)
for z in data["zones"]:
    zx, zy, zw, zh = z["rect"]
    cx = (zx + zw / 2) * SCALE
    cy = (zy + zh / 2) * SCALE
    name = z["name"]
    if z["type"] == "town":
        halo_text(cx, cy, name, font_town, TOWN_FILL)
    else:
        # 세로로 긴 존은 라벨이 겹치지 않게 그대로 중앙, 이름이 긴 수평 존도 중앙
        halo_text(cx, cy, name, font_route, ROUTE_FILL)

out = os.path.join(ROOT, "world_map.png")
img.save(out)
print("saved", out, img.size)
