#!/usr/bin/env node
// FAQ の検査（読み取りだけ）：src/data/tasks.json の faq を見て、
//   1. 問いに答えていない「まとめの貼り付け」（要約＋背景：＋時期：）
//   2. 同じ項目の中で答えがまるごと同じ
//   3. 同じ段落・文のくり返し（答えの中／同じ項目のほかの答えと）
//   4. 作り手あてのメモ（TODO・※ここに〜・編集者へ・英語の下書きメモ など）
//   5. 問いと答えの言葉が重ならない（キーワードの目安）
// を数える。使い方: node scripts/faq-audit.mjs [--json] [--list]
import { readFileSync } from 'node:fs';

const tasks = JSON.parse(readFileSync(new URL('../src/data/tasks.json', import.meta.url), 'utf8'));
const args = new Set(process.argv.slice(2));

// 作り手あてのメモ（画面に出してはいけない）
const META = [
  /TODO|FIXME|TBD|XXX|placeholder|lorem/i,
  /※\s*ここに/, /ここに[^。\n]{0,20}(入れる|書く|入る|追記|差し込)/,
  /編集(者|部|さん)へ|編集メモ|ライター|執筆者|校正|要追記|要出典|追記予定|差し替え予定|仮置き|（仮）|\(仮\)/,
  /\b(note|memo|draft|check|verify|confirm|source|cite|citation|insert|update|fix|rewrite|editor|writer)\b\s*[:：]/i,
  /\[(?:要確認|出典|TK|tk|citation needed)[^\]]*\]/i,
  /\bLean\b/,
  /\b[A-Za-z]{3,}(?:\s+[a-z]{2,}){3,}/, // 英語の文（4語以上の小文字の連なり）
];
const OK_EN = /Prime Video|Apple ID|Google|LINE|PayPay|iDeCo|NISA|URL|PDF|ID|SNS|ETC|NHK|ZEH|GX|DC|UR/;

function meta(text) {
  const hits = [];
  for (const re of META) {
    const m = text.match(re);
    if (m && !(re.source.includes('{3,}') && OK_EN.test(m[0]) && m[0].split(/\s+/).length < 4)) hits.push(m[0]);
  }
  return hits;
}

const isFiller = (a) => /\n背景：/.test(a) && /\n時期：/.test(a);

function paras(a) {
  return a.split(/\n+/).flatMap((p) => p.split(/(?<=。)/)).map((s) => s.trim()).filter((s) => [...s].length >= 18);
}

// 漢字・カタカナ・英数の2文字の組（問いの中身の目安）
const STOP = new Set(['必要', '大丈夫', '場合', '確認', '方法', '注意', 'どう', 'する', 'どこ', 'いつ', 'なに', '何を', '進め', '後回', '回し', 'やら']);
function grams(s) {
  const runs = s.replace(/[（(].*?[)）]/g, ' ').match(/[\p{Script=Han}\p{Script=Katakana}ーA-Za-z0-9]{2,}/gu) || [];
  const g = new Set();
  for (const r of runs) { const c = [...r]; for (let i = 0; i + 1 < c.length; i++) { const k = c[i] + c[i + 1]; if (!STOP.has(k)) g.add(k); } }
  return g;
}
function overlap(q, a) {
  const gq = grams(q); if (!gq.size) return null;
  let n = 0; for (const k of gq) if (a.includes(k)) n++;
  return n / gq.size;
}

const out = { tasks: tasks.length, faq: 0, filler: [], dupAnswer: [], dupPara: [], meta: [], mismatch: [] };
for (const t of tasks) {
  const faq = t.faq || [];
  out.faq += faq.length;
  const firstByAnswer = new Map();
  const paraOwner = new Map();
  faq.forEach((f, i) => {
    const ref = { task: t.id, i, q: f.q };
    if (isFiller(f.a)) out.filler.push(ref);
    if (firstByAnswer.has(f.a)) out.dupAnswer.push({ ...ref, same: firstByAnswer.get(f.a) });
    else firstByAnswer.set(f.a, i);
    const ps = paras(f.a);
    const seenHere = new Set();
    for (const p of ps) {
      if (seenHere.has(p)) out.dupPara.push({ ...ref, where: 'same answer', p });
      seenHere.add(p);
      if (paraOwner.has(p) && paraOwner.get(p) !== i && !firstByAnswer.get(f.a) !== i) out.dupPara.push({ ...ref, where: `faq ${paraOwner.get(p)}`, p });
      else if (!paraOwner.has(p)) paraOwner.set(p, i);
    }
    const m = meta(f.q + '\n' + f.a);
    if (m.length) out.meta.push({ ...ref, hits: m });
    const ov = overlap(f.q, f.a);
    if (ov !== null) {
      // ほかの答えのほうがずっと合っていれば「入れ違い」の疑い
      let best = -1, bestOv = ov;
      faq.forEach((g, j) => { if (j !== i) { const o = overlap(f.q, g.a); if (o > bestOv + 0.25) { bestOv = o; best = j; } } });
      if (ov === 0 || best >= 0) out.mismatch.push({ ...ref, overlap: +ov.toFixed(2), better: best >= 0 ? best : undefined });
    }
  });
}

const counts = {
  tasks: out.tasks, faq: out.faq,
  filler: out.filler.length, dupAnswer: out.dupAnswer.length, dupPara: out.dupPara.length,
  meta: out.meta.length, mismatch: out.mismatch.length,
  tasksWithIssues: new Set([...out.filler, ...out.dupAnswer, ...out.dupPara, ...out.meta, ...out.mismatch].map((r) => r.task)).size,
};
if (args.has('--json')) console.log(JSON.stringify(args.has('--list') ? { counts, ...out } : counts, null, 1));
else {
  console.log('FAQ の検査');
  console.log(`  項目 ${counts.tasks} / FAQ ${counts.faq}組 / 問題のある項目 ${counts.tasksWithIssues}`);
  console.log(`  まとめの貼り付け（問いに答えていない） ${counts.filler}`);
  console.log(`  同じ項目で答えがまるごと同じ           ${counts.dupAnswer}`);
  console.log(`  段落・文のくり返し                     ${counts.dupPara}`);
  console.log(`  作り手あてのメモ                       ${counts.meta}`);
  console.log(`  問いと答えの言葉が重ならない（目安）   ${counts.mismatch}`);
  if (args.has('--list')) for (const k of ['filler', 'dupAnswer', 'dupPara', 'meta', 'mismatch']) for (const r of out[k]) console.log(k, JSON.stringify(r));
}
