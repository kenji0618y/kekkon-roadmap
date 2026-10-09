#!/usr/bin/env node
/** 画面の機能（今週ふたりでやること など）の node テスト。TS を esbuild でまとめて動かす。 */
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './state.mjs';

const dir = mkdtempSync(join(tmpdir(), 'features-'));
let status = 0;
try {
  for (const name of ['week-together', 'household', 'later', 'shopping', 'reminders', 'google-cal']) {
    const out = join(dir, `${name}.mjs`);
    await build({ entryPoints: [join(root, `scripts/tests/${name}.test.ts`)], bundle: true, platform: 'node', format: 'esm', target: 'node20', outfile: out, logLevel: 'error', loader: { '.json': 'json' } });
    const r = spawnSync(process.execPath, [out], { stdio: 'inherit' });
    if ((r.status ?? 1) !== 0) status = 1;
  }
  process.exitCode = status;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
