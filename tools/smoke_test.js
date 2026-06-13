/* 헤드리스 통합 스모크 테스트: node tools/smoke_test.js */
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

/* ---- DOM/브라우저 스텁 ---- */
const noop = () => {};
const ctxStub = new Proxy({}, {
  get: (t, p) => p === "measureText" ? () => ({ width: 100 })
    : p === "createLinearGradient" ? () => ({ addColorStop: noop })
    : noop,
  set: () => true,
});
global.document = { getElementById: () => ({ getContext: () => ctxStub, width: 768, height: 576, addEventListener: noop, style: {} }) };
global.window = { addEventListener: noop, AudioContext: undefined };
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] ?? null; },
  setItem(k, v) { this._d[k] = v; },
  removeItem(k) { delete this._d[k]; },
};
global.requestAnimationFrame = noop;
global.performance = { now: () => Date.now() };

const src = ["pokedex.js", "map.js", "game.js"]
  .map((f) => fs.readFileSync(path.join(root, f), "utf8"))
  .join("\n")
  .replace(/^"use strict";$/gm, "");
eval(src + `
;global.T = { POKEDEX, MOVES, WORLD, WORLD_W, WORLD_H, ZONES, SOLID_TILES, START,
  LEGEND_AT, ITEMS_AT, SIGN_TEXT, zoneAt, worldTile, ENCOUNTER_TILES,
  makeMon, movesAtLevel, computeStats, effectiveness, calcDamage, effStat,
  expForLevel, usableMoves, josa, game, ui, saveGame, loadGame, startBattle, tryCatch, STONES,
  KANTO_NPCS, KANTO_GYMS, ELITE_FOUR, CHAMPION_TEAM, GYM_AT, BADGE_ORDER, ZONE_VOLUME, npcAt };
global.__feed = (k) => { if (keyResolver) { const r = keyResolver; keyResolver = null; r(k); } };
`);
const T = global.T;
let fails = 0;
const ok = (cond, label) => { if (cond) console.log("  PASS", label); else { console.log("  FAIL", label); fails++; } };

(async function main() {

console.log("[1] 도감 151종 생성");
let allMon = true, allMoves = true;
for (let id = 1; id <= 151; id++) {
  for (const lv of [3, 5, 36, 70]) {
    const m = T.makeMon(id, lv);
    if (!(m.maxHp > 0 && m.atk > 0 && m.def > 0 && m.spc > 0 && m.spd > 0)) allMon = false;
    if (m.moves.length > 4) allMon = false;
    for (const mv of m.moves) if (!T.MOVES[mv]) allMoves = false;
  }
  for (const e of T.POKEDEX[id].evolutions) {
    if (!T.POKEDEX[e.to]) allMon = false;
    if (e.method === "stone" && !T.STONES.has(e.item)) allMoves = false;
  }
}
ok(allMon, "전 종 스탯/기술 슬롯 정상");
ok(allMoves, "기술·진화 데이터 정합");
ok(T.POKEDEX[133].evolutions.length === 3, "이브이 3분기 진화");
ok(T.usableMoves(T.makeMon(63, 5))[0] === "struggle", "캐이시 발버둥 폴백");

console.log("[2] 타입 상성");
ok(T.effectiveness("전기", ["땅"]) === 0, "전기→땅 무효");
ok(T.effectiveness("노말", ["고스트"]) === 0, "노말→고스트 무효");
ok(T.effectiveness("물", ["불꽃", "비행"]) === 2, "물→리자몽 2배");
ok(T.effectiveness("바위", ["불꽃", "비행"]) === 4, "바위→리자몽 4배");
ok(T.effectiveness("전기", ["물", "비행"]) === 4, "전기→갸라도스 4배");

console.log("[3] 데미지 계산");
const a50 = T.makeMon(6, 50), d50 = T.makeMon(3, 50);
const st0 = { atk: 0, def: 0, spd: 0, spc: 0 };
const r1 = T.calcDamage(a50, d50, T.MOVES["flamethrower"], st0, st0);
ok(r1.dmg > 0 && r1.eff === 2, "화염방사 특수 데미지+상성");
const r2 = T.calcDamage(a50, d50, T.MOVES["seismic-toss"], st0, st0);
ok(r2 === 50, "지구던지기 고정 데미지 = 레벨");
ok(T.effStat(a50, "atk", { atk: 2, def: 0, spd: 0, spc: 0 }) === Math.floor(a50.atk * 2), "랭크 +2 = 2배");

console.log("[4] 맵 구조 / 연결성 (BFS)");
ok(T.WORLD.length === T.WORLD_H && T.WORLD.every((r) => r.length === T.WORLD_W), `월드 ${T.WORLD_W}x${T.WORLD_H} 격자`);
const visited = new Set();
const queue = [[T.START.x, T.START.y]];
visited.add(T.START.x + "," + T.START.y);
while (queue.length) {
  const [x, y] = queue.shift();
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const nx = x + dx, ny = y + dy, key = nx + "," + ny;
    if (visited.has(key)) continue;
    if (nx < 0 || ny < 0 || nx >= T.WORLD_W || ny >= T.WORLD_H) continue;
    if (T.SOLID_TILES.has(T.WORLD[ny][nx])) continue;
    visited.add(key);
    queue.push([nx, ny]);
  }
}
ok(!T.SOLID_TILES.has(T.worldTile(T.START.x, T.START.y)), "시작 타일 통행 가능");
// 모든 기능 타일 도달성
const unreachable = { H: [], M: [], I: [], L: [], G: 0, zone: [] };
for (let y = 0; y < T.WORLD_H; y++) {
  for (let x = 0; x < T.WORLD_W; x++) {
    const ch = T.WORLD[y][x];
    const key = x + "," + y;
    if (ch === "H" || ch === "M" || ch === "I") {
      if (!visited.has(key)) unreachable[ch].push(key);
    } else if (ch === "L") {
      const adj = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => visited.has((x + dx) + "," + (y + dy)));
      if (!adj) unreachable.L.push(key);
    }
  }
}
for (const z of T.ZONES) {
  const [zx, zy, zw, zh] = z.rect;
  let zoneReach = false, zoneEnc = 0;
  for (let y = zy; y < zy + zh && !zoneReach; y++)
    for (let x = zx; x < zx + zw; x++)
      if (visited.has(x + "," + y)) { zoneReach = true; break; }
  for (let y = zy; y < zy + zh; y++)
    for (let x = zx; x < zx + zw; x++)
      if (T.ENCOUNTER_TILES.has(T.WORLD[y][x]) && visited.has(x + "," + y)) zoneEnc++;
  if (!zoneReach) unreachable.zone.push(z.key);
  if (z.pool && zoneEnc === 0) unreachable.zone.push(z.key + "(인카운터0)");
}
ok(unreachable.H.length === 0, "모든 포켓몬센터 도달 가능" + (unreachable.H.length ? " → " + unreachable.H : ""));
ok(unreachable.M.length === 0, "모든 상점 도달 가능" + (unreachable.M.length ? " → " + unreachable.M : ""));
ok(unreachable.I.length === 0, "모든 아이템 도달 가능" + (unreachable.I.length ? " → " + unreachable.I : ""));
ok(unreachable.L.length === 0, "모든 전설 인접 도달 가능" + (unreachable.L.length ? " → " + unreachable.L : ""));
ok(unreachable.zone.length === 0, "모든 존 도달+인카운터 보유" + (unreachable.zone.length ? " → " + unreachable.zone : ""));
ok(Object.keys(T.LEGEND_AT).length === 5, "전설 5마리 배치");
// 체육관 문 8개 + 리그 문 도달성
const gymDoors = Object.keys(T.GYM_AT);
ok(gymDoors.length === 8, "체육관 문 8개 배치");
ok(gymDoors.every((k) => visited.has(k)), "모든 체육관 문 도달 가능"
  + (gymDoors.filter((k) => !visited.has(k)).length ? " → " + gymDoors.filter((k) => !visited.has(k)) : ""));
let eReach = false;
for (let y = 0; y < T.WORLD_H && !eReach; y++)
  for (let x = 0; x < T.WORLD_W; x++)
    if (T.WORLD[y][x] === "E" && visited.has(x + "," + y)) { eReach = true; break; }
ok(eReach, "포켓몬리그 문 도달 가능");
// NPC 타일 도달성 (말을 걸 수 있는 위치)
const npcBad = T.KANTO_NPCS.filter((n) =>
  ![[0, 1], [0, -1], [1, 0], [-1, 0], [0, 0]].some(([dx, dy]) => visited.has((n.x + dx) + "," + (n.y + dy))));
ok(npcBad.length === 0, `NPC ${T.KANTO_NPCS.length}명 전원 접근 가능` + (npcBad.length ? " → " + npcBad.map((n) => n.id) : ""));

console.log("[4b] 원작 대비 면적");
/* 오버월드 36개 존(도시 11 + 도로 25)은 원작 면적과 동일해야 함 */
const DUNGEON_KEYS = new Set(["VIRIDIAN_FOREST", "MT_MOON", "ROCK_TUNNEL", "POWER_PLANT",
  "VICTORY_ROAD", "CERULEAN_CAVE", "SEAFOAM", "SAFARI_ZONE"]);
const overworld = T.ZONES.filter((z) => !DUNGEON_KEYS.has(z.key))
  .reduce((s, z) => s + z.rect[2] * z.rect[3], 0);
ok(overworld === 43380, `오버월드 면적 ${overworld} = 원작 43380 (100%)`);
/* 던전 포함 전체 보행면적: 원작(전 층 합산) 대비 ±10% 이내 */
const ORIGINAL_TOTAL = 61876;
const ratio = T.ZONE_VOLUME / ORIGINAL_TOTAL;
ok(Math.abs(1 - ratio) <= 0.10, `전체 보행면적 ${T.ZONE_VOLUME} / 원작 ${ORIGINAL_TOTAL} = ${(ratio * 100).toFixed(1)}% (±10% 이내)`);

console.log("[4c] 체육관/사천왕/NPC 데이터 정합");
let gymOk = true;
const badgeSet = new Set();
for (const [city, g] of Object.entries(T.KANTO_GYMS)) {
  if (!T.ZONES.some((z) => z.key === city)) gymOk = false;
  badgeSet.add(g.badge);
  for (const [id, lv] of g.team) if (!T.POKEDEX[id] || lv < 1 || lv > 100) gymOk = false;
}
ok(gymOk && badgeSet.size === 8, "관장 8명 팀·배지 데이터 유효");
let e4Ok = true;
for (const e of T.ELITE_FOUR)
  for (const [id, lv] of e.team) if (!T.POKEDEX[id] || lv < 1) e4Ok = false;
for (const t of Object.values(T.CHAMPION_TEAM))
  for (const [id, lv] of t) if (!T.POKEDEX[id] || lv < 1) e4Ok = false;
ok(e4Ok, "사천왕 4명 + 챔피언(스타터별 3종) 팀 유효");
let npcOk = true;
const npcIds = new Set();
for (const n of T.KANTO_NPCS) {
  if (npcIds.has(n.id)) npcOk = false;
  npcIds.add(n.id);
  if (n.team) for (const [id] of n.team) if (!T.POKEDEX[id]) npcOk = false;
  if (n.mon && !T.POKEDEX[n.mon[0]]) npcOk = false;
  if (n.choice) for (const [id] of n.choice) if (!T.POKEDEX[id]) npcOk = false;
}
ok(npcOk, "NPC id 중복 없음 + 보유 포켓몬 유효");

console.log("[5] 인카운터 풀 정합");
let poolOk = true;
for (const z of T.ZONES) {
  if (!z.pool) continue;
  for (const [id, lo, hi] of z.pool) {
    if (!T.POKEDEX[id] || lo > hi || lo < 1) { poolOk = false; console.log("    불량:", z.key, id); }
  }
}
ok(poolOk, "모든 풀이 유효한 종/레벨 참조");

console.log("[6] 인트로 자동 진행 (타이틀→스타터 선택)");
const feeder = setInterval(() => global.__feed("z"), 3);
const t0 = Date.now();
while ((T.game.state !== "world" || !T.game.party.length) && Date.now() - t0 < 8000) {
  await new Promise((r) => setTimeout(r, 20));
}
ok(T.game.state === "world" && T.game.party.length === 1 && T.game.party[0].id === 1, "스타터(이상해씨) 획득, 월드 진입");
ok(T.game.dexCaught.includes(1), "도감에 포획 기록");
// 인트로 잔여 메시지가 모두 끝날 때까지 대기
for (let calm = 0; calm < 15;) {
  await new Promise((r) => setTimeout(r, 20));
  if (!T.ui.message && !T.ui.menu) calm++; else calm = 0;
}

console.log("[7] 전투 자동 진행 (승리 경로)");
T.game.party = [T.makeMon(6, 50)]; // 리자몽 Lv50
const moneyBefore = T.game.money;
const res = await Promise.race([
  T.startBattle(T.makeMon(16, 3), { bgType: "field" }),
  new Promise((r) => setTimeout(() => r("timeout"), 8000)),
]);
ok(res === "end", "전투 종료(승리), 결과=" + res);
ok(T.game.money > moneyBefore, "상금 획득");
ok(T.game.dexSeen.includes(16), "상대 도감 등록");

console.log("[7b] 트레이너 연속 전투 (2마리 교체)");
T.game.party = [T.makeMon(6, 60)];
const moneyT0 = T.game.money;
const tTeam = [T.makeMon(74, 12), T.makeMon(95, 14)];
const resT = await Promise.race([
  T.startBattle(null, { trainer: { name: "관장 테스트", team: tTeam, prize: 1400 }, bgType: "field" }),
  new Promise((r) => setTimeout(() => r("timeout"), 10000)),
]);
ok(resT === "end", "트레이너전 종료(승리), 결과=" + resT);
ok(T.game.money === moneyT0 + 1400, "트레이너 상금 1회만 지급");
ok(T.game.dexSeen.includes(74) && T.game.dexSeen.includes(95), "상대 2마리 모두 도감 등록");

console.log("[8] 포획 흐름");
T.game.bag["몬스터볼"] = 99;
const partyBefore = T.game.party.length;
let caught = false;
for (let i = 0; i < 30 && !caught; i++) {
  const enemy = T.makeMon(10, 3);
  enemy.hp = 1;
  const b = { enemy, player: T.game.party[0], stages: { pl: { ...st0 }, en: { ...st0 } } };
  caught = await Promise.race([
    T.tryCatch(b),
    new Promise((r) => setTimeout(() => r(false), 3000)),
  ]);
}
ok(caught && T.game.party.length === partyBefore + 1, "포획 성공 → 파티 합류");
ok(T.game.dexCaught.includes(10), "포획 도감 기록");

console.log("[9] 세이브/로드 왕복");
T.game.px = 55; T.game.py = 77;
T.game.flags.items.push("30,109");
T.saveGame();
T.game.px = 0; T.game.party = [];
ok(T.loadGame() && T.game.px === 55 && T.game.party.length === partyBefore + 1, "저장→복원 일치");

console.log("[10] 구버전(v2 맵) 세이브 마이그레이션");
const oldSave = {
  px: 30, py: 109,                       // 구맵 좌표 (새 맵에선 무효)
  party: [T.makeMon(6, 50), T.makeMon(25, 30)],
  boxMons: [T.makeMon(150, 70)],
  bag: { "몬스터볼": 7, "이상한사탕": 2 },
  money: 12345,
  flags: { items: ["30,109", "5,5"], legends: ["10,10"] }, // 구맵 흔적
  dexSeen: [1, 6, 25, 150], dexCaught: [1, 6, 25, 150],
};
global.localStorage.setItem("pokeclone_save_v2", JSON.stringify(oldSave));
ok(T.loadGame(), "구버전 세이브 로드 성공");
ok(T.game.party.length === 2 && T.game.party[0].id === 6 && T.game.boxMons[0].id === 150, "파티·박스 보존");
ok(T.game.money === 12345 && T.game.bag["몬스터볼"] === 7, "소지금·가방 보존");
ok(T.game.dexCaught.length === 4, "도감 보존");
ok(T.game.px === T.START.x && T.game.py === T.START.y, "위치는 태초마을로 초기화");
ok(T.game.flags.items.length === 0 && T.game.flags.badges.length === 0, "구맵 좌표 플래그 미적용 (맵 오염 방지)");
ok(T.worldTile(5, 5) !== ".", "구맵 아이템 좌표가 새 맵을 덮어쓰지 않음");
T.saveGame();
const resaved = JSON.parse(global.localStorage.getItem("pokeclone_save_v2"));
ok(resaved.ver === 3 && T.loadGame() && T.game.money === 12345, "재저장 후 v3 정상 왕복");

clearInterval(feeder);
console.log(fails === 0 ? "\nALL_OK" : `\n${fails}건 실패`);
process.exit(fails === 0 ? 0 : 1);
})();
