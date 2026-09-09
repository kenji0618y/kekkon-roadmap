#!/usr/bin/env node
/**
 * Permanent guardrail: never drop or thin app-seed content.
 * Exits non-zero if inventory counts fall below minima OR UI mounts are missing.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const headline = home.headline && String(home.headline).trim() ? 1 : 0;
const banner = home.anti_lie_banner && String(home.anti_lie_banner).trim() ? 1 : 0;
const phaseN = (phases.phases || []).length;
const events = (phases.phases || []).reduce((n, p) => n + ((p.events || []).length), 0);
const subtitles = groups.filter((g) => g.subtitle && String(g.subtitle).trim()).length;
const chipSets = groups.filter((g) => Array.isArray(g.chips) && g.chips.length > 0).length;

check('tasks.count', tasks.length, 137, true);
check('tasks.why', why, 137);
check('tasks.miss', miss, 137);
check('tasks.window', window, 137);
check('tasks.faq_pairs', faqPairs, 650);
check('tasks.money_in', moneyIn, 90);
check('tasks.money_out', moneyOut, 50);
check('tasks.track', track, 137);
check('deadlines.next_absolute', abs, 10, true);
check('deadlines.relative_always', rel, 6, true);
check('exclude.items', excl, 36, true);
check('home.hero_numbers', hero, 3, true);
check('home.lies_not_to_buy', lies, 4, true);
check('home.talk_lines', talk, 10, true);
check('home.tomorrow_3_actions', tomorrow, 3, true);
check('home.headline', headline, 1, true);
check('home.anti_lie_banner', banner, 1, true);
check('phases.count', phaseN, 9, true);
check('phases.events', events, 48);
check('groups.subtitle', subtitles, 10);
check('groups.chips_sets', chipSets, 31);

// UI mounts
const panels = readText('src/components/SeedContentPanels.tsx');
const notebook = readText('src/Notebook.tsx');
const forms = readText('src/components/notebook-forms.tsx');

const uiChecks = [
  ['SeedContentPanels HomeInsightPanels', panels.includes('export function HomeInsightPanels')],
  ['SeedContentPanels headline', panels.includes('headline')],
  ['SeedContentPanels tomorrow_3_actions', panels.includes('tomorrow_3_actions')],
  ['SeedContentPanels InstitutionalDeadlines', panels.includes('export function InstitutionalDeadlines')],
  ['SeedContentPanels PhasesPanel', panels.includes('export function PhasesPanel')],
  ['SeedContentPanels excludeItems', panels.includes('excludeItems')],
  ['Notebook mounts HomeInsightPanels', notebook.includes('HomeInsightPanels')],
  ['Notebook mounts InstitutionalDeadlines', notebook.includes('InstitutionalDeadlines')],
  ['Notebook mounts PhasesPanel', notebook.includes('PhasesPanel')],
  ['Notebook wires onOpenTask to HomeInsightPanels', /HomeInsightPanels[^>]*onOpenTask/.test(notebook)],
  ['TaskForm seed money memo', forms.includes('シード金額メモ')],
  ['TaskForm why/miss/window', forms.includes('なぜやるのか') && forms.includes('やらないと失うもの')],
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

console.log('=== verify-seed inventory ===');
for (const line of ok) console.log('OK  ', line);
if (fail.length) {
  console.error('\n=== FAILURES ===');
  for (const line of fail) console.error('FAIL', line);
  console.error(`\nverify-seed: ${fail.length} check(s) failed`);
  process.exit(1);
}
console.log(`\nverify-seed: all ${ok.length} checks passed`);
