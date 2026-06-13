/* 자전거·파도타기 기능 검증 (임시): node tools/verify_bike_surf.js */
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

const noop = () => {};
const ctxStub = new Proxy({}, {
  get: (t, p) => p === "measureText" ? () => ({ width: 100 })
    : p === "createLinearGradient" ? () => ({ addColorStop: noop })
    : noop,
  set: () => true,
});
global.document = { getElementById: () => ({ getContext: () => ctxStub, width: 768, height: 576, addEventListener: noop, style: {} }) };
global.window = { addEventListener: noop, AudioContext: undefined };
global.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
global.requestAnimationFrame = noop;
global.performance = { now: () => Date.now() };

const src = ["pokedex.js", "map.js", "game.js"]
  .map((f) => fs.readFileSync(path.join(root, f), "utf8"))
  .join("\n")
  .replace(/^"use strict";$/gm, "");
eval(src + `
;global.T = { WORLD, WORLD_W, WORLD_H, worldTile, game, tryStartMove, canSurf, KANTO_NPCS, Z, freshFlags, loadGame, saveGame, makeMon, ENCOUNTER_TILES };
`);
const T = global.T;
let fails = 0;
const ok = (cond, label) => { if (cond) console.log("  PASS", label); else { console.log("  FAIL", label); fails++; } };

/* 물 타일 하나 찾기 (21번수로 내부) */
let wx = -1, wy = -1;
outer: for (let y = 260; y < 340; y++)
  for (let x = 53; x < 71; x++)
    if (T.worldTile(x, y) === "W" && T.worldTile(x - 1, y) === "s") { wx = x; wy = y; break outer; }
ok(wx > 0, `검증용 물 타일 확보 (${wx},${wy}) — 서쪽이 모래`);

console.log("[1] 파도타기 게이트");
T.game.state = "world";
T.game.px = wx - 1; T.game.py = wy; T.game.moving = null;
T.game.bag = {}; T.game.flags.badges = [];
T.tryStartMove(1, 0, "right");
ok(!T.game.moving, "비전머신·배지 없음 → 물 진입 불가");
T.game.bag["비전머신03"] = 1;
T.tryStartMove(1, 0, "right");
ok(!T.game.moving, "비전머신만 있음(배지 없음) → 물 진입 불가");
T.game.flags.badges = ["핑크배지"];
T.tryStartMove(1, 0, "right");
ok(!!T.game.moving && T.game.moving.tx === wx, "비전머신+핑크배지 → 물 진입 가능");
ok(T.game.moving.dur === 150, "물 위 이동은 일반 속도");

console.log("[2] 자전거 속도");
T.game.moving = null;
T.game.px = 62; T.game.py = 245; /* 태초마을 시작점 */
T.game.bag["자전거"] = 1; T.game.flags.bikeOn = false;
T.tryStartMove(0, -1, "up");
ok(!!T.game.moving && T.game.moving.dur === 150, "자전거 내림 → 150ms");
T.game.moving = null; T.game.flags.bikeOn = true;
T.tryStartMove(0, -1, "up");
ok(!!T.game.moving && T.game.moving.dur === 75, "자전거 탑승 → 75ms (2배)");
T.game.moving = null; T.game.bag["자전거"] = 0;
T.tryStartMove(0, -1, "up");
ok(!!T.game.moving && T.game.moving.dur === 150, "자전거 미보유 시 bikeOn 무시");

console.log("[3] 신규 NPC 배치");
const bike = T.KANTO_NPCS.find((n) => n.id === "bike_shop");
const warden = T.KANTO_NPCS.find((n) => n.id === "safari_warden");
ok(bike && bike.kind === "itemVendor" && bike.item === "자전거" && bike.price === 1000, "자전거숍 주인 (블루시티, 1000원)");
ok(warden && warden.kind === "giftItem" && warden.item === "비전머신03", "사파리존 원장 (비전머신03)");
ok(bike && !["T", "B", "F"].includes(T.worldTile(bike.x, bike.y)), "자전거숍 주인 발밑 통행 가능");
ok(warden && !["T", "B", "F"].includes(T.worldTile(warden.x, warden.y)), "원장 발밑 통행 가능");

console.log("[4] 물 인카운터 타일 등록");
ok(T.ENCOUNTER_TILES.has("W"), "ENCOUNTER_TILES에 W 포함");

console.log("[5] 구세이브 호환 (bikeOn 플래그 병합)");
global.localStorage.setItem("pokeclone_save_v2", JSON.stringify({
  ver: 3, px: 62, py: 245,
  party: [T.makeMon(1, 5)], boxMons: [], bag: { "몬스터볼": 3 }, money: 500,
  flags: { items: [], legends: [], badges: [], npcDone: [], quests: { parcel: 0, fossil: 0, champion: false }, starter: 1 },
  dexSeen: [1], dexCaught: [1],
}));
ok(T.loadGame(), "bikeOn 없는 기존 v3 세이브 로드 성공");
ok(T.game.flags.bikeOn === false, "bikeOn 기본값 false로 병합");
ok(T.game.money === 500 && T.game.bag["몬스터볼"] === 3, "기존 데이터 보존");

console.log(fails === 0 ? "\nALL_OK" : `\n${fails}건 실패`);
process.exit(fails === 0 ? 0 : 1);
