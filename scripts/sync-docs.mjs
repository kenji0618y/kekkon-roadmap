#!/usr/bin/env node
/**
 * ドキュメントの「いまの数字」をコードから書き込む。
 *   npm run sync:docs
 * 対象は <!-- STATE:LINE --> … <!-- /STATE --> と <!-- STATE:TABLE --> … <!-- /STATE --> で
 * 囲まれた部分だけ。ここを手で書き換えないこと（次の sync で上書きされます）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, collectState, stateLine, stateTable } from './state.mjs';

export const DOCS = [
  'AGENTS.md', 'CLAUDE.md', 'CHATGPT.md', 'README.md',
  '.github/copilot-instructions.md', '.cursor/rules/kekkon-roadmap.mdc',
  'docs/AI_START_HERE.md', 'docs/HANDOFF.md', 'docs/CONTENT_GUARD.md',
];

/** verify-seed 本体に検査数を出させる（推測しない） */
export function checkCount() {
  const out = execFileSync('node', [join(root, 'scripts/verify-seed.mjs'), '--emit-checks'], {
    cwd: root, encoding: 'utf8',
  });
  return Number(String(out).trim());
}

export function renderBlocks(state, checks) {
  return {
    LINE: stateLine(state, checks),
    TABLE: stateTable(state, checks),
  };
}

/** 1ファイル分。書き換えたら true、変更なしなら false。check=true なら書かずに判定だけ */
export function applyToFile(rel, blocks, { check = false } = {}) {
  const path = join(root, rel);
  const before = readFileSync(path, 'utf8');
  let after = before;
  for (const kind of ['LINE', 'TABLE']) {
    const re = new RegExp(`(<!-- STATE:${kind} -->)([\\s\\S]*?)(<!-- /STATE -->)`, 'g');
    after = after.replace(re, (_m, a, _body, b) => `${a}\n${blocks[kind]}\n${b}`);
  }
  const changed = after !== before;
  if (changed && !check) writeFileSync(path, after);
  return changed;
}

if (process.argv[1] && process.argv[1].endsWith('sync-docs.mjs')) {
  const state = collectState();
  const checks = checkCount();
  const blocks = renderBlocks(state, checks);
  const touched = DOCS.filter((f) => applyToFile(f, blocks));
  console.log(stateLine(state, checks));
  console.log(touched.length ? `更新: ${touched.join(' / ')}` : 'すべて最新でした');
}
