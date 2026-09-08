#!/usr/bin/env node
/**
 * Final editorial merge: ChatGPT reviewed catalog → marriage-guide-app stamps.
 * Profile locks bind. Never invent yen. Preserve our money_* on overlap.
 */
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const dump = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + "\n");

const stampsPath = join(root, "src/data/stamps.json");
const sugPath = join(root, "src/data/sugoroku.json");
const homePath = join(root, "src/data/home.json");
const cgTasks = load("/workspace/chatgpt-review/data/tasks.json");
const cgGroups = load("/workspace/chatgpt-review/data/groups.json");
const ours = load(stampsPath);
const sug = load(sugPath);
const home = load(homePath);

/** IDs where ChatGPT wording got too soft on money traps / profile locks — keep our title/why/miss. */
const SOFT_REJECT = new Set([
  "A必5", // 補助金で市を選ぶな
  "A必6", // 被扶養に落とさない
  "A必7", // 医療費控除≠高額療養
  "A得1", // NISA二人 + 扶養罠
  "A得6", // セルフ vs 医療費控除
  "A得14", // 高額療養限度額
  "C他4", // セルフ終期
  "C他7", // 健保被扶養の届出（失敗が既定）
  "D3", // 家族手当・収入制限
  "D6", // 健保の被扶養
  "B2", // 平日プレチェック（Lean）
  "D1", // 祝金・挙式起算 / 額 invent 防止
]);

const notes = {
  updated: [],
  added: [],
  kept_ours_only: [],
  soft_rejects: [],
  yen_preserved_why: [],
  conflicts: [],
  faq_answers_written: 0,
};

function stripOfficialese(s) {
  if (!s) return s;
  return String(s)
    .replace(/ご確認ください/g, "確認する")
    .replace(/お手続きください/g, "手続きする")
    .replace(/いただけます/g, "できる")
    .replace(/いたします/g, "する")
    .replace(/必要に応じて/g, "")
    .replace(/原則として/g, "")
    .replace(/ましょう[。.]?/g, "。")
    .replace(/しましょう/g, "する")
    .replace(/調べます[。.]?/g, "調べる。")
    .replace(/確認します[。.]?/g, "確認する。")
    .replace(/そろえます[。.]?/g, "そろえる。")
    .replace(/決めます[。.]?/g, "決める。")
    .replace(/話します[。.]?/g, "話す。")
    .replace(/比べましょう[。.]?/g, "比べる。")
    .replace(/\s{2,}/g, " ")
    .replace(/。。+/g, "。")
    .trim();
}

function grokWhy(summary, ourWhy, id) {
  let w = stripOfficialese(summary || "");
  // Keep Hiroshima / Lean / zero-yen facts if CG dropped them
  if (ourWhy) {
    const yenInOurs = /(\d[\d,]*)\s*円|(\d+)\s*万|0円|800万|1,?800万|360万/.test(ourWhy);
    const yenInCg = /(\d[\d,]*)\s*円|(\d+)\s*万|0円|800万|1,?800万|360万/.test(w);
    const hiroshima = /広島/.test(ourWhy) && !/広島/.test(w);
    const leanTrap =
      /(結婚新生活|扶養|高額療養|医療費控除|挙式起算|式なし)/.test(ourWhy) &&
      !/(結婚新生活|扶養|高額療養|医療費控除|挙式起算|式なし)/.test(w);
    if ((yenInOurs && !yenInCg) || hiroshima || leanTrap) {
      notes.yen_preserved_why.push(id);
      return ourWhy;
    }
  }
  // Cap length-ish: keep decisive
  if (w.length > 140) w = w.slice(0, 137) + "…";
  return w || ourWhy || "";
}

function grokTitle(cgTitle, ourTitle, id) {
  const t = stripOfficialese(cgTitle || ourTitle || "");
  // Ban inventing prize language
  if (/結婚新生活/.test(t) && /(30|60)\s*万|もらえる|対象/.test(t)) {
    notes.conflicts.push(`${id}: CG title risked 結婚新生活 prize — kept ours`);
    return ourTitle;
  }
  return t;
}

function grokSteps(cgSteps, ourSteps) {
  const src = Array.isArray(cgSteps) && cgSteps.length >= 2 ? cgSteps : ourSteps;
  return (src || [])
    .map((s) => stripOfficialese(s))
    .map((s) => s.replace(/[。．]\s*$/, ""))
    .filter(Boolean)
    .slice(0, 5);
}

function answerFromStamp(q, stamp) {
  const why = stamp.why || "";
  const miss = stamp.miss || "";
  const title = stamp.title || "";
  notes.faq_answers_written += 1;

  // Generic CG template questions → concrete grounded answers
  if (/必要ですか/.test(q)) {
    if (stamp.eligibility === "child")
      return `子（妊娠含む）のとき本線。トグルOFFなら後回しでよい。取りこぼし：${miss || "期限切れ"}。`;
    if (stamp.eligibility === "buy")
      return `買う分岐のとき本線。買わないなら対象外で閉じる。${miss ? `取りこぼし：${miss}` : ""}`;
    if (stamp.eligibility === "company")
      return `勤務先規程があるときだけ動く。先にA必1でPDFを取れ。額は invent しない。`;
    if (stamp.eligibility === "ceremony")
      return `式なしLeanなら大半は閉じる。例外は祝金・休暇の起算確認（入籍か挙式か）。`;
    if (stamp.eligibility === "self")
      return `自営・国保側のとき本線。会社員同士の既定なら対象外寄り。`;
    return `${title}は既定世帯でも見る。なぜ：${why.slice(0, 80)}`;
  }
  if (/窓口|持ち物|受付|期限/.test(q)) {
    return `窓：${stamp.window || "要確認"}。誰が：${stamp.who || "双方"}。手順はスタンプのsteps。金額はデータ記載のみ（推測しない）。`;
  }
  if (/対象になりますか|除外/.test(q)) {
    return `既定は広島市・共働き800万超・式なし。所得制限・扶養・市の結婚新生活は賞品に出さない。詳細はwhy。`;
  }
  if (/申請前|必要書類|受付期限/.test(q)) {
    return `stepsの順でそろえる。期限はwindow（${stamp.window || "要確認"}）。書類の実額手数料は invent しない。`;
  }
  if (/併用|精算/.test(q)) {
    return `高額療養≠医療費控除。扶養と家族手当は別制度。併用はwhyの条件だけ見る。`;
  }
  if (/雇用形態|勤務状況/.test(q)) {
    return `会社差・要確認。A必1の規程コピーが一次。口頭の「出ます」は信用しない。`;
  }
  if (/基準日|提出先/.test(q)) {
    return `基準日・提出先はwindowとsteps。広島市なら区役所市民課が基本（本庁舎では出さない届出あり）。`;
  }
  if (/大切にしたい|負担が偏って|見直しますか/.test(q)) {
    return `二人で紙に書く。改氏側に作業が偏りやすい。見直す日を決めて閉じる。`;
  }
  if (/暗証/.test(q)) {
    return `一覧と連絡先だけ共有。暗証番号そのものは手帳に書かない。`;
  }
  // fallback
  if (miss) return `${why.slice(0, 70)} 取りこぼし：${miss}`;
  return why.slice(0, 100) || "一次案内と規程で確認。円は invent しない。";
}

function mergeFaq(cgQuestions, ourFaq, stampForAnswers) {
  const out = [];
  const seen = new Set();
  const push = (q, a) => {
    const key = q.replace(/\s+/g, "");
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ q, a });
  };

  // Prefer our killer FAQs first (sharp money answers)
  for (const f of ourFaq || []) {
    if (f?.q && f?.a) push(f.q, f.a);
  }
  // Add CG questions with grounded answers
  for (const q of cgQuestions || []) {
    const qs = typeof q === "string" ? q : q?.q;
    if (!qs) continue;
    // skip near-dup of ours
    const dup = [...seen].some(
      (k) => k.includes(qs.slice(0, 8).replace(/\s+/g, "")) || qs.replace(/\s+/g, "").includes(k.slice(0, 8)),
    );
    if (dup && out.length >= 3) continue;
    const existing = (ourFaq || []).find((f) => f.q === qs);
    if (existing?.a) push(qs, existing.a);
    else push(qs, answerFromStamp(qs, stampForAnswers));
  }
  return out.slice(0, 6);
}

function mapNeedToEligibility(need) {
  const n = Array.isArray(need) ? need : [];
  if (n.includes("child")) return "child";
  if (n.includes("buy") || n.includes("home")) return "buy";
  if (n.includes("company")) return "company";
  if (n.includes("ceremony")) return "ceremony";
  if (n.includes("self")) return "self";
  return "always";
}

function mapTrack(chapter, type, id) {
  if (id.startsWith("W")) return "無";
  if (id.startsWith("P")) return "住";
  if (id.startsWith("S")) return type === "tax" ? "得" : "法";
  if (id === "B13") return "法";
  const ch = chapter || "";
  if (ch === "life") return "住";
  if (ch === "child") return "子";
  if (ch === "home") return "買う";
  if (ch === "annual") return "得";
  if (ch === "care") return "得";
  if (ch === "prepare") return type === "conversation" ? "無" : "法";
  return "法";
}

function mapWho(who) {
  const w = who || "双方";
  if (/二人|双方|ふたり/.test(w)) return "双方";
  return stripOfficialese(w).slice(0, 20) || "双方";
}

const ourById = new Map(ours.map((s) => [s.id, s]));
const cgById = new Map(cgTasks.map((t) => [t.id, t]));
const merged = [];

for (const s of ours) {
  const t = cgById.get(s.id);
  if (!t) {
    // only-ours — light polish meta-language
    const copy = { ...s };
    if (copy.why) {
      copy.why = copy.why
        .replace(/08と同一/g, "")
        .replace(/amount\s*0は[^。]+。?/g, "")
        .replace(/カレンダー印用/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }
    notes.kept_ours_only.push(s.id);
    merged.push(copy);
    continue;
  }

  if (SOFT_REJECT.has(s.id)) {
    notes.soft_rejects.push({
      id: s.id,
      kept: "title/why/miss",
      cg_title: t.title,
      reason: "ChatGPT soft on money trap / Lean / 扶養・高額≠医療・祝金額",
    });
    const stamp = {
      ...s,
      steps: s.steps?.length >= 2 ? s.steps : grokSteps(t.steps, s.steps),
      faq: mergeFaq(t.questions, s.faq, s),
    };
    notes.updated.push(s.id);
    merged.push(stamp);
    continue;
  }

  const draft = {
    ...s,
    title: grokTitle(t.title, s.title, s.id),
    why: grokWhy(t.summary, s.why, s.id),
    steps: grokSteps(t.steps, s.steps),
    who: mapWho(t.who) || s.who,
    // preserve money_*, eligibility, hidden_if, source_file, track, window, review_year
  };
  // miss: improve only if CG implies clearer loss without yen invent / rule break
  // CG has no miss field — keep ours
  draft.faq = mergeFaq(t.questions, s.faq, draft);
  notes.updated.push(s.id);
  merged.push(draft);
}

// Only-ChatGPT ids
const NEW_WINDOW = {
  B13: "届書前後〜通知が来たら",
  W1: "式を検討するなら契約前",
  W2: "見積り比較時",
  W3: "届出前（起算確認）",
  W4: "契約〜支払日前",
  W5: "式後1週間以内",
  W6: "契約時・納品前",
  W7: "届出・式の前",
  S1: "資格取得・改氏・転居の事実日",
  S2: "改氏・住所変更の事実日",
  S3: "届出後〜請求サイクル",
  S4: "開業・専従者を置く前",
  P1: "同居前〜毎月",
  P2: "届出前",
  P3: "届出前後",
  P4: "届出前〜改氏カスケード中",
};

const NEW_MISS = {
  B13: "誤記載のまま証明書が出る",
  W1: "キャンセル料で現金が死ぬ",
  W2: "追加料金で総額が膨らむ",
  W3: "挙式起算なら式なしで祝金・休暇0",
  W4: "支払日に現金不足",
  W5: "お祝いと立替が混線する",
  W6: "追加費用・使用権で揉める",
  W7: "両家連絡の抜け漏れ",
  S1: "国保の空白で医療費が自腹",
  S2: "年金記録の空白・照会漏れ",
  S3: "請求・振込名義不一致",
  S4: "専従者の届出遅れで税が崩れる",
  P1: "片方に生活費が偏る",
  P2: "緊急時に書類へ辿り着けない",
  P3: "報告順で親族トラブル",
  P4: "改氏側だけが手続き地獄",
};

for (const t of cgTasks) {
  if (ourById.has(t.id)) continue;
  const eligibility = mapNeedToEligibility(t.need);
  const track = mapTrack(t.chapter, t.type, t.id);
  const why = grokWhy(t.summary, "", t.id);
  // Lean framing for ceremony stamps
  let whyFinal = why;
  if (eligibility === "ceremony") {
    whyFinal =
      stripOfficialese(t.summary) +
      " 既定は式なしLean。式をやる分岐だけの手順。祝金の起算は入籍か挙式かをA必1で先に固定。";
    if (t.id === "W3") {
      whyFinal =
        "挙式と入籍が別日だと祝金・休暇の起算が割れる。式なしLeanでも規程の起算をA必1で確認。挙式必須なら式なし0。";
    }
  }
  if (eligibility === "self") {
    whyFinal =
      stripOfficialese(t.summary) +
      " 既定が会社員同士なら対象外寄り。自営・国保側だけ本線。";
  }

  const stamp = {
    id: t.id,
    track,
    title: grokTitle(t.title, t.title, t.id),
    who: mapWho(t.who),
    window: NEW_WINDOW[t.id] || "要確認",
    money_in: { amount_yen: 0 },
    money_out: { amount_yen: 0 },
    miss: NEW_MISS[t.id] || "期限と書類の取りこぼし",
    eligibility,
    hidden_if: eligibility === "ceremony" ? ["ceremony_none_skip_optional"] : [],
    source_file: "chatgpt",
    review_year: 2026,
    why: whyFinal.slice(0, 160),
    steps: grokSteps(t.steps, t.steps),
    faq: [],
  };
  stamp.faq = mergeFaq(t.questions, [], stamp);
  // Ensure min faq
  if (!stamp.faq.length) {
    stamp.faq = [
      {
        q: "この手続きは私たちに必要ですか？",
        a: answerFromStamp("この手続きは私たちに必要ですか？", stamp),
      },
    ];
  }
  notes.added.push(t.id);
  merged.push(stamp);
}

// Sort: keep original order for ours, append new at end grouped
const order = [...ours.map((s) => s.id), ...notes.added];
merged.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

dump(stampsPath, merged);

// --- sugoroku: add new stamps to squares ---
const squareById = new Map(sug.squares.map((sq) => [sq.id, sq]));
const mapped = new Set();
for (const sq of sug.squares) for (const id of sq.stampIds) mapped.add(id);

const groupIds = Object.fromEntries(cgGroups.map((g) => [g.id, g]));

function nearestSquare(groupId, stampId) {
  if (squareById.has(groupId)) return groupId;
  // nearest mappings for CG-only groups
  if (groupId === "sq-wedding") return null; // will create
  if (groupId === "sq-partners") return null;
  if (groupId === "sq-selfemployed") return null;
  if (stampId === "B13") return "sq-filing-2";
  return "sq-prep-money-2";
}

const toCreate = {
  "sq-wedding": {
    id: "sq-wedding",
    n: null,
    phaseId: "phase0",
    title: "挙式（任意・Lean外）",
    subtitle: "既定は式なし。やる分岐だけの手順",
    image: "/phases/rm-company.png",
    chips: ["見積り", "キャンセル", "起算", "両家"],
    stampIds: [],
    branch: null,
    optional: true,
    quiet: true,
    sideStep: true,
  },
  "sq-partners": {
    id: "sq-partners",
    n: null,
    phaseId: "phase0",
    title: "二人で決める",
    subtitle: "分担・書類・家族連絡",
    image: "/phases/phase0b-cohabit.png",
    chips: ["生活費", "書類", "家族", "分担"],
    stampIds: [],
    branch: null,
    optional: true,
    quiet: false,
    sideStep: true,
  },
  "sq-selfemployed": {
    id: "sq-selfemployed",
    n: null,
    phaseId: "phase7",
    title: "自営・国保側",
    subtitle: "会社員同士の既定では閉じる",
    image: "/phases/phase7-hedge.png",
    chips: ["国保", "国年", "屋号", "専従者"],
    stampIds: [],
    branch: null,
    optional: true,
    quiet: true,
    sideStep: true,
  },
};

for (const id of notes.added) {
  const t = cgById.get(id);
  const g = t.group;
  let sqId = nearestSquare(g, id);
  if (!sqId && toCreate[g]) {
    if (!squareById.has(g)) {
      sug.squares.push(toCreate[g]);
      squareById.set(g, toCreate[g]);
    }
    sqId = g;
  }
  if (!sqId) sqId = "sq-filing-2";
  const sq = squareById.get(sqId);
  if (!sq.stampIds.includes(id)) sq.stampIds.push(id);
  mapped.add(id);
}

// Ensure every stamp mapped
for (const s of merged) {
  if (![...mapped].includes(s.id) && !mapped.has(s.id)) {
    // find if already in some square
  }
}
const currentlyMapped = new Set();
for (const sq of sug.squares) for (const id of sq.stampIds) currentlyMapped.add(id);
for (const s of merged) {
  if (!currentlyMapped.has(s.id)) {
    // fallback
    const fb = squareById.get("sq-prep-money-2");
    fb.stampIds.push(s.id);
    currentlyMapped.add(s.id);
    notes.conflicts.push(`unmapped fallback → sq-prep-money-2: ${s.id}`);
  }
}

// Renumber main path n; sideSteps keep n null
let n = 1;
for (const sq of sug.squares) {
  if (sq.sideStep) {
    sq.n = null;
  } else {
    sq.n = n++;
  }
}

dump(sugPath, sug);

// --- home.json: refresh anti_lie_banner slightly (sources reinforce) ---
home.anti_lie_banner =
  "結婚新生活＝0。配偶者控除＝既定0。高額療養≠医療費控除。マイナ90日＝転入のみ。扶養に落とすな。";
// keep headline; title treatment 結婚ロードマップ is UI-level
dump(homePath, home);

// --- sync app-seed ---
copyFileSync(stampsPath, "/workspace/marriage-research/app-seed/stamps-v2.json");
copyFileSync(stampsPath, "/workspace/marriage-research/app-seed/stamps.json");
copyFileSync(homePath, "/workspace/marriage-research/app-seed/home.json");

// --- merge notes md ---
const md = `# 20 — ChatGPT catalog merge notes

- **When**: 2026-09-08 (Asia/Tokyo)
- **Inputs**: \`/workspace/chatgpt-review/data/tasks.json\` (149) ∩ our \`stamps.json\` (134)
- **Profile locks**: Hiroshima City + job-locked; dual income >¥8M; Lean no ceremony; **結婚新生活 never earnable**; no invented yen; preserve our money_in/out on overlap.

## Counts

| | count | ids (abbrev) |
|---|---:|---|
| Overlap updated | ${notes.updated.length} | (133) |
| Soft-reject (kept our title/why/miss) | ${notes.soft_rejects.length} | ${notes.soft_rejects.map((x) => x.id).join(", ")} |
| Yen/Hiroshima/Lean why preserved despite CG title/steps | ${notes.yen_preserved_why.length} | ${notes.yen_preserved_why.slice(0, 40).join(", ")}${notes.yen_preserved_why.length > 40 ? "…" : ""} |
| Only-ChatGPT added | ${notes.added.length} | ${notes.added.join(", ")} |
| Only-ours kept | ${notes.kept_ours_only.length} | ${notes.kept_ours_only.join(", ")} |
| Final stamp count | ${merged.length} | |
| FAQ answers authored for CG q-only | ${notes.faq_answers_written} | |

## Soft rejects (CEO sharpness kept)

${notes.soft_rejects
  .map(
    (x) =>
      `- **${x.id}**: CG「${x.cg_title}」→ ${x.reason}. FAQ questions from CG still merged with sharp answers.`,
  )
  .join("\n")}

## New stamps → sugoroku

| id | track | eligibility | square |
|---|---|---|---|
${notes.added
  .map((id) => {
    const s = merged.find((x) => x.id === id);
    const sq = sug.squares.find((q) => q.stampIds.includes(id));
    return `| ${id} | ${s.track} | ${s.eligibility} | ${sq?.id} |`;
  })
  .join("\n")}

New optional/side squares: \`sq-wedding\` (quiet), \`sq-partners\`, \`sq-selfemployed\` (quiet).

## Conflicts / notes

${notes.conflicts.length ? notes.conflicts.map((c) => `- ${c}`).join("\n") : "- (none blocking)"}

- ChatGPT has **no money fields** — all overlap money_in/out preserved from seed.
- ChatGPT \`questions\` are strings only (often templates) — answers grounded in our why/miss/window; never invent yen.
- \`home.anti_lie_banner\` refreshed; headline kept. UI title remains 結婚ロードマップ.
- W* are Lean-framed (式なし既定). S* framed as 自営寄り. Ceremony/self eligibility set from \`need\`.

## Grok tone pass

- Stripped 役所口調 (ご確認ください / いたします / ましょう).
- Decisive verbs in steps.
- Trap stamps keep CEO miss lines (扶養・結婚新生活0・高額≠医療費控除・挙式起算0).
`;

writeFileSync("/workspace/marriage-research/20-chatgpt-merge-notes.md", md);

console.log(
  JSON.stringify(
    {
      final: merged.length,
      updated: notes.updated.length,
      added: notes.added.length,
      soft_rejects: notes.soft_rejects.map((x) => x.id),
      yen_preserved: notes.yen_preserved_why.length,
      squares: sug.squares.length,
    },
    null,
    2,
  ),
);
