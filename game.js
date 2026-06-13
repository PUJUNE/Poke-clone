/* ===================================================================
   포켓몬 클론 — 1세대 151종 실데이터 (PokéAPI) + 관동 스타일 대형 맵
   의존: pokedex.js (POKEDEX, MOVES), map.js (WORLD, ZONES 등)
   =================================================================== */
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
const TILE = 32;
const VIEW_W = Math.ceil(W / TILE), VIEW_H = Math.ceil(H / TILE);
const SAVE_KEY = "pokeclone_save_v2";

/* ===================== 타입 상성 (1세대 15타입) ===================== */
const TYPE_CHART = {
  "노말":   { "바위": 0.5, "고스트": 0 },
  "불꽃":   { "불꽃": 0.5, "물": 0.5, "풀": 2, "얼음": 2, "벌레": 2, "바위": 0.5, "드래곤": 0.5 },
  "물":     { "불꽃": 2, "물": 0.5, "풀": 0.5, "땅": 2, "바위": 2, "드래곤": 0.5 },
  "전기":   { "물": 2, "전기": 0.5, "풀": 0.5, "땅": 0, "비행": 2, "드래곤": 0.5 },
  "풀":     { "불꽃": 0.5, "물": 2, "풀": 0.5, "독": 0.5, "땅": 2, "비행": 0.5, "벌레": 0.5, "바위": 2, "드래곤": 0.5 },
  "얼음":   { "물": 0.5, "풀": 2, "얼음": 0.5, "땅": 2, "비행": 2, "드래곤": 2 },
  "격투":   { "노말": 2, "얼음": 2, "독": 0.5, "비행": 0.5, "에스퍼": 0.5, "벌레": 0.5, "바위": 2, "고스트": 0 },
  "독":     { "풀": 2, "독": 0.5, "땅": 0.5, "바위": 0.5, "고스트": 0.5 },
  "땅":     { "불꽃": 2, "전기": 2, "풀": 0.5, "독": 2, "비행": 0, "벌레": 0.5, "바위": 2 },
  "비행":   { "전기": 0.5, "풀": 2, "격투": 2, "벌레": 2, "바위": 0.5 },
  "에스퍼": { "격투": 2, "독": 2, "에스퍼": 0.5 },
  "벌레":   { "불꽃": 0.5, "풀": 2, "격투": 0.5, "독": 2, "비행": 0.5, "에스퍼": 2, "고스트": 0.5 },
  "바위":   { "불꽃": 2, "얼음": 2, "격투": 0.5, "땅": 0.5, "비행": 2, "벌레": 2 },
  "고스트": { "노말": 0, "에스퍼": 2, "고스트": 2 },
  "드래곤": { "드래곤": 2 },
};
const TYPE_COLOR = {
  "노말": "#a8a090", "불꽃": "#e8543c", "물": "#3d8cf0", "전기": "#f0c930",
  "풀": "#5cb83c", "얼음": "#7fd4d4", "격투": "#b14a3a", "독": "#9a4a9a",
  "땅": "#d4b05c", "비행": "#9aa0e8", "에스퍼": "#e85a8a", "벌레": "#a8b820",
  "바위": "#b09a5c", "고스트": "#6a5a9a", "드래곤": "#7048e8",
};
const STATUS_LABEL = { slp: "잠듦", par: "마비", psn: "독", brn: "화상", frz: "얼음" };
const STATUS_COLOR = { slp: "#8a93c4", par: "#c8a830", psn: "#9a4a9a", brn: "#e8543c", frz: "#7fd4d4" };
const STARTER_IDS = [1, 4, 7];
const SHOP_LIST = [["몬스터볼", 200], ["상처약", 300], ["좋은상처약", 700]];
const HEAL_AMOUNT = { "상처약": 30, "좋은상처약": 60 };
const STONES = new Set(["불꽃의돌", "물의돌", "천둥의돌", "잎의돌", "달의돌"]);

/* ===================== 게임 상태 ===================== */
const SAVE_VER = 3;
function freshFlags() {
  return { items: [], legends: [], badges: [], npcDone: [], bikeOn: false,
    quests: { parcel: 0, fossil: 0, champion: false }, starter: 1 };
}
const game = {
  state: "title",            // title | world | battle
  px: START.x, py: START.y,
  dir: "down",
  moving: null,
  party: [], boxMons: [],
  bag: { "몬스터볼": 20, "상처약": 5 },
  money: 3000,
  flags: freshFlags(),
  dexSeen: [], dexCaught: [],
  lastHeal: { x: START.x, y: START.y },
  healCooldown: false,
  pendingEvo: [],
};
const ui = { message: null, menu: null, battle: null, flash: 0 };
const held = new Set();
let keyResolver = null;

/* ===================== 유틸 ===================== */
function josa(word, a, b) {
  const c = word.charCodeAt(word.length - 1);
  if (c >= 0xac00 && c <= 0xd7a3) return word + ((c - 0xac00) % 28 > 0 ? a : b);
  return word + a;
}
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function waitKey() { return new Promise((r) => { keyResolver = r; }); }
const monName = (m) => POKEDEX[m.id].name;

/* ===================== 몬스터 스프라이트 ===================== */
/* sprites/front|back/{id}.png — PokéAPI 공식 게임 스프라이트 (96×96) */
const SPRITE_CACHE = {};
function monSpriteImg(id, side) {
  const key = side + ":" + id;
  let img = SPRITE_CACHE[key];
  if (!img) {
    img = new Image();
    img.src = "sprites/" + side + "/" + id + ".png";
    SPRITE_CACHE[key] = img;
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}
/* 정사각 원본을 종횡비 그대로 size×size로 확대해 중심 (cx,cy)에 그림. 로딩 전엔 이모지 폴백 */
function drawMon(id, side, cx, cy, size) {
  const img = monSpriteImg(id, side);
  if (img) {
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(cx - size / 2), Math.round(cy - size / 2), size, size);
    ctx.imageSmoothingEnabled = prev;
  } else {
    ctx.font = Math.round(size * 0.6) + "px serif";
    ctx.textAlign = "center";
    ctx.fillText(POKEDEX[id].emoji, cx, cy + size * 0.2);
  }
}
function effectiveness(moveType, defTypes) {
  let e = 1;
  for (const t of defTypes) {
    const row = TYPE_CHART[moveType];
    if (row && row[t] !== undefined) e *= row[t];
  }
  return e;
}
function dexAdd(arr, id) { if (!arr.includes(id)) arr.push(id); }

/* ===================== NPC 초기화 ===================== */
/* 절대좌표 부여 + 발밑 지면 확보 + 관문형 NPC 차단 울타리 설치 */
(function initNPCs() {
  for (const n of KANTO_NPCS) {
    const p = npcAbs(n.zone, n.dx, n.dy);
    n.x = p.x; n.y = p.y;
    const z = zoneAt(n.x, n.y);
    const floor = z && z.type === "cave" ? "c" : z && z.type.startsWith("water") ? "s" : ".";
    if (SOLID_TILES.has(WORLD[n.y][n.x])) WORLD[n.y][n.x] = floor;
    if (n.block) {
      const [zx, zy, zw, zh] = Z[n.zone].rect;
      const dir = typeof n.block === "string" ? n.block : n.block.dir;
      const span = typeof n.block === "string" ? 999 : n.block.span;
      if (dir === "h") {
        for (let x = Math.max(zx + 1, n.x - span); x <= Math.min(zx + zw - 2, n.x + span); x++)
          if (x !== n.x) WORLD[n.y][x] = "F";
      } else {
        for (let y = Math.max(zy + 1, n.y - span); y <= Math.min(zy + zh - 2, n.y + span); y++)
          if (y !== n.y) WORLD[y][n.x] = "F";
      }
    }
  }
})();
const npcGone = (n) => ["gate", "gateFlag", "snorlax"].includes(n.kind) && game.flags.npcDone.includes(n.id);
function npcAt(x, y) {
  for (const n of KANTO_NPCS) if (n.x === x && n.y === y && !npcGone(n)) return n;
  return null;
}
function markDone(n) { if (!game.flags.npcDone.includes(n.id)) game.flags.npcDone.push(n.id); }
async function receiveMon(mon) {
  dexAdd(game.dexSeen, mon.id);
  dexAdd(game.dexCaught, mon.id);
  sfx.catchOk();
  if (game.party.length < 6) {
    game.party.push(mon);
    await msg(`Lv${mon.level} ${josa(monName(mon), "이", "가")} 동료가 되었다!`, { sprite: mon.id });
  } else {
    game.boxMons.push(mon);
    await msg(`지닌 자리가 가득 차서 Lv${mon.level} ${josa(monName(mon), "은", "는")} 박스로 보내졌다.`, { sprite: mon.id });
  }
}

/* ===================== 사운드 ===================== */
let actx = null;
function audioInit() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* 무음 */ } }
  if (actx && actx.state === "suspended") actx.resume();
}
function tone(freq, dur = 0.08, delay = 0, type = "square", vol = 0.04) {
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = freq;
  o.connect(g); g.connect(actx.destination);
  const t = actx.currentTime + delay;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  cursor: () => tone(880, 0.04),
  confirm: () => tone(1320, 0.06),
  cancel: () => tone(440, 0.06),
  hit: () => tone(160, 0.1, 0, "sawtooth", 0.06),
  superHit: () => { tone(160, 0.1, 0, "sawtooth", 0.07); tone(110, 0.12, 0.08, "sawtooth", 0.07); },
  faint: () => { tone(440, 0.1); tone(330, 0.1, 0.1); tone(220, 0.18, 0.2); },
  catchOk: () => { tone(660, 0.1); tone(880, 0.1, 0.11); tone(1320, 0.22, 0.22); },
  levelUp: () => { tone(523, 0.08); tone(659, 0.08, 0.09); tone(784, 0.08, 0.18); tone(1047, 0.18, 0.27); },
  heal: () => { tone(784, 0.09); tone(988, 0.09, 0.1); tone(1175, 0.16, 0.2); },
  encounter: () => { tone(220, 0.07); tone(311, 0.07, 0.08); tone(220, 0.07, 0.16); tone(311, 0.14, 0.24); },
  evolve: () => { tone(440, 0.12); tone(554, 0.12, 0.13); tone(659, 0.12, 0.26); tone(880, 0.3, 0.39); },
  money: () => { tone(1047, 0.06); tone(1568, 0.1, 0.07); },
};

/* ===================== 포켓몬 생성/스탯 ===================== */
function computeStats(mon) {
  const b = POKEDEX[mon.id].base, L = mon.level;
  mon.maxHp = Math.floor(b.hp * 2 * L / 100) + L + 10;
  mon.atk = Math.floor(b.atk * 2 * L / 100) + 5;
  mon.def = Math.floor(b.def * 2 * L / 100) + 5;
  mon.spc = Math.floor(b.spc * 2 * L / 100) + 5;
  mon.spd = Math.floor(b.spd * 2 * L / 100) + 5;
}
function movesAtLevel(id, level) {
  return POKEDEX[id].learnset.filter(([lv]) => lv <= level).map(([, m]) => m).slice(-4);
}
function makeMon(id, level) {
  const mon = { id, level, exp: level ** 3, moves: movesAtLevel(id, level), hp: 0, status: null };
  computeStats(mon);
  mon.hp = mon.maxHp;
  return mon;
}
const expForLevel = (lv) => lv ** 3;
function firstAlive() { return game.party.find((m) => m.hp > 0) || null; }
function usableMoves(mon) { return mon.moves.length ? mon.moves : ["struggle"]; }
const STAGE_MULT = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
function effStat(mon, key, stages) {
  let v = mon[key] * STAGE_MULT(stages ? stages[key] : 0);
  if (key === "atk" && mon.status && mon.status.k === "brn") v *= 0.5;
  if (key === "spd" && mon.status && mon.status.k === "par") v *= 0.25;
  return Math.max(1, Math.floor(v));
}

/* ===================== 메시지/메뉴 ===================== */
async function msg(text, opts = {}) {
  const box = { text, done: false, sprite: opts.sprite || null };
  ui.message = box;
  await sleep(80);
  box.done = true;
  while (true) {
    const k = await waitKey();
    if (["z", "Enter", " ", "x", "Escape"].includes(k)) break;
  }
  sfx.confirm();
  if (ui.message === box) ui.message = null;
}
async function msgAuto(text, ms = 650) {
  const box = { text, done: false };
  ui.message = box;
  await sleep(ms);
  if (ui.message === box) ui.message = null;
}
/* opts: {cancelable, cols, x, y, w, title, info(i), maxRows} */
async function choose(options, opts = {}) {
  const m = {
    options, index: 0, top: 0,
    cols: opts.cols || 1,
    cancelable: opts.cancelable !== false,
    x: opts.x, y: opts.y, w: opts.w,
    title: opts.title || null,
    info: opts.info || null,
    sprite: opts.sprite || null,
    maxRows: opts.maxRows || 10,
  };
  ui.menu = m;
  try {
    while (true) {
      const k = await waitKey();
      const rows = Math.ceil(options.length / m.cols);
      let r = Math.floor(m.index / m.cols), c = m.index % m.cols;
      if (k === "ArrowUp" || k === "w") r = (r + rows - 1) % rows;
      else if (k === "ArrowDown" || k === "s") r = (r + 1) % rows;
      else if (k === "ArrowLeft" || k === "a") c = (c + m.cols - 1) % m.cols;
      else if (k === "ArrowRight" || k === "d") c = (c + 1) % m.cols;
      else if (k === "z" || k === "Enter" || k === " ") { sfx.confirm(); return m.index; }
      else if ((k === "x" || k === "Escape") && m.cancelable) { sfx.cancel(); return -1; }
      const ni = r * m.cols + c;
      if (ni < options.length && ni !== m.index) { m.index = ni; sfx.cursor(); }
      // 스크롤 창 갱신
      const vr = Math.floor(m.index / m.cols);
      if (vr < m.top) m.top = vr;
      if (vr >= m.top + m.maxRows) m.top = vr - m.maxRows + 1;
    }
  } finally {
    ui.menu = null;
  }
}

/* ===================== 전투 보조 ===================== */
function pickEncounter(zone) {
  const pool = zone.pool;
  const total = pool.reduce((s, p) => s + p[3], 0);
  let roll = Math.random() * total;
  for (const [id, lo, hi, w] of pool) {
    roll -= w;
    if (roll <= 0) return makeMon(id, rint(lo, hi));
  }
  return makeMon(pool[0][0], pool[0][1]);
}
const aiMove = (e) => { const ms = usableMoves(e); return ms[rint(0, ms.length - 1)]; };

async function applyAilment(def, kind) {
  if (def.status || def.hp <= 0) return false;
  const turns = kind === "slp" ? rint(1, 3) : 0;
  def.status = { k: kind, turns };
  const txt = {
    slp: "은 잠들어 버렸다!", par: "은 마비되어 기술이 나오기 어려워졌다!",
    psn: "은 독에 당했다!", brn: "은 화상을 입었다!", frz: "은 얼어붙었다!",
  }[kind];
  await msg(josa(monName(def), "은", "는") + txt.slice(1));
  return true;
}
async function applyStages(target, stages, stObj) {
  for (const [st, ch] of stages) {
    const cur = stObj[st];
    const next = Math.max(-6, Math.min(6, cur + ch));
    const label = { atk: "공격", def: "방어", spd: "스피드", spc: "특수" }[st];
    if (next === cur) { await msg(`${monName(target)}의 ${label}은 더 이상 변하지 않는다!`); continue; }
    stObj[st] = next;
    const dir = ch > 0 ? (ch >= 2 ? "크게 올랐다!" : "올랐다!") : (ch <= -2 ? "크게 떨어졌다!" : "떨어졌다!");
    await msg(`${monName(target)}의 ${label}이(가) ${dir}`);
  }
}
/* 행동 가능 여부 (수면/얼음/마비) */
async function canAct(mon) {
  const s = mon.status;
  if (!s) return true;
  if (s.k === "slp") {
    if (s.turns > 0) { s.turns--; await msg(`${josa(monName(mon), "은", "는")} 쿨쿨 잠들어 있다.`); return false; }
    mon.status = null;
    await msg(`${josa(monName(mon), "이", "가")} 잠에서 깨어났다!`);
    return true;
  }
  if (s.k === "frz") {
    if (Math.random() < 0.2) { mon.status = null; await msg(`${josa(monName(mon), "이", "가")} 얼음이 녹았다!`); return true; }
    await msg(`${josa(monName(mon), "은", "는")} 얼어서 움직일 수 없다!`);
    return false;
  }
  if (s.k === "par" && Math.random() < 0.25) {
    await msg(`${josa(monName(mon), "은", "는")} 몸이 저려서 움직일 수 없다!`);
    return false;
  }
  return true;
}
/* 독/화상 슬립 데미지. 반환: 기절 여부 */
async function endChip(mon) {
  const s = mon.status;
  if (!s || mon.hp <= 0) return mon.hp <= 0;
  if (s.k === "psn") {
    mon.hp = Math.max(0, mon.hp - Math.max(1, Math.floor(mon.maxHp / 8)));
    await msg(`${josa(monName(mon), "은", "는")} 독 데미지를 입었다!`);
  } else if (s.k === "brn") {
    mon.hp = Math.max(0, mon.hp - Math.max(1, Math.floor(mon.maxHp / 16)));
    await msg(`${josa(monName(mon), "은", "는")} 화상 데미지를 입었다!`);
  }
  return mon.hp <= 0;
}

function calcDamage(att, def, mv, attStages, defStages) {
  if (mv.fixed) {
    if (mv.fixed === "level") return att.level;
    if (mv.fixed === "half") return Math.max(1, Math.floor(def.hp / 2));
    if (mv.fixed === "psywave") return Math.max(1, Math.floor(att.level * (0.5 + Math.random())));
    return mv.fixed;
  }
  const A = mv.cls === "physical" ? effStat(att, "atk", attStages) : effStat(att, "spc", attStages);
  const D = mv.cls === "physical" ? effStat(def, "def", defStages) : effStat(def, "spc", defStages);
  const eff = effectiveness(mv.type, POKEDEX[def.id].types);
  const stab = POKEDEX[att.id].types.includes(mv.type) ? 1.5 : 1;
  const crit = Math.random() < 1 / 16 ? 2 : 1;
  const base = ((2 * att.level / 5 + 2) * mv.power * A / D) / 50 + 2;
  return {
    dmg: Math.max(1, Math.floor(base * stab * eff * crit * (0.85 + Math.random() * 0.15))),
    eff, crit: crit > 1,
  };
}

/* 기술 사용 (att → def). b.stages = {pl, en} */
async function useMove(b, att, def, moveEn) {
  const mv = MOVES[moveEn];
  const attStages = att === b.player ? b.stages.pl : b.stages.en;
  const defStages = att === b.player ? b.stages.en : b.stages.pl;
  await msg(`${monName(att)}의 ${mv.name}!`);

  // 명중 판정 (자신 대상 기술은 무조건 명중)
  const selfTarget = mv.stageTarget === "self" || mv.healing;
  if (!selfTarget && Math.random() * 100 > mv.acc) { await msg("그러나 빗나갔다!"); return; }

  // 데미지 기술
  if (mv.power > 0 || mv.fixed) {
    const eff0 = effectiveness(mv.type, POKEDEX[def.id].types);
    if (eff0 === 0 && !mv.fixed) { await msg("효과가 없는 것 같다..."); return; }
    let total = 0, hits = 1, critAny = false, effLast = 1;
    const n = mv.hits ? rint(mv.hits[0], mv.hits[1]) : 1;
    for (let i = 0; i < n && def.hp > 0; i++) {
      const r = calcDamage(att, def, mv, attStages, defStages);
      const dmg = typeof r === "number" ? r : r.dmg;
      effLast = typeof r === "number" ? 1 : r.eff;
      critAny = critAny || (typeof r !== "number" && r.crit);
      def.hp = Math.max(0, def.hp - dmg);
      total += dmg;
      hits = i + 1;
    }
    ui.flash = 6;
    if (effLast > 1) sfx.superHit(); else sfx.hit();
    if (critAny) await msg("급소에 맞았다!");
    if (mv.hits && hits > 1) await msg(`${hits}번 맞았다!`);
    if (effLast > 1) await msg("효과가 굉장했다!");
    else if (effLast < 1 && effLast > 0) await msg("효과가 별로인 듯하다...");
    // 흡수/반동
    if (mv.drain) {
      att.hp = Math.min(att.maxHp, att.hp + Math.max(1, Math.floor(total * mv.drain / 100)));
      await msg(`${monName(def)}의 체력을 흡수했다!`);
    }
    if (mv.recoil) {
      att.hp = Math.max(0, att.hp - Math.max(1, Math.floor(total * mv.recoil / 100)));
      await msg(`${josa(monName(att), "은", "는")} 반동 데미지를 입었다!`);
    }
    if (mv.selfKO) {
      att.hp = 0;
      await msg(`${josa(monName(att), "은", "는")} 쓰러졌다... 굉장한 자폭이었다!`);
    }
    // 부가 상태이상
    if (mv.ailment && def.hp > 0 && Math.random() * 100 < (mv.ailmentChance || 0)) {
      await applyAilment(def, mv.ailment);
    }
    return;
  }
  // 변화 기술
  let didSomething = false;
  if (mv.healing) {
    if (att.hp < att.maxHp) {
      att.hp = Math.min(att.maxHp, att.hp + Math.max(1, Math.floor(att.maxHp * mv.healing / 100)));
      sfx.heal();
      await msg(`${josa(monName(att), "은", "는")} 체력을 회복했다!`);
      didSomething = true;
    }
    if (mv.selfSleep) { att.status = { k: "slp", turns: 2 }; await msg(`${josa(monName(att), "은", "는")} 잠들어서 회복하고 있다!`); }
  }
  if (mv.stages) {
    const target = mv.stageTarget === "self" ? att : def;
    const stObj = target === b.player ? b.stages.pl : b.stages.en;
    await applyStages(target, mv.stages, stObj);
    didSomething = true;
  }
  if (mv.ailment && !mv.stages && !mv.healing) {
    if (def.status) { await msg("그러나 실패했다!"); return; }
    const ok = await applyAilment(def, mv.ailment);
    if (!ok) await msg("그러나 실패했다!");
    didSomething = true;
  }
  if (!didSomething && !mv.healing) await msg("그러나 아무 일도 일어나지 않았다!");
}

/* ===================== 경험치/레벨업/진화 ===================== */
function queueEvolution(mon) {
  for (const e of POKEDEX[mon.id].evolutions) {
    if (e.method === "level" && mon.level >= e.level) {
      if (!game.pendingEvo.some((p) => p.mon === mon)) game.pendingEvo.push({ mon, to: e.to });
      return;
    }
  }
}
async function learnMovesAt(mon, level) {
  for (const [lv, mvEn] of POKEDEX[mon.id].learnset) {
    if (lv !== level || mon.moves.includes(mvEn)) continue;
    const mvName = MOVES[mvEn].name;
    if (mon.moves.length < 4) {
      mon.moves.push(mvEn);
      await msg(`${josa(mvName, "을", "를")} 배웠다!`);
    } else {
      await msg(`${josa(mvName, "을", "를")} 배우고 싶다. 어느 기술을 잊을까?`);
      const i = await choose([...mon.moves.map((m) => MOVES[m].name), "배우지 않는다"], { cancelable: false, title: "기술 교체" });
      if (i >= 0 && i < mon.moves.length) {
        const old = MOVES[mon.moves[i]].name;
        mon.moves[i] = mvEn;
        await msg(`${josa(old, "을", "를")} 잊고 ${josa(mvName, "을", "를")} 배웠다!`);
      } else await msg(`${josa(mvName, "을", "를")} 배우지 않았다.`);
    }
  }
}
async function levelUpTo(mon, newLevel) {
  while (mon.level < newLevel && mon.level < 100) {
    mon.level++;
    const prevMax = mon.maxHp;
    computeStats(mon);
    mon.hp = Math.min(mon.maxHp, mon.hp + (mon.maxHp - prevMax));
    sfx.levelUp();
    await msg(`${josa(monName(mon), "이", "가")} 레벨 ${mon.level}이 되었다!`);
    await learnMovesAt(mon, mon.level);
    queueEvolution(mon);
  }
}
async function gainExp(mon, enemy) {
  const gain = Math.max(1, Math.floor(POKEDEX[enemy.id].expYield * enemy.level / 7));
  mon.exp += gain;
  await msg(`${josa(monName(mon), "은", "는")} 경험치 ${gain}을 얻었다!`);
  let target = mon.level;
  while (target < 100 && mon.exp >= expForLevel(target + 1)) target++;
  if (target > mon.level) await levelUpTo(mon, target);
}
async function doEvolution(mon, toId) {
  const oldName = monName(mon);
  await msg(`어라!? ${josa(oldName, "이", "가")} 이상하다...!`);
  const c = await choose(["진화시킨다", "그만둔다"], { cancelable: false, x: 60, y: 300, w: 260 });
  if (c !== 0) { await msg(`${josa(oldName, "은", "는")} 진화를 멈췄다.`); return; }
  sfx.evolve();
  const hpLost = mon.maxHp - mon.hp;
  mon.id = toId;
  computeStats(mon);
  mon.hp = Math.max(1, mon.maxHp - hpLost);
  dexAdd(game.dexSeen, toId);
  dexAdd(game.dexCaught, toId);
  await msg(`축하합니다! ${josa(oldName, "은", "는")} ${josa(monName(mon), "으로", "로")} 진화했다!`);
}
async function processPendingEvolutions() {
  const queue = game.pendingEvo.splice(0);
  for (const { mon, to } of queue) await doEvolution(mon, to);
}

/* ===================== 포획 ===================== */
async function tryCatch(b) {
  game.bag["몬스터볼"]--;
  const e = b.enemy;
  await msg("몬스터볼을 던졌다!");
  const statusBonus = e.status ? (["slp", "frz"].includes(e.status.k) ? 2 : 1.5) : 1;
  const base = (POKEDEX[e.id].catchRate / 255) * (1 - 0.7 * e.hp / e.maxHp) * statusBonus;
  const p = Math.min(0.95, Math.max(0.02, base));
  const ok = Math.random() < p;
  const shakes = ok ? 3 : rint(0, 2);
  let s = "";
  for (let i = 0; i < shakes; i++) { s += "흔들... "; tone(520, 0.05); await msgAuto(s, 600); }
  if (!ok) { await msg("아앗! 나와버렸다!"); return false; }
  sfx.catchOk();
  e.status = null;
  dexAdd(game.dexCaught, e.id);
  await msg(`신난다! ${josa(monName(e), "을", "를")} 잡았다!`);
  if (game.party.length < 6) {
    game.party.push(e);
    await msg(`${josa(monName(e), "이", "가")} 동료가 되었다!`);
  } else {
    game.boxMons.push(e);
    await msg(`지닌 자리가 가득 차서 ${josa(monName(e), "은", "는")} 박스로 보내졌다.`);
  }
  return true;
}

/* ===================== 전투 메뉴 ===================== */
async function battlePartyMenu(b, forced = false) {
  while (true) {
    const labels = game.party.map((m) =>
      `${monName(m)} Lv${m.level}  ${m.hp}/${m.maxHp}${m.status ? " " + STATUS_LABEL[m.status.k] : ""}${m === b.player ? " (전투중)" : ""}${m.hp <= 0 ? " 기절" : ""}`);
    const i = await choose(labels, { cancelable: !forced, title: "포켓몬 선택", x: 60, y: 100, w: 500, sprite: (i2) => game.party[i2].id });
    if (i === -1) return false;
    const sel = game.party[i];
    if (sel.hp <= 0) { await msg("기절한 포켓몬은 싸울 수 없다!"); continue; }
    if (sel === b.player && !forced) { await msg("이미 싸우고 있다!"); continue; }
    b.player = sel;
    b.stages.pl = { atk: 0, def: 0, spd: 0, spc: 0 };
    await msg(`가라! ${monName(sel)}!`);
    return true;
  }
}
async function useHealItem(item, inBattle) {
  const targets = game.party.map((m) => `${monName(m)}  ${m.hp}/${m.maxHp}`);
  const t = await choose(targets, { title: "누구에게 쓸까?", x: 60, y: 100, w: 440 });
  if (t === -1) return false;
  const mon = game.party[t];
  if (mon.hp <= 0) { await msg("기절한 포켓몬에게는 효과가 없다!"); return false; }
  if (mon.hp >= mon.maxHp) { await msg("HP가 가득 차 있다!"); return false; }
  game.bag[item]--;
  mon.hp = Math.min(mon.maxHp, mon.hp + HEAL_AMOUNT[item]);
  sfx.heal();
  await msg(`${josa(monName(mon), "은", "는")} HP를 ${HEAL_AMOUNT[item]} 회복했다!`);
  return true;
}
async function battleBagMenu(b) {
  while (true) {
    const items = Object.keys(game.bag).filter((k) => game.bag[k] > 0);
    if (items.length === 0) { await msg("가방이 비었다!"); return false; }
    const i = await choose(items.map((k) => `${k} x${game.bag[k]}`), { title: "가방", x: 60, y: 120, w: 360 });
    if (i === -1) return false;
    const item = items[i];
    if (item === "몬스터볼") {
      if (b.trainer) { await msg("다른 트레이너의 포켓몬에 볼을 던질 수는 없다!"); continue; }
      return (await tryCatch(b)) ? "caught" : "used";
    }
    if (HEAL_AMOUNT[item]) {
      if (await useHealItem(item, true)) return "used";
      continue;
    }
    await msg("지금은 쓸 수 없다.");
  }
}

/* ===================== 전투 본체 ===================== */
/* 반환: true = 전투 종료, false = 트레이너의 다음 포켓몬으로 전투 계속 */
async function handleEnemyFaint(b) {
  sfx.faint();
  await msg(`${b.trainer ? "" : "야생의 "}${josa(monName(b.enemy), "이", "가")} 쓰러졌다!`);
  await gainExp(b.player, b.enemy);
  if (b.trainer && b.queue.length) {
    b.enemy = b.queue.shift();
    b.stages.en = { atk: 0, def: 0, spd: 0, spc: 0 };
    dexAdd(game.dexSeen, b.enemy.id);
    await msg(`${b.trainer.name}: 가라, ${monName(b.enemy)}!`);
    return false;
  }
  const prize = b.trainer ? b.trainer.prize : b.enemy.level * 20;
  game.money += prize;
  sfx.money();
  if (b.trainer) await msg(`${b.trainer.name}에게 이겼다! 상금 ${prize}원을 받았다!`);
  else await msg(`상금 ${prize}원을 받았다!`);
  return true;
}
async function handlePlayerFaint(b) {
  sfx.faint();
  await msg(`${josa(monName(b.player), "이", "가")} 쓰러졌다!`);
  if (firstAlive()) {
    await battlePartyMenu(b, true);
    return false;
  }
  await msg("눈앞이 캄캄해졌다...");
  game.party.forEach((m) => { m.hp = m.maxHp; m.status = null; });
  game.px = game.lastHeal.x; game.py = game.lastHeal.y; game.dir = "down";
  return true;
}
/* 반환: "blackout"(플레이어 전멸) | "end"(적 전멸로 종료) | null(전투 계속) */
async function enemyFreeAttack(b) {
  const e = b.enemy;
  if (e.hp <= 0) return null;
  if (await canAct(e)) {
    await useMove(b, e, b.player, aiMove(e));
    if (b.player.hp <= 0 && await handlePlayerFaint(b)) return "blackout";
  }
  if (await endChip(e)) { if (await handleEnemyFaint(b)) return "end"; }
  return null;
}

/* opts.trainer = { name, team: [mon...], prize } → 트레이너 연속 전투 (포획·도주 불가) */
async function startBattle(enemy, opts = {}) {
  game.state = "battle";
  sfx.encounter();
  const trainer = opts.trainer || null;
  if (trainer && trainer.team) enemy = trainer.team[0];
  const b = {
    enemy, player: firstAlive(),
    isLegend: opts.legend || false,
    trainer, queue: trainer ? trainer.team.slice(1) : [],
    bgType: opts.bgType || "field",
    stages: { pl: { atk: 0, def: 0, spd: 0, spc: 0 }, en: { atk: 0, def: 0, spd: 0, spc: 0 } },
  };
  ui.battle = b;
  dexAdd(game.dexSeen, enemy.id);
  await msg(trainer
    ? `${trainer.name}와의 승부! 상대는 ${josa(monName(enemy), "을", "를")} 내보냈다!`
    : opts.legend
      ? `${josa(monName(enemy), "이", "가")} 눈을 떴다!`
      : `앗! 야생의 ${josa(monName(enemy), "이", "가")} 나타났다!`);
  await msg(`가라! ${monName(b.player)}!`);
  let result = "end";

  battle: while (true) {
    const action = await choose(["싸운다", "가방", "포켓몬", "도망간다"],
      { cancelable: false, cols: 2, x: 400, y: 460, w: 368 });

    if (action === 0) {
      const list = usableMoves(b.player);
      const mi = await choose(list.map((m) => MOVES[m].name), {
        cols: 2, x: 0, y: 460, w: 768,
        info: (i) => {
          const mv = MOVES[list[i]];
          return `${mv.type} / ${mv.cls === "status" ? "변화" : "위력 " + (mv.power || "—")} / 명중 ${mv.acc}`;
        },
      });
      if (mi === -1) continue;
      const pFirst = effStat(b.player, "spd", b.stages.pl) >= effStat(b.enemy, "spd", b.stages.en);
      const order = pFirst
        ? [[b.player, b.enemy, list[mi]], [b.enemy, b.player, null]]
        : [[b.enemy, b.player, null], [b.player, b.enemy, list[mi]]];
      for (const [att, def, mvEn] of order) {
        if (att.hp <= 0 || def.hp <= 0) continue;
        if (await canAct(att)) {
          await useMove(b, att, def, mvEn || aiMove(b.enemy));
        }
        await endChip(att);
        // 기절 정리
        if (b.enemy.hp <= 0) {
          if (await handleEnemyFaint(b)) break battle;
          break; // 트레이너의 다음 포켓몬 등장 → 다음 라운드
        }
        if (b.player.hp <= 0) {
          if (await handlePlayerFaint(b)) { result = "blackout"; break battle; }
          break; // 교체 후 라운드 종료
        }
      }
    } else if (action === 1) {
      const r = await battleBagMenu(b);
      if (r === "caught") { result = "caught"; break battle; }
      if (r === "used") {
        const fr = await enemyFreeAttack(b);
        if (fr) { result = fr; break battle; }
      }
    } else if (action === 2) {
      const prev = b.player;
      if (await battlePartyMenu(b) && b.player !== prev) {
        const fr = await enemyFreeAttack(b);
        if (fr) { result = fr; break battle; }
      }
    } else {
      if (b.trainer) { await msg("트레이너와의 승부 도중에는 도망칠 수 없다!"); continue; }
      if (effStat(b.player, "spd", b.stages.pl) >= effStat(b.enemy, "spd", b.stages.en) || Math.random() < 0.6) {
        await msg("무사히 도망쳤다!");
        result = "fled";
        break battle;
      }
      await msg("도망칠 수 없었다!");
      const fr = await enemyFreeAttack(b);
      if (fr) { result = fr; break battle; }
    }
  }
  ui.battle = null;
  game.state = "world";
  await processPendingEvolutions();
  return result;
}

/* ===================== 월드: 이동/이벤트 ===================== */
const canSurf = () => (game.bag["비전머신03"] || 0) > 0 && game.flags.badges.includes("핑크배지");
function tryStartMove(dx, dy, dir) {
  game.dir = dir;
  const tx = game.px + dx, ty = game.py + dy;
  const t = worldTile(tx, ty);
  if (t === "W" ? !canSurf() : SOLID_TILES.has(t)) return;
  if (npcAt(tx, ty)) return;
  const onWater = t === "W" || worldTile(game.px, game.py) === "W";
  const dur = !onWater && game.flags.bikeOn && game.bag["자전거"] ? 75 : 150;
  game.moving = { fx: game.px, fy: game.py, tx, ty, start: performance.now(), dur };
}
async function onArrive() {
  const t = worldTile(game.px, game.py);
  const key = game.px + "," + game.py;
  if (t === "H" || t === "h") {
    if (!game.healCooldown) {
      game.healCooldown = true;
      game.party.forEach((m) => { m.hp = m.maxHp; m.status = null; });
      game.lastHeal = { x: game.px, y: game.py };
      sfx.heal();
      await msg(t === "h" ? "집에서 푹 쉬었다. 포켓몬이 모두 기운을 되찾았다!"
        : "포켓몬센터에서 쉬었다. 포켓몬이 모두 기운을 되찾았다!");
    }
    return;
  }
  game.healCooldown = false;
  if (t === "M") { await shopMenu(); return; }
  if (t === "D") { await gymChallenge(key); return; }
  if (t === "E") { await leagueChallenge(); return; }
  if (t === "I" && !game.flags.items.includes(key)) {
    game.flags.items.push(key);
    WORLD[game.py][game.px] = ".";
    const item = ITEMS_AT[key];
    game.bag[item] = (game.bag[item] || 0) + (item === "몬스터볼" ? 5 : 1);
    sfx.money();
    await msg(`${josa(item, "을", "를")} ${item === "몬스터볼" ? "5개 " : ""}손에 넣었다!`);
    return;
  }
  if (ENCOUNTER_TILES.has(t) && Math.random() < ENCOUNTER_RATE) {
    const zone = zoneAt(game.px, game.py);
    if (zone && zone.pool) {
      const bg = zone.type === "cave" ? "cave" : (zone.type.startsWith("water") ? "water" : "field");
      await startBattle(pickEncounter(zone), { bgType: bg });
    }
  }
}
async function interact() {
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[game.dir];
  const fx = game.px + d[0], fy = game.py + d[1];
  const t = worldTile(fx, fy);
  const key = fx + "," + fy;
  const npc = npcAt(fx, fy);
  if (npc) { await interactNPC(npc); return; }
  if (t === "S" && SIGN_TEXT[key]) { await msg(SIGN_TEXT[key]); return; }
  if (t === "L" && LEGEND_AT[key] && !game.flags.legends.includes(key)) {
    const spec = LEGEND_AT[key];
    dexAdd(game.dexSeen, spec.id);
    await msg(`강대한 기운이 느껴진다... ${josa(POKEDEX[spec.id].name, "이", "가")} 잠들어 있다!`);
    const c = await choose(["깨운다", "그만둔다"], { cancelable: false, x: 60, y: 300, w: 240 });
    if (c !== 0) return;
    const legend = makeMon(spec.id, spec.level);
    const zone = zoneAt(fx, fy);
    const bg = zone && zone.type === "cave" ? "cave" : "field";
    const result = await startBattle(legend, { legend: true, bgType: bg });
    if (result === "caught" || result === "end") {
      game.flags.legends.push(key);
      WORLD[fy][fx] = zone && zone.type === "cave" ? "c" : ".";
    }
  }
}

/* ===================== NPC 상호작용 ===================== */
async function runTrainerBattle(name, teamSpec, prize, bg) {
  const team = teamSpec.map(([id, lv]) => makeMon(id, lv));
  const r = await startBattle(null, { trainer: { name, team, prize }, bgType: bg || "field" });
  return r === "end";
}
async function interactNPC(npc) {
  const done = game.flags.npcDone.includes(npc.id);
  const q = game.flags.quests;
  switch (npc.kind) {
    case "talk":
      for (const l of npc.lines) await msg(`${npc.name}: ${l}`);
      return;
    case "gate":
      if (game.flags.badges.length >= npc.need) { await msg(`${npc.name}: ${npc.pass}`); markDone(npc); }
      else await msg(`${npc.name}: ${npc.deny}`);
      return;
    case "gateFlag":
      if (npc.flag === "champion" && q.champion) { await msg(`${npc.name}: ${npc.pass}`); markDone(npc); }
      else await msg(`${npc.name}: ${npc.deny}`);
      return;
    case "snorlax": {
      if (!game.bag["포켓몬피리"]) {
        await msg("잠만보가 길을 막은 채 쿨쿨 자고 있다... 어지간한 소리로는 깨어날 것 같지 않다.");
        return;
      }
      await msg("포켓몬피리를 불었다! 잠만보가 벌떡 일어나 덤벼들었다!");
      const r = await startBattle(makeMon(143, npc.level), { bgType: "field" });
      if (r === "end" || r === "caught") {
        markDone(npc);
        if (r === "end") await msg("잠만보는 어슬렁어슬렁 산속으로 떠나갔다.");
      } else {
        await msg("잠만보는 다시 드러누워 잠들어 버렸다...");
      }
      return;
    }
    case "trainer": {
      if (done) { await msg(`${npc.name}: ${npc.win}`); return; }
      await msg(`${npc.name}: ${npc.intro}`);
      const prize = Math.max(...npc.team.map((t) => t[1])) * 40;
      const z = zoneAt(npc.x, npc.y);
      if (await runTrainerBattle(npc.name, npc.team, prize, z && z.type === "cave" ? "cave" : "field")) {
        markDone(npc);
        await msg(`${npc.name}: ${npc.win}`);
      }
      return;
    }
    case "gift": {
      if (done) { await msg(`${npc.name}: ${npc.after || "..."}`); return; }
      if (npc.needBadges && game.flags.badges.length < npc.needBadges) {
        await msg(`${npc.name}: ${npc.denyLine}`);
        return;
      }
      for (const l of npc.lines) await msg(`${npc.name}: ${l}`);
      let spec = npc.mon;
      if (npc.choice) {
        const i = await choose(npc.choiceLabels.concat(["다음에 받는다"]), { cancelable: true, x: 60, y: 280, w: 340 });
        if (i === -1 || i >= npc.choice.length) { await msg(`${npc.name}: 마음이 정해지면 다시 오게.`); return; }
        spec = npc.choice[i];
        if (npc.id === "fossil_sci") q.fossil = spec[0];
      }
      await receiveMon(makeMon(spec[0], spec[1]));
      markDone(npc);
      return;
    }
    case "vendor": {
      if (!npc.repeat && done) { await msg(`${npc.name}: 품절이야. 미안하군!`); return; }
      for (const l of npc.lines) await msg(`${npc.name}: ${l}`);
      const c = await choose([`산다 (${npc.price}원)`, "그만둔다"], { cancelable: false, x: 60, y: 300, w: 280 });
      if (c !== 0) { await msg(`${npc.name}: 거참, 아쉽네!`); return; }
      if (game.money < npc.price) { await msg("돈이 부족하다!"); return; }
      game.money -= npc.price;
      sfx.money();
      await receiveMon(makeMon(npc.mon[0], npc.mon[1]));
      if (!npc.repeat) markDone(npc);
      return;
    }
    case "itemVendor": {
      if (!npc.repeat && done) { await msg(`${npc.name}: 품절이야. 미안하군!`); return; }
      for (const l of npc.lines) await msg(`${npc.name}: ${l}`);
      const c = await choose([`산다 (${npc.price}원)`, "그만둔다"], { cancelable: false, x: 60, y: 300, w: 280 });
      if (c !== 0) { await msg(`${npc.name}: 언제든 다시 와!`); return; }
      if (game.money < npc.price) { await msg("돈이 부족하다!"); return; }
      game.money -= npc.price;
      sfx.money();
      game.bag[npc.item] = (game.bag[npc.item] || 0) + 1;
      await msg(`${josa(npc.item, "을", "를")} 손에 넣었다!`);
      if (!npc.repeat) markDone(npc);
      return;
    }
    case "giftItem": {
      if (done) { await msg(`${npc.name}: ${npc.after || "잘 지내게!"}`); return; }
      for (const l of npc.lines) await msg(`${npc.name}: ${l}`);
      game.bag[npc.item] = (game.bag[npc.item] || 0) + npc.count;
      sfx.money();
      await msg(`${josa(npc.item, "을", "를")} 손에 넣었다!`);
      markDone(npc);
      return;
    }
    case "oak": {
      if (q.parcel === 0) {
        await msg("오박사: 오, 잘 왔구나! 미안하지만 부탁이 하나 있단다.");
        await msg("오박사: 상록시티 프렌들리숍에 연구용 소포를 맡겨 뒀는데, 받아와 주겠니?");
      } else if (q.parcel === 1) {
        await msg("오박사: 오오, 그 소포구나! 수고했다. 답례로 이걸 받으렴.");
        game.bag["몬스터볼"] = (game.bag["몬스터볼"] || 0) + 5;
        game.bag["이상한사탕"] = (game.bag["이상한사탕"] || 0) + 1;
        sfx.money();
        await msg("몬스터볼 5개와 이상한사탕을 손에 넣었다!");
        q.parcel = 2;
      } else {
        await msg(`오박사: 도감은 잘 채워지고 있니? 본 포켓몬 ${game.dexSeen.length}종, 잡은 포켓몬 ${game.dexCaught.length}종이구나!`);
        if (q.champion) await msg("오박사: 챔피언이 된 네 모습, 정말 자랑스럽단다!");
      }
      return;
    }
    case "clerk": {
      if (q.parcel === 0) {
        await msg("점원: 어서 오세요! ...아, 태초마을에서 온 트레이너죠? 오박사님께 보낼 소포를 부탁해도 될까요?");
        await msg("오박사의 소포를 받았다!");
        q.parcel = 1;
      } else if (q.parcel === 1) {
        await msg("점원: 그 소포, 오박사님께 잘 전해 주세요!");
      } else {
        await msg("점원: 늘 이용해 주셔서 감사합니다! 물건은 옆 상점 카운터에서!");
      }
      return;
    }
    case "rival1": {
      if (done) { await msg("라이벌: 다음엔 안 져. 내 포켓몬은 점점 강해지고 있다고!"); return; }
      await msg("라이벌: 마침 잘 됐다! 포켓몬을 받은 기념으로... 나와 승부다!");
      const counter = RIVAL_COUNTER[game.flags.starter] || 4;
      if (await runTrainerBattle("라이벌", [[counter, 5]], 100)) {
        markDone(npc);
        await msg("라이벌: 뭐, 뭐야! 잘못 골랐나... 두고 봐!");
      }
      return;
    }
    case "rival2": {
      if (done) { await msg("라이벌: 난 체육관 배지를 모으는 중이야. 너도 서두르는 게 좋을걸?"); return; }
      await msg("라이벌: 어? 너도 여기까지 왔냐? 그럼 실력 좀 볼까!");
      const counter = RIVAL_COUNTER[game.flags.starter] || 4;
      if (await runTrainerBattle("라이벌", [[16, 9], [counter, 8]], 280)) {
        markDone(npc);
        await msg("라이벌: 쳇! 포켓몬리그로 가는 길은 이쪽이지만... 지금 너한텐 무리겠지!");
      }
      return;
    }
    case "fossilLab": {
      if (done) { await msg("조수: 화석 연구는 계속됩니다. 태고의 낭만이죠!"); return; }
      if (!q.fossil) { await msg("조수: 달맞이산에서 화석이 나온다던데, 아직 실물을 못 봤어요."); return; }
      if (!q.champion) { await msg("조수: 달맞이산의 남은 화석을 양도받아 부활 연구 중이에요. 완성까지는 아직..."); return; }
      const other = q.fossil === 138 ? 140 : 138;
      await msg("조수: 챔피언님! 마침 잘 오셨어요. 남은 화석의 부활에 성공했습니다. 받아 주세요!");
      await receiveMon(makeMon(other, 30));
      markDone(npc);
      return;
    }
  }
}

/* ===================== 체육관 / 포켓몬리그 ===================== */
async function gymChallenge(doorKey) {
  const cityKey = GYM_AT[doorKey];
  const gym = KANTO_GYMS[cityKey];
  if (!gym) return;
  if (game.flags.badges.includes(gym.badge)) {
    await msg(`${gym.leader}: 좋은 승부였다. ${josa(gym.badge, "은", "는")} 네 실력의 증표다!`);
    return;
  }
  if (gym.need && game.flags.badges.length < gym.need) {
    await msg(`체육관 문이 굳게 잠겨 있다. "배지 ${gym.need}개를 모은 도전자만 받는다 — 관장"`);
    return;
  }
  const c = await choose(["도전한다", "그만둔다"], { cancelable: false, x: 60, y: 300, w: 240 });
  if (c !== 0) return;
  await msg(`관장 ${gym.leader}: 잘 왔다, 도전자! 이 체육관의 벽이 얼마나 높은지 보여주지!`);
  const prize = Math.max(...gym.team.map((t) => t[1])) * 100;
  if (await runTrainerBattle(`관장 ${gym.leader}`, gym.team, prize)) {
    game.flags.badges.push(gym.badge);
    sfx.levelUp();
    await msg(`관장 ${gym.leader}: 완패다! 자, ${josa(gym.badge, "을", "를")} 받아라!`);
    await msg(`${josa(gym.badge, "을", "를")} 손에 넣었다! (${game.flags.badges.length}/8)`);
  }
}
async function leagueChallenge() {
  const q = game.flags.quests;
  if (game.flags.badges.length < 8) {
    await msg(`접수원: 사천왕 도전에는 배지 8개가 필요합니다. 현재 ${game.flags.badges.length}개시네요.`);
    return;
  }
  if (q.champion) {
    await msg("접수원: 챔피언님, 방문을 환영합니다! 재도전 접수도 가능합니다.");
  }
  const c = await choose(["사천왕에 도전한다", "그만둔다"], { cancelable: false, x: 60, y: 300, w: 320 });
  if (c !== 0) return;
  await msg("접수원: 지금부터 사천왕 4연전, 이어서 챔피언전입니다. 도중 회복은 없습니다. 행운을 빕니다!");
  for (const e4 of ELITE_FOUR) {
    await msg(`${e4.name}: 잘 왔다, 도전자여. 전력으로 상대해 주지!`);
    const prize = Math.max(...e4.team.map((t) => t[1])) * 100;
    if (!await runTrainerBattle(e4.name, e4.team, prize)) return;
    await msg(`${e4.name}: 훌륭하다... 다음 방으로 가라!`);
  }
  await msg("라이벌: ...왔구나. 내가 한발 먼저 사천왕을 꺾고 챔피언이 됐다!");
  await msg("라이벌: 하지만 진짜 챔피언이 누군지, 지금 여기서 정하자!");
  const team = CHAMPION_TEAM[game.flags.starter] || CHAMPION_TEAM[1];
  if (!await runTrainerBattle("챔피언 라이벌", team, 9900)) return;
  q.champion = true;
  game.party.forEach((m) => { m.hp = m.maxHp; m.status = null; });
  sfx.evolve();
  await msg("라이벌: ...졌다. 네가 새로운 챔피언이다.");
  await msg("관동 포켓몬리그 챔피언에 등극했다! 전당에 이름이 새겨졌다!");
  await msg("어디선가: 블루시티 동굴의 봉인이 풀렸다는 소문이 들려온다...");
}

/* ===================== 상점 ===================== */
async function shopMenu() {
  await msg("어서 오세요! 무엇을 드릴까요?");
  while (true) {
    const labels = SHOP_LIST.map(([n, p]) => `${n} — ${p}원 (보유 ${game.bag[n] || 0})`).concat(["나가기"]);
    const i = await choose(labels, { title: `프렌들리숍 — 소지금 ${game.money}원`, x: 60, y: 100, w: 460, cancelable: true });
    if (i === -1 || i === SHOP_LIST.length) { await msg("또 오세요!"); return; }
    const [name, price] = SHOP_LIST[i];
    if (game.money < price) { await msg("돈이 부족하다!"); continue; }
    game.money -= price;
    game.bag[name] = (game.bag[name] || 0) + 1;
    sfx.money();
  }
}

/* ===================== 세이브 ===================== */
function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    ver: SAVE_VER,
    px: game.px, py: game.py,
    party: game.party, boxMons: game.boxMons, bag: game.bag,
    money: game.money, flags: game.flags,
    dexSeen: game.dexSeen, dexCaught: game.dexCaught,
    lastHeal: game.lastHeal,
  }));
}
function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!d || !d.party || !d.party.length) return false;
    if (!d.ver || d.ver < SAVE_VER) {
      /* 구버전(이전 맵) 세이브 마이그레이션:
         파티·박스·가방·돈·도감은 그대로 보존, 좌표·맵 흔적만 초기화 */
      Object.assign(game, {
        px: START.x, py: START.y,
        party: d.party, boxMons: d.boxMons || [],
        bag: d.bag || {}, money: d.money || 0,
        dexSeen: d.dexSeen || [], dexCaught: d.dexCaught || [],
        lastHeal: { x: START.x, y: START.y },
        flags: freshFlags(),
      });
      game.flags.starter = STARTER_IDS.find((id) => game.dexCaught.includes(id)) || 1;
      game._migrated = true;
    } else {
      const f = Object.assign(freshFlags(), d.flags || {});
      f.quests = Object.assign(freshFlags().quests, (d.flags && d.flags.quests) || {});
      Object.assign(game, {
        px: d.px, py: d.py, party: d.party, boxMons: d.boxMons || [],
        bag: d.bag, money: d.money || 0, flags: f,
        dexSeen: d.dexSeen || [], dexCaught: d.dexCaught || [],
        lastHeal: d.lastHeal || { x: START.x, y: START.y },
      });
      // 수집/격파 흔적 맵 반영 (v3 좌표만)
      for (const key of game.flags.items) {
        const [x, y] = key.split(",").map(Number);
        WORLD[y][x] = ".";
      }
      for (const key of game.flags.legends) {
        const [x, y] = key.split(",").map(Number);
        const z = zoneAt(x, y);
        WORLD[y][x] = z && z.type === "cave" ? "c" : ".";
      }
    }
    game.party.concat(game.boxMons).forEach((m) => { computeStats(m); m.hp = Math.min(m.hp, m.maxHp); });
    return true;
  } catch (e) { return false; }
}

/* ===================== 세이브 파일 입출력 (JSON) ===================== */
let _saveFileHandle = null; // File System Access API 핸들 (localhost/https에서만 유지)

function _setSaveStatus(text, isError) {
  const el = document.getElementById("saveStatus");
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#e88" : "#9aa0c0";
}

async function exportSaveFile() {
  // 진행 중이면 현재 상태를 먼저 저장해 최신 진행도를 내보냄
  if (game.state === "world" && Array.isArray(game.party) && game.party.length) saveGame();
  const data = localStorage.getItem(SAVE_KEY);
  if (!data) { _setSaveStatus("저장된 기록이 없습니다. 게임 메뉴에서 '저장'을 먼저 하세요.", true); return; }
  // 1) localhost/https(크로미엄): 저장 위치를 직접 지정 → 작업 폴더에 바로 저장
  if (window.showSaveFilePicker) {
    try {
      const handle = _saveFileHandle || await window.showSaveFilePicker({
        suggestedName: "pokeclone_save.json",
        types: [{ description: "포켓몬 클론 세이브", accept: { "application/json": [".json"] } }],
      });
      const w = await handle.createWritable();
      await w.write(data);
      await w.close();
      _saveFileHandle = handle;
      _setSaveStatus("파일로 저장했습니다: " + handle.name);
      return;
    } catch (e) {
      if (e && e.name === "AbortError") { _setSaveStatus("저장을 취소했습니다."); return; }
      // 미지원·권한 거부 → 다운로드 폴백
    }
  }
  // 2) 폴백: 브라우저 다운로드 (file://에서도 동작, 다운로드 폴더로 저장됨)
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "pokeclone_save.json";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  _setSaveStatus("세이브 파일을 다운로드했습니다 (브라우저 다운로드 폴더).");
}

function _applyImportedSave(text) {
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { _setSaveStatus("올바른 JSON 파일이 아닙니다.", true); return; }
  if (!parsed || !Array.isArray(parsed.party) || !parsed.party.length) {
    _setSaveStatus("세이브 형식이 올바르지 않습니다 (party 없음).", true); return;
  }
  localStorage.setItem(SAVE_KEY, text);
  _setSaveStatus("세이브를 불러왔습니다. 잠시 후 새로고침해 '이어하기'로 진행합니다…");
  setTimeout(() => location.reload(), 900);
}

async function importSaveFile() {
  // 1) localhost/https(크로미엄): 파일 선택 창
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: "포켓몬 클론 세이브", accept: { "application/json": [".json"] } }],
      });
      const file = await handle.getFile();
      _applyImportedSave(await file.text());
      return;
    } catch (e) {
      if (e && e.name === "AbortError") { _setSaveStatus("불러오기를 취소했습니다."); return; }
      // 폴백
    }
  }
  // 2) 폴백: 숨김 <input type=file>
  const fi = document.getElementById("fileImport");
  if (fi) fi.click();
}

(function initSaveButtons() {
  const be = document.getElementById("btnExport");
  const bi = document.getElementById("btnImport");
  const fi = document.getElementById("fileImport");
  if (be) be.addEventListener("click", (e) => { e.currentTarget.blur(); exportSaveFile(); });
  if (bi) bi.addEventListener("click", (e) => { e.currentTarget.blur(); importSaveFile(); });
  if (fi) fi.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) f.text().then(_applyImportedSave);
    e.target.value = ""; // 같은 파일 재선택 허용
  });
})();

/* ===================== 월드 메뉴 ===================== */
async function partyMenuWorld() {
  while (true) {
    const labels = game.party.map((m, idx) =>
      `${idx === 0 ? "▶" : "  "}${monName(m)} Lv${m.level}  HP ${m.hp}/${m.maxHp}${m.status ? " " + STATUS_LABEL[m.status.k] : ""}`);
    const p = await choose(labels, { title: "포켓몬 (첫 번째가 선두)", x: 60, y: 90, w: 480, sprite: (i2) => game.party[i2].id });
    if (p === -1) return;
    const mon = game.party[p];
    const acts = ["맨 앞으로", "능력 보기"];
    if (game.party.length > 1) acts.push("박스로 보낸다");
    acts.push("돌아가기");
    const a = await choose(acts, { x: 560, y: 150, w: 190 });
    if (a === 0) {
      const [sel] = game.party.splice(p, 1);
      game.party.unshift(sel);
    } else if (a === 1) {
      const d = POKEDEX[mon.id];
      await msg(`${monName(mon)} Lv${mon.level} (${d.types.join("/")})  공격 ${mon.atk} / 방어 ${mon.def} / 특수 ${mon.spc} / 스피드 ${mon.spd}`);
      await msg(`기술: ${usableMoves(mon).map((m) => MOVES[m].name).join(", ")}`);
    } else if (a === 2 && game.party.length > 1) {
      game.party.splice(p, 1);
      game.boxMons.push(mon);
      await msg(`${josa(monName(mon), "을", "를")} 박스로 보냈다.`);
    }
  }
}
async function boxMenuWorld() {
  while (true) {
    if (!game.boxMons.length) { await msg("박스가 비어 있다."); return; }
    const labels = game.boxMons.map((m) => `${monName(m)} Lv${m.level}  HP ${m.hp}/${m.maxHp}`);
    const i = await choose(labels, { title: `박스 (${game.boxMons.length}마리)`, x: 60, y: 70, w: 480, maxRows: 11, sprite: (i2) => game.boxMons[i2].id });
    if (i === -1) return;
    const mon = game.boxMons[i];
    const a = await choose(["파티에 넣는다", "돌아가기"], { x: 560, y: 150, w: 190 });
    if (a !== 0) continue;
    if (game.party.length < 6) {
      game.boxMons.splice(i, 1);
      game.party.push(mon);
      await msg(`${josa(monName(mon), "이", "가")} 파티에 합류했다!`);
    } else {
      const swap = await choose(game.party.map((m) => `${monName(m)} Lv${m.level}`), { title: "맞바꿀 포켓몬은?", x: 60, y: 110, w: 420 });
      if (swap === -1) continue;
      const out = game.party[swap];
      game.party[swap] = mon;
      game.boxMons.splice(i, 1);
      game.boxMons.push(out);
      await msg(`${josa(monName(out), "을", "를")} 박스로 보내고 ${josa(monName(mon), "을", "를")} 데려왔다!`);
    }
  }
}
async function dexMenuWorld() {
  const ids = Array.from({ length: 151 }, (_, i) => i + 1);
  const labels = ids.map((id) => {
    const caught = game.dexCaught.includes(id), seen = game.dexSeen.includes(id);
    const name = caught || seen ? POKEDEX[id].name : "???";
    const mark = caught ? "●" : seen ? "○" : "  ";
    return `No.${String(id).padStart(3, "0")} ${mark} ${name}`;
  });
  while (true) {
    const i = await choose(labels, {
      title: `포켓몬도감 — 본 수 ${game.dexSeen.length} / 잡은 수 ${game.dexCaught.length}`,
      x: 120, y: 40, w: 460, maxRows: 13,
      sprite: (i2) => (game.dexSeen.includes(ids[i2]) || game.dexCaught.includes(ids[i2])) ? ids[i2] : null,
    });
    if (i === -1) return;
    const id = ids[i];
    if (!game.dexSeen.includes(id) && !game.dexCaught.includes(id)) { await msg("아직 만난 적 없는 포켓몬이다."); continue; }
    const d = POKEDEX[id];
    await msg(`No.${id} ${d.name} (${d.types.join("/")}) — ${d.dex || "기록 없음"}`, { sprite: id });
  }
}
async function bagMenuWorld() {
  while (true) {
    const items = Object.keys(game.bag).filter((k) => game.bag[k] > 0);
    if (!items.length) { await msg("가방이 비었다!"); return; }
    const i = await choose(items.map((k) => `${k} x${game.bag[k]}`), { title: `가방 — 소지금 ${game.money}원`, x: 60, y: 110, w: 380 });
    if (i === -1) return;
    const item = items[i];
    if (item === "몬스터볼") { await msg("전투 중에만 쓸 수 있다."); continue; }
    if (item === "포켓몬피리") { await msg("길을 막고 잠든 포켓몬 앞에서 말을 걸면 피리를 불 수 있다."); continue; }
    if (item === "자전거") {
      game.flags.bikeOn = !game.flags.bikeOn;
      sfx.confirm();
      await msg(game.flags.bikeOn ? "자전거에 올라탔다! 페달을 밟으면 두 배로 빠르다." : "자전거에서 내렸다.");
      continue;
    }
    if (item === "비전머신03") {
      await msg(canSurf()
        ? "파도타기 비전머신. 물가를 향해 걸으면 그대로 물 위를 나아갈 수 있다."
        : "파도타기 비전머신. 핑크배지가 있어야 물 위로 나아갈 수 있다.");
      continue;
    }
    if (HEAL_AMOUNT[item]) { await useHealItem(item, false); continue; }
    if (item === "이상한사탕") {
      const t = await choose(game.party.map((m) => `${monName(m)} Lv${m.level}`), { title: "누구에게 쓸까?", x: 60, y: 110, w: 420 });
      if (t === -1) continue;
      const mon = game.party[t];
      if (mon.level >= 100) { await msg("더 이상 레벨이 오르지 않는다!"); continue; }
      game.bag[item]--;
      mon.exp = expForLevel(mon.level + 1);
      await levelUpTo(mon, mon.level + 1);
      await processPendingEvolutions();
      continue;
    }
    if (STONES.has(item)) {
      const t = await choose(game.party.map((m) => `${monName(m)} Lv${m.level}`), { title: `${item} — 누구에게 쓸까?`, x: 60, y: 110, w: 420 });
      if (t === -1) continue;
      const mon = game.party[t];
      const evo = POKEDEX[mon.id].evolutions.find((e) => e.method === "stone" && e.item === item);
      if (!evo) { await msg("아무 반응이 없다..."); continue; }
      game.bag[item]--;
      await doEvolution(mon, evo.to);
      continue;
    }
    await msg("지금은 쓸 수 없다.");
  }
}
async function badgeMenuWorld() {
  const owned = game.flags.badges;
  const list = BADGE_ORDER.map((b) => `${owned.includes(b) ? "●" : "○"} ${b}`).join("  ");
  await msg(`배지 ${owned.length}/8 — ${list}`);
  if (owned.length === 8 && !game.flags.quests.champion)
    await msg("배지 8개를 모두 모았다! 석영고원의 포켓몬리그에 도전할 수 있다.");
}
async function worldMenu() {
  while (true) {
    const i = await choose(["포켓몬", "가방", "도감", "배지", "박스", "저장", "닫기"], { x: 560, y: 40, w: 180 });
    if (i === -1 || i === 6) return;
    if (i === 0) await partyMenuWorld();
    else if (i === 1) await bagMenuWorld();
    else if (i === 2) await dexMenuWorld();
    else if (i === 3) await badgeMenuWorld();
    else if (i === 4) await boxMenuWorld();
    else if (i === 5) { saveGame(); sfx.confirm(); await msg("모험 기록을 저장했다!"); }
  }
}

/* ===================== 도입부 ===================== */
async function titleFlow() {
  const hasSave = !!localStorage.getItem(SAVE_KEY);
  const options = hasSave ? ["이어하기", "새로 시작"] : ["새로 시작"];
  const i = await choose(options, { cancelable: false, x: 284, y: 400, w: 200 });
  if (hasSave && i === 0 && loadGame()) {
    game.state = "world";
    if (game._migrated) {
      await msg("관동지방이 원작 지형으로 새로 그려졌다! 파티·도감·가방·소지금은 그대로다.");
      await msg("모험은 태초마을에서 다시 출발한다. 체육관 배지를 모아 포켓몬리그에 도전하자!");
    } else {
      await msg("모험을 이어서 시작한다!");
    }
    return;
  }
  localStorage.removeItem(SAVE_KEY);
  game.state = "world";
  await msg("포켓몬의 세계에 온 것을 환영한다!");
  await msg("여기는 태초마을. 오박사가 첫 포켓몬을 한 마리 주신다고 한다.");
  while (true) {
    const s = await choose(
      STARTER_IDS.map((id) => `${POKEDEX[id].name} (${POKEDEX[id].types.join("/")})`),
      { cancelable: false, title: "파트너 선택", x: 60, y: 140, w: 460, info: (i) => POKEDEX[STARTER_IDS[i]].dex.slice(0, 40), sprite: (i) => STARTER_IDS[i] }
    );
    const id = STARTER_IDS[s];
    const ok = await choose(["좋아, 너로 정했다!", "다시 고른다"], { cancelable: false, x: 60, y: 320, w: 300 });
    if (ok === 0) {
      game.party = [makeMon(id, 5)];
      game.flags.starter = id;
      dexAdd(game.dexSeen, id);
      dexAdd(game.dexCaught, id);
      sfx.catchOk();
      await msg(`${josa(POKEDEX[id].name, "이", "가")} 파트너가 되었다!`);
      break;
    }
  }
  await msg("관동지방을 누비며 151마리의 포켓몬을 모아 보자!");
  await msg("Enter로 메뉴(저장·도감·박스), Z로 조사. 포켓몬센터(십자 건물)에서 회복할 수 있다.");
}

/* ===================== 입력 ===================== */
const KEY_ALIAS = { Z: "z", X: "x", W: "w", A: "a", S: "s", D: "d" };
window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  audioInit();
  const k = KEY_ALIAS[e.key] || e.key;
  held.add(k);
  if (e.repeat) return;
  if (keyResolver) {
    const r = keyResolver;
    keyResolver = null;
    r(k);
    return;
  }
  if (game.state === "world" && !ui.message && !ui.menu && !game.moving) {
    if (k === "z" || k === " ") interact();
    else if (k === "Enter" || k === "Escape" || k === "x") worldMenu();
  }
});
window.addEventListener("keyup", (e) => held.delete(KEY_ALIAS[e.key] || e.key));

/* ===================== 업데이트 ===================== */
function update(now) {
  if (game.moving) {
    const m = game.moving;
    if (now - m.start >= m.dur) {
      game.px = m.tx; game.py = m.ty;
      game.moving = null;
      onArrive();
    }
    return;
  }
  if (game.state !== "world" || ui.message || ui.menu || keyResolver) return;
  if (held.has("ArrowUp") || held.has("w")) tryStartMove(0, -1, "up");
  else if (held.has("ArrowDown") || held.has("s")) tryStartMove(0, 1, "down");
  else if (held.has("ArrowLeft") || held.has("a")) tryStartMove(-1, 0, "left");
  else if (held.has("ArrowRight") || held.has("d")) tryStartMove(1, 0, "right");
}

/* ===================== 렌더: 타일 ===================== */
function playerWorldPos(now) {
  let x = game.px, y = game.py, hop = 0;
  if (game.moving) {
    const m = game.moving;
    const t = Math.min(1, (now - m.start) / m.dur);
    x = m.fx + (m.tx - m.fx) * t;
    y = m.fy + (m.ty - m.fy) * t;
    hop = Math.sin(t * Math.PI) * 3;
  }
  return { x, y, hop };
}
function drawTile(ch, x, y, sx, sy, now) {
  // 바탕
  if ("cRg".includes(ch)) { ctx.fillStyle = "#3a3028"; ctx.fillRect(sx, sy, TILE, TILE); }
  else if (ch === "W") { ctx.fillStyle = "#3d8cf0"; ctx.fillRect(sx, sy, TILE, TILE); }
  else if (ch === "s") { ctx.fillStyle = "#e8dba3"; ctx.fillRect(sx, sy, TILE, TILE); }
  else { ctx.fillStyle = (x + y) % 2 === 0 ? "#7ec850" : "#79c14b"; ctx.fillRect(sx, sy, TILE, TILE); }

  switch (ch) {
    case ".": {
      ctx.fillStyle = "#e8d5a3"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#dcc78f"; ctx.fillRect(sx + 4, sy + 4, 6, 6); ctx.fillRect(sx + 20, sy + 18, 6, 6);
      break;
    }
    case "G": {
      ctx.fillStyle = "#4ea63b"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#3c8c2e";
      for (let i = 0; i < 4; i++) {
        const gx = sx + 3 + i * 8;
        ctx.beginPath(); ctx.moveTo(gx, sy + 28); ctx.lineTo(gx + 3, sy + 10); ctx.lineTo(gx + 6, sy + 28); ctx.fill();
      }
      break;
    }
    case "g": {
      ctx.fillStyle = "#4a3e33"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#5f5045";
      ctx.beginPath(); ctx.arc(sx + 10, sy + 20, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 22, sy + 12, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 20, sy + 24, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "c": {
      ctx.fillStyle = "#4a3e33"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#41362c"; ctx.fillRect(sx + 6, sy + 8, 5, 5); ctx.fillRect(sx + 20, sy + 20, 5, 5);
      break;
    }
    case "R": {
      ctx.fillStyle = "#6a5a48"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#7d6c58"; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = "#5a4c3c"; ctx.fillRect(sx + 6, sy + 14, 8, 6); ctx.fillRect(sx + 18, sy + 6, 8, 6);
      break;
    }
    case "T": {
      ctx.fillStyle = "#6b4a2b"; ctx.fillRect(sx + 12, sy + 18, 8, 12);
      ctx.fillStyle = "#2e7d32"; ctx.beginPath(); ctx.arc(sx + 16, sy + 12, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#388e3c";
      ctx.beginPath(); ctx.arc(sx + 10, sy + 16, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 22, sy + 16, 8, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "W": {
      ctx.strokeStyle = "#7ab8ff"; ctx.lineWidth = 2;
      const ph = Math.sin(now / 500 + x + y) * 2;
      ctx.beginPath();
      ctx.moveTo(sx + 4, sy + 16 + ph);
      ctx.quadraticCurveTo(sx + 10, sy + 12 + ph, sx + 16, sy + 16 + ph);
      ctx.quadraticCurveTo(sx + 22, sy + 20 + ph, sx + 28, sy + 16 + ph);
      ctx.stroke();
      break;
    }
    case "s": {
      ctx.fillStyle = "#dbcb8d"; ctx.fillRect(sx + 5, sy + 7, 4, 3); ctx.fillRect(sx + 20, sy + 20, 4, 3);
      break;
    }
    case "F": {
      ctx.fillStyle = "#a87844";
      ctx.fillRect(sx + 2, sy + 12, TILE - 4, 6);
      ctx.fillRect(sx + 4, sy + 6, 5, 20); ctx.fillRect(sx + 23, sy + 6, 5, 20);
      break;
    }
    case "B": {
      ctx.fillStyle = "#c0623c"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.strokeStyle = "#8a4226"; ctx.lineWidth = 1.5;
      ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = "#e8d5a3"; ctx.fillRect(sx + 8, sy + 9, 7, 7); ctx.fillRect(sx + 19, sy + 9, 7, 7);
      break;
    }
    case "H": {
      ctx.fillStyle = "#f7e9ec"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.strokeStyle = "#d8b8c0"; ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = "#e0526a";
      ctx.fillRect(sx + 13, sy + 7, 6, 18); ctx.fillRect(sx + 7, sy + 13, 18, 6);
      break;
    }
    case "M": {
      ctx.fillStyle = "#dfeefb"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.strokeStyle = "#9ab8d8"; ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = "#3d6cb0";
      ctx.fillRect(sx + 7, sy + 7, 18, 8);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("SHOP", sx + 16, sy + 14);
      ctx.fillStyle = "#3d6cb0"; ctx.fillRect(sx + 12, sy + 18, 8, 12);
      break;
    }
    case "h": {
      ctx.fillStyle = "#c0623c"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.strokeStyle = "#8a4226"; ctx.lineWidth = 1.5;
      ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = "#6b3a1e"; ctx.fillRect(sx + 10, sy + 10, 12, 22);
      ctx.fillStyle = "#ffd24d"; ctx.fillRect(sx + 18, sy + 20, 3, 3);
      break;
    }
    case "D": {
      ctx.fillStyle = "#c0623c"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.strokeStyle = "#8a4226"; ctx.lineWidth = 1.5;
      ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = "#5a3a8a"; ctx.fillRect(sx + 8, sy + 8, 16, 24);
      ctx.fillStyle = "#ffd24d";
      ctx.beginPath(); ctx.arc(sx + 16, sy + 17, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#5a3a8a";
      ctx.beginPath(); ctx.arc(sx + 16, sy + 17, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "E": {
      ctx.fillStyle = "#3b2f6e"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.strokeStyle = "#ffd24d"; ctx.lineWidth = 2;
      ctx.strokeRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = "#ffd24d";
      ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("리그", sx + 16, sy + 21);
      break;
    }
    case "S": {
      ctx.fillStyle = "#8a6238"; ctx.fillRect(sx + 14, sy + 16, 4, 12);
      ctx.fillStyle = "#c49a6c"; ctx.fillRect(sx + 5, sy + 5, 22, 13);
      ctx.strokeStyle = "#6b4a2b"; ctx.strokeRect(sx + 5, sy + 5, 22, 13);
      ctx.fillStyle = "#6b4a2b"; ctx.fillRect(sx + 9, sy + 9, 14, 2); ctx.fillRect(sx + 9, sy + 13, 10, 2);
      break;
    }
    case "f": {
      ctx.fillStyle = "#ff8fb3";
      for (const [fx2, fy2] of [[10, 10], [22, 20]]) {
        ctx.beginPath(); ctx.arc(sx + fx2, sy + fy2, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#ffd24d";
      ctx.beginPath(); ctx.arc(sx + 10, sy + 10, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 22, sy + 20, 1.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "I": {
      ctx.fillStyle = "#e8d5a3"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.beginPath(); ctx.arc(sx + 16, sy + 16, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#e0392f"; ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 16, sy + 16, 9, 0, Math.PI); ctx.fillStyle = "#fff"; ctx.fill();
      ctx.strokeStyle = "#333"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx + 16, sy + 16, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 7, sy + 16); ctx.lineTo(sx + 25, sy + 16); ctx.stroke();
      ctx.beginPath(); ctx.arc(sx + 16, sy + 16, 2.5, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke();
      break;
    }
    case "L": {
      const key = x + "," + y;
      const spec = LEGEND_AT[key];
      if (spec) {
        const bob = Math.sin(now / 350 + x) * 2;
        drawMon(spec.id, "front", sx + 16, sy + 14 + bob, 40);
        ctx.fillStyle = "rgba(255,210,77," + (0.25 + 0.15 * Math.sin(now / 300)) + ")";
        ctx.beginPath(); ctx.arc(sx + 16, sy + 16, 14, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
  }
}
function drawPlayer(now, camX, camY) {
  const p = playerWorldPos(now);
  const px = p.x * TILE + TILE / 2 - camX, py = p.y * TILE + TILE / 2 - p.hop - camY;
  const onWater = worldTile(Math.round(p.x), Math.round(p.y)) === "W";
  if (onWater) {
    const bob = Math.sin(now / 300) * 1.5;
    ctx.fillStyle = "#5a7ab8";
    ctx.beginPath(); ctx.ellipse(p.x * TILE + 16 - camX, p.y * TILE + 26 + bob - camY, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#3a5a98"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(p.x * TILE + 16 - camX, p.y * TILE + 26 + bob - camY, 13, 7, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (game.flags.bikeOn && game.bag["자전거"]) {
    ctx.fillStyle = "#333";
    ctx.beginPath(); ctx.arc(px - 6, py + 11, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 6, py + 11, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#888"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px - 6, py + 11); ctx.lineTo(px + 6, py + 11); ctx.stroke();
  }
  if (!onWater) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(p.x * TILE + 16 - camX, p.y * TILE + 27 - camY, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#3558c0"; ctx.fillRect(px - 7, py - 2, 14, 13);
  ctx.fillStyle = "#ffd9b0";
  ctx.beginPath(); ctx.arc(px, py - 8, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e0392f";
  ctx.beginPath(); ctx.arc(px, py - 10, 8, Math.PI, 0); ctx.fill();
  ctx.fillRect(px - 8, py - 11, 16, 3);
  ctx.fillStyle = "#222";
  const eo = { down: [[-3, -6], [3, -6]], up: [], left: [[-4, -6]], right: [[4, -6]] }[game.dir];
  for (const [ex, ey] of eo) ctx.fillRect(px + ex - 1, py + ey, 2.4, 3);
}
function drawNPC(n, sx, sy, now) {
  if (n.kind === "snorlax") {
    drawMon(143, "front", sx + 16, sy + 12, 40);
    const zz = Math.floor(now / 600) % 2;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(zz ? "Z z" : "z Z", sx + 28, sy + 2);
    return;
  }
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(sx + 16, sy + 27, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = n.color || "#888";
  ctx.fillRect(sx + 9, sy + 12, 14, 13);
  ctx.fillStyle = "#ffd9b0";
  ctx.beginPath(); ctx.arc(sx + 16, sy + 8, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#4a3a2a";
  ctx.beginPath(); ctx.arc(sx + 16, sy + 5, 8, Math.PI, 0); ctx.fill();
  ctx.fillStyle = "#222";
  ctx.fillRect(sx + 12, sy + 9, 2.4, 3); ctx.fillRect(sx + 18, sy + 9, 2.4, 3);
}
function drawWorld(now) {
  const p = playerWorldPos(now);
  let camX = p.x * TILE + TILE / 2 - W / 2;
  let camY = p.y * TILE + TILE / 2 - H / 2;
  camX = Math.max(0, Math.min(WORLD_W * TILE - W, camX));
  camY = Math.max(0, Math.min(WORLD_H * TILE - H, camY));
  const tx0 = Math.floor(camX / TILE), ty0 = Math.floor(camY / TILE);
  for (let y = ty0; y <= ty0 + VIEW_H && y < WORLD_H; y++) {
    for (let x = tx0; x <= tx0 + VIEW_W && x < WORLD_W; x++) {
      drawTile(WORLD[y][x], x, y, x * TILE - camX, y * TILE - camY, now);
    }
  }
  for (const n of KANTO_NPCS) {
    if (npcGone(n)) continue;
    if (n.x < tx0 - 1 || n.x > tx0 + VIEW_W + 1 || n.y < ty0 - 1 || n.y > ty0 + VIEW_H + 1) continue;
    drawNPC(n, n.x * TILE - camX, n.y * TILE - camY, now);
  }
  drawPlayer(now, camX, camY);
  // 지역명 표시
  const zone = zoneAt(game.px, game.py);
  if (zone) {
    ctx.fillStyle = "rgba(20,24,48,0.75)";
    ctx.beginPath(); ctx.roundRect(10, 10, ctx.measureText(zone.name).width + 60, 30, 8); ctx.fill();
    ctx.fillStyle = "#ffd24d";
    ctx.font = "bold 15px 'Malgun Gothic', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(zone.name, 24, 30);
  }
}

/* ===================== 렌더: 전투 ===================== */
function hpColor(r) { return r > 0.5 ? "#4caf50" : r > 0.2 ? "#ffb300" : "#e53935"; }
function drawHpBar(x, y, w, mon, showNum) {
  const ratio = Math.max(0, mon.hp / mon.maxHp);
  ctx.fillStyle = "#555"; ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = hpColor(ratio); ctx.fillRect(x + 1, y + 1, (w - 2) * ratio, 8);
  if (showNum) {
    ctx.fillStyle = "#333";
    ctx.font = "bold 13px 'Malgun Gothic', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${mon.hp} / ${mon.maxHp}`, x + w, y + 26);
  }
}
function drawTypeBadges(x, y, types) {
  ctx.font = "bold 11px 'Malgun Gothic', sans-serif";
  ctx.textAlign = "center";
  let bx = x;
  for (const t of types) {
    ctx.fillStyle = TYPE_COLOR[t] || "#888";
    ctx.beginPath(); ctx.roundRect(bx, y, 44, 16, 4); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillText(t, bx + 22, y + 12);
    bx += 50;
  }
}
function drawStatusBadge(x, y, mon) {
  if (!mon.status) return;
  ctx.fillStyle = STATUS_COLOR[mon.status.k];
  ctx.beginPath(); ctx.roundRect(x, y, 40, 16, 4); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px 'Malgun Gothic', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(STATUS_LABEL[mon.status.k], x + 20, y + 12);
}
function drawBattle(now) {
  const b = ui.battle;
  if (!b) return;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  if (b.bgType === "cave") { grad.addColorStop(0, "#5a4c3e"); grad.addColorStop(1, "#3a3028"); }
  else if (b.bgType === "water") { grad.addColorStop(0, "#aee3ff"); grad.addColorStop(1, "#5a9ad8"); }
  else { grad.addColorStop(0, "#aee3ff"); grad.addColorStop(0.6, "#dff3d8"); grad.addColorStop(1, "#c8e6b8"); }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = b.bgType === "cave" ? "rgba(30,24,18,0.5)" : "rgba(120,160,90,0.5)";
  ctx.beginPath(); ctx.ellipse(580, 235, 130, 32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(190, 440, 150, 36, 0, 0, Math.PI * 2); ctx.fill();

  const shake = ui.flash > 0 ? (ui.flash % 2 === 0 ? 4 : -4) : 0;
  if (ui.flash > 0) ui.flash--;

  const bob = Math.sin(now / 400) * 4;
  if (b.enemy.hp > 0) drawMon(b.enemy.id, "front", 580 + shake, 168 + bob, 176);
  if (b.player.hp > 0) drawMon(b.player.id, "back", 190, 370, 230);

  // 적 정보
  ctx.fillStyle = "rgba(255,255,250,0.92)";
  ctx.strokeStyle = "#5a5a4a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(24, 24, 330, 88, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#222";
  ctx.font = "bold 18px 'Malgun Gothic', sans-serif";
  ctx.textAlign = "left"; ctx.fillText(monName(b.enemy), 40, 50);
  ctx.textAlign = "right"; ctx.fillText(`Lv${b.enemy.level}`, 338, 50);
  drawHpBar(40, 62, 298, b.enemy, false);
  drawTypeBadges(40, 82, POKEDEX[b.enemy.id].types);
  drawStatusBadge(260, 82, b.enemy);

  // 내 정보
  ctx.fillStyle = "rgba(255,255,250,0.92)";
  ctx.beginPath(); ctx.roundRect(420, 318, 324, 120, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#222";
  ctx.font = "bold 18px 'Malgun Gothic', sans-serif";
  ctx.textAlign = "left"; ctx.fillText(monName(b.player), 436, 346);
  ctx.textAlign = "right"; ctx.fillText(`Lv${b.player.level}`, 728, 346);
  drawHpBar(436, 358, 292, b.player, true);
  drawStatusBadge(436, 380, b.player);
  const cur = expForLevel(b.player.level), next = expForLevel(b.player.level + 1);
  const er = Math.max(0, Math.min(1, (b.player.exp - cur) / (next - cur)));
  ctx.fillStyle = "#888"; ctx.fillRect(436, 424, 292, 6);
  ctx.fillStyle = "#42a5f5"; ctx.fillRect(436, 424, 292 * er, 6);

  // 파티 몬스터볼
  for (let i = 0; i < game.party.length; i++) {
    ctx.beginPath();
    ctx.fillStyle = game.party[i].hp > 0 ? "#e0392f" : "#aaa";
    ctx.arc(40 + i * 22, 130, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#555"; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

/* ===================== 렌더: 공통 UI ===================== */
function wrapText(text, maxW) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w2 of words) {
    const test = line ? line + " " + w2 : w2;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w2; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function drawMessageBox(now) {
  if (!ui.message) return;
  if (ui.message.sprite) {
    ctx.fillStyle = "rgba(252,252,245,0.96)";
    ctx.strokeStyle = "#8a93c4"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(W - 178, H - 290, 162, 162, 10); ctx.fill(); ctx.stroke();
    drawMon(ui.message.sprite, "front", W - 97, H - 209, 140);
  }
  ctx.fillStyle = "rgba(20,24,48,0.93)";
  ctx.strokeStyle = "#8a93c4"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(8, H - 112, W - 16, 104, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "19px 'Malgun Gothic', sans-serif";
  ctx.textAlign = "left";
  wrapText(ui.message.text, W - 80).slice(0, 3).forEach((l, i) => ctx.fillText(l, 32, H - 78 + i * 28));
  if (ui.message.done && Math.floor(now / 400) % 2 === 0) {
    ctx.fillStyle = "#ffd24d";
    ctx.beginPath();
    ctx.moveTo(W - 40, H - 28); ctx.lineTo(W - 24, H - 28); ctx.lineTo(W - 32, H - 18);
    ctx.fill();
  }
}
function drawMenu() {
  const m = ui.menu;
  if (!m) return;
  const cols = m.cols;
  const totalRows = Math.ceil(m.options.length / cols);
  const visRows = Math.min(totalRows, m.maxRows);
  const w = m.w || 240;
  const rowH = 34;
  const titleH = m.title ? 30 : 0;
  const h = visRows * rowH + 24 + titleH;
  const x = m.x !== undefined ? m.x : W - w - 16;
  const y = m.y !== undefined ? m.y : H - h - 16;
  ctx.fillStyle = "rgba(252,252,245,0.96)";
  ctx.strokeStyle = "#5a5a4a"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.stroke();
  ctx.textAlign = "left";
  if (m.title) {
    ctx.fillStyle = "#7a4aa0";
    ctx.font = "bold 15px 'Malgun Gothic', sans-serif";
    ctx.fillText(m.title, x + 16, y + 22);
  }
  ctx.font = "17px 'Malgun Gothic', sans-serif";
  const colW = (w - 24) / cols;
  for (let vr = 0; vr < visRows; vr++) {
    const r = m.top + vr;
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (i >= m.options.length) continue;
      const ox = x + 16 + c * colW, oy = y + titleH + 30 + vr * rowH;
      ctx.fillStyle = i === m.index ? "#c0392b" : "#222";
      if (i === m.index) ctx.fillText("▶", ox - 2, oy);
      ctx.fillText(m.options[i], ox + 18, oy);
    }
  }
  // 스크롤 표시
  ctx.fillStyle = "#999";
  ctx.textAlign = "center";
  if (m.top > 0) ctx.fillText("▲", x + w / 2, y + titleH + 14);
  if (m.top + visRows < totalRows) ctx.fillText("▼", x + w / 2, y + h - 6);
  ctx.textAlign = "left";
  if (m.sprite) {
    const sid = m.sprite(m.index);
    if (sid) {
      const ps = 150;
      const px2 = Math.min(x + w + 10, W - ps - 8);
      const py2 = Math.max(8, Math.min(y, H - ps - 8));
      ctx.fillStyle = "rgba(252,252,245,0.96)";
      ctx.strokeStyle = "#5a5a4a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(px2, py2, ps, ps, 10); ctx.fill(); ctx.stroke();
      drawMon(sid, "front", px2 + ps / 2, py2 + ps / 2, 132);
      ctx.textAlign = "left";
    }
  }
  if (m.info) {
    const txt = m.info(m.index);
    if (txt) {
      ctx.fillStyle = "rgba(20,24,48,0.9)";
      ctx.beginPath(); ctx.roundRect(x, y - 38, Math.min(w, 420), 32, 8); ctx.fill();
      ctx.fillStyle = "#ffd24d";
      ctx.font = "14px 'Malgun Gothic', sans-serif";
      ctx.fillText(txt, x + 14, y - 16);
    }
  }
}
function drawTitle(now) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#1a1c4c"); grad.addColorStop(1, "#3b2f6e");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (let i = 0; i < 40; i++) {
    const sx = (i * 137 + 50) % W, sy = (i * 211 + 30) % (H / 2);
    const tw = Math.sin(now / 600 + i) * 0.5 + 1;
    ctx.fillRect(sx, sy, tw, tw);
  }
  ctx.textAlign = "center";
  ctx.font = "bold 64px 'Malgun Gothic', sans-serif";
  ctx.fillStyle = "#ffd24d"; ctx.strokeStyle = "#7a4a00"; ctx.lineWidth = 6;
  ctx.strokeText("포켓몬 클론", W / 2, 190);
  ctx.fillText("포켓몬 클론", W / 2, 190);
  ctx.font = "20px 'Malgun Gothic', sans-serif";
  ctx.fillStyle = "#cfd4ff";
  ctx.fillText("— 1세대 151마리 · 관동지방 —", W / 2, 235);
  const bob = Math.sin(now / 350) * 5;
  const lineup = [1, 4, 7, 25, 94, 149];
  lineup.forEach((id, i) =>
    drawMon(id, "front", W / 2 + (i - (lineup.length - 1) / 2) * 100, 305 + bob, 84));
  ctx.font = "15px 'Malgun Gothic', sans-serif";
  ctx.fillStyle = "#8a93c4";
  ctx.fillText("Z / Enter 키로 선택", W / 2, 540);
}

/* ===================== 메인 루프 ===================== */
function render(now) {
  ctx.clearRect(0, 0, W, H);
  if (game.state === "title") drawTitle(now);
  else if (game.state === "battle") drawBattle(now);
  else drawWorld(now);
  drawMenu();
  drawMessageBox(now);
}
function frame(now) {
  update(now);
  render(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
titleFlow();
