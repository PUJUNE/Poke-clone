/* ===================================================================
   관동지방 원작 배치 월드맵 (384x400 타일)
   존 좌표는 원작 맵 크기·연결 오프셋(공개 디스어셈블리 수치 데이터)에서 산출.
   오버월드 36개 존은 원작 면적 100% 일치, 던전 8개 존은 대표 층 규모로 인라인.
   타일: T나무 R바위벽 W물 B건물 F울타리(이상 통행불가)
         . 길  , 잔디  G풀숲(인카운터)  g동굴바닥(인카운터)  s모래
         c동굴길  f꽃  S표지판  H회복센터문  h민가문(회복)  M상점문
         D체육관문  E포켓몬리그문  I아이템  L전설
   =================================================================== */
"use strict";

const WORLD_W = 384, WORLD_H = 400;

/* ---------- 존 정의: [x, y, w, h] 절대 타일 좌표 ---------- */
const KANTO_POOLS = {
  ROUTE_1: [[16,2,5,50],[19,2,4,50]],
  ROUTE_2: [[19,2,5,43],[16,3,5,26],[10,3,5,23],[13,3,5,9]],
  ROUTE_3: [[16,6,8,46],[21,5,8,45],[39,3,7,9]],
  ROUTE_4: [[21,8,12,34],[19,8,12,27],[27,6,12,27],[23,6,12,13]],
  ROUTE_5: [[16,13,16,40],[43,13,16,18],[69,13,16,18],[52,10,16,13],[56,10,16,13]],
  ROUTE_6: [[16,13,16,40],[43,13,16,18],[69,13,16,18],[52,10,16,13],[56,10,16,13]],
  ROUTE_7: [[16,19,22,20],[52,17,20,19],[69,19,22,18],[43,19,22,15],[56,17,20,15],[37,18,20,8],[58,18,20,5]],
  ROUTE_8: [[16,18,20,20],[27,17,19,15],[52,18,20,15],[56,18,20,15],[37,15,18,14],[23,17,19,10],[58,15,18,10]],
  ROUTE_9: [[21,13,17,34],[19,14,17,27],[27,11,17,27],[23,11,17,13]],
  ROUTE_10: [[21,13,17,34],[27,11,17,27],[100,14,17,27],[23,11,17,13]],
  ROUTE_11: [[96,9,15,37],[21,13,17,34],[23,12,15,21],[27,12,15,8]],
  ROUTE_12: [[16,23,27,40],[48,24,26,20],[43,22,26,18],[69,22,26,18],[44,28,30,3],[70,28,30,3]],
  ROUTE_13: [[16,25,27,36],[48,24,26,20],[43,22,26,18],[69,22,26,18],[132,25,25,4],[44,28,30,3],[70,28,30,3]],
  ROUTE_14: [[48,24,26,26],[43,22,26,18],[132,23,23,18],[69,22,26,15],[16,26,26,11],[17,28,30,5],[70,30,30,5],[44,30,30,2]],
  ROUTE_15: [[48,26,28,26],[16,23,23,18],[43,22,26,18],[69,22,26,15],[132,26,26,11],[17,28,30,5],[70,30,30,5],[44,30,30,2]],
  ROUTE_16: [[21,20,22,40],[19,18,22,29],[84,18,22,25],[20,23,25,5]],
  ROUTE_17: [[21,20,22,40],[20,25,29,29],[84,24,28,25],[22,25,27,5]],
  ROUTE_18: [[21,20,22,40],[84,24,28,25],[20,25,29,19],[22,25,29,15]],
  ROUTE_21: [[16,21,23,30],[19,21,23,30],[17,30,32,15],[20,30,30,15],[114,28,32,9],[72,5,40,11]],
  ROUTE_22: [[19,2,4,38],[29,2,4,26],[32,2,4,24],[21,3,5,12]],
  ROUTE_23: [[22,38,43,40],[132,33,43,19],[23,26,26,14],[27,26,26,14],[21,26,26,7],[24,41,41,3],[28,41,41,3]],
  ROUTE_24: [[69,12,14,26],[63,8,12,21],[16,12,13,14],[43,12,14,13],[13,7,7,11],[14,8,8,11],[10,7,7,2],[11,8,8,2]],
  ROUTE_25: [[16,13,13,15],[63,10,12,14],[43,12,14,13],[69,12,14,13],[11,7,9,12],[14,7,9,12],[10,8,8,11],[13,8,8,11]],
  VIRIDIAN_FOREST: [[13,3,5,29],[14,4,6,26],[10,3,5,25],[11,4,6,16],[25,3,5,5]],
  MT_MOON: [[41,6,12,63],[74,7,10,24],[46,8,12,10],[35,8,12,3]],
  ROCK_TUNNEL: [[41,15,18,53],[74,16,18,26],[66,15,17,14],[95,13,17,7]],
  POWER_PLANT: [[26,33,36,29],[81,21,23,21],[100,21,23,21],[25,20,24,18],[82,32,35,6],[125,33,36,4]],
  VICTORY_ROAD: [[95,36,45,26],[66,22,24,20],[74,24,26,20],[41,22,26,15],[67,41,45,5],[42,40,41,4],[75,41,43,4],[49,40,40,3],[105,40,43,2]],
  CERULEAN_CAVE: [[132,53,67,15],[49,49,51,9],[85,49,51,9],[105,52,55,9],[112,52,55,9],[101,52,55,7],[42,46,46,6],[64,49,51,6],[97,46,46,6],[82,46,46,5],[24,52,57,4],[47,52,64,4],[113,56,64,4],[26,53,64,3],[28,52,57,3],[40,54,54,1]],
  SEAFOAM: [[120,28,32,15],[90,28,32,14],[98,28,32,14],[116,28,32,13],[86,28,30,12],[54,28,30,10],[79,28,30,10],[41,21,21,5],[42,29,29,4],[87,38,38,2],[55,38,38,1],[80,38,38,1],[99,37,37,1],[117,37,37,1]],
  LAVENDER_TOWN: [[92,18,24,91],[104,20,22,8],[93,25,25,1]],
  CINNABAR_ISLAND: [[58,32,36,25],[37,32,36,20],[77,30,34,20],[88,30,34,15],[109,30,34,15],[126,34,38,5]],
  SAFARI_ZONE: [[29,22,30,13],[32,22,30,13],[102,24,28,11],[111,25,28,11],[46,24,26,9],[48,26,30,8],[84,26,30,8],[123,26,28,6],[127,26,28,6],[115,26,30,5],[128,26,30,4],[113,24,28,4],[147,25,28,2]],
  WATER: [[72,5,40,100]],
};

const ZONES = [
  { key: "PALLET_TOWN",     rect: [52, 236, 20, 18],  type: "town",    name: "태초마을",
    sign: "태초마을 — 새하얀 시작의 색" },
  { key: "VIRIDIAN_CITY",   rect: [42, 164, 40, 36],  type: "town",    name: "상록시티",
    sign: "상록시티 — 영원한 초록의 마을", gym: true },
  { key: "PEWTER_CITY",     rect: [42, 56, 40, 36],   type: "town",    name: "회색시티",
    sign: "회색시티 — 잿빛 바위에 둘러싸인 마을", gym: true },
  { key: "CERULEAN_CITY",   rect: [222, 38, 40, 36],  type: "town",    name: "블루시티",
    sign: "블루시티 — 물의 도시", gym: true },
  { key: "LAVENDER_TOWN",   rect: [322, 118, 20, 18], type: "town",    name: "보라타운",
    sign: "보라타운 — 포켓몬의 영혼이 잠드는 곳", pool: KANTO_POOLS.LAVENDER_TOWN },
  { key: "VERMILION_CITY",  rect: [222, 182, 40, 36], type: "town",    name: "갈색시티",
    sign: "갈색시티 — 석양에 물드는 항구", gym: true },
  { key: "CELADON_CITY",    rect: [152, 110, 50, 36], type: "town",    name: "무지개시티",
    sign: "무지개시티 — 일곱 빛깔 꿈의 도시", gym: true },
  { key: "FUCHSIA_CITY",    rect: [162, 272, 40, 36], type: "town",    name: "연분홍시티",
    sign: "연분홍시티 — 사파리존의 마을", gym: true },
  { key: "SAFFRON_CITY",    rect: [222, 110, 40, 36], type: "town",    name: "노랑시티",
    sign: "노랑시티 — 관동의 중심, 황금빛 대도시", gym: true },
  { key: "CINNABAR_ISLAND", rect: [52, 344, 20, 18],  type: "town",    name: "홍련마을",
    sign: "홍련마을 — 불타는 연구의 섬", gym: true, pool: KANTO_POOLS.CINNABAR_ISLAND },
  { key: "INDIGO_PLATEAU",  rect: [2, 10, 20, 18],    type: "town",    name: "석영고원",
    sign: "석영고원 — 정상에 선 자가 모이는 곳" },
  { key: "ROUTE_1",  rect: [52, 200, 20, 36],  type: "route_v", name: "1번도로",  pool: KANTO_POOLS.ROUTE_1 },
  { key: "ROUTE_2",  rect: [52, 92, 20, 72],   type: "route_v", name: "2번도로",  pool: KANTO_POOLS.ROUTE_2 },
  { key: "ROUTE_3",  rect: [82, 64, 70, 18],   type: "route_h", name: "3번도로",  pool: KANTO_POOLS.ROUTE_3 },
  { key: "ROUTE_4",  rect: [132, 46, 90, 18],  type: "route_h", name: "4번도로",  pool: KANTO_POOLS.ROUTE_4 },
  { key: "ROUTE_5",  rect: [232, 74, 20, 36],  type: "route_v", name: "5번도로",  pool: KANTO_POOLS.ROUTE_5 },
  { key: "ROUTE_6",  rect: [232, 146, 20, 36], type: "route_v", name: "6번도로",  pool: KANTO_POOLS.ROUTE_6 },
  { key: "ROUTE_7",  rect: [202, 118, 20, 18], type: "route_h", name: "7번도로",  pool: KANTO_POOLS.ROUTE_7 },
  { key: "ROUTE_8",  rect: [262, 118, 60, 18], type: "route_h", name: "8번도로",  pool: KANTO_POOLS.ROUTE_8 },
  { key: "ROUTE_9",  rect: [262, 46, 60, 18],  type: "route_h", name: "9번도로",  pool: KANTO_POOLS.ROUTE_9 },
  { key: "ROUTE_10", rect: [322, 46, 20, 72],  type: "route_v", name: "10번도로", pool: KANTO_POOLS.ROUTE_10 },
  { key: "ROUTE_11", rect: [262, 190, 60, 18], type: "route_h", name: "11번도로", pool: KANTO_POOLS.ROUTE_11 },
  { key: "ROUTE_12", rect: [322, 136, 20, 108], type: "route_v", name: "12번도로", pool: KANTO_POOLS.ROUTE_12 },
  { key: "ROUTE_13", rect: [282, 244, 60, 18], type: "route_h", name: "13번도로", pool: KANTO_POOLS.ROUTE_13 },
  { key: "ROUTE_14", rect: [262, 244, 20, 54], type: "route_v", name: "14번도로", pool: KANTO_POOLS.ROUTE_14 },
  { key: "ROUTE_15", rect: [202, 280, 60, 18], type: "route_h", name: "15번도로", pool: KANTO_POOLS.ROUTE_15 },
  { key: "ROUTE_16", rect: [112, 118, 40, 18], type: "route_h", name: "16번도로", pool: KANTO_POOLS.ROUTE_16 },
  { key: "ROUTE_17", rect: [112, 136, 20, 144], type: "route_v", name: "17번도로 (사이클링로드)", pool: KANTO_POOLS.ROUTE_17 },
  { key: "ROUTE_18", rect: [112, 280, 50, 18], type: "route_h", name: "18번도로", pool: KANTO_POOLS.ROUTE_18 },
  { key: "ROUTE_19", rect: [172, 308, 20, 54], type: "water_v", name: "19번수로", pool: KANTO_POOLS.WATER },
  { key: "ROUTE_20", rect: [72, 344, 100, 18], type: "water_h", name: "20번수로", pool: KANTO_POOLS.WATER },
  { key: "ROUTE_21", rect: [52, 254, 20, 90],  type: "water_v", name: "21번수로", pool: KANTO_POOLS.ROUTE_21 },
  { key: "ROUTE_22", rect: [2, 172, 40, 18],   type: "route_h", name: "22번도로", pool: KANTO_POOLS.ROUTE_22 },
  { key: "ROUTE_23", rect: [2, 28, 20, 144],   type: "route_v", name: "23번도로", pool: KANTO_POOLS.ROUTE_23 },
  { key: "ROUTE_24", rect: [232, 2, 20, 36],   type: "route_v", name: "24번도로", pool: KANTO_POOLS.ROUTE_24 },
  { key: "ROUTE_25", rect: [252, 2, 60, 18],   type: "route_h", name: "25번도로", pool: KANTO_POOLS.ROUTE_25 },
  /* ---- 던전 (원작 대표 층 규모 인라인) ---- */
  { key: "VIRIDIAN_FOREST", rect: [72, 100, 34, 48], type: "forest", name: "상록숲",     pool: KANTO_POOLS.VIRIDIAN_FOREST },
  { key: "MT_MOON",        rect: [142, 10, 60, 36],  type: "cave",   name: "달맞이산",   pool: KANTO_POOLS.MT_MOON },
  { key: "ROCK_TUNNEL",    rect: [342, 46, 40, 54],  type: "cave",   name: "바위산터널", pool: KANTO_POOLS.ROCK_TUNNEL },
  { key: "POWER_PLANT",    rect: [342, 108, 40, 36], type: "cave",   name: "무인발전소", pool: KANTO_POOLS.POWER_PLANT },
  { key: "VICTORY_ROAD",   rect: [22, 60, 20, 72],   type: "cave",   name: "챔피언로드", pool: KANTO_POOLS.VICTORY_ROAD },
  { key: "CERULEAN_CAVE",  rect: [202, 20, 30, 18],  type: "cave",   name: "블루시티 동굴", pool: KANTO_POOLS.CERULEAN_CAVE },
  { key: "SEAFOAM",        rect: [102, 362, 30, 36], type: "cave",   name: "쌍둥이섬",   pool: KANTO_POOLS.SEAFOAM },
  { key: "SAFARI_ZONE",    rect: [162, 218, 40, 54], type: "safari", name: "사파리존",   pool: KANTO_POOLS.SAFARI_ZONE },
];
const Z = {};
ZONES.forEach((z) => { Z[z.key] = z; });

/* ---------- 연결: [존A, 존B, 접변 위치 비율(0~1)] ---------- */
const CONNECT = [
  ["PALLET_TOWN", "ROUTE_1", 0.5], ["ROUTE_1", "VIRIDIAN_CITY", 0.5],
  ["VIRIDIAN_CITY", "ROUTE_2", 0.5], ["ROUTE_2", "PEWTER_CITY", 0.5],
  ["PEWTER_CITY", "ROUTE_3", 0.5], ["ROUTE_3", "ROUTE_4", 0.5],
  ["ROUTE_4", "CERULEAN_CITY", 0.5],
  ["CERULEAN_CITY", "ROUTE_24", 0.5], ["ROUTE_24", "ROUTE_25", 0.5],
  ["CERULEAN_CITY", "ROUTE_5", 0.5], ["ROUTE_5", "SAFFRON_CITY", 0.5],
  ["SAFFRON_CITY", "ROUTE_6", 0.5], ["ROUTE_6", "VERMILION_CITY", 0.5],
  ["CERULEAN_CITY", "ROUTE_9", 0.5], ["ROUTE_9", "ROUTE_10", 0.5],
  ["ROUTE_10", "LAVENDER_TOWN", 0.5], ["LAVENDER_TOWN", "ROUTE_8", 0.5],
  ["ROUTE_8", "SAFFRON_CITY", 0.5], ["SAFFRON_CITY", "ROUTE_7", 0.5],
  ["ROUTE_7", "CELADON_CITY", 0.5], ["CELADON_CITY", "ROUTE_16", 0.5],
  ["ROUTE_16", "ROUTE_17", 0.3], ["ROUTE_17", "ROUTE_18", 0.3],
  ["ROUTE_18", "FUCHSIA_CITY", 0.5], ["FUCHSIA_CITY", "ROUTE_15", 0.5],
  ["ROUTE_15", "ROUTE_14", 0.7], ["ROUTE_14", "ROUTE_13", 0.7],
  ["ROUTE_13", "ROUTE_12", 0.5], ["ROUTE_12", "LAVENDER_TOWN", 0.5],
  ["VERMILION_CITY", "ROUTE_11", 0.5], ["ROUTE_11", "ROUTE_12", 0.5],
  ["FUCHSIA_CITY", "ROUTE_19", 0.5], ["ROUTE_19", "ROUTE_20", 0.9],
  ["ROUTE_20", "CINNABAR_ISLAND", 0.5], ["CINNABAR_ISLAND", "ROUTE_21", 0.5],
  ["ROUTE_21", "PALLET_TOWN", 0.5],
  ["VIRIDIAN_CITY", "ROUTE_22", 0.5], ["ROUTE_22", "ROUTE_23", 0.1],
  ["ROUTE_23", "INDIGO_PLATEAU", 0.5],
  /* 던전 출입구 */
  ["ROUTE_2", "VIRIDIAN_FOREST", 0.13], ["ROUTE_2", "VIRIDIAN_FOREST", 0.84],
  ["ROUTE_4", "MT_MOON", 0.15], ["ROUTE_4", "MT_MOON", 0.85],
  ["ROUTE_10", "ROCK_TUNNEL", 0.2], ["ROUTE_10", "ROCK_TUNNEL", 0.85],
  ["ROUTE_10", "POWER_PLANT", 0.5],
  ["ROUTE_23", "VICTORY_ROAD", 0.15], ["ROUTE_23", "VICTORY_ROAD", 0.85],
  ["CERULEAN_CITY", "CERULEAN_CAVE", 0.5],
  ["ROUTE_20", "SEAFOAM", 0.5],
  ["FUCHSIA_CITY", "SAFARI_ZONE", 0.5],
];

/* ---------- 던전 우회 강제 차단벽: [존, 방향(h:가로띠/v:세로띠), 시작비율, 두께] ---------- */
const SURFACE_BLOCKS = [
  ["ROUTE_4", "v", 0.5, 4],    // 달맞이산을 지나야 동서 통행
  ["ROUTE_10", "h", 0.5, 4],   // 바위산터널 경유 강제
  ["ROUTE_23", "h", 0.45, 4],  // 챔피언로드 경유 강제
  ["ROUTE_2", "h", 0.45, 4],   // 상록숲 경유 강제
];

/* ---------- 전설 포켓몬: 존 → {id, level, 존 내 상대좌표} ---------- */
const LEGEND_SPEC = {
  SEAFOAM:       { id: 144, level: 50, rx: 15, ry: 20 },  // 프리져
  POWER_PLANT:   { id: 145, level: 50, rx: 30, ry: 18 },  // 썬더
  VICTORY_ROAD:  { id: 146, level: 50, rx: 10, ry: 36 },  // 파이어
  CERULEAN_CAVE: { id: 150, level: 70, rx: 8,  ry: 8 },   // 뮤츠
  ROUTE_25:      { id: 151, level: 30, rx: 54, ry: 5 },   // 뮤 (숨겨진 곶)
};

/* ---------- 보장 아이템: 존 → 아이템 배열 ---------- */
const STONE_SPEC = {
  MT_MOON:        ["달의돌", "달의돌"],
  POWER_PLANT:    ["천둥의돌"],
  SAFFRON_CITY:   ["천둥의돌"],
  CINNABAR_ISLAND: ["불꽃의돌"],
  VICTORY_ROAD:   ["불꽃의돌", "이상한사탕"],
  SEAFOAM:        ["물의돌"],
  CELADON_CITY:   ["잎의돌"],
  VIRIDIAN_FOREST: ["잎의돌"],
  CERULEAN_CAVE:  ["이상한사탕", "물의돌"],
  ROUTE_23:       ["이상한사탕"],
  ROUTE_13:       ["이상한사탕"],
  SAFARI_ZONE:    ["이상한사탕", "달의돌"],
};

/* ---------- 결정적 RNG ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 월드 그리드 ---------- */
const WORLD = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill("T"));
const SIGN_TEXT = {};   // "x,y" -> text
const ITEMS_AT = {};    // "x,y" -> item name
const LEGEND_AT = {};   // "x,y" -> {id, level}
const GYM_AT = {};      // "x,y" -> 체육관 도시 존 key

function zoneAt(x, y) {
  for (const z of ZONES) {
    const [zx, zy, zw, zh] = z.rect;
    if (x >= zx && x < zx + zw && y >= zy && y < zy + zh) return z;
  }
  return null;
}
const SOLID_TILES = new Set(["T", "R", "W", "B", "F", "S", "L"]);
function worldTile(x, y) {
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return "T";
  return WORLD[y][x];
}

/* ---------- 빌더 헬퍼 ---------- */
function fillRect(x0, y0, w, h, ch) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++)
      if (x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H) WORLD[y][x] = ch;
}
function border(x0, y0, w, h, ch) {
  fillRect(x0, y0, w, 1, ch); fillRect(x0, y0 + h - 1, w, 1, ch);
  fillRect(x0, y0, 1, h, ch); fillRect(x0 + w - 1, y0, 1, h, ch);
}
function scatter(rand, x0, y0, w, h, ch, count, allowed) {
  let tries = count * 14;
  while (count > 0 && tries-- > 0) {
    const x = x0 + 1 + Math.floor(rand() * (w - 2));
    const y = y0 + 1 + Math.floor(rand() * (h - 2));
    if (allowed.has(WORLD[y][x])) { WORLD[y][x] = ch; count--; }
  }
}
function blob(rand, x0, y0, w, h, ch, n, allowed) {
  for (let i = 0; i < n; i++) {
    const cx = x0 + 2 + Math.floor(rand() * (w - 4));
    const cy = y0 + 2 + Math.floor(rand() * (h - 4));
    const r = 1 + Math.floor(rand() * 2);
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) {
        if (x <= x0 || y <= y0 || x >= x0 + w - 1 || y >= y0 + h - 1) continue;
        if (Math.abs(x - cx) + Math.abs(y - cy) <= r + (rand() < 0.5 ? 0 : 1) && allowed.has(WORLD[y][x]))
          WORLD[y][x] = ch;
      }
  }
}
function building(x, y, w, h, door) {
  fillRect(x, y, w, h, "B");
  if (door) {
    const dx = x + Math.floor(w / 2);
    WORLD[y + h - 1][dx] = door;
    if (door === "H") WORLD[y + h - 1][dx - 1] = "H";
  }
  return { doorX: x + Math.floor(w / 2), doorY: y + h - 1 };
}
function putSign(x, y, text) {
  WORLD[y][x] = "S";
  SIGN_TEXT[x + "," + y] = text;
}

/* ---------- 도시별 건물 구성 ---------- */
function buildTown(z, rand) {
  const [x0, y0, w, h] = z.rect;
  fillRect(x0 + 1, y0 + 1, w - 2, h - 2, ",");
  const floorAllowed = new Set([","]);
  const cx = x0 + Math.floor(w / 2);
  // 중앙 십자 길
  fillRect(x0 + 1, y0 + Math.floor(h / 2) - 1, w - 2, 2, ".");
  fillRect(cx - 1, y0 + 1, 2, h - 2, ".");
  scatter(rand, x0, y0, w, h, "f", Math.floor(w * h / 90), floorAllowed);

  const big = w >= 40; // 대도시 / 소도시
  if (z.key === "PALLET_TOWN") {
    building(x0 + 3, y0 + 3, 4, 3, "h");                 // 주인공의 집 (회복)
    building(x0 + 12, y0 + 3, 4, 3, null);               // 라이벌의 집
    building(x0 + 3, y0 + 10, 6, 4, null);               // 오박사 연구소
    putSign(x0 + 2, y0 + 9, "[오박사 연구소] 포켓몬 연구의 최전선");
    putSign(x0 + 4, y0 + 7, "[" + z.name + "] " + z.sign);
    return;
  }
  if (z.key === "INDIGO_PLATEAU") {
    const b = building(x0 + 6, y0 + 3, 8, 5, "E");       // 포켓몬리그 본부
    fillRect(b.doorX, b.doorY + 1, 1, 4, ".");
    building(x0 + 2, y0 + 12, 4, 3, "H");
    building(x0 + 14, y0 + 12, 4, 3, "M");
    putSign(x0 + 4, y0 + 9, "[" + z.name + "] " + z.sign);
    return;
  }
  if (!big) { // 보라타운 / 홍련마을 (20x18) — 중앙 통로(연결부)를 비워 동·서쪽에 배치
    if (z.key === "LAVENDER_TOWN") {
      building(x0 + 2, y0 + 3, 4, 3, "H");
      building(x0 + 14, y0 + 3, 4, 3, "M");
      building(x0 + 2, y0 + 10, 4, 6, null);             // 포켓몬타워
      putSign(x0 + 7, y0 + 12, "[포켓몬타워] 떠나간 포켓몬이 잠드는 탑");
      blob(rand, x0 + 11, y0 + 10, 8, 7, "G", 3, floorAllowed); // 묘지 풀숲
    }
    if (z.key === "CINNABAR_ISLAND") {
      building(x0 + 2, y0 + 3, 4, 3, "H");
      building(x0 + 2, y0 + 10, 4, 3, "M");
      const g = building(x0 + 14, y0 + 3, 4, 3, "D");
      GYM_AT[g.doorX + "," + g.doorY] = z.key;
      building(x0 + 13, y0 + 12, 5, 3, null);            // 포켓몬 연구소
      putSign(x0 + 8, y0 + 14, "[포켓몬저택 터] 출입 주의");
      blob(rand, x0 + 8, y0 + 10, 5, 7, "G", 2, floorAllowed); // 저택 터
    }
    putSign(x0 + 4, y0 + 8, "[" + z.name + "] " + z.sign);
    return;
  }
  // 대도시 (40x36 / 50x36)
  building(x0 + 5, y0 + 8, 5, 4, "H");
  building(x0 + 14, y0 + 8, 5, 4, "M");
  if (z.gym) {
    const g = building(x0 + 26, y0 + 7, 6, 5, "D");
    GYM_AT[g.doorX + "," + g.doorY] = z.key;
    fillRect(g.doorX, g.doorY + 1, 1, y0 + Math.floor(h / 2) - g.doorY - 1, ".");
  }
  building(x0 + 5, y0 + 24, 4, 3, null);
  building(x0 + 13, y0 + 24, 4, 3, null);
  if (z.key === "PEWTER_CITY") {
    building(x0 + 24, y0 + 22, 7, 4, null);              // 박물관
    putSign(x0 + 22, y0 + 25, "[회색시티 과학박물관] 화석과 우주 전시");
  }
  if (z.key === "CERULEAN_CITY") {
    building(x0 + 24, y0 + 24, 5, 3, null);              // 자전거숍
    putSign(x0 + 22, y0 + 26, "[자전거숍] 최고급 자전거 전시 중");
  }
  if (z.key === "CELADON_CITY") {
    building(x0 + 36, y0 + 7, 7, 6, null);               // 백화점
    putSign(x0 + 34, y0 + 11, "[무지개백화점] 없는 게 없는 대형 상점");
    building(x0 + 36, y0 + 24, 6, 4, null);              // 게임코너
    putSign(x0 + 34, y0 + 26, "[로켓게임코너] 어른들의 오락실");
  }
  if (z.key === "SAFFRON_CITY") {
    building(x0 + 16, y0 + 18, 8, 6, null);              // 실프주식회사
    putSign(x0 + 14, y0 + 22, "[실프주식회사] 관동 최대 기업 본사");
    building(x0 + 27, y0 + 24, 5, 3, null);              // 격투도장
    putSign(x0 + 25, y0 + 26, "[격투도장] 주먹과 발차기의 길");
  }
  if (z.key === "VERMILION_CITY") {
    fillRect(x0 + 14, y0 + 32, 14, 3, "s");              // 항구 부두
    putSign(x0 + 12, y0 + 31, "[갈색부두] 호화 여객선이 정박하는 곳");
  }
  putSign(x0 + Math.floor(w / 2) - 3, y0 + Math.floor(h / 2) + 2, "[" + z.name + "] " + z.sign);
}

/* ---------- 존 생성 ---------- */
function buildZone(z, zi) {
  const [x0, y0, w, h] = z.rect;
  const rand = mulberry32(20260611 + zi * 7919);
  const floorAllowed = new Set([","]);

  if (z.type === "town") {
    fillRect(x0, y0, w, h, "T"); // 외곽
    buildTown(z, rand);
    border(x0, y0, w, h, "T");
  } else if (z.type === "route_v" || z.type === "route_h") {
    fillRect(x0 + 1, y0 + 1, w - 2, h - 2, ",");
    border(x0, y0, w, h, "T");
    if (z.type === "route_v") fillRect(x0 + Math.floor(w / 2) - 1, y0 + 1, 2, h - 2, ".");
    else fillRect(x0 + 1, y0 + Math.floor(h / 2) - 1, w - 2, 2, ".");
    blob(rand, x0, y0, w, h, "G", Math.floor(w * h / 70), floorAllowed);
    scatter(rand, x0, y0, w, h, "T", Math.floor(w * h / 80), floorAllowed);
    scatter(rand, x0, y0, w, h, "f", 3, floorAllowed);
    putSign(x0 + Math.floor(w / 2) + 2, y0 + Math.floor(h / 2) + 2, "[" + z.name + "]");
  } else if (z.type === "safari") {
    fillRect(x0 + 1, y0 + 1, w - 2, h - 2, ",");
    border(x0, y0, w, h, "F");
    fillRect(x0 + Math.floor(w / 2) - 1, y0 + 1, 2, h - 2, ".");
    blob(rand, x0, y0, w, h, "G", Math.floor(w * h / 28), floorAllowed);
    scatter(rand, x0, y0, w, h, "W", 6, floorAllowed);
    putSign(x0 + Math.floor(w / 2) + 2, y0 + h - 4, "[사파리존] 진귀한 포켓몬의 낙원");
  } else if (z.type === "forest") {
    fillRect(x0 + 1, y0 + 1, w - 2, h - 2, ",");
    border(x0, y0, w, h, "T");
    scatter(rand, x0, y0, w, h, "T", Math.floor(w * h / 9), floorAllowed);
    blob(rand, x0, y0, w, h, "G", Math.floor(w * h / 40), floorAllowed);
    // 보장 통로: ㄷ자
    fillRect(x0 + 2, y0 + 6, w - 4, 2, ".");
    fillRect(x0 + 2, y0 + h - 8, w - 4, 2, ".");
    fillRect(x0 + w - 4, y0 + 6, 2, h - 12, ".");
    putSign(x0 + 5, y0 + 5, "[상록숲] 천연의 미로. 벌레 포켓몬에 주의");
  } else if (z.type === "cave") {
    fillRect(x0, y0, w, h, "R");
    fillRect(x0 + 1, y0 + 1, w - 2, h - 2, "c");
    const caveFloor = new Set(["c"]);
    scatter(rand, x0, y0, w, h, "R", Math.floor(w * h / 22), caveFloor);
    blob(rand, x0, y0, w, h, "g", Math.floor(w * h / 60), caveFloor);
    // 보장 통로: 십자 + 내곽 링 (어느 가장자리 출입구에서도 중심 도달)
    fillRect(x0 + 1, y0 + Math.floor(h / 2) - 1, w - 2, 2, "c");
    fillRect(x0 + Math.floor(w / 2) - 1, y0 + 1, 2, h - 2, "c");
    fillRect(x0 + 4, y0 + 4, w - 8, 2, "c");
    fillRect(x0 + 4, y0 + h - 6, w - 8, 2, "c");
    fillRect(x0 + 4, y0 + 4, 2, h - 8, "c");
    fillRect(x0 + w - 6, y0 + 4, 2, h - 8, "c");
  } else if (z.type === "water_v" || z.type === "water_h") {
    fillRect(x0 + 1, y0 + 1, w - 2, h - 2, "W");
    border(x0, y0, w, h, "T");
    const sandAllowed = new Set(["s"]);
    if (z.type === "water_v") fillRect(x0 + Math.floor(w / 2) - 2, y0 + 1, 4, h - 2, "s");
    else fillRect(x0 + 1, y0 + Math.floor(h / 2) - 2, w - 2, 4, "s");
    blob(rand, x0, y0, w, h, "G", Math.floor(w * h / 110), sandAllowed);
  }
}

/* ---------- 연결 통로 개통 ---------- */
function floorChar(z) {
  if (z.type === "cave") return "c";
  if (z.type.startsWith("water")) return "s";
  return ".";
}
function carveConnections() {
  const depth = (z) => z.type === "town" ? 8 : 10; // 도시는 건물 회피를 위해 얕게
  for (const [ka, kb, at] of CONNECT) {
    const a = Z[ka], b = Z[kb];
    const [ax, ay, aw, ah] = a.rect, [bx, by, bw, bh] = b.rect;
    const fa = floorChar(a), fb = floorChar(b);
    // 수직 접변 (좌우 이웃)
    if (ax + aw === bx || bx + bw === ax) {
      const X = ax + aw === bx ? bx : ax;            // 경계선 x
      const y0 = Math.max(ay, by), y1 = Math.min(ay + ah, by + bh);
      const dy = Math.max(y0 + 1, Math.min(y1 - 3, y0 + Math.floor((y1 - y0) * at)));
      const [zl, zr] = ax < bx ? [a, b] : [b, a];
      fillRect(X - depth(zl), dy, depth(zl), 2, floorChar(zl));
      fillRect(X, dy, depth(zr), 2, floorChar(zr));
    } else { // 수평 접변 (상하 이웃)
      const Y = ay + ah === by ? by : ay;
      const x0 = Math.max(ax, bx), x1 = Math.min(ax + aw, bx + bw);
      const dx = Math.max(x0 + 1, Math.min(x1 - 3, x0 + Math.floor((x1 - x0) * at)));
      const [zt, zb2] = ay < by ? [a, b] : [b, a];
      fillRect(dx, Y - depth(zt), 2, depth(zt), floorChar(zt));
      fillRect(dx, Y, 2, depth(zb2), floorChar(zb2));
    }
  }
}

/* ---------- 던전 우회 강제 차단벽 ---------- */
function placeSurfaceBlocks() {
  for (const [key, dirn, at, thick] of SURFACE_BLOCKS) {
    const [x0, y0, w, h] = Z[key].rect;
    if (dirn === "h") fillRect(x0, y0 + Math.floor(h * at), w, thick, "R");
    else fillRect(x0 + Math.floor(w * at), y0, thick, h, "R");
  }
}

/* ---------- 아이템/전설 배치 ---------- */
const WALKABLE_FOR_ITEM = new Set([",", ".", "c", "s"]);
function placeFeatures() {
  const GENERIC = ["몬스터볼", "몬스터볼", "상처약", "좋은상처약"];
  ZONES.forEach((z, zi) => {
    if (z.type === "town" && !STONE_SPEC[z.key]) return;
    const rand = mulberry32(987654 + zi * 104729);
    const [x0, y0, w, h] = z.rect;
    const wanted = [...(STONE_SPEC[z.key] || [])];
    if (z.type !== "town") wanted.push(GENERIC[zi % GENERIC.length]);
    for (const item of wanted) {
      let tries = 80;
      while (tries-- > 0) {
        const x = x0 + 2 + Math.floor(rand() * (w - 4));
        const y = y0 + 2 + Math.floor(rand() * (h - 4));
        if (WALKABLE_FOR_ITEM.has(WORLD[y][x])) {
          WORLD[y][x] = "I";
          ITEMS_AT[x + "," + y] = item;
          break;
        }
      }
    }
  });
  for (const [key, spec] of Object.entries(LEGEND_SPEC)) {
    const z = Z[key];
    const x = z.rect[0] + spec.rx, y = z.rect[1] + spec.ry;
    const floor = z.type === "cave" ? "c" : ".";
    fillRect(x - 1, y - 1, 3, 3, floor);
    WORLD[y][x] = "L";
    LEGEND_AT[x + "," + y] = { id: spec.id, level: spec.level };
  }
}

/* ---------- 빌드 실행 ---------- */
ZONES.forEach((z, i) => buildZone(z, i));
carveConnections();
placeSurfaceBlocks();
placeFeatures();

/* ---------- 체육관 관장 (원작 파티 수치 데이터) ---------- */
const KANTO_GYMS = {
  PEWTER_CITY:    { leader: "웅",     badge: "회색배지",   team: [[74, 12], [95, 14]] },
  CERULEAN_CITY:  { leader: "이슬",   badge: "블루배지",   team: [[120, 18], [121, 21]] },
  VERMILION_CITY: { leader: "마티스", badge: "오렌지배지", team: [[100, 21], [25, 18], [26, 24]] },
  CELADON_CITY:   { leader: "민화",   badge: "무지개배지", team: [[71, 29], [114, 24], [45, 29]] },
  FUCHSIA_CITY:   { leader: "독수",   badge: "핑크배지",   team: [[109, 37], [89, 39], [109, 37], [110, 43]] },
  SAFFRON_CITY:   { leader: "초련",   badge: "골드배지",   team: [[64, 38], [122, 37], [49, 38], [65, 43]] },
  CINNABAR_ISLAND: { leader: "강연",  badge: "크림슨배지", team: [[58, 42], [77, 40], [78, 42], [59, 47]] },
  VIRIDIAN_CITY:  { leader: "비주기", badge: "그린배지",   team: [[111, 45], [51, 42], [31, 44], [34, 45], [112, 50]], need: 7 },
};
const BADGE_ORDER = ["회색배지", "블루배지", "오렌지배지", "무지개배지", "핑크배지", "골드배지", "크림슨배지", "그린배지"];

/* ---------- 사천왕 + 챔피언 (원작 파티 수치 데이터) ---------- */
const ELITE_FOUR = [
  { name: "사천왕 칸나",   team: [[87, 54], [91, 53], [80, 54], [124, 56], [131, 56]] },
  { name: "사천왕 시바",   team: [[95, 53], [107, 55], [106, 55], [95, 56], [68, 58]] },
  { name: "사천왕 키쿠코", team: [[94, 56], [42, 56], [93, 55], [24, 58], [94, 60]] },
  { name: "사천왕 목호",   team: [[130, 58], [148, 56], [148, 56], [142, 60], [149, 62]] },
];
/* 챔피언 라이벌: 플레이어 스타터별 (원작 수치) — 공통 5 + 최종 에이스 */
const CHAMPION_TEAM = {
  1: [[18, 61], [65, 59], [112, 61], [103, 61], [130, 63], [6, 65]],   // 플레이어 이상해씨 → 리자몽
  4: [[18, 61], [65, 59], [112, 61], [59, 61], [103, 63], [9, 65]],    // 플레이어 파이리 → 거북왕
  7: [[18, 61], [65, 59], [112, 61], [130, 61], [59, 63], [3, 65]],    // 플레이어 꼬부기 → 이상해꽃
};
const RIVAL_COUNTER = { 1: 4, 4: 7, 7: 1 }; // 라이벌은 플레이어에 유리한 스타터 선택

/* ---------- NPC 배치 ---------- */
function npcAbs(zoneKey, dx, dy) {
  const r = Z[zoneKey].rect;
  return { x: r[0] + dx, y: r[1] + dy };
}
const KANTO_NPCS = [
  /* 태초마을 */
  { id: "oak", zone: "PALLET_TOWN", dx: 9, dy: 15, color: "#e8e4d8", name: "오박사", kind: "oak" },
  { id: "rival1", zone: "PALLET_TOWN", dx: 14, dy: 8, color: "#5a4632", name: "라이벌", kind: "rival1" },
  { id: "pallet_girl", zone: "PALLET_TOWN", dx: 5, dy: 8, color: "#e87aa0", name: "여자아이", kind: "talk",
    lines: ["풀숲에서는 야생 포켓몬이 튀어나와. 우리 마을 위쪽 1번도로부터 모험이 시작돼!"] },
  /* 상록시티 */
  { id: "clerk", zone: "VIRIDIAN_CITY", dx: 18, dy: 13, color: "#3d6cb0", name: "점원", kind: "clerk" },
  { id: "viridian_gate", zone: "VIRIDIAN_CITY", dx: 29, dy: 13, color: "#b04a3a", name: "체육관 안내인", kind: "gate",
    need: 7, deny: "이 체육관의 관장님은 배지 7개를 모은 도전자만 상대하셔. 아직 이르다네.",
    pass: "배지 7개라니... 인정하지. 관장 비주기 님이 기다리신다!" },
  { id: "viridian_old", zone: "VIRIDIAN_CITY", dx: 10, dy: 28, color: "#8a8a7a", name: "할아버지", kind: "talk",
    lines: ["포켓몬을 잡으려면 먼저 싸워서 약하게 만든 뒤 몬스터볼을 던지는 거란다.", "상태이상이면 더 잡기 쉽지!"] },
  /* 2번도로 */
  { id: "mime_gift", zone: "ROUTE_2", dx: 6, dy: 60, color: "#c08ae0", name: "수집가", kind: "gift",
    mon: [122, 16], lines: ["희귀한 포켓몬을 교환하려 했는데 상대가 안 나타나네... 자네가 대신 받아주게!"],
    after: "마임맨은 장벽 만들기의 달인이라네." },
  /* 회색시티 */
  { id: "pewter_sci", zone: "PEWTER_CITY", dx: 27, dy: 27, color: "#d8d8e8", name: "연구원", kind: "talk",
    lines: ["박물관에는 달맞이산에서 발굴된 화석이 전시되어 있어요.", "화석은 태고 포켓몬의 흔적이래요."] },
  /* 3번도로 */
  { id: "r3_bug", zone: "ROUTE_3", dx: 20, dy: 8, color: "#7ab83c", name: "벌레잡이소년 민수", kind: "trainer",
    team: [[10, 9], [13, 9], [11, 10]], intro: "내 벌레 포켓몬 컬렉션을 보여주지!", win: "내 애벌레들이...!" },
  { id: "r3_lass", zone: "ROUTE_3", dx: 45, dy: 6, color: "#e87aa0", name: "미니스커트 윤아", kind: "trainer",
    team: [[16, 9], [29, 9]], intro: "귀엽다고 봐주기 없기야!", win: "졌잖아, 분해!" },
  /* 4번도로 */
  { id: "karp_seller", zone: "ROUTE_4", dx: 12, dy: 6, color: "#c8a040", name: "수상한 아저씨", kind: "vendor",
    mon: [129, 5], price: 500, repeat: true,
    lines: ["이 잉어킹, 딱 봐도 대물이지? 단돈 500원!"] },
  /* 달맞이산 */
  { id: "fossil_sci", zone: "MT_MOON", dx: 30, dy: 10, color: "#d8d8e8", name: "화석 연구가", kind: "gift",
    choice: [[138, 30], [140, 30]], choiceLabels: ["조개 화석 (암나이트)", "돔 화석 (투구)"],
    lines: ["화석을 두 개나 발굴했네! 하나는 자네가 가지게. 부활 장치로 되살려서 주지."],
    after: "남은 화석은 내가 연구하겠네. 홍련마을 연구소 동료에게도 들러 보게." },
  { id: "mtmoon_rocket", zone: "MT_MOON", dx: 45, dy: 25, color: "#3a3a3a", name: "로켓단원", kind: "trainer",
    team: [[19, 13], [41, 13]], intro: "로켓단의 화석 발굴 현장이다. 꼬마는 물러가!", win: "본부에 보고해야겠어..." },
  /* 블루시티 */
  { id: "jynx_gift", zone: "CERULEAN_CITY", dx: 8, dy: 28, color: "#c08ae0", name: "교환 마니아", kind: "gift",
    mon: [124, 20], lines: ["북쪽 나라에서 데려온 루주라야. 정성껏 키워줄 사람에게 맡기고 싶어."],
    after: "루주라는 잘 지내니?" },
  { id: "cave_guard", zone: "CERULEAN_CITY", dx: 5, dy: 2, color: "#3a4a8a", name: "동굴 경비원", kind: "gateFlag", block: { dir: "h", span: 2 },
    flag: "champion", deny: "이 동굴은 위험해서 출입 금지야. 포켓몬리그 챔피언이라면 또 모를까.",
    pass: "다, 당신은 챔피언...! 알겠습니다. 부디 조심하세요." },
  { id: "cerulean_girl", zone: "CERULEAN_CITY", dx: 30, dy: 28, color: "#e87aa0", name: "여성", kind: "talk",
    lines: ["북쪽 곶에는 포켓몬 연구가 마사키 씨가 살아. 다리에서는 트레이너들이 기다리고 있고."] },
  { id: "bike_shop", zone: "CERULEAN_CITY", dx: 26, dy: 28, color: "#c8a040", name: "자전거숍 주인", kind: "itemVendor",
    item: "자전거", price: 1000, repeat: false,
    lines: ["어서 와! 최신형 자전거, 특별 세일 중이야.", "가방에서 꺼내 타면 걷기의 두 배로 빨라진다고!"] },
  /* 24-25번도로 */
  { id: "r24_jr", zone: "ROUTE_24", dx: 9, dy: 20, color: "#4a7ab8", name: "단짝소년 호석", kind: "trainer",
    team: [[63, 10], [16, 12]], intro: "골든브릿지에 도전하는 거야?", win: "다리는 아직 멀었어..." },
  { id: "bill", zone: "ROUTE_25", dx: 54, dy: 10, color: "#3d6cb0", name: "마사키", kind: "giftItem",
    item: "이상한사탕", count: 1,
    lines: ["난 포켓몬 수집가 마사키. 도와준 답례로 좋은 걸 주지!"], after: "내 별장 주변에 환상의 포켓몬이 나온다는 소문이 있어." },
  { id: "r25_hiker", zone: "ROUTE_25", dx: 25, dy: 8, color: "#8a6a3a", name: "등산가 대호", kind: "trainer",
    team: [[74, 11], [74, 11], [95, 13]], intro: "바위처럼 단단한 승부다!", win: "돌이 굴러떨어졌군!" },
  /* 노랑시티 관문 4곳 */
  { id: "gate_r5", zone: "ROUTE_5", dx: 9, dy: 33, color: "#3a4a8a", name: "경비원", kind: "gate", block: "h",
    need: 3, deny: "노랑시티는 지금 검문 중이야. 배지 3개 이상인 트레이너만 통과!",
    pass: "배지 3개 확인! 통과하세요." },
  { id: "gate_r6", zone: "ROUTE_6", dx: 9, dy: 2, color: "#3a4a8a", name: "경비원", kind: "gate", block: "h",
    need: 3, deny: "노랑시티는 지금 검문 중이야. 배지 3개 이상인 트레이너만 통과!",
    pass: "배지 3개 확인! 통과하세요." },
  { id: "gate_r7", zone: "ROUTE_7", dx: 17, dy: 8, color: "#3a4a8a", name: "경비원", kind: "gate", block: "v",
    need: 3, deny: "노랑시티는 지금 검문 중이야. 배지 3개 이상인 트레이너만 통과!",
    pass: "배지 3개 확인! 통과하세요." },
  { id: "gate_r8", zone: "ROUTE_8", dx: 2, dy: 8, color: "#3a4a8a", name: "경비원", kind: "gate", block: "v",
    need: 3, deny: "노랑시티는 지금 검문 중이야. 배지 3개 이상인 트레이너만 통과!",
    pass: "배지 3개 확인! 통과하세요." },
  /* 노랑시티 */
  { id: "dojo_master", zone: "SAFFRON_CITY", dx: 29, dy: 28, color: "#b04a3a", name: "격투도장 사범", kind: "gift",
    choice: [[106, 30], [107, 30]], choiceLabels: ["시라소몬 (발차기)", "홍수몬 (주먹)"],
    lines: ["우리 도장의 수련생을 한 명 맡아주게! 발의 달인과 주먹의 달인, 어느 쪽인가?"],
    after: "수련을 게을리하지 말게!" },
  { id: "silph_staff", zone: "SAFFRON_CITY", dx: 20, dy: 25, color: "#3d6cb0", name: "실프 직원", kind: "gift",
    mon: [131, 15], lines: ["회사를 도와준 보답입니다. 희귀 포켓몬 라프라스를 받아 주세요!"],
    after: "라프라스는 사람을 태우는 걸 좋아한답니다." },
  /* 갈색시티 */
  { id: "farfetchd_gift", zone: "VERMILION_CITY", dx: 8, dy: 28, color: "#c08ae0", name: "아주머니", kind: "gift",
    mon: [83, 15], lines: ["우리 파오리, 파를 들고 다녀서 키우기 힘들어... 자네가 맡아줘!"],
    after: "파오리는 잘 있니? 파는 갈아줬어?" },
  { id: "sailor", zone: "VERMILION_CITY", dx: 30, dy: 30, color: "#3a6aa0", name: "뱃사람", kind: "talk",
    lines: ["호화 여객선 상아호는 어제 출항해버렸어. 다음 기항을 기다리라고!"] },
  /* 9-11번도로 */
  { id: "r9_hiker", zone: "ROUTE_9", dx: 25, dy: 8, color: "#8a6a3a", name: "등산가 만식", kind: "trainer",
    team: [[74, 14], [66, 14]], intro: "바위산터널 앞을 지키는 남자, 그게 나다!", win: "단단함이 부족했나..." },
  { id: "r11_young", zone: "ROUTE_11", dx: 15, dy: 8, color: "#4a7ab8", name: "반바지꼬마 철민", kind: "trainer",
    team: [[27, 14], [23, 14]], intro: "디그다의 굴 근처에서 특훈 중이야!", win: "더 특훈해야겠다!" },
  { id: "r11_gambler", zone: "ROUTE_11", dx: 40, dy: 10, color: "#7a5aa0", name: "건달 상구", kind: "trainer",
    team: [[100, 16], [96, 16]], intro: "한 판 크게 걸어볼까?", win: "오늘은 운이 나빴어..." },
  /* 보라타운 */
  { id: "fuji", zone: "LAVENDER_TOWN", dx: 6, dy: 13, color: "#e8e4d8", name: "후지노인", kind: "giftItem",
    item: "포켓몬피리", count: 1,
    lines: ["타워의 영혼들을 위로해줘서 고맙네... 이 포켓몬피리를 받게. 잠든 포켓몬도 깨우는 신비한 피리라네."],
    after: "포켓몬피리 소리는 잠만보도 벌떡 일으킨다네." },
  { id: "lavender_girl", zone: "LAVENDER_TOWN", dx: 14, dy: 13, color: "#a0a0c8", name: "소녀", kind: "talk",
    lines: ["타워 묘지에는 밤마다 고오스가 나와... 떠나간 포켓몬들이 외로운가 봐."] },
  /* 8번도로 */
  { id: "r8_nerd", zone: "ROUTE_8", dx: 30, dy: 8, color: "#7a5aa0", name: "안경소년 진우", kind: "trainer",
    team: [[100, 17], [109, 17]], intro: "독가스와 전기의 콜라보를 보여주마!", win: "계산 밖이야!" },
  /* 무지개시티 */
  { id: "eevee_gift", zone: "CELADON_CITY", dx: 42, dy: 28, color: "#c08ae0", name: "옥상 소년", kind: "gift",
    mon: [133, 25], lines: ["이브이는 진화의 돌에 따라 세 가지 모습으로 진화해. 네가 키워볼래?"],
    after: "불꽃·물·천둥의돌... 어느 쪽으로 진화시킬 거야?" },
  { id: "porygon_seller", zone: "CELADON_CITY", dx: 38, dy: 30, color: "#c8a040", name: "경품 교환원", kind: "vendor",
    mon: [137, 9], price: 9999, repeat: false,
    lines: ["게임코너 특별 경품, 인공 포켓몬 폴리곤! 9999원에 모십니다."] },
  { id: "celadon_rocket", zone: "CELADON_CITY", dx: 20, dy: 30, color: "#3a3a3a", name: "수상한 남자", kind: "talk",
    lines: ["게임코너 지하에서 이상한 소리가 들린다고? ...기분 탓이겠지. 어서 가."] },
  /* 16번도로: 잠만보 + 사이클링 게이트 */
  { id: "cycling_gate", zone: "ROUTE_16", dx: 10, dy: 13, color: "#3a4a8a", name: "게이트 직원", kind: "gate", block: "v",
    need: 4, deny: "여기부터는 사이클링로드. 배지 4개 이상의 베테랑만 들여보내고 있어.",
    pass: "배지 4개 확인! 바람을 가르며 달려보세요." },
  { id: "snorlax_16", zone: "ROUTE_16", dx: 14, dy: 9, name: "잠만보", kind: "snorlax", level: 30, block: "v" },
  /* 12번도로 잠만보 */
  { id: "snorlax_12", zone: "ROUTE_12", dx: 9, dy: 54, name: "잠만보", kind: "snorlax", level: 30, block: "h" },
  /* 13-15번도로 */
  { id: "r13_bird", zone: "ROUTE_13", dx: 30, dy: 8, color: "#4a7ab8", name: "새박사 영진", kind: "trainer",
    team: [[17, 26], [22, 26]], intro: "하늘을 나는 포켓몬이 최강이야!", win: "추락이다..." },
  { id: "r15_beauty", zone: "ROUTE_15", dx: 30, dy: 8, color: "#e87aa0", name: "미스 수진", kind: "trainer",
    team: [[44, 26], [70, 26]], intro: "향기로운 승부를 청할게요.", win: "꽃잎이 졌네요..." },
  /* 18번도로 */
  { id: "lickitung_gift", zone: "ROUTE_18", dx: 30, dy: 8, color: "#c08ae0", name: "교환 아저씨", kind: "gift",
    mon: [108, 20], lines: ["내 내루미, 혀가 길어서 밥값이 많이 들어... 자네가 데려가 주게!"],
    after: "내루미 혀에 감기면 하루 종일 끈적해." },
  /* 연분홍시티 */
  { id: "warden", zone: "FUCHSIA_CITY", dx: 30, dy: 28, color: "#8a8a7a", name: "사파리 관리인", kind: "talk",
    lines: ["북쪽 문이 사파리존 입구야. 켄타로스, 럭키, 스라크... 진귀한 포켓몬의 낙원이지!"] },
  { id: "r19_gate", zone: "ROUTE_19", dx: 9, dy: 2, color: "#3a4a8a", name: "해변 감시원", kind: "gate", block: "h",
    need: 5, deny: "이 앞 수로는 파도가 거칠어. 배지 5개 이상의 실력자만 보내주고 있어.",
    pass: "배지 5개 확인! 물살을 조심하세요." },
  { id: "r19_swim", zone: "ROUTE_19", dx: 9, dy: 25, color: "#3a9ad8", name: "수영선수 동현", kind: "trainer",
    team: [[118, 24], [72, 26]], intro: "바다에서 단련된 포켓몬의 힘을 보여주지!", win: "파도에 휩쓸렸다..." },
  /* 사파리존 */
  { id: "safari_ranger", zone: "SAFARI_ZONE", dx: 20, dy: 50, color: "#5a8a3a", name: "레인저", kind: "talk",
    lines: ["여기는 사파리존. 야생 그대로의 환경이라 진귀한 포켓몬이 많아. 미니룡이 산다는 소문도 있어!"] },
  { id: "safari_warden", zone: "SAFARI_ZONE", dx: 20, dy: 8, color: "#e8e4d8", name: "사파리존 원장", kind: "giftItem",
    item: "비전머신03", count: 1,
    lines: ["오오, 사파리존 가장 깊은 곳까지 오다니 대단한 트레이너군!", "기념으로 이걸 주지. 비전머신03 — 파도타기다! 핑크배지가 있다면 물가를 향해 걸을 때 그대로 물 위를 나아갈 수 있다네."],
    after: "파도타기로 물 위를 달려 보게. 연분홍시티 남쪽 바다가 장관이라네!" },
  /* 홍련마을 */
  { id: "cinnabar_lab", zone: "CINNABAR_ISLAND", dx: 4, dy: 16, color: "#d8d8e8", name: "연구소 박사", kind: "gift",
    mon: [142, 30], needBadges: 7,
    lines: ["박물관의 옛 호박에서 DNA를 추출해 프테라를 부활시켰네! 배지 7개의 실력자라면 맡길 수 있지."],
    denyLine: "프테라를 부활시켰는데 너무 난폭해서... 배지 7개쯤 모은 실력자에게만 맡길 생각이네.",
    after: "프테라는 태고의 하늘을 지배했던 포켓몬이라네." },
  { id: "fossil_lab2", zone: "CINNABAR_ISLAND", dx: 16, dy: 16, color: "#d8d8e8", name: "조수", kind: "fossilLab" },
  /* 22번도로: 라이벌 2차 */
  { id: "rival2", zone: "ROUTE_22", dx: 20, dy: 8, color: "#5a4632", name: "라이벌", kind: "rival2" },
  /* 23번도로 관문 */
  { id: "league_gate", zone: "ROUTE_23", dx: 9, dy: 135, color: "#3a4a8a", name: "리그 관문 경비", kind: "gate", block: "h",
    need: 8, deny: "여기서부터는 포켓몬리그 구역. 배지 8개를 모두 모은 트레이너만 통과할 수 있다!",
    pass: "배지 8개... 완벽하군. 챔피언로드가 너를 기다린다!" },
  /* 챔피언로드 */
  { id: "vr_cool", zone: "VICTORY_ROAD", dx: 10, dy: 30, color: "#b04a3a", name: "엘리트 트레이너 준호", kind: "trainer",
    team: [[112, 42], [59, 42], [65, 43]], intro: "여기까지 온 실력, 시험해 주마!", win: "리그에서도 통하겠어..." },
  /* 석영고원 */
  { id: "indigo_guide", zone: "INDIGO_PLATEAU", dx: 8, dy: 11, color: "#3d6cb0", name: "접수원", kind: "talk",
    lines: ["포켓몬리그 본부에 오신 걸 환영합니다. 안에서는 사천왕 4연전, 그리고 챔피언전이 이어집니다. 회복은 불가능하니 만반의 준비를!"] },
];

/* 시작 위치: 태초마을 중심 */
const START = { x: 62, y: 245 };
/* 인카운터 확률 */
const ENCOUNTER_RATE = 0.12;
const ENCOUNTER_TILES = new Set(["G", "g", "W"]);
/* 면적 집계 (원작 대비 검증용) */
const ZONE_VOLUME = ZONES.reduce((s, z) => s + z.rect[2] * z.rect[3], 0);
