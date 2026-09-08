import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const meta = load("src/data/meta.json");
const stamps = load("src/data/stamps.json");
const exclude = load("src/data/exclude.json");
const sugoroku = load("src/data/sugoroku.json");
const errors = [];

if (!meta.data_year || !meta.schema_version) errors.push("meta incomplete");
if (!Array.isArray(stamps) || !stamps.length) errors.push("stamps empty");

const stampIds = new Set(stamps.map((s) => s.id));
for (const s of stamps) {
  if (!s.id || !s.title) errors.push("bad stamp id/title");
  if (!s.why) errors.push(s.id + ": missing why");
  if (!Array.isArray(s.steps) || s.steps.length < 2) errors.push(s.id + ": steps");
  if (!Array.isArray(s.faq) || s.faq.length < 1) errors.push(s.id + ": faq");
}

if (!exclude.items || !exclude.items.length) errors.push("exclude empty");
if (!exclude.items.some((i) => String(i.title).includes("結婚新生活"))) {
  errors.push("exclude missing shinseikatsu");
}

const mapped = new Set();
if (!Array.isArray(sugoroku.squares) || !sugoroku.squares.length) {
  errors.push("sugoroku squares empty");
} else {
  for (const sq of sugoroku.squares) {
    if (!Array.isArray(sq.stampIds)) {
      errors.push(sq.id + ": missing stampIds");
      continue;
    }
    for (const id of sq.stampIds) {
      if (!stampIds.has(id)) errors.push(sq.id + ": unknown stamp " + id);
      mapped.add(id);
    }
  }
  for (const id of stampIds) {
    if (!mapped.has(id)) errors.push("unmapped stamp " + id);
  }
}

if (errors.length) {
  console.error("FAILED");
  for (const e of errors) console.error(e);
  process.exit(1);
}
console.log(
  "OK stamps=" +
    stamps.length +
    " squares=" +
    sugoroku.squares.length +
    " mapped=" +
    mapped.size +
    " year=" +
    meta.data_year,
);
