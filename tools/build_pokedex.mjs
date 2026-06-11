/* PokéAPI에서 1세대 151종 + 관련 기술 데이터를 수집해 pokedex.js를 생성 */
const API = "https://pokeapi.co/api/v2";

async function getJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch (e) { /* retry */ }
    await new Promise((s) => setTimeout(s, 800 * (i + 1)));
  }
  throw new Error("fetch fail: " + url);
}
async function batchMap(items, fn, size = 15) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    out.push(...await Promise.all(chunk.map(fn)));
    process.stdout.write(`\r  ${Math.min(i + size, items.length)}/${items.length}`);
  }
  process.stdout.write("\n");
  return out;
}
const ko = (names) => (names.find((n) => n.language.name === "ko") || {}).name || null;

const TYPE_KO = {
  normal: "노말", fire: "불꽃", water: "물", electric: "전기", grass: "풀",
  ice: "얼음", fighting: "격투", poison: "독", ground: "땅", flying: "비행",
  psychic: "에스퍼", bug: "벌레", rock: "바위", ghost: "고스트", dragon: "드래곤",
};
const STONE_KO = {
  "fire-stone": "불꽃의돌", "water-stone": "물의돌", "thunder-stone": "천둥의돌",
  "leaf-stone": "잎의돌", "moon-stone": "달의돌",
};
const STAT_MAP = { attack: "atk", defense: "def", speed: "spd", "special-attack": "spc", "special-defense": "spc" };
const AILMENTS = { sleep: "slp", poison: "psn", paralysis: "par", burn: "brn", freeze: "frz" };
/* 위력 null이지만 구현 가능한 특수 기술 */
const FIXED = {
  "sonic-boom": { fixed: 20 }, "dragon-rage": { fixed: 40 },
  "seismic-toss": { fixed: "level" }, "night-shade": { fixed: "level" },
  "super-fang": { fixed: "half" }, "psywave": { fixed: "psywave" },
  "low-kick": { power: 50 },
};
const SELF_KO = new Set(["self-destruct", "explosion"]);
const NO_EFFECT_OK = new Set(["splash"]); // 효과 없음 메시지용으로 유지

/* 이모지 도감 (1~151) */
const EMOJI = [
  "🌱","🌿","🌺","🦎","🔥","🐉","🐢","💧","🌊","🐛", // 1-10
  "🟩","🦋","🐛","🟨","🐝","🐦","🕊️","🦅","🐀","🐀", // 11-20
  "🐤","🦅","🐍","🐍","⚡","⚡","🦔","🦔","🐇","🐇", // 21-30
  "🦏","🐇","🐇","🦏","🧚","🧚","🦊","🦊","🎈","🎈", // 31-40
  "🦇","🦇","🥬","🥀","🌺","🍄","🍄","👾","🦋","🕳️", // 41-50
  "🕳️","🐱","🐈","🦆","🦆","🐒","🐒","🐕","🦁","🐸", // 51-60
  "🐸","💪","🧘","🥄","🔮","💪","💪","🏋️","🪴","🔔", // 61-70
  "🏺","🎐","🐙","🪨","🪨","🗿","🐴","🦄","🦛","🦛", // 71-80
  "🧲","🧲","🦃","🦤","🦤","🦭","🦭","🟣","🟪","🐚", // 81-90
  "🦪","👻","👻","😈","⛰️","💤","🌀","🦀","🦀","🔴", // 91-100
  "💥","🥚","🌴","🦴","💀","🦵","🥊","👅","💨","🌫️", // 101-110
  "🦏","🦏","🍼","🧶","🦘","🦐","🐬","🐠","🎏","⭐", // 111-120
  "🌟","🎭","🦗","💋","🔌","🌋","🪲","🐂","🐟","🐲", // 121-130
  "🦕","🫠","🐶","🦦","🌩️","❤️‍🔥","🤖","🐌","🦑","🛡️", // 131-140
  "🦂","🦖","🐻","❄️","⚡","☄️","🐍","🐉","🐲","🧬", // 141-150
  "✨", // 151
];

console.log("1/4 포켓몬 151종 수집...");
const ids = Array.from({ length: 151 }, (_, i) => i + 1);
const pokes = await batchMap(ids, (i) => getJson(`${API}/pokemon/${i}`));
console.log("2/4 종 정보(이름/포획률/진화) 수집...");
const species = await batchMap(ids, (i) => getJson(`${API}/pokemon-species/${i}`));

/* 진화 체인 */
const chainUrls = [...new Set(species.map((s) => s.evolution_chain.url))];
console.log(`3/4 진화 체인 ${chainUrls.length}개 수집...`);
const chains = await batchMap(chainUrls, (u) => getJson(u));
const evoMap = {}; // fromId -> [{to, method, level?, item?}]
function walkChain(link) {
  const fromId = parseInt(link.species.url.match(/\/(\d+)\/$/)[1]);
  for (const next of link.evolves_to) {
    const toId = parseInt(next.species.url.match(/\/(\d+)\/$/)[1]);
    if (fromId <= 151 && toId <= 151) {
      const d = next.evolution_details[0] || {};
      let evo = null;
      if (d.trigger && d.trigger.name === "level-up" && d.min_level)
        evo = { to: toId, method: "level", level: d.min_level };
      else if (d.trigger && d.trigger.name === "use-item" && d.item && STONE_KO[d.item.name])
        evo = { to: toId, method: "stone", item: STONE_KO[d.item.name] };
      else if (d.trigger && d.trigger.name === "trade")
        evo = { to: toId, method: "level", level: 37 }; // 통신교환 → 레벨 37 대체
      if (evo) (evoMap[fromId] = evoMap[fromId] || []).push(evo);
    }
    walkChain(next);
  }
}
chains.forEach((c) => walkChain(c.chain));

/* 레드/블루 레벨업 기술 추출 */
const learnsets = {}; // id -> [[lv, moveEn]]
const moveSet = new Set();
for (const p of pokes) {
  const ls = [];
  for (const m of p.moves) {
    for (const v of m.version_group_details) {
      if (v.version_group.name === "red-blue" && v.move_learn_method.name === "level-up") {
        ls.push([v.level_learned_at, m.move.name]);
        moveSet.add(m.move.name);
      }
    }
  }
  ls.sort((a, b) => a[0] - b[0]);
  learnsets[p.id] = ls;
}
moveSet.add("struggle");

console.log(`4/4 기술 ${moveSet.size}개 수집...`);
const moveList = await batchMap([...moveSet], (n) => getJson(`${API}/move/${n}`));

/* 기술 필터링: 구현 가능한 것만 채택 */
const MOVES = {};
for (const mv of moveList) {
  const en = mv.name;
  const meta = mv.meta || {};
  const entry = {
    name: ko(mv.names) || en,
    type: TYPE_KO[mv.type.name],
    cls: mv.damage_class.name, // physical | special | status
    power: mv.power || 0,
    acc: mv.accuracy === null ? 100 : mv.accuracy,
  };
  const fx = FIXED[en];
  if (fx) { if (fx.fixed) entry.fixed = fx.fixed; if (fx.power) entry.power = fx.power; }
  if (SELF_KO.has(en)) entry.selfKO = true;
  // 랭크 변화
  const stages = [];
  for (const sc of mv.stat_changes || []) {
    const st = STAT_MAP[sc.stat.name];
    if (st) stages.push([st, sc.change]);
  }
  if (stages.length) {
    entry.stages = stages;
    entry.stageTarget = mv.target.name === "user" ? "self" : "enemy";
    if (meta.ailment && meta.ailment.name !== "none") { /* growl류엔 없음 */ }
  }
  // 상태이상
  const ail = meta.ailment && AILMENTS[meta.ailment.name];
  if (ail) {
    entry.ailment = ail;
    entry.ailmentChance = meta.ailment_chance || (entry.cls === "status" ? 100 : 0);
  }
  // 흡수/반동/연속/회복
  if (meta.drain > 0) entry.drain = meta.drain;
  if (meta.drain < 0) entry.recoil = -meta.drain;
  if (meta.healing > 0) entry.healing = meta.healing;
  if (meta.min_hits) entry.hits = [meta.min_hits, meta.max_hits];
  if (en === "rest") { entry.healing = 100; entry.selfSleep = true; delete entry.ailment; }

  const usable =
    entry.power > 0 || entry.fixed ||
    (entry.stages && entry.stages.length) ||
    (entry.ailment && entry.ailmentChance >= 100 && entry.cls === "status") ||
    entry.healing > 0 ||
    NO_EFFECT_OK.has(en);
  if (usable || en === "struggle") MOVES[en] = entry;
}
if (MOVES["struggle"]) { MOVES["struggle"].recoil = 25; MOVES["struggle"].power = 50; }

/* 도감 조립 */
const POKEDEX = {};
for (let i = 0; i < 151; i++) {
  const p = pokes[i], s = species[i];
  const st = {};
  for (const x of p.stats) st[x.stat.name] = x.base_stat;
  const flav = (s.flavor_text_entries.find((f) => f.language.name === "ko") || {}).flavor_text || "";
  const ls = learnsets[p.id].filter(([, m]) => MOVES[m]).map(([lv, m]) => [Math.max(1, lv), m]);
  // 중복 제거 (같은 기술 여러 레벨 → 첫 등장만)
  const seen = new Set(); const lsDedup = [];
  for (const [lv, m] of ls) { if (!seen.has(m)) { seen.add(m); lsDedup.push([lv, m]); } }
  POKEDEX[p.id] = {
    name: ko(s.names) || p.name,
    emoji: EMOJI[i] || "❓",
    types: p.types.map((t) => TYPE_KO[t.type.name]),
    base: { hp: st.hp, atk: st.attack, def: st.defense, spc: st["special-attack"], spd: st.speed },
    catchRate: s.capture_rate,
    expYield: p.base_experience || 60,
    learnset: lsDedup,
    evolutions: evoMap[p.id] || [],
    dex: flav.replace(/[\n\f\r]/g, " ").trim(),
  };
}

/* 검증 */
let warn = 0;
for (const [id, d] of Object.entries(POKEDEX)) {
  if (!d.name) { console.log("이름 없음:", id); warn++; }
  if (!d.learnset.length) console.log(`  (참고) 기술 없음 → 발버둥 폴백: #${id} ${d.name}`);
  for (const [, m] of d.learnset) if (!MOVES[m]) { console.log("미등록 기술:", id, m); warn++; }
  for (const e of d.evolutions) if (!POKEDEX[e.to] && e.to <= 151) { console.log("진화 대상 누락:", id, e.to); warn++; }
}
console.log(`종: ${Object.keys(POKEDEX).length}, 기술: ${Object.keys(MOVES).length}, 경고: ${warn}`);

const out = `/* 자동 생성: PokéAPI 1세대(레드/블루) 데이터. tools/build_pokedex.mjs 로 재생성 */
"use strict";
const POKEDEX = ${JSON.stringify(POKEDEX)};
const MOVES = ${JSON.stringify(MOVES)};
`;
const fs = await import("fs");
fs.writeFileSync(new URL("../pokedex.js", import.meta.url), out, "utf8");
console.log("pokedex.js 생성 완료");
