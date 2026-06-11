/* 관동 오버월드 절대좌표 산출: pokered 공개 데이터(맵 크기 상수 + 연결 오프셋)로
   BFS 배치 → 무중첩·접변·면적 검증 → JS 데이터 블록 출력
   사용: node tools/build_kanto_layout.mjs <pokered_dir>  (기본 /tmp/pokered) */
"use strict";
import fs from "node:fs";
import path from "node:path";

const SRC = process.argv[2] || "/tmp/pokered";

/* ---- 1. 맵 크기 (블록 단위, 1블록 = 2x2 타일) ---- */
const constants = fs.readFileSync(path.join(SRC, "map_constants.asm"), "utf8");
const DIMS = {};
for (const m of constants.matchAll(/map_const\s+(\w+),\s+(\d+),\s+(\d+)/g)) {
  DIMS[m[1]] = { w: +m[2], h: +m[3] };
}

/* ---- 2. 연결 (헤더 파일) ---- */
const HDR = path.join(SRC, "headers");
const NAME2CONST = {
  PalletTown: "PALLET_TOWN", ViridianCity: "VIRIDIAN_CITY", PewterCity: "PEWTER_CITY",
  CeruleanCity: "CERULEAN_CITY", LavenderTown: "LAVENDER_TOWN", VermilionCity: "VERMILION_CITY",
  CeladonCity: "CELADON_CITY", FuchsiaCity: "FUCHSIA_CITY", CinnabarIsland: "CINNABAR_ISLAND",
  IndigoPlateau: "INDIGO_PLATEAU", SaffronCity: "SAFFRON_CITY",
};
for (let i = 1; i <= 25; i++) NAME2CONST["Route" + i] = "ROUTE_" + i;
const CONNS = {}; // const명 → [{dir, to, off}]
for (const [file, cname] of Object.entries(NAME2CONST)) {
  const txt = fs.readFileSync(path.join(HDR, file + ".asm"), "utf8");
  CONNS[cname] = [];
  for (const m of txt.matchAll(/connection\s+(north|south|east|west),\s*\w+,\s*(\w+),\s*(-?\d+)/g)) {
    CONNS[cname].push({ dir: m[1], to: m[2], off: +m[3] });
  }
}

/* ---- 3. BFS 절대 배치 (블록) ---- */
const POS = { PALLET_TOWN: { x: 0, y: 0 } };
const queue = ["PALLET_TOWN"];
while (queue.length) {
  const cur = queue.shift();
  const p = POS[cur], d = DIMS[cur];
  for (const c of CONNS[cur] || []) {
    if (!DIMS[c.to]) continue;
    const nd = DIMS[c.to];
    let nx, ny;
    if (c.dir === "north") { nx = p.x + c.off; ny = p.y - nd.h; }
    else if (c.dir === "south") { nx = p.x + c.off; ny = p.y + d.h; }
    else if (c.dir === "west") { nx = p.x - nd.w; ny = p.y + c.off; }
    else { nx = p.x + d.w; ny = p.y + c.off; }
    if (POS[c.to]) {
      if (POS[c.to].x !== nx || POS[c.to].y !== ny)
        console.log(`불일치: ${cur}→${c.to} 기존(${POS[c.to].x},${POS[c.to].y}) 신규(${nx},${ny})`);
      continue;
    }
    POS[c.to] = { x: nx, y: ny };
    queue.push(c.to);
  }
}

/* ---- 4. 타일 변환 + 정규화 ---- */
let rects = Object.entries(POS).map(([k, p]) => ({
  key: k, x: p.x * 2, y: p.y * 2, w: DIMS[k].w * 2, h: DIMS[k].h * 2,
}));
const minX = Math.min(...rects.map(r => r.x)), minY = Math.min(...rects.map(r => r.y));
/* 좌측에 동굴 존(상록숲·후일 배치)을 위한 여백 포함, 전체 +2 margin */
rects.forEach(r => { r.x += -minX + 2; r.y += -minY + 2; });

/* ---- 5. 검증 ---- */
let bad = 0;
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
for (let i = 0; i < rects.length; i++)
  for (let j = i + 1; j < rects.length; j++)
    if (overlap(rects[i], rects[j])) { console.log("중첩:", rects[i].key, rects[j].key); bad++; }
const byKey = Object.fromEntries(rects.map(r => [r.key, r]));
for (const [a, list] of Object.entries(CONNS)) {
  for (const c of list) {
    const ra = byKey[a], rb = byKey[c.to];
    if (!ra || !rb) continue;
    /* 접변 길이 ≥ 4타일 */
    const ox = Math.min(ra.x + ra.w, rb.x + rb.w) - Math.max(ra.x, rb.x);
    const oy = Math.min(ra.y + ra.h, rb.y + rb.h) - Math.max(ra.y, rb.y);
    const touchV = (ra.y + ra.h === rb.y || rb.y + rb.h === ra.y) && ox >= 4;
    const touchH = (ra.x + ra.w === rb.x || rb.x + rb.w === ra.x) && oy >= 4;
    if (!touchV && !touchH) { console.log("접변 실패:", a, "→", c.to, "ox", ox, "oy", oy); bad++; }
  }
}

/* ---- 6. 면적/요약 ---- */
const vol = rects.reduce((s, r) => s + r.w * r.h, 0);
const maxX = Math.max(...rects.map(r => r.x + r.w)), maxY = Math.max(...rects.map(r => r.y + r.h));
console.log(`존 ${rects.length}개, 오버월드 면적 ${vol} 타일 (원작 43380 대비 ${(vol / 43380 * 100).toFixed(1)}%)`);
console.log(`경계: ${maxX} x ${maxY}`);
console.log(bad === 0 ? "검증 통과" : `검증 실패 ${bad}건`);

/* ---- 7. JS 데이터 출력 ---- */
rects.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
const lines = rects.map(r => `  ${r.key}: [${r.x}, ${r.y}, ${r.w}, ${r.h}],`);
fs.writeFileSync(path.join(SRC, "kanto_rects.js"), "const KANTO_RECTS = {\n" + lines.join("\n") + "\n};\n");
console.log("kanto_rects.js 출력 완료");
