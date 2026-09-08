import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stamps = JSON.parse(readFileSync(join(root, "src/data/stamps.json"), "utf8"));

const MAX = 8;

/** Logical groups — each stamp id appears once. Oversized groups are auto-split. */
const groups = [
  {
    baseId: "sq-filing",
    phaseId: "phase0",
    title: "届出",
    subtitle: "婚姻届が受理された日が M0",
    image: "/phases/rm-filing.png",
    chips: ["婚姻届", "証人・本人確認", "受理証明", "戸籍・住民票"],
    branch: null,
    optional: false,
    quiet: false,
    sideStep: false,
    ids: [
      "A無1", "C即1", "B2", "B3", "B4", "B6", "B12",
      "C即2", "C即3", "C即4",
    ],
  },
  {
    baseId: "sq-namechange",
    phaseId: "phase0",
    title: "改氏",
    subtitle: "称する氏と名義変更のカスケード",
    image: "/phases/rm-namechange.png",
    chips: ["称する氏", "改氏棚卸し", "マイナ・免許", "銀行・年金"],
    branch: null,
    optional: false,
    quiet: false,
    sideStep: false,
    ids: [
      "A必2", "A必3", "A必4", "B1",
      "C即7", "C即8", "C即9", "C即10",
      "C即11", "C即12", "C即13", "C即14",
    ],
  },
  {
    baseId: "sq-company",
    phaseId: "phase0",
    title: "会社祝金・休暇",
    subtitle: "人事・慶弔・年末調整",
    image: "/phases/rm-company.png",
    chips: ["結婚祝金", "結婚休暇", "人事申告", "健保被扶養"],
    branch: null,
    optional: false,
    quiet: false,
    sideStep: false,
    ids: [
      "A必1", "B7", "C即5", "C即6", "D1", "D2", "C他7",
      "C他1", "C他2",
    ],
  },
  {
    baseId: "sq-cohabit",
    phaseId: "phase0",
    title: "同居・名義",
    subtitle: "届出と同時でも後でも可",
    image: "/phases/phase0b-cohabit.png",
    chips: ["転居・世帯", "社宅・通勤", "UR賃貸", "マイナ継続"],
    branch: null,
    optional: true,
    quiet: false,
    sideStep: false,
    ids: [
      "A必5", "C14-1", "C14-2", "C15-1", "C90-1", "C90-2",
      "A得13", "D4", "D5",
    ],
  },
  {
    baseId: "sq-familyplan",
    phaseId: "phase0",
    title: "民間割・契約整理",
    subtitle: "家族割・光熱・保険の一本化",
    image: "/phases/phase0b-cohabit.png",
    chips: ["家族割", "光熱名義", "火災・家財", "クレカ家族"],
    branch: null,
    optional: true,
    quiet: false,
    sideStep: false,
    ids: ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10"],
  },
  {
    baseId: "sq-prep-health",
    phaseId: "phase1",
    title: "妊娠前・健診",
    subtitle: null,
    image: "/phases/rm-prenatal.png",
    chips: ["風しん", "不妊・不育", "肝炎", "子宮頸がん"],
    branch: null,
    optional: false,
    quiet: false,
    sideStep: false,
    ids: ["G1", "G2", "G3", "G4", "A無2", "A無3", "A無8"],
  },
  {
    baseId: "sq-prep-consult",
    phaseId: "phase1",
    title: "妊娠前・相談",
    subtitle: null,
    image: "/phases/phase1-prep.png",
    chips: ["弁護士相談", "民事相談", "司法書士", "記念写真"],
    branch: null,
    optional: false,
    quiet: false,
    sideStep: false,
    ids: ["A無4", "A無5", "A無6", "A無7"],
  },
  {
    baseId: "sq-prep-money",
    phaseId: "phase1",
    title: "妊娠前・資産",
    subtitle: null,
    image: "/phases/phase1-prep.png",
    chips: ["NISA", "ふるさと", "贈与", "iDeCo"],
    branch: null,
    optional: false,
    quiet: false,
    sideStep: false,
    ids: [
      "A得1", "A得2", "A得3", "A得5", "A得6", "A得8",
      "A得9", "A得10", "A得11", "A得16", "A得17",
      "C他3", "C他4", "C他6",
    ],
  },
  {
    baseId: "sq-pregnant",
    phaseId: "phase2",
    title: "妊婦健診",
    subtitle: null,
    image: "/phases/phase2-pregnant.png",
    chips: ["妊娠届", "妊婦健診", "妊婦支援", "妊婦歯科"],
    branch: "child",
    optional: false,
    quiet: false,
    sideStep: false,
    ids: ["G5", "G6", "G7", "G8", "G9"],
  },
  {
    baseId: "sq-birth-money",
    phaseId: "phase3",
    title: "出産一時金・届出",
    subtitle: null,
    image: "/phases/rm-birth-money.png",
    chips: ["出産育児一時金", "出産手当金", "出生届", "産婦・新生児"],
    branch: "child",
    optional: false,
    quiet: false,
    sideStep: false,
    ids: ["G11", "G12", "G13", "G16", "G17", "G18", "G19"],
  },
  {
    baseId: "sq-allowance",
    phaseId: "phase3",
    title: "児童手当",
    subtitle: null,
    image: "/phases/rm-allowance.png",
    chips: ["児童手当", "こども医療"],
    branch: "child",
    optional: false,
    quiet: false,
    sideStep: false,
    ids: ["G14", "G15"],
  },
  {
    baseId: "sq-daycare",
    phaseId: "phase4",
    title: "保育",
    subtitle: null,
    image: "/phases/rm-daycare.png",
    chips: ["認可保育料", "育休・出生後休業"],
    branch: "child",
    optional: false,
    quiet: false,
    sideStep: false,
    ids: ["G23", "G25"],
  },
  {
    baseId: "sq-infant-other",
    phaseId: "phase4",
    title: "0-2その他",
    subtitle: null,
    image: "/phases/phase4-infant.png",
    chips: ["産後ケア", "三世代", "団地空き家"],
    branch: "child",
    optional: false,
    quiet: false,
    sideStep: false,
    ids: ["G10", "G20", "G21", "G22"],
  },
  {
    baseId: "sq-preschool",
    phaseId: "phase5",
    title: "3-6",
    subtitle: null,
    image: "/phases/phase5-preschool.png",
    chips: ["放課後児童クラブ"],
    branch: "child",
    optional: false,
    quiet: false,
    sideStep: false,
    ids: ["G24"],
  },
  {
    baseId: "sq-home",
    phaseId: "phase6",
    title: "住宅・ローン",
    subtitle: "任意マス",
    image: "/phases/rm-mortgage.png",
    chips: ["住宅ローン減税", "みらいエコ", "贈与非課税", "ペアローン"],
    branch: "buy",
    optional: true,
    quiet: false,
    sideStep: false,
    ids: [
      "A得12", "B8", "C2年1", "C他5",
      "F1", "F2", "F3", "F4", "F5", "F6",
      "F7", "F8", "F9", "F10", "F11", "F12", "F13",
    ],
  },
  {
    baseId: "sq-hedge-med",
    phaseId: "phase7",
    title: "医療・控除ヘッジ",
    subtitle: null,
    image: "/phases/phase7-hedge.png",
    chips: ["高額療養", "医療費控除", "限度額認定", "地震保険"],
    branch: null,
    optional: false,
    quiet: false,
    sideStep: false,
    ids: ["A必6", "A必7", "A得4", "A得7", "A得14", "A得15"],
  },
  {
    baseId: "sq-hedge-legal",
    phaseId: "phase7",
    title: "遺言・後見ヘッジ",
    subtitle: null,
    image: "/phases/phase7-hedge.png",
    chips: ["任意後見", "死後事務", "公正証書遺言"],
    branch: null,
    optional: false,
    quiet: false,
    sideStep: false,
    ids: ["B9", "B10", "B11"],
  },
  {
    baseId: "sq-hedge-company",
    phaseId: "phase7",
    title: "会社福利・保険",
    subtitle: null,
    image: "/phases/phase7-hedge.png",
    chips: ["家族手当", "団体生命", "DC・持株", "財形"],
    branch: null,
    optional: false,
    quiet: false,
    sideStep: false,
    ids: [
      "D3", "D6", "D7", "D8", "D9", "D10",
      "D11", "D12", "D13", "D14", "D15",
    ],
  },
  {
    baseId: "sq-divorce",
    phaseId: "phase8",
    title: "離婚窓",
    subtitle: "期限の地図のみ",
    image: "/phases/phase8-divorce-hedge.png",
    chips: ["夫婦財産契約", "財産分与", "年金分割"],
    branch: null,
    optional: false,
    quiet: true,
    sideStep: false,
    ids: ["B5"],
  },
];

const stampById = new Map(stamps.map((s) => [s.id, s]));
const assigned = new Set();
const dupes = [];
const unknown = [];

for (const g of groups) {
  for (const id of g.ids) {
    if (!stampById.has(id)) unknown.push(id);
    if (assigned.has(id)) dupes.push(id);
    assigned.add(id);
  }
}

const missing = stamps.map((s) => s.id).filter((id) => !assigned.has(id));
if (unknown.length || dupes.length || missing.length) {
  console.error("MAPPING ERROR");
  if (unknown.length) console.error("unknown ids", unknown);
  if (dupes.length) console.error("duplicate ids", dupes);
  if (missing.length) console.error("unmapped", missing);
  process.exit(1);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const squares = [];
let n = 1;

for (const g of groups) {
  const parts = chunk(g.ids, MAX);
  parts.forEach((ids, idx) => {
    const multi = parts.length > 1;
    const id = multi ? `${g.baseId}-${idx + 1}` : g.baseId;
    const title = multi ? `${g.title}（${idx + 1}/${parts.length}）` : g.title;
    const square = {
      id,
      n: g.sideStep ? null : n,
      phaseId: g.phaseId,
      title,
      subtitle: idx === 0 ? g.subtitle : null,
      image: g.image,
      chips: g.chips,
      stampIds: ids,
      branch: g.branch,
      optional: g.optional,
      quiet: g.quiet,
      sideStep: g.sideStep,
    };
    if (!g.sideStep) n += 1;
    squares.push(square);
  });
}

// Attach side steps after first main square visually: keep sideStep flags;
// MapPage currently looks for one sideStep after sq-start. Update MapPage
// to show all sideSteps near the start of the path (after first filing square).
const sugoroku = {
  legend: "マス＝人生のタイミング。下のスタンプ台を押してロードマップを進める",
  squares,
};

writeFileSync(
  join(root, "src/data/sugoroku.json"),
  JSON.stringify(sugoroku, null, 2) + "\n",
);

console.log("=== Square stamp counts ===");
let total = 0;
let over = 0;
for (const sq of squares) {
  total += sq.stampIds.length;
  const flag = sq.stampIds.length > MAX ? " OVER" : "";
  if (sq.stampIds.length > MAX) over += 1;
  console.log(
    `${sq.id}\t${sq.stampIds.length}\t${sq.title}${flag}\t${sq.sideStep ? "side" : "n=" + sq.n}`,
  );
}
console.log("squares", squares.length, "mapped", total, "/", stamps.length, "overCap", over);
