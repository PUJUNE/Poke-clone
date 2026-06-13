/* map.js를 실행해 월드 그리드·존 정보를 JSON으로 덤프 (지도 이미지 생성용) */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = readFileSync(join(root, "map.js"), "utf8");

const fn = new Function(
  src +
  "\nreturn { WORLD, ZONES, WORLD_W, WORLD_H, LEGEND_AT, GYM_AT, START };"
);
const { WORLD, ZONES, WORLD_W, WORLD_H, LEGEND_AT, GYM_AT, START } = fn();

writeFileSync(
  join(root, "tools", "world_dump.json"),
  JSON.stringify({
    w: WORLD_W,
    h: WORLD_H,
    rows: WORLD.map((r) => r.join("")),
    zones: ZONES.map((z) => ({ key: z.key, rect: z.rect, type: z.type, name: z.name })),
    legends: LEGEND_AT,
    gyms: GYM_AT,
    start: START,
  })
);
console.log("dumped", WORLD_W + "x" + WORLD_H, ZONES.length, "zones");
