#!/usr/bin/env node
/**
 * Permanent guardrail: never drop or thin app-seed content.
 * Exits non-zero if inventory counts fall below minima OR UI mounts are missing.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanScreenLanguage } from './screen-language.mjs';
import { collectState, stateLine } from './state.mjs';
import { DOCS, renderBlocks, applyToFile } from './sync-docs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];
const ok = [];

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
const filingWeek = (home.filing_week_path && home.filing_week_path.steps) || [];
const filingWeekN = filingWeek.length;
const banner = home.anti_lie_banner && String(home.anti_lie_banner).trim() ? 1 : 0;
const phaseN = (phases.phases || []).length;
const events = (phases.phases || []).reduce((n, p) => n + ((p.events || []).length), 0);
const subtitles = groups.filter((g) => g.subtitle && String(g.subtitle).trim()).length;
const chipSets = groups.filter((g) => Array.isArray(g.chips) && g.chips.length > 0).length;

check('tasks.count', tasks.length, 186, true);
check('tasks.why', why, 186);
check('tasks.miss', miss, 186);
check('tasks.window', window, 186);
check('tasks.faq_pairs', faqPairs, 2000);
check('tasks.money_in', moneyIn, 90);
check('tasks.money_out', moneyOut, 50);
check('tasks.track', track, 186);
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
check('home.tomorrow_3_actions', tomorrow, 5, true);
check('home.filing_week_path.steps', filingWeekN, 7, true);
const taskIds = new Set(tasks.map((t) => t.id));
for (const step of filingWeek) {
  if (!step.stamp_id || !taskIds.has(step.stamp_id)) {
    fail.push(`home.filing_week_path: unknown stamp_id ${step?.stamp_id || '(empty)'}`);
  } else if (!String(step.title || '').trim()) {
    fail.push(`home.filing_week_path: empty title for ${step.stamp_id}`);
  }
}
if (!Object.keys(loadJson('src/data/sources.json') || {}).includes('graffer')) {
  fail.push('sources.graffer missing (広島市オンライン手続き)');
} else {
  ok.push('sources.graffer present');
}
check('home.anti_lie_banner', banner, 1, true);
check('phases.count', phaseN, 9, true);
check('phases.events', events, 48);
check('groups.subtitle', subtitles, 12);
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

// Phase / public asset paths: relative only (Pages subdirectory). Files must exist.
const phaseImages = loadJson('src/data/phase-images.json') || {};
const phaseVals = Object.values(phaseImages);
const absPhase = phaseVals.filter((v) => typeof v === 'string' && v.startsWith('/'));
if (absPhase.length) fail.push(`phase-images.json: absolute path(s) break Pages base — ${absPhase.slice(0, 3).join(', ')}`);
else ok.push('phase-images.json: no absolute /paths');
const missingPhase = phaseVals.filter((v) => typeof v === 'string' && !existsSync(join(root, 'public', v)));
if (missingPhase.length) fail.push(`phase-images.json: missing public file(s) — ${missingPhase.slice(0, 5).join(', ')}`);
else ok.push(`phase-images.json: ${phaseVals.length} files exist under public/`);

const sugoroku = loadJson('src/data/sugoroku.json');
if (sugoroku) {
  const abs = [];
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    for (const [k, v] of Object.entries(o)) {
      if (k === 'image' && typeof v === 'string' && v.startsWith('/')) abs.push(v);
      else walk(v);
    }
  };
  walk(sugoroku);
  if (abs.length) fail.push(`sugoroku.json: ${abs.length} absolute image path(s) (use phases/... not /phases/...)`);
  else ok.push('sugoroku.json: no absolute image paths');
}


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

// ===== ふたりタブ：今日の一問・レッスン・困ったとき・ふたり会議（2026-09-25） =====
// 内容を足したら、ここの下限も上げる。出典のないカードは入れない。
const gsrc = loadJson('src/data/gottman-sources.json') || {};
const fcards = loadJson('src/data/futari-cards.json') || {};
const flessons = loadJson('src/data/futari-lessons.json') || {};
const fguide = loadJson('src/data/futari-guide.json') || {};
const gIds = new Set((gsrc.sources || []).map((x) => x.id));
check('futari.sources', gIds.size, 44);
check('futari.ai_allowed_sources', (gsrc.ai_allowed || []).length, 17, true);
for (const id of gsrc.ai_allowed || []) if (!gIds.has(id)) fail.push(`futari.ai_allowed: ${id} が出典表にありません`);
for (const x of gsrc.sources || []) {
  if (!String(x.title || '').trim()) fail.push(`futari.sources: ${x.id} の title が空です`);
  if (x.kind === 'web' && !/^https:\/\//.test(x.url || '')) fail.push(`futari.sources: ${x.id} の url がありません`);
}
const cardsArr = fcards.cards || [];
check('futari.cards', cardsArr.length, 180);
check('futari.week_themes', (fcards.week || []).length, 7, true);
check('futari.year_modes', (fcards.years || []).length, 4, true);
const DAYS = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
for (const c of cardsArr) {
  for (const key of ['id', 'question', 'hint', 'concept']) if (!String(c[key] || '').trim()) fail.push(`futari.cards: ${c.id} の ${key} が空です`);
  if (!Array.isArray(c.sourceIds) || !c.sourceIds.length) fail.push(`futari.cards: ${c.id} に出典（sourceIds）がありません`);
  for (const id of c.sourceIds || []) if (!gIds.has(id)) fail.push(`futari.cards: ${c.id} が知らない出典 ${id} を指しています`);
  if (!Array.isArray(c.days) || !c.days.length || c.days.some((d) => !DAYS.has(d))) fail.push(`futari.cards: ${c.id} の days が正しくありません`);
}
for (const d of DAYS) if (!cardsArr.some((c) => (c.days || []).includes(d))) fail.push(`futari.cards: ${d} のカードがありません`);
// 曜日ごとの回転が偏らないよう、各曜日に20枚以上。id と問いの重複は不可（既存の答えは id で結びつく）。
for (const d of DAYS) { const n = cardsArr.filter((c) => (c.days || []).includes(d)).length; if (n < 20) fail.push(`futari.cards: ${d} のカードが ${n} 枚（20枚以上）`); }
{ const ids = cardsArr.map((c) => c.id), qs = cardsArr.map((c) => String(c.question || '').trim());
  if (new Set(ids).size !== ids.length) fail.push('futari.cards: id が重複しています');
  if (new Set(qs).size !== qs.length) fail.push('futari.cards: 同じ問いが重複しています'); }
const lessonArr = flessons.lessons || [];
check('futari.lesson_scripts', lessonArr.length, 10);
check('futari.lesson_lines', lessonArr.reduce((n, l) => n + (l.lines || []).length, 0), 45);
check('futari.video_topics', (flessons.topics || []).length, 24);
const videos = lessonArr.filter((l) => l.video);
check('futari.lesson_videos', videos.length, 9);
for (const l of videos) {
  if (l.video.startsWith('/') || !existsSync(join(root, 'public', l.video))) fail.push(`futari.lessons: 動画 ${l.video} が public/ にありません`);
  if (l.poster && !existsSync(join(root, 'public', l.poster))) fail.push(`futari.lessons: ポスター ${l.poster} が public/ にありません`);
}
check('futari.trouble_steps', ((fguide.trouble || {}).steps || []).length, 6);
check('futari.rephrase_rows', (fguide.rephrase || []).length, 8);
check('futari.meeting_steps', ((fguide.meeting || {}).steps || []).length, 5);
check('futari.feedback_rules', (fguide.feedbackRules || []).length, 13);
const allRefs = [
  ...lessonArr.flatMap((l) => l.sourceIds || []),
  ...(flessons.topics || []).flatMap((t) => t.sourceIds || []),
  ...(fcards.week || []).flatMap((w) => w.sourceIds || []),
  ...((fguide.trouble || {}).steps || []).flatMap((t) => t.sourceIds || []),
  ...(fguide.rephrase || []).flatMap((r) => r.sourceIds || []),
  ...((fguide.meeting || {}).sourceIds || []),
  ...(fguide.feedbackRules || []).flatMap((r) => r.sourceIds || []),
];
const unknownRefs = [...new Set(allRefs.filter((id) => !gIds.has(id)))];
if (unknownRefs.length) fail.push(`futari: 出典表にないID ${unknownRefs.join(', ')}`);
else ok.push(`futari: all ${allRefs.length} source refs resolve`);
if (!existsSync(join(root, 'public/futari/doctor-icon.png'))) fail.push('futari: public/futari/doctor-icon.png がありません');
// 博士のイラストは ふたりタブ（FutariDaily）だけ。Amity と同じ画面に出さない。
{
  const offenders = [];
  const walkSrc = (dir) => {
    for (const name of readdirSync(join(root, dir))) {
      const rel = `${dir}/${name}`;
      if (statSync(join(root, rel)).isDirectory()) walkSrc(rel);
      else if (/\.(tsx?|css)$/.test(name) && readFileSync(join(root, rel), 'utf8').includes('doctor-icon')) offenders.push(rel);
    }
  };
  walkSrc('src');
  const bad = offenders.filter((f) => f !== 'src/components/FutariDaily.tsx');
  if (bad.length) fail.push(`futari: 博士のイラストが ふたりタブ以外で使われています（${bad.join(', ')}）`);
  else ok.push('futari: doctor icon only in FutariDaily');
  const fd = readText('src/components/FutariDaily.tsx');
  if (/desk-mascot|amity-shark/.test(fd)) fail.push('futari: ふたりタブのコンポーネントに Amity の画像があります');
}
if (existsSync(join(root, 'public/preview'))) fail.push('public/preview/ は削除済みのはずです（見本ページ）');

const panels = readText('src/components/SeedContentPanels.tsx');
const notebook = readText('src/Notebook.tsx');
const forms = readText('src/components/notebook-forms.tsx');
const marriageDesk = readText('src/components/MarriageDesk.tsx');

const uiChecks = [
  ['MarriageDesk mounts desk-money before くわしく見る', /desk-money[\s\S]*desk-decor-fold|desk-more-viz/.test(marriageDesk) && marriageDesk.includes('desk-money') && marriageDesk.includes('くわしく見る')],
  ['MarriageDesk role labels desk-roles', marriageDesk.includes('desk-roles') && marriageDesk.includes('市の窓口・持ち物') && marriageDesk.includes('結婚新生活支援') && marriageDesk.includes('このサイト')],
  ['MarriageDesk filing week path', marriageDesk.includes('desk-filing-path') && marriageDesk.includes('最短パス：届出週')],
  ['MarriageDesk filing week default closed', /<details className="desk-filing-path">/.test(marriageDesk) && !/<details className="desk-filing-path"[^>]*open/.test(marriageDesk)],
  ['MarriageDesk no duplicate titlebar h1', !marriageDesk.includes('ふたりの手帳') && marriageDesk.includes('desk-meta-bar')],
  ['MarriageDesk no Amity deadline list', !marriageDesk.includes('absoluteDeadlines') && !marriageDesk.includes('直近の絶対期限') && !marriageDesk.includes('amity-brief-grid-2')],
  ['MarriageDesk next-actions SoT pointer', marriageDesk.includes('#desk-next-actions') && marriageDesk.includes('desk-next-actions')],
  ['HomeInsightPanels is next-actions SoT', panels.includes('id="desk-next-actions"') && panels.includes('tomorrow_3_actions') && !marriageDesk.includes('tomorrow_3_actions')],
  ['index meta mentions 広島・式なし・未導入', (() => { const html = readText('index.html'); return html.includes('式なし') && html.includes('未導入') && html.includes('og:description'); })()],
  ['Money block has no old headings', !marriageDesk.includes('暮らしに増えた') && !marriageDesk.includes('各項目で二人が入力した金額を集計') && !notebook.includes('暮らしに増えた') && !notebook.includes('各項目で二人が入力した金額を集計')],
  ['Notebook desk tab has no standalone money-section', !notebook.includes('money-section')],
  ['SeedContentPanels HomeInsightPanels', panels.includes('export function HomeInsightPanels')],
  ['SeedContentPanels tomorrow_3_actions', panels.includes('tomorrow_3_actions')],
  ['SeedContentPanels InstitutionalDeadlines', panels.includes('export function InstitutionalDeadlines')],
  ['SeedContentPanels PhasesPanel', panels.includes('export function PhasesPanel')],
  ['SeedContentPanels excludeItems', panels.includes('excludeItems')],
  ['SeedContentPanels ExcludeAndLiesPanel', panels.includes('export function ExcludeAndLiesPanel')],
  ['SeedContentPanels TalkStartersPanel', panels.includes('export function TalkStartersPanel')],
  ['SeedContentPanels HeroNumbersPanel', panels.includes('export function HeroNumbersPanel')],
  ['Notebook mounts HomeInsightPanels', notebook.includes('HomeInsightPanels')],
  ['Notebook mounts InstitutionalDeadlines', notebook.includes('InstitutionalDeadlines')],
  ['Notebook mounts PhasesPanel', notebook.includes('PhasesPanel')],
  ['Notebook mounts ExcludeAndLiesPanel on find', notebook.includes('ExcludeAndLiesPanel')],
  ['Notebook mounts HeroNumbersPanel on deadlines', notebook.includes('HeroNumbersPanel')],
  ['PairWorkbook mounts TalkStartersPanel', readText('src/components/PairWorkbook.tsx').includes('TalkStartersPanel')],
  ['Notebook wires onOpenTask to HomeInsightPanels', /HomeInsightPanels[^>]*onOpenTask/.test(notebook)],
  ['TaskForm seed money memo', forms.includes('お金のめやす')],
  ['TaskForm why/miss/window', forms.includes('なぜやるのか') && forms.includes('やらないと失うもの')],
  ['PairWorkbook mounted', notebook.includes('PairWorkbook')],
  ['PairWorkbook safety note', readText('src/components/PairWorkbook.tsx').includes('pair-safety')],
  ['Pair tab in nav', /id:'pair'/.test(notebook)],
  ['DeskChatPanel brand きく', readText('src/components/DeskChatPanel.tsx').includes('Amityちゃんにきく') && !readText('src/components/DeskChatPanel.tsx').includes('Amityちゃんに聞く')],
  ['YEARLY_UPDATE in docs', existsSync(join(root, 'docs/YEARLY_UPDATE.md'))],
  ['YEARLY_UPDATE in src/data', existsSync(join(root, 'src/data/YEARLY_UPDATE.md'))],
  ['YEARLY_UPDATE surfaced in Notebook', notebook.includes('毎年更新メモ') || notebook.includes('yearlyUpdateMd')],
  ['PairWorkbook stamp-rally pads', readText('src/components/PairWorkbook.tsx').includes('pair-stamp') && readText('src/components/PairWorkbook.tsx').includes('PRACTICE_PAD')],
  ['StampIllustBoard fold done stamps', readText('src/components/StampIllustBoard.tsx').includes('stamp-done-bar') && readText('src/components/StampIllustBoard.tsx').includes('SHOW_DONE_KEY')],
  ['PairWorkbook practice quiet autosave', (pw => pw.includes('quietTimer') && pw.includes('メモは自動で保存されます') && pw.includes('書きかけを戻す') && !pw.includes('メモを保存する'))(readText('src/components/PairWorkbook.tsx'))],
  ['Deadlines block hierarchy', notebook.includes('deadline-block-hero') && notebook.includes('deadline-block-intro')],
  ['Deadlines calendar mounted', notebook.includes('DeadlinesCalendar') && notebook.includes('deadline-block-calendar')],
  ['DeadlinesCalendar component', existsSync(join(root, 'src/components/DeadlinesCalendar.tsx')) && readText('src/components/DeadlinesCalendar.tsx').includes('ふたりのカレンダー')],
  ['Book events schema', readText('src/lib/model.ts').includes('pairEventSchema') && readText('src/lib/model.ts').includes('events:z.array(pairEventSchema)')],
  ['use-book event mutate', readText('src/lib/use-book.ts').includes("action==='event'") && readText('src/lib/use-book.ts').includes("action==='deleteEvent'")],
  ['Find exclude outer with counts', notebook.includes('find-exclude-outer') && notebook.includes('excludeItems.length')],
  ['Nav short ロードマップ', /short:'ロードマップ'/.test(notebook)],
  ['Notebook mounts FutariDaily on pair tab', notebook.includes('<FutariDaily') && /value="pair"[\s\S]*<FutariDaily[\s\S]*<PairWorkbook/.test(notebook)],
  ['Amity button hidden on ふたり tab', /amity-fab[^\n]*tab==='pair'/.test(notebook)],
  ['FutariDaily labels', (fd => fd.includes('ゴットマン博士の教え') && fd.includes('ゴットマン博士の研究にもとづくアドバイス') && fd.includes('イラストはイメージです') && fd.includes('AIにみてもらう') && fd.includes('playsInline'))(readText('src/components/FutariDaily.tsx'))],
  ['futari AI citations constrained', (ai => ai.includes('AI_ALLOWED_SOURCE_IDS') && ai.includes('cleanIds') && ai.includes('validateFeedback'))(readText('src/lib/futari-ai.ts'))],
  ['futari answers in book schema', readText('src/lib/model.ts').includes('futari:futariSchema') && readText('src/lib/use-book.ts').includes("action==='futariAnswer'") && readText('src/lib/use-book.ts').includes('mergeFutari')],
];

const yearlyDocs = readText('docs/YEARLY_UPDATE.md');
const yearlyData = readText('src/data/YEARLY_UPDATE.md');
if (yearlyDocs && yearlyData && yearlyDocs !== yearlyData) {
  fail.push('YEARLY_UPDATE.md drift: docs/ and src/data/ must be identical (settings imports src/data)');
} else if (yearlyDocs && yearlyData) {
  ok.push('YEARLY_UPDATE docs\u2194src/data identical');
}

for (const [name, pass] of uiChecks) {
  if (pass) ok.push(`ui:${name}`);
  else fail.push(`ui missing: ${name}`);
}

const screen = scanScreenLanguage();
for (const w of screen.warnings) console.error('WARN 画面用語（AIへの指示文なので表示はされません）:', w);
if (screen.errors.length) {
  for (const e of screen.errors) fail.push(`画面用語: ${e}`);
} else {
  ok.push('screen language clean (src/data + *.tsx)');
}

const checkTotal = ok.length + fail.length + 1;
if (process.argv.includes('--emit-checks')) {
  process.stdout.write(String(checkTotal));
  process.exit(0);
}

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
