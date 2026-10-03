#!/usr/bin/env node
// 項目の欄（FAQ 以外で画面に出るもの）に残った作り手あてのメモを数える。
// 使い方: node scripts/field-audit.mjs [tasks.json] [--list]
import { readFileSync } from 'node:fs';

const args = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
const tasks = JSON.parse(readFileSync(file || new URL('../src/data/tasks.json', import.meta.url), 'utf8'));
const IDS = tasks.map((t) => t.id).sort((a, b) => b.length - a.length);
const ID_RE = new RegExp(`(?<![A-Za-z0-9])(${IDS.map((s) => s.replace(/[-]/g, '\\-')).join('|')})(?![0-9])`);

const CHECKS = [
  ['項目番号', (s) => s.match(ID_RE)?.[0]],
  ['同上', (s) => s.match(/^同上$|同上/)?.[0]],
  ['埋めていない「○」', (s) => s.match(/○(日|円|か月|週間|万|年)?/)?.[0]],
  ['意味の通らない時期', (s) => s.match(/と書いていない|書かれていない日/)?.[0]],
  ['作り手あての語', (s) => s.match(/TODO|FIXME|詳細はwhy|\bwhy\b|exclude|収録した案内|本線|トグル|創作|捏造|分岐|教えるな|書くな|混ぜるな|埋めない|推測で埋め|定石|が死ぬ|窓は閉じて|同趣旨|空振り|を先に切れ|主戦場|防衛線|→(この世帯)?NO|(?<![A-Za-z])NO(?![A-Za-z])|規程入力|円は公式のみ|要綱参照|\bLean\b/)?.[0]],
  ['貼り付けの重複（同じ文が2回）', (s) => { const p = s.split(/(?<=。)/).map((x) => x.trim()).filter((x) => [...x].length >= 12); const seen = new Set(); for (const x of p) { if (seen.has(x)) return x; seen.add(x); } return null; }],
];

const fieldsOf = (t) => {
  const out = [];
  for (const k of ['summary', 'why', 'miss', 'window', 'amountNote', 'notice']) if (typeof t[k] === 'string') out.push([k, t[k]]);
  (t.steps || []).forEach((s, i) => typeof s === 'string' && out.push([`steps[${i}]`, s]));
  (t.questions || []).forEach((s, i) => typeof s === 'string' && out.push([`questions[${i}]`, s]));
  for (const m of ['money_in', 'money_out']) if (t[m] && typeof t[m].note === 'string') out.push([`${m}.note`, t[m].note]);
  return out;
};

const hits = [];
for (const t of tasks) for (const [k, v] of fieldsOf(t)) for (const [name, fn] of CHECKS) {
  const m = fn(v); if (m) hits.push({ task: t.id, field: k, kind: name, hit: m, text: v });
}
const by = {}; for (const h of hits) by[h.kind] = (by[h.kind] || 0) + 1;
console.log('項目の欄の検査');
console.log(`  項目 ${tasks.length} / 見つかったもの ${hits.length}（欄 ${new Set(hits.map((h) => h.task + h.field)).size}）`);
for (const [n] of CHECKS) console.log(`  ${n.padEnd(16, '　')} ${by[n] || 0}`);
if (args.has('--list')) for (const h of hits) console.log(JSON.stringify(h));
if (args.has('--json')) console.log(JSON.stringify(hits));
