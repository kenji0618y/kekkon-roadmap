#!/usr/bin/env node
/**
 * いまのコード・データから「現状の数字」を1か所で計算する。
 * sync-docs.mjs（ドキュメントへの書き込み）と verify-seed.mjs（ズレの検査）が
 * どちらもここを使うので、数字の出どころは常にこの1ファイル。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));

export function collectState() {
  const tasks = json('src/data/tasks.json');
  const groups = json('src/data/groups.json');
  const sources = json('src/data/sources.json');
  const phases = json('src/data/phases.json');
  const notebook = read('src/Notebook.tsx');

  const navLine = notebook.match(/const nav=\[[^\n]*\]/)?.[0] || '';
  const tabs = [...navLine.matchAll(/id:'([a-z]+)',label:'([^']+)',short:'([^']+)'/g)]
    .map((m) => ({ id: m[1], label: m[2], short: m[3] }));

  return {
    tasks: tasks.length,
    groups: groups.length,
    faq: tasks.reduce((n, t) => n + (t.faq || []).length, 0),
    sources: Object.keys(sources).length,
    practices: json('src/data/practices.json').length,
    talks: json('src/data/talks.json').length,
    agreements: json('src/data/agreements.json').length,
    refs: json('src/data/refs.json').length,
    phases: (phases.phases || []).length,
    events: (phases.phases || []).reduce((n, p) => n + (p.events || []).length, 0),
    review: tasks.filter((t) => t.review).length,
    tabs,
    reviewedOn: read('src/data/catalog.ts').match(/reviewedOn='([\d-]+)'/)?.[1] || '',
  };
}

export function stateLine(s, checks) {
  return `${s.tasks}項目 · ${s.groups}まとまり · FAQ ${s.faq}組 · 出典 ${s.sources}件 · ${s.tabs.length}タブ · 検査 ${checks}項目`;
}

export function stateTable(s, checks) {
  return [
    '| いまの状態 | 数 |',
    '|---|---|',
    `| 項目（tasks） | **${s.tasks}** |`,
    `| まとまり（groups） | ${s.groups} |`,
    `| FAQ | ${s.faq}組 |`,
    `| 出典（sources） | ${s.sources}件 |`,
    `| ふたりの練習帳 | 行動${s.practices} / 会話${s.talks} / 合意${s.agreements} / 根拠${s.refs} |`,
    `| 時期・出来事 | ${s.phases}区切り / ${s.events}件 |`,
    `| 毎年見直す項目 | ${s.review}件 |`,
    `| タブ | ${s.tabs.length}（${s.tabs.map((t) => t.short).join(' / ')}） |`,
    `| verify-seed | ${checks}項目 |`,
    `| データ確認日 | ${s.reviewedOn} |`,
  ].join('\n');
}
