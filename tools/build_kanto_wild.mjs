/* pokered 야생 출현표 → 게임 풀 [[id, lo, hi, weight], ...] 변환
   겐1 슬롯 확률(51/51/39/25/25/25/13/10/10/3 / 256)을 종별 합산해 가중치로 사용
   사용: node tools/build_kanto_wild.mjs <pokered_dir> */
"use strict";
import fs from "node:fs";
import path from "node:path";

const SRC = process.argv[2] || "/tmp/pokered";
const SLOT_P = [51, 51, 39, 25, 25, 25, 13, 10, 10, 3];

const NAMES = ("BULBASAUR IVYSAUR VENUSAUR CHARMANDER CHARMELEON CHARIZARD SQUIRTLE WARTORTLE BLASTOISE " +
  "CATERPIE METAPOD BUTTERFREE WEEDLE KAKUNA BEEDRILL PIDGEY PIDGEOTTO PIDGEOT RATTATA RATICATE " +
  "SPEAROW FEAROW EKANS ARBOK PIKACHU RAICHU SANDSHREW SANDSLASH NIDORAN_F NIDORINA " +
  "NIDOQUEEN NIDORAN_M NIDORINO NIDOKING CLEFAIRY CLEFABLE VULPIX NINETALES JIGGLYPUFF WIGGLYTUFF " +
  "ZUBAT GOLBAT ODDISH GLOOM VILEPLUME PARAS PARASECT VENONAT VENOMOTH DIGLETT " +
  "DUGTRIO MEOWTH PERSIAN PSYDUCK GOLDUCK MANKEY PRIMEAPE GROWLITHE ARCANINE POLIWAG " +
  "POLIWHIRL POLIWRATH ABRA KADABRA ALAKAZAM MACHOP MACHOKE MACHAMP BELLSPROUT WEEPINBELL " +
  "VICTREEBEL TENTACOOL TENTACRUEL GEODUDE GRAVELER GOLEM PONYTA RAPIDASH SLOWPOKE SLOWBRO " +
  "MAGNEMITE MAGNETON FARFETCHD DODUO DODRIO SEEL DEWGONG GRIMER MUK SHELLDER " +
  "CLOYSTER GASTLY HAUNTER GENGAR ONIX DROWZEE HYPNO KRABBY KINGLER VOLTORB " +
  "ELECTRODE EXEGGCUTE EXEGGUTOR CUBONE MAROWAK HITMONLEE HITMONCHAN LICKITUNG KOFFING WEEZING " +
  "RHYHORN RHYDON CHANSEY TANGELA KANGASKHAN HORSEA SEADRA GOLDEEN SEAKING STARYU " +
  "STARMIE MR_MIME SCYTHER JYNX ELECTABUZZ MAGMAR PINSIR TAUROS MAGIKARP GYARADOS " +
  "LAPRAS DITTO EEVEE VAPOREON JOLTEON FLAREON PORYGON OMANYTE OMASTAR KABUTO " +
  "KABUTOPS AERODACTYL SNORLAX ARTICUNO ZAPDOS MOLTRES DRATINI DRAGONAIR DRAGONITE MEWTWO MEW").split(/\s+/);
const ID = {};
NAMES.forEach((n, i) => { ID[n] = i + 1; });

function parseGrass(file) {
  const txt = fs.readFileSync(path.join(SRC, "wild", file + ".asm"), "utf8");
  const grass = txt.split("def_grass_wildmons")[1];
  if (!grass) return [];
  const body = grass.split("end_grass_wildmons")[0];
  const slots = [];
  for (const m of body.matchAll(/db\s+(\d+),\s*(\w+)/g)) slots.push([+m[1], m[2]]);
  return slots;
}
function toPool(files) {
  const agg = {}; // id -> {lo, hi, w}
  for (const f of files) {
    const slots = parseGrass(f);
    slots.forEach(([lvl, sp], i) => {
      const id = ID[sp];
      if (!id) { console.log("미확인 종:", sp, "in", f); return; }
      const a = agg[id] || (agg[id] = { lo: lvl, hi: lvl, w: 0 });
      a.lo = Math.min(a.lo, lvl); a.hi = Math.max(a.hi, lvl);
      a.w += SLOT_P[i % 10];
    });
  }
  const total = Object.values(agg).reduce((s, a) => s + a.w, 0);
  return Object.entries(agg)
    .map(([id, a]) => [+id, a.lo, a.hi, Math.max(1, Math.round(a.w / total * 100))])
    .sort((a, b) => b[3] - a[3]);
}

const ZONE_FILES = {
  ROUTE_1: ["Route1"], ROUTE_2: ["Route2"], ROUTE_3: ["Route3"], ROUTE_4: ["Route4"],
  ROUTE_5: ["Route5"], ROUTE_6: ["Route6"], ROUTE_7: ["Route7"], ROUTE_8: ["Route8"],
  ROUTE_9: ["Route9"], ROUTE_10: ["Route10"], ROUTE_11: ["Route11"], ROUTE_12: ["Route12"],
  ROUTE_13: ["Route13"], ROUTE_14: ["Route14"], ROUTE_15: ["Route15"], ROUTE_16: ["Route16"],
  ROUTE_17: ["Route17"], ROUTE_18: ["Route18"], ROUTE_21: ["Route21"],
  ROUTE_22: ["Route22"], ROUTE_23: ["Route23"], ROUTE_24: ["Route24"], ROUTE_25: ["Route25"],
  VIRIDIAN_FOREST: ["ViridianForest"],
  MT_MOON: ["MtMoon1F", "MtMoonB1F", "MtMoonB2F"],
  ROCK_TUNNEL: ["RockTunnel1F", "RockTunnelB1F"],
  POWER_PLANT: ["PowerPlant"],
  VICTORY_ROAD: ["VictoryRoad1F", "VictoryRoad2F", "VictoryRoad3F"],
  CERULEAN_CAVE: ["CeruleanCave1F", "CeruleanCave2F", "CeruleanCaveB1F"],
  SEAFOAM: ["SeafoamIslands1F", "SeafoamIslandsB1F"],
  LAVENDER_TOWN: ["PokemonTower3F"],
};

let out = "const KANTO_POOLS = {\n";
for (const [zone, files] of Object.entries(ZONE_FILES)) {
  const pool = toPool(files);
  out += `  ${zone}: ${JSON.stringify(pool)},\n`;
}
/* 수로(19·20·21)는 겐1 공통 왕눈해 테이블 */
out += `  WATER: [[72, 5, 40, 100]],\n`;
out += "};\n";
fs.writeFileSync(path.join(SRC, "kanto_pools.js"), out);
console.log("kanto_pools.js 출력:\n" + out);
