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

check('tasks.count', tasks.length, 192, true);
check('tasks.why', why, 192);
check('tasks.miss', miss, 192);
check('tasks.window', window, 192);
check('tasks.faq_pairs', faqPairs, 2000);
check('tasks.money_in', moneyIn, 90);
check('tasks.money_out', moneyOut, 50);
check('tasks.track', track, 192);
const pads = tasks.filter((t) => {
  const n = [...String(t.pad || '').trim()].length;
  return n >= 2 && n <= 8;
}).length;
check('tasks.pad(2-8字)', pads, 192, true);
// 2026-10-02 ハネムーン（新生活の章 sq-honeymoon）。式なしでも出るよう W* / ceremony にしない。
const HONEY_IDS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P6', 'E11'];
const honey = groups.find((g) => g.id === 'sq-honeymoon');
const honeyOk = honey && honey.chapter === 'life' && HONEY_IDS.every((id) => honey.ids.includes(id) && tasks.some((t) => t.id === id && t.group === 'sq-honeymoon' && t.chapter === 'life' && t.eligibility === 'always' && !(t.need || []).includes('ceremony')));
if (!honeyOk) fail.push(`groups.sq-honeymoon: ハネムーンのマス（${HONEY_IDS.join(' / ')}）が欠けています`);
else ok.push(`groups.sq-honeymoon: ${HONEY_IDS.length}項目`);
// どのタスクも、ちょうど1つのまとまり（groups[].ids）に入っている（入っていないと画面に出ない）
const groupCount = new Map();
for (const g of groups) for (const id of g.ids || []) groupCount.set(id, (groupCount.get(id) || 0) + 1);
const notOnce = tasks.filter((t) => groupCount.get(t.id) !== 1).map((t) => t.id);
if (notOnce.length) fail.push(`groups.ids: まとまりに0回または2回以上入っている項目 — ${notOnce.slice(0, 8).join(', ')}`);
else ok.push('groups.ids: 全項目がちょうど1つのまとまりに入っている');
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
check('futari.sources', gIds.size, 87);
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
check('futari.lesson_scripts', lessonArr.length, 198);
check('futari.lesson_lines', lessonArr.reduce((n, l) => n + (l.lines || []).length, 0), 624);
check('futari.video_topics', (flessons.topics || []).length, 25);
const videos = lessonArr.filter((l) => l.video);
check('futari.lesson_videos', videos.length, 35);
const calDays = (flessons.calendar && flessons.calendar.days) || [];
check('futari.calendar_days', calDays.length, 365);
for (const d of calDays) {
  if (!['lesson', 'practice', 'review'].includes(d.kind)) fail.push(`futari.calendar: day ${d.day} の kind が不正です`);
  if (d.kind === 'lesson') {
    if (!d.lessonId) fail.push(`futari.calendar: day ${d.day} に lessonId がありません`);
    else if (!lessonArr.some((l) => l.id === d.lessonId)) fail.push(`futari.calendar: day ${d.day} の ${d.lessonId} が lessons にありません`);
  }
}
// 1–365 は空欄にしない：いまあるカレンダー枠を順に繰り返し（二周目以降＝もう一度）
{
  const n = calDays.length;
  if (n < 1) fail.push('futari.calendar: days が空です');
  else {
    const byDay = new Map(calDays.map((d) => [d.day, d]));
    for (let dayNumber = 1; dayNumber <= 365; dayNumber++) {
      const contentDay = ((dayNumber - 1) % n) + 1;
      const entry = byDay.get(contentDay);
      if (!entry) { fail.push(`futari.calendar: contentDay ${contentDay} がありません（dayNumber=${dayNumber}）`); break; }
      if (!['lesson', 'practice', 'review'].includes(entry.kind)) {
        fail.push(`futari.calendar: day ${contentDay} の kind が不正（365写像）`); break;
      }
      if (entry.kind === 'lesson') {
        if (!entry.lessonId || !lessonArr.some((l) => l.id === entry.lessonId)) {
          fail.push(`futari.calendar: day ${contentDay} のレッスンが解決できません（365写像 dayNumber=${dayNumber}）`); break;
        }
      } else if (!String(entry.concept || '').trim()) {
        fail.push(`futari.calendar: day ${contentDay} の ${entry.kind} に concept がありません（365写像）`); break;
      }
    }
    if (!fail.some((f) => String(f).includes('365写像') || String(f).includes('contentDay'))) {
      ok.push('futari.calendar: every day 1–365 resolves to real content (wrap)');
    }
  }
}
for (const l of lessonArr.filter((x) => !x.video)) {
  if (!String(l.tryToday || '').trim()) fail.push(`futari.lessons: 文字レッスン ${l.id} に tryToday がありません`);
  if (!Array.isArray(l.lines) || l.lines.length < 2) fail.push(`futari.lessons: 文字レッスン ${l.id} の本文が短すぎます`);
}

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
const whereToLook = readText('src/components/WhereToLook.tsx');

const uiChecks = [
  // 2026-10-10 デスクの「くわしく見る」の図はアーカイブへ（折りたたみ・detailOnly）。デスクのお金の案内と説明の行は消した（集計は お金 の MoneySummary）。
  ['MarriageDesk detail charts kept (アーカイブ「くわしく見る」, detailOnly), money totals on お金', marriageDesk.includes('if(detailOnly)return') && marriageDesk.includes('desk-main-grid') && marriageDesk.includes('export function MoneySummary') && /id="archive-desk-detail"[\s\S]*<MarriageDesk detailOnly /.test(notebook) && !marriageDesk.includes('desk-more-viz') && !marriageDesk.includes('片方だけの確認はいまないよ')],
  // 2026-09-30「どこを見るか」＋「最短パス：届出週」はデスクから探すタブへ移動（WhereToLook.tsx）。文言・リンクは同一。
  ['WhereToLook role labels desk-roles (all links/text)', whereToLook.includes('desk-roles') && ['どこを見るか','市の窓口／未導入の支援／このサイト','市の窓口・持ち物','広島市・婚姻届と必要書類','オンライン手続き（Graffer）','結婚新生活支援','広島市は未導入（もらえる前提にしない）','市FAQ：実施について','民間・税・除外・二人の進捗','このサイト','sources.marry','sources.graffer','sources.nogrant'].every(x=>whereToLook.includes(x))],
  ['WhereToLook filing week path (default closed)', whereToLook.includes('desk-filing-path') && whereToLook.includes('最短パス：届出週') && whereToLook.includes('式なし・広島市 · 届出そのものは0円 · 開くと手順') && whereToLook.includes('filing_week_path') && /<details className="desk-filing-path">/.test(whereToLook) && !/<details className="desk-filing-path"[^>]*open/.test(whereToLook)],
  ['Find tab mounts どこを見るか (not on desk)', /value="find"[\s\S]*id="find-where-to-look"[\s\S]*<DeskRoleLabels\/>[\s\S]*<FilingWeekPath[\s\S]*value="settings"/.test(notebook) && !/<DeskRoleLabels|<FilingWeekPath/.test(marriageDesk) && !/value="desk"[\s\S]*<DeskRoleLabels[\s\S]*value="journey"/.test(notebook)],
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
  ['Notebook mounts HeroNumbersPanel on the money tab', notebook.includes('HeroNumbersPanel') && /<TabsContent value="money"[\s\S]*<HeroNumbersPanel/.test(notebook)],
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
  ['PairWorkbook practice quiet autosave', (pw => pw.includes('quietTimer') && pw.includes('書きかけを戻す') && !pw.includes('メモを保存する'))(readText('src/components/PairWorkbook.tsx'))],
  // 2026-10-09 夕 カレンダータブは Google だけ（Kenji「長ったらしい説明は消したい」）。外した中身は「アーカイブ」タブ（18:15「アーカイブのタブを作ってそこに整理して置く」）に折りたたみで置く（消さない）：
  // 制度の期限（全部・休日の出典つき）・項目の予定・時期の区切り・アプリの予定（予定の追加・お知らせのもと）＋「カレンダーに書き出す」。お金には「お金の締切だけ」の一覧を残す。
  ['Archive tab holds the blocks moved out of カレンダー (institutional + schedule + phases + app calendar/ics), money-only list stays on お金', (tab => { const arc = tab('archive', 'settings'), money = tab('money', 'pair'); return /\{id:'archive',label:'アーカイブ',short:'アーカイブ',icon:Archive\},\{id:'settings'/.test(notebook) && arc.includes('id="deadline-block-institutional"') && arc.includes('<InstitutionalDeadlines child={p.child} home={p.home}/>') && arc.includes('<SourceLink source={sources.holidays} compact/>') && arc.includes('id="deadline-block-schedule"') && arc.includes('dated.map(') && arc.includes('missingDates.map(') && arc.includes('手続きの日付を入れる') && arc.includes('id="deadline-block-phases"') && arc.includes('<PhasesPanel ') && money.includes('<InstitutionalDeadlines moneyOnly ') && !money.includes('<InstitutionalDeadlines child=')  && (notebook.match(/<PhasesPanel /g) || []).length === 1 && notebook.includes("onGoDeadlines={()=>openBlock('archive','deadline-block-institutional')}"); })((from, to) => (notebook.split(`<TabsContent value="${from}"`)[1] || '').split(`<TabsContent value="${to}"`)[0])],
  ['DeadlinesCalendar component', existsSync(join(root, 'src/components/DeadlinesCalendar.tsx')) && readText('src/components/DeadlinesCalendar.tsx').includes('ふたりのカレンダー')],
  ['Book events schema', readText('src/lib/model.ts').includes('pairEventSchema') && readText('src/lib/model.ts').includes('events:z.array(pairEventSchema)')],
  ['use-book event mutate', readText('src/lib/use-book.ts').includes("action==='event'") && readText('src/lib/use-book.ts').includes("action==='deleteEvent'")],
  ['Find exclude outer with counts', notebook.includes('find-exclude-outer') && notebook.includes('excludeItems.length')],
  ['Nav short ロードマップ', /short:'ロードマップ'/.test(notebook)],
  ['Notebook mounts FutariDaily on pair tab', notebook.includes('<FutariDaily') && /value="pair"[\s\S]*<FutariDaily[\s\S]*<PairWorkbook/.test(notebook)],
  ['Amity button hidden on ふたり tab', /amity-fab[^\n]*tab==='pair'/.test(notebook)],
  ['FutariDaily labels', (fd => fd.includes('ゴットマン博士の教え') && fd.includes('ゴットマン博士の研究にもとづくアドバイス') && fd.includes('イラストはイメージです') && fd.includes('AIにみてもらう') && fd.includes('playsInline'))(readText('src/components/FutariDaily.tsx'))],
  ['futari AI citations constrained', (ai => ai.includes('AI_ALLOWED_SOURCE_IDS') && ai.includes('cleanIds') && ai.includes('validateFeedback'))(readText('src/lib/futari-ai.ts'))],
  // 2026-10-02 掲示板はデスクのいちばん上（MarriageDesk より前）。見つけやすいようサメの絵・アイコンつきの見出し。デスクのあいさつ文は同日に削除（戻さない）。
  ['Desk board mounted FIRST on desk tab (before MarriageDesk; no intro block), with mascot + icon', /<TabsContent value="desk"[^>]*>\s*<DeskBoard[^\n]*\n(\s*<(?:WeekTogether|LaterList)[^\n]*\n)*\s*<MarriageDesk[\s\S]*value="journey"/.test(notebook) && !notebook.includes('ふたりの未来に、小さな一歩を。') && !notebook.includes('次にやることをまとめた画面です') && existsSync(join(root, 'src/components/DeskBoard.tsx')) && (db => db.includes('desk-board-top') && db.includes('amity-shark.png') && db.includes('MessageSquareHeart'))(readText('src/components/DeskBoard.tsx'))],
  // アプリのカレンダー（予定の追加・ふたり会議・お知らせのもと）と「カレンダーに書き出す」（.ics）はアーカイブの「アプリの予定」に1つだけ。デスクの日付リンクはそこのその日を開く。
  ['Deadlines calendar mounted (アーカイブ → アプリの予定, with .ics export, only once)', (arc => arc.includes('id="archive-app-calendar"') && arc.includes('<DeadlinesCalendar ') && arc.includes('onClick={exportCalendar}') && arc.includes('カレンダーに書き出す'))((notebook.split('<TabsContent value="archive"')[1] || '').split('<TabsContent value="settings"')[0]) && (notebook.match(/<DeadlinesCalendar /g) || []).length === 1 && readText('src/lib/quick-search.ts').includes("scrollId: 'archive-app-calendar'") && readText('src/components/DeadlinesCalendar.tsx').includes('deadline-block-calendar') && readText('src/components/DeadlinesCalendar.tsx').includes('ふたりのカレンダー')],
  // 2026-10-08 「今週ふたりでやること」は掲示板のすぐ下。項目の期限とカレンダーの予定（book.events）・制度の締切を並べ、予定を押すとカレンダーのその日が開く。
  ['Week together on カレンダー under the Google embed (tasks + calendar events, plain text)', /<TabsContent value="deadlines"[^>]*>\s*<GoogleFamilyCalendar [^\n]*\n\s*<WeekTogether [^\n]*\n\s*<\/TabsContent>/.test(notebook) && !readText('src/components/WeekTogether.tsx').includes('onOpenCalendar') && notebook.includes('focus={calFocus}') && (w => w.includes('events:PairEvent[]') && w.includes("kind:'event'") && w.includes("kind:'rule'"))(readText('src/lib/week-together.ts'))],
  // 2026-10-08 期限と記念日の LINE お知らせ・月に一度のふたり会議。カレンダーにのるもの（制度の締切・項目の予定日・予定・記念日・会議）から作り、会議の日は book.reminders.meeting の1か所（カレンダー・設定・.ics・LINE が同じ値）。中継先へはこの先35日の短い一覧だけ。1日1通。
  ['LINE reminders + monthly meeting from the calendar (one source, ics, relay list)', readText('src/lib/model.ts').includes('reminders:remindersSchema.catch(emptyReminders).default(emptyReminders)') && readText('src/lib/use-book.ts').includes('reminders:newerLineNotify(local?.reminders,remote.reminders,emptyReminders)') && readText('src/lib/book-merge.ts').includes('reminders:newerLineNotify(p.reminders,s.reminders,emptyReminders)') && (r => r.includes('export function calendarItems') && r.includes('REMIND_WINDOW_DAYS=35') && r.includes("kind:'reminders'") && r.includes('export function meetingRrule'))(readText('src/lib/reminders.ts')) && notebook.includes('itemsFor={calExtrasFor}') && !notebook.includes('meetingEditor=') && readText('src/components/ReminderSettings.tsx').includes('<MeetingEditor value={value}') && notebook.includes('<RemindersCard ') && notebook.includes('<MeetingCard ') && notebook.includes("icsAlarm('meeting')") && readText('src/lib/dates.ts').includes('RRULE:${rrule}') && readText('src/lib/line-notify.ts').includes("r.error==='unknown'") && !/月\s*200\s*通/.test(readText('src/components/ReminderSettings.tsx')) && readText('scripts/test-features.mjs').includes("'reminders'")],
  // 2026-10-09 カレンダータブのいちばん上に「Google（ファミリー）」/「アプリの予定」。はじめは Google の埋め込み。アプリのカレンダー（お知らせ・鈴・会議・.ics のもと）は「アプリの予定」に残す。ID は book.googleCal（初期値ファミリー・同期は新しい方）、切り替えは端末ごと。CSP の frame-src に calendar.google.com。
  // 2026-10-09 夕 Kenji の指定で、カレンダータブから切り替え・「カレンダー」見出し・書き出し・チップ・「Googleカレンダー」「ファミリー カレンダー」の見出し・説明文を消した。埋め込みの下は小さな「Googleカレンダーで開く」と「直す」だけ。
  ['Google family calendar embed only (no switch/chips/export/heading/note on the tab; app calendar kept in 設定; synced id; CSP frame-src)', readText('src/lib/model.ts').includes('googleCal:googleCalSchema.catch(emptyGoogleCal).default(emptyGoogleCal)') && readText('src/lib/use-book.ts').includes('googleCal:newerLineNotify(local?.googleCal,remote.googleCal,emptyGoogleCal)') && readText('src/lib/book-merge.ts').includes('googleCal:newerLineNotify(p.googleCal,s.googleCal,emptyGoogleCal)') && /<TabsContent value="deadlines" className="tab-surface deadlines-tab">\s*<GoogleFamilyCalendar [^\n]*\n\s*(<WeekTogether [^\n]*\n\s*)?<\/TabsContent>/.test(notebook) && !notebook.includes('CalendarViewSwitch') && !notebook.includes('calView') && !notebook.includes('deadlines-mini-nav" aria-label="カレンダータブ内の節"') && (g => g.includes('Googleカレンダーで開く') && g.includes('直す') && g.includes('googleEmbedUrl(id)') && !g.includes('iPhone の Safari') && !g.includes('「アプリの予定」のほうから') && !g.includes('ファミリーに入っている人だけ') && !g.includes('>Googleカレンダー<small>') && !g.includes('CalendarViewSwitch'))(readText('src/components/GoogleFamilyCalendar.tsx')) && (l => l.includes("ctz:'Asia/Tokyo'") && l.includes("'https://calendar.google.com'"))(readText('src/lib/google-cal.ts')) && /"frame-src[^"]*https:\/\/calendar\.google\.com/.test(readText('vite.config.ts')) && readText('scripts/test-features.mjs').includes("'google-cal'")],
  // 2026-10-08 ロードマップ「新生活」の章に「新生活の買い物リスト」。品目はゼクシィのチェックリストのまま（出典リンクつき）、値段なし。担当・状態・メモ。book.shopping は同期で品目ごとに新しい方、足した品目の削除は tombstone。
  ['Newlife shopping list (Zexy checklist items, source link, no prices, synced)', (d => d.source.url === 'https://zexy.net/newlife/manual/interior_checklist/' && d.categories.length === 4 && !/[0-9０-９]+\s*(円|万)/.test(JSON.stringify(d.categories)))(JSON.parse(readText('src/data/newlife-checklist.json'))) && readText('src/lib/model.ts').includes('shopping:shoppingSchema.catch(emptyShopping).default(emptyShopping)') && readText('src/lib/use-book.ts').includes('shopping:mergeShopping(local?.shopping,remote.shopping)') && readText('src/lib/use-book.ts').includes('sameShopping(a.shopping,b.shopping)') && readText('src/lib/book-merge.ts').includes('shopping:mergeShopping(p.shopping,s.shopping)') && notebook.includes("{chapter==='life'&&<ShoppingList ") && readText('src/components/ShoppingList.tsx').includes('shopSource.url') && readText('scripts/test-features.mjs').includes("'shopping'")],
  // 2026-10-08 「あとで見る」（ふたりで共有）。項目・よくある質問・博士のレッスンに印。book.later は同期で合わせ、外した印は tombstone で相手の端末でも外れる。
  ['Later list shared (task/FAQ/lesson marks, synced with tombstones)', readText('src/lib/model.ts').includes('later:laterSchema.catch(emptyLater).default(emptyLater)') && readText('src/lib/use-book.ts').includes('later:mergeLater(local?.later,remote.later)') && readText('src/lib/use-book.ts').includes('sameLater(a.later,b.later)') && readText('src/lib/book-merge.ts').includes('later:mergeLater(p.later,s.later)') && /id="archive-later"[\s\S]*<LaterList /.test(notebook) && !/<TabsContent value="desk"[\s\S]*<LaterList [\s\S]*<TabsContent value="journey"/.test(notebook) && notebook.includes('<LaterProvider value={laterCtx}>') && readText('src/components/notebook-forms.tsx').includes('laterFaqId(t.id,f.q)') && readText('src/components/notebook-forms.tsx').includes('laterTaskId(t.id)') && readText('src/components/FutariDaily.tsx').includes('laterLessonId(lesson.id)') && readText('scripts/test-features.mjs').includes("'later'")],
  // 2026-10-08 博士タブ「家計の分け方」。ゼクシィの記事の5つの型（文言は記事のまま・出典リンクつき）。金額は出さない。book.household は既定値つきで、同期では新しい方。
  // 2026-10-09 お金タブ。家計の分け方・金額の集計・覚えておきたい数字を移す。買い物リストとロードマップのスタンプは動かさない。制度の期限の全文はカレンダーに残し、お金タブは moneyOnly。
  ['Money tab holds moved money blocks (shopping stays on roadmap)', /id:'money',label:'お金'/.test(notebook) && notebook.includes('<TabsContent value="money"') && /<TabsContent value="money"[\s\S]*<HouseholdSplitCard/.test(notebook) && notebook.includes('<MoneySummary') && notebook.includes('moneyOnly') && notebook.includes("{chapter==='life'&&<ShoppingList ") && readText('src/components/MarriageDesk.tsx').includes('export function MoneySummary') && readText('src/components/SeedContentPanels.tsx').includes('moneyOnly')],
  ['Household split card (5 patterns, source link, synced)', (h => h.patterns.length === 5 && h.source.url === 'https://zexy.net/article/app002112015/')(JSON.parse(readText('src/data/household-patterns.json'))) && readText('src/lib/model.ts').includes('household:householdSchema.catch(emptyHousehold).default(emptyHousehold)') && readText('src/lib/use-book.ts').includes('household:newerLineNotify(') && readText('src/lib/book-merge.ts').includes('household:newerLineNotify(') && notebook.includes('<HouseholdSplitCard') && readText('src/components/HouseholdSplitCard.tsx').includes('householdSource.url')],
  ['Desk board in book schema (defaulted)', readText('src/lib/model.ts').includes('board:boardSchema.catch(emptyBoard).default(emptyBoard)')],
  ['Desk board synced + merged', (ub => ub.includes("action==='boardNote'") && ub.includes("action==='deleteBoardNote'") && ub.includes('mergeBoard'))(readText('src/lib/use-book.ts')) && readText('src/lib/board.ts').includes('deleted')],
  ['Desk board delete confirm + own-only edit', (db => db.includes('AlertDialog') && db.includes('このメモを消しますか') && db.includes('mine&&'))(readText('src/components/DeskBoard.tsx'))],
  ['Desk board 新着 (partner unread, per-device)', (db => db.includes('desk-board-new') && db.includes('新着') && db.includes('markSeen'))(readText('src/components/DeskBoard.tsx')) && (b => b.includes('desk-board-seen-v1') && b.includes("n.who!==me"))(readText('src/lib/board.ts'))],
  // 2026-10-01 同期の暗号化。同期先には暗号文だけ・同期先の ID を公開の JS / ドキュメントに置かない・古い同期先には書かない。
  ['Sync encrypted: AES-GCM + HKDF, push seals before PATCH, no plaintext writer', (c => c.includes("name:'AES-GCM'") && c.includes("name:'HKDF'") && c.includes('KeyMismatchError') && c.includes('getRandomValues'))(readText('src/lib/sync-crypto.ts')) && (g => g.includes('encryptJson(') && g.includes('decryptJson(') && /files:\{\[ENC_FILENAME\]:\{content:await sealed\(/.test(g) && !/\[LEGACY_FILENAME\]:\{content/.test(g) && !/JSON\.stringify\(payload\)/.test(g))(readText('src/lib/gist-sync.ts'))],
  ['Sync: no gist id literal in src (found by key / entered in settings)', !/DEFAULT_GIST_ID|['"`][0-9a-f]{32}['"`]/.test(readText('src/lib/gist-sync.ts') + readText('src/Notebook.tsx') + readText('src/components/SyncSettings.tsx') + readText('src/lib/use-book.ts'))],
  ['Sync migration: join merge (never drops board memos / futari answers), never pushes after a failed read', (ub => ub.includes('mergeBooks(') && ub.includes('pullLegacy(') && ub.includes('instanceof KeyMismatchError') && !ub.includes('pushToGist') && !ub.includes('pullFromGist'))(readText('src/lib/use-book.ts')) && (bm => bm.includes('mergeFutari(') && bm.includes('mergeBoard('))(readText('src/lib/book-merge.ts')) && existsSync(join(root, 'scripts/test-sync-crypt.mjs'))],
  ['Sync settings mounted (encryption status + old-gist cleanup)', notebook.includes('<SyncSettings') && (ss => ss.includes('id="settings-gist-sync"') && ss.includes('sync-crypt-status') && ss.includes('古い同期先を削除する') && ss.includes('AlertDialog'))(readText('src/components/SyncSettings.tsx'))],
  // 2026-10-03 掲示板の LINE 通知（Google Apps Script 経由）。text/plain の POST・合言葉は端末の中で作る・同期で入ったメモでは送らない。
  ['Board LINE notify: text/plain POST, Apps Script /exec only, never throws', (ln => ln.includes("headers:{'Content-Type':'text/plain;charset=utf-8'}") && ln.includes('if(!isRelayUrl(url))return') && ln.includes("return {ok:false,error:'network'};") && ln.includes('LINE_NAME_MAX=20') && ln.includes('LINE_TEXT_MAX=500'))(readText('src/lib/line-notify.ts'))],
  ['Board LINE notify: secret = hex SHA-256 on device, not in book / bundle / VITE_', (ln => ln.includes("LINE_SECRET_PREFIX='kekkon-board-line-v1\\n'") && ln.includes("crypto.subtle.digest('SHA-256'") && ln.includes("toString(16).padStart(2,'0')") && !/script\.google\.com\/macros\/s\/AKfyc/.test(ln))(readText('src/lib/line-notify.ts')) && /lineNotifySchema=z\.object\(\{\s*url:[^\n]*\n\s*on:[^\n]*\n\s*updatedAt:[^\n]*\n\}\)/.test(readText('src/lib/model.ts')) && readText('src/lib/model.ts').includes('lineNotify:lineNotifySchema.catch(emptyLineNotify).default(emptyLineNotify)') && !/VITE_[A-Z_]*(LINE|RELAY|BOARD)/.test(readText('src/lib/line-notify.ts')+readText('src/lib/use-line-notify.ts')+readText('vite.config.ts'))],
  ['Board LINE notify: sent only from the writing device (after save, try/catch), never on sync', (db => /if\(await save\.put\(note,'掲示板に書きました'\)\)\{\s*setDraft\(''\);\s*void notifyLine\(note\);/.test(db) && db.includes("shouldNotifyBoard('compose',note,me)") && db.includes('LINE通知：') && /const notifyLine=async\(note:BoardNote\)=>\{\s*try\{[\s\S]*?\}catch\{/.test(db))(readText('src/components/DeskBoard.tsx')) && !/postRelay|line\.send|notifyLine/.test(readText('src/lib/use-book.ts')+readText('src/lib/book-merge.ts')+readText('src/lib/board.ts')) && (ub => ub.includes("action==='lineNotify'") && ub.includes('newerLineNotify('))(readText('src/lib/use-book.ts'))],
  ['Board LINE notify: 通知（LINE）card right after the 同期 card', /<SyncSettings data=\{data\} profile=\{p\}\/>\n <LineNotifySettings /.test(notebook) && (ls => ls.includes('id="settings-line-notify"') && ls.includes('お知らせの中継先（GoogleのスクリプトのURL）') && ls.includes('LINE通知を使う') && ls.includes('合言葉をコピー') && ls.includes('つながるか試す') && ls.includes('準備中'))(readText('src/components/LineNotifySettings.tsx'))],
  // 2026-10-03 ロードマップの済 → LINE 通知（kind:"board"）。この端末で押したときだけ・5秒待って取り消しなら送らない・同じ項目は30分に1回。
  ['Stamp done LINE notify: local stamp only, held + cooldown, never blocks', (sn => sn.includes('STAMP_HOLD_MS=5000') && sn.includes('STAMP_COOLDOWN_MS=30*60*1000') && sn.includes("prev!=='done'&&next==='done'") && sn.includes('isStillDone(id)') && sn.includes("const head='『'") && sn.includes('を済にしました'))(readText('src/lib/stamp-notify.ts')) && notebook.includes('if(await data.mutate({action:\'record\',id,record:next},msg))noteStampChange(id,cur.status,next.status);') && notebook.includes('noteStampChange(task.id,prevStatus,r.status)') && !/stampNotifier|noteStampChange/.test(readText('src/lib/use-book.ts')+readText('src/lib/book-merge.ts'))],
  // 2026-10-03 公開サイト全体を合言葉で暗号化（scripts/site-lock/）。CI は build → 暗号化 → 平文検査 → 公開の順。合言葉が無ければ失敗して公開しない。
  ['Site lock: CI encrypts with secrets.SITE_PASSPHRASE and leak-scans before gh-pages', (ci => { const e = ci.indexOf('node scripts/site-lock/encrypt-dist.mjs dist'); const v = ci.indexOf('node scripts/site-lock/verify-dist.mjs dist'); const b = ci.indexOf('run: npm run build'); const pub = ci.indexOf('peaceiris/actions-gh-pages'); return b > 0 && e > b && v > e && pub > v && (ci.match(/SITE_PASSPHRASE: \$\{\{ secrets\.SITE_PASSPHRASE \}\}/g) || []).length >= 2 && /publish_dir: \.\/dist/.test(ci); })(readText('.github/workflows/ci.yml'))],
  ['Site lock: encrypt fails without passphrase; AES-256-GCM + PBKDF2-SHA256 ≥600k + random salt; tests in prebuild', (en => en.includes("if (!passphrase.trim()) die(") && en.includes('crypto.getRandomValues(new Uint8Array(16))'))(readText('scripts/site-lock/encrypt-dist.mjs')) && (co => /ITERATIONS = (\d+)/.test(co) && Number(/ITERATIONS = (\d+)/.exec(co)[1]) >= 600000 && co.includes("name: 'AES-GCM', length: 256") && co.includes("hash: 'SHA-256'"))(readText('scripts/site-lock/core.mjs')) && readText('package.json').includes('npm run test:sitelock') && existsSync(join(root, 'scripts/test-site-lock.mjs')) && !/VITE_[A-Z_]*(SITE|PASS)/.test(readText('vite.config.ts') + readText('scripts/site-lock/encrypt-dist.mjs'))],
  ['Site lock: unlock page is neutral (title 合言葉を入れてください, no og/meta/app text)', (u => (/<title>([^<]*)<\/title>/.exec(u) || [])[1] === '合言葉を入れてください' && !/og:|twitter:|name="description"|rel="manifest"|結婚|ロードマップ|Amity|婚姻|ゴットマン|広島|手帳/.test(u) && u.includes('合言葉がちがいます') && !/localStorage/.test(u))(readText('scripts/site-lock/unlock.html'))],
  ['Site lock: 「この端末の合言葉を消す」 in 設定 → 詳細 (IndexedDB only, notebook untouched)', notebook.includes('<SiteLockSettings/>') && (sl => sl.includes('この端末の合言葉を消す') && sl.includes('手帳の記録は消えません'))(readText('src/components/SiteLockSettings.tsx')) && (lib => lib.includes("const DB = 'site-lock'") && !/localStorage/.test(lib.replace(/^\s*(\/\*\*|\*).*$/gm, '')))(readText('src/lib/site-lock.ts'))],
  // 2026-10-03 xAI キーはアプリに同梱しない（難読化した同梱キーを削除）。キーは 設定 →「AI」で入れた端末内の localStorage だけ（2026-10-08 まで「詳細設定」の中）。
  // 2026-10-05 AI on/off（クレジットを使う）スイッチ。オフなら askGrok* は fetch せず ai-off。
  ['Grok AI toggle: isGrokEnabled gates askGrok* before fetch; settings switch クレジット; default ON iff key', (g => g.includes("GROK_ENABLED_LS = 'amity-grok-enabled'") && g.includes('export function isGrokEnabled') && g.includes("error: 'ai-off'") && /if \(!isGrokEnabled\(\)\)/.test(g) && g.includes('GROK_AI_OFF_JA') && g.indexOf('if (!isGrokEnabled())') < g.indexOf('fetch(`${base}/chat/completions`'))(readText('src/lib/amity-grok.ts')) && notebook.includes('AIを使う（クレジットを使う）') && notebook.includes('setGrokEnabled') && readText('src/components/DeskChatPanel.tsx').includes('GROK_AI_OFF_JA') && readText('src/components/DeskChatPanel.tsx').includes('isGrokEnabled()')],
  ['Grok key: user-entered only (no bundled key file / decoder / VITE_), no-key message points to 設定 →「AI」', !existsSync(join(root, 'src/lib/amity-grok-bundle.ts')) && (g => !/amity-grok-bundle|loadBundledGrokKey|import\.meta\.env/.test(g) && g.includes("localStorage.getItem(GROK_KEY_LS)") && /GROK_NO_KEY_JA =[^;]*設定 →「AI」/.test(g))(readText('src/lib/amity-grok.ts')) && readText('src/components/DeskChatPanel.tsx').includes('GROK_NO_KEY_JA') && !/VITE_[A-Z_]*(GROK|XAI)/.test(readText('vite.config.ts'))],
  // 2026-10-09 解錠／開いたときの LINE 通知は外した（Kenji「ログインのときはやっぱり必要ない」）。掲示板・スタンプ・期限と記念日はそのまま。
  ['Login LINE notify removed (board/stamp/reminders kept)', !existsSync(join(root, 'src/lib/login-notify.ts')) && !existsSync(join(root, 'scripts/tests/login-notify.test.ts')) && !notebook.includes('createLoginNotifier') && !notebook.includes('loginOpenedText') && !notebook.includes('loginNotifier') && !/'login-notify'/.test(readText('scripts/test-line-notify.mjs')) && !readText('docs/LINE_NOTIFY.md').includes('手帳を開いたときも知らせる') && !readText('src/components/LineNotifySettings.tsx').includes('開きました') && (ln => ln.includes('boardPayload') && ln.includes('stampDoneText') && readText('src/lib/reminders.ts').includes("kind:'reminders'"))(readText('src/lib/line-notify.ts') + readText('src/lib/stamp-notify.ts'))],
  ['futari calendar wrap: resolveCalendarEntry + もう一度 UI', (f => f.includes('export function resolveCalendarEntry') && f.includes('lessonCalendarLength') && /\(\(dayNumber-1\)%n\)\+1/.test(f.replace(/\s/g,'')))(readText('src/lib/futari.ts')) && (fd => fd.includes('もう一度') && fd.includes('slot.revisit'))(readText('src/components/FutariDaily.tsx'))],
  // 2026-10-08 設定タブを見やすく（カード・状態チップ・折りたたみ）。設定は1つも消さない・id はそのまま（探す・掲示板からのジャンプ先）。
  ['Settings readable: cards + chips + folds, every setting id kept', (nb => ['id="settings-profile"','id="settings-backup"','id="settings-ai"','id="settings-research"','id="settings-grok"','id="settings-advanced-fold"','<SettingsOverview','<SyncSettings','<LineNotifySettings','<SiteLockSettings/>','id="amity-grok-key"','id="amity-grok-base"','AIを使う（クレジットを使う）','スタンプ進捗をリセット…','バックアップを書き出す','バックアップを読み込む','手帳を印刷・PDFにする','毎年の見直しメモ','最新の保存内容を読み込む'].every(x => nb.includes(x)))(notebook) && (ss => ['id="gist-pat"','id="gist-id"','自動同期を使う','今すぐ同期','<Fold'].every(x => ss.includes(x)))(readText('src/components/SyncSettings.tsx')) && (ls => ['id="line-relay-url"','合言葉を手で入れる','<Fold'].every(x => ls.includes(x)))(readText('src/components/LineNotifySettings.tsx')) && existsSync(join(root, 'src/components/settings-ui.tsx'))],
  ['futari answers in book schema', readText('src/lib/model.ts').includes('futari:futariSchema') && readText('src/lib/use-book.ts').includes("action==='futariAnswer'") && readText('src/lib/use-book.ts').includes('mergeFutari')],
];

{
  // 古い同期先（暗号化前・2026-10 に削除予定）の ID は、リポジトリのどこにも書かない（ハッシュで照合）。
  const OLD_SYNC_ID_SHA256 = '0a32f2462a54586f6e93737331fd8a02c56edb0f4d750c8a3a154c85cf54ad74';
  const { createHash } = await import('node:crypto');
  const hits = [];
  const scan = (dir) => {
    for (const name of readdirSync(join(root, dir))) {
      if (['node_modules', 'dist', '.git'].includes(name)) continue;
      const rel = join(dir, name), abs = join(root, rel);
      if (statSync(abs).isDirectory()) { scan(rel); continue; }
      if (!/\.(md|ts|tsx|mjs|js|json|html|yml|txt|mdc)$/.test(name)) continue;
      for (const m of readFileSync(abs, 'utf8').matchAll(/[0-9a-f]{32}/g)) if (createHash('sha256').update(m[0]).digest('hex') === OLD_SYNC_ID_SHA256) hits.push(rel);
    }
  };
  scan('.');
  if (hits.length) fail.push(`古い同期先の ID が書かれています（${[...new Set(hits)].join(', ')}）`);
  else ok.push('old sync gist id absent from repo files');
}
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
