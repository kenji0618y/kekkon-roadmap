#!/usr/bin/env node
/**
 * Permanent guardrail: never drop or thin app-seed content.
 * Exits non-zero if inventory counts fall below minima OR UI mounts are missing.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanScreenLanguage } from './screen-language.mjs';
import { collectState, stateLine } from './state.mjs';
import { DOCS, renderBlocks, applyToFile } from './sync-docs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];
const ok = [];

// Reminder for agents that skip docs: handoff lives at repo root.
if (!existsSync(join(root, 'AGENTS.md')) || !existsSync(join(root, 'docs/AI_START_HERE.md'))) {
  fail.push('missing AGENTS.md or docs/AI_START_HERE.md — restore handoff entry files');
} else {
  ok.push('handoff entry files present (AGENTS.md + AI_START_HERE)');
}
if (!existsSync(join(root, 'CLAUDE.md')) || !existsSync(join(root, 'CHATGPT.md'))) {
  fail.push('missing CLAUDE.md or CHATGPT.md — restore Claude/ChatGPT entry files');
} else {
  ok.push('Claude/ChatGPT entry files present');
}

function loadJson(rel) {
  const p = join(root, rel);
  if (!existsSync(p)) {
    fail.push(`missing file: ${rel}`);
    return null;
  }
  return JSON.parse(readFileSync(p, 'utf8'));
}

function readText(rel) {
  const p = join(root, rel);
  if (!existsSync(p)) {
    fail.push(`missing file: ${rel}`);
    return '';
  }
  return readFileSync(p, 'utf8');
}

function check(name, actual, min, exact = false) {
  if (exact) {
    if (actual !== min) fail.push(`${name}: expected exactly ${min}, got ${actual}`);
    else ok.push(`${name}=${actual} (exact)`);
  } else if (actual < min) {
    fail.push(`${name}: expected ≥${min}, got ${actual}`);
  } else {
    ok.push(`${name}=${actual} (≥${min})`);
  }
}

const tasks = loadJson('src/data/tasks.json') || [];
const deadlines = loadJson('src/data/deadlines.json') || {};
const exclude = loadJson('src/data/exclude.json') || {};
const home = loadJson('src/data/home.json') || {};
const phases = loadJson('src/data/phases.json') || {};
const groups = loadJson('src/data/groups.json') || [];
const practices = loadJson('src/data/practices.json') || [];
const talks = loadJson('src/data/talks.json') || [];
const agreements = loadJson('src/data/agreements.json') || [];
const refs = loadJson('src/data/refs.json') || [];

const why = tasks.filter((t) => t.why && String(t.why).trim()).length;
const miss = tasks.filter((t) => t.miss && String(t.miss).trim()).length;
const window = tasks.filter((t) => t.window && String(t.window).trim()).length;
const faqPairs = tasks.reduce((n, t) => n + ((t.faq || []).filter((f) => f && f.q && f.a).length), 0);
const moneyIn = tasks.filter((t) => t.money_in != null).length;
const moneyOut = tasks.filter((t) => t.money_out != null).length;
const track = tasks.filter((t) => t.track).length;
const abs = (deadlines.next_absolute || []).length;
const rel = (deadlines.relative_always || []).length;
const excl = (exclude.items || []).length;
const hero = (home.hero_numbers || []).length;
const lies = (home.lies_not_to_buy || []).length;
const talk = (home.talk_lines || []).length;
const tomorrow = (home.tomorrow_3_actions || []).length;
const banner = home.anti_lie_banner && String(home.anti_lie_banner).trim() ? 1 : 0;
const phaseN = (phases.phases || []).length;
const events = (phases.phases || []).reduce((n, p) => n + ((p.events || []).length), 0);
const subtitles = groups.filter((g) => g.subtitle && String(g.subtitle).trim()).length;
const chipSets = groups.filter((g) => Array.isArray(g.chips) && g.chips.length > 0).length;

check('tasks.count', tasks.length, 186, true);
check('tasks.why', why, 186);
check('tasks.miss', miss, 186);
check('tasks.window', window, 186);
check('tasks.faq_pairs', faqPairs, 890);
check('tasks.money_in', moneyIn, 90);
check('tasks.money_out', moneyOut, 50);
check('tasks.track', track, 186);
// pad = 絵の上に出る短縮名。長いと枠からはみ出し、無いと機械的に切れて読めなくなる。
const pads = tasks.filter((t) => {
  const n = [...String(t.pad || '').trim()].length;
  return n >= 2 && n <= 8;
}).length;
check('tasks.pad(2-8字)', pads, 186, true);
check('deadlines.next_absolute', abs, 11, true);
check('deadlines.relative_always', rel, 6, true);
check('exclude.items', excl, 36, true);
check('home.hero_numbers', hero, 3, true);
check('home.lies_not_to_buy', lies, 4, true);
check('home.talk_lines', talk, 10, true);
check('home.tomorrow_3_actions', tomorrow, 3, true);
check('home.anti_lie_banner', banner, 1, true);
check('phases.count', phaseN, 9, true);
check('phases.events', events, 48);
check('groups.subtitle', subtitles, 12);

// 「ふたりの練習帳」の中身。ここも減らさない。
check('pair.practices', practices.length, 52, true);
check('pair.practice_themes', new Set(practices.map((p) => p.theme)).size, 14);
check('pair.talks', talks.length, 16, true);
check('pair.agreements', agreements.length, 18, true);
check('pair.refs', refs.length, 18, true);
const refIds = new Set(refs.map((r) => r.id));
for (const row of [...practices, ...talks, ...agreements]) {
  for (const id of row.refs || []) {
    if (!refIds.has(id)) fail.push(`pair: ${row.id} が知らない根拠 ${id} を指しています`);
  }
}
for (const p of practices) {
  for (const key of ['idea', 'action', 'when', 'caution']) {
    if (!String(p[key] || '').trim()) fail.push(`pair.practices: ${p.id} の ${key} が空です`);
  }
}
for (const t of talks) {
  for (const key of ['scene', 'say', 'listen', 'next', 'caution']) {
    if (!String(t[key] || '').trim()) fail.push(`pair.talks: ${t.id} の ${key} が空です`);
  }
}
if (!refs.some((r) => /DV相談/.test(r.title))) fail.push('pair.refs: DV相談の窓口が外れています');
if (!refs.some((r) => /性犯罪・性暴力/.test(r.title))) fail.push('pair.refs: 性犯罪・性暴力の案内が外れています');
for (const r of refs) {
  for (const key of ['kind', 'by', 'title', 'summary', 'limits', 'url']) {
    if (!String(r[key] || '').trim()) fail.push(`pair.refs: ${r.id} の ${key} が空です`);
  }
}
for (const a of agreements) {
  for (const key of ['topic', 'question']) {
    if (!String(a[key] || '').trim()) fail.push(`pair.agreements: ${a.id} の ${key} が空です`);
  }
}
check('groups.chips_sets', chipSets, 33);

// Yearly-review items: commercial perks that go stale. Count is a floor;
// staleness is a WARNING (loud, but never blocks a build a year from now).
const reviewed = tasks.filter((t) => t.review);
check('tasks.yearly_review', reviewed.length, 12);
const warn = [];
const DAY = 24 * 60 * 60 * 1000;
for (const t of reviewed) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.review)) {
    fail.push(`tasks.review: ${t.id} の日付が YYYY-MM-DD ではありません (${t.review})`);
    continue;
  }
  const months = (Date.now() - Date.parse(`${t.review}T00:00:00Z`)) / (30.44 * DAY);
  if (months > 15) warn.push(`${t.id} ${t.title}（最終確認 ${t.review} · ${Math.floor(months)}か月前）`);
}
if (warn.length) {
  console.log('');
  console.log('=== 毎年見直す項目の期限です ===');
  console.log('民間のサービスは条件が変わります。公式ページで確かめて、');
  console.log('tasks.json の "review" を今日の日付に更新してください。');
  for (const w of warn) console.log(`  ・${w}`);
  console.log('手順は docs/YEARLY_UPDATE.md の「毎年見直す項目」を見てください。');
  console.log('');
}

// UI mounts
const panels = readText('src/components/SeedContentPanels.tsx');
const notebook = readText('src/Notebook.tsx');
const forms = readText('src/components/notebook-forms.tsx');
const marriageDesk = readText('src/components/MarriageDesk.tsx');

const uiChecks = [
  ['MarriageDesk mounts desk-money before くわしく見る', /desk-money[\s\S]*desk-decor-fold|desk-more-viz/.test(marriageDesk) && marriageDesk.includes('desk-money') && marriageDesk.includes('くわしく見る')],
  ['Money block has no old headings', !marriageDesk.includes('暮らしに増えた') && !marriageDesk.includes('各項目で二人が入力した金額を集計') && !notebook.includes('暮らしに増えた') && !notebook.includes('各項目で二人が入力した金額を集計')],
  ['Notebook desk tab has no standalone money-section', !notebook.includes('money-section')],
  ['SeedContentPanels HomeInsightPanels', panels.includes('export function HomeInsightPanels')],
  ['SeedContentPanels tomorrow_3_actions', panels.includes('tomorrow_3_actions')],
  ['SeedContentPanels InstitutionalDeadlines', panels.includes('export function InstitutionalDeadlines')],
  ['SeedContentPanels PhasesPanel', panels.includes('export function PhasesPanel')],
  ['SeedContentPanels excludeItems', panels.includes('excludeItems')],
  ['Notebook mounts HomeInsightPanels', notebook.includes('HomeInsightPanels')],
  ['Notebook mounts InstitutionalDeadlines', notebook.includes('InstitutionalDeadlines')],
  ['Notebook mounts PhasesPanel', notebook.includes('PhasesPanel')],
  ['Notebook wires onOpenTask to HomeInsightPanels', /HomeInsightPanels[^>]*onOpenTask/.test(notebook)],
  ['TaskForm seed money memo', forms.includes('お金のめやす')],
  ['TaskForm why/miss/window', forms.includes('なぜやるのか') && forms.includes('やらないと失うもの')],
  ['PairWorkbook mounted', notebook.includes('PairWorkbook')],
  ['PairWorkbook safety note', readText('src/components/PairWorkbook.tsx').includes('pair-safety')],
  ['Pair tab in nav', /id:'pair'/.test(notebook)],
  ['YEARLY_UPDATE in docs', existsSync(join(root, 'docs/YEARLY_UPDATE.md'))],
  ['YEARLY_UPDATE in src/data', existsSync(join(root, 'src/data/YEARLY_UPDATE.md'))],
  ['YEARLY_UPDATE surfaced in Notebook', notebook.includes('毎年更新メモ') || notebook.includes('yearlyUpdateMd')],
];

const yearlyDocs = readText('docs/YEARLY_UPDATE.md');
const yearlyData = readText('src/data/YEARLY_UPDATE.md');
if (yearlyDocs && yearlyData && yearlyDocs !== yearlyData) {
  fail.push('YEARLY_UPDATE.md drift: docs/ and src/data/ must be identical (settings imports src/data)');
} else if (yearlyDocs && yearlyData) {
  ok.push('YEARLY_UPDATE docs↔src/data identical');
}


for (const [name, pass] of uiChecks) {
  if (pass) ok.push(`ui:${name}`);
  else fail.push(`ui missing: ${name}`);
}

// 画面に作り手の言葉が出ていないか（日本語を含む文字列だけを見る）
const screen = scanScreenLanguage();
for (const w of screen.warnings) console.error('WARN 画面用語（AIへの指示文なので表示はされません）:', w);
if (screen.errors.length) {
  for (const e of screen.errors) fail.push(`画面用語: ${e}`);
} else {
  ok.push('screen language clean (src/data + *.tsx)');
}

// ここまでが「検査項目」。+1 は、このあと必ず1件行う「docs が古くないか」の検査ぶん。
// こうしておくと、ドキュメントに書かれる数と実行時の "all N checks passed" が一致する。
const checkTotal = ok.length + fail.length + 1;
if (process.argv.includes('--emit-checks')) {
  process.stdout.write(String(checkTotal));
  process.exit(0);
}

// ドキュメントの STATE ブロックが古くなっていないか
const blocks = renderBlocks(collectState(), checkTotal);
const stale = DOCS.filter((f) => existsSync(join(root, f)) && applyToFile(f, blocks, { check: true }));
if (stale.length) {
  fail.push(`docs が古いままです（${stale.join(' / ')}）→ npm run sync:docs を実行してコミットしてください`);
} else {
  ok.push(`docs state block in sync — ${stateLine(collectState(), checkTotal)}`);
}

console.log('=== verify-seed inventory ==='); 
for (const line of ok) console.log('OK  ', line);
if (fail.length) {
  console.error('\n=== FAILURES ===');
  for (const line of fail) console.error('FAIL', line);
  console.error(`\nverify-seed: ${fail.length} check(s) failed`);
  process.exit(1);
}
console.log(`\nverify-seed: all ${ok.length} checks passed`);
