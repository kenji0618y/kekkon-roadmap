#!/usr/bin/env node
/** 掲示板の LINE 通知の node テスト。TS を esbuild でまとめて動かす（本物の中継先にはつながない）。 */
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './state.mjs';

const dir = mkdtempSync(join(tmpdir(), 'line-notify-'));
const out = join(dir, 'test.mjs');
try {
  await build({ entryPoints: [join(root, 'scripts/tests/line-notify.test.ts')], bundle: true, platform: 'node', format: 'esm', target: 'node20', outfile: out, logLevel: 'error', loader: { '.json': 'json' } });
  const r = spawnSync(process.execPath, [out], { stdio: 'inherit' });
  process.exitCode = r.status ?? 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
