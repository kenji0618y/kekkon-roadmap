#!/usr/bin/env node
/** LINE 通知（掲示板・ロードマップの済）の node テスト。TS を esbuild でまとめて動かす（本物の中継先にはつながない）。 */
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './state.mjs';

const dir = mkdtempSync(join(tmpdir(), 'line-notify-'));
let status = 0;
try {
  for (const name of ['line-notify', 'stamp-notify']) {
    const out = join(dir, `${name}.mjs`);
    await build({ entryPoints: [join(root, `scripts/tests/${name}.test.ts`)], bundle: true, platform: 'node', format: 'esm', target: 'node20', outfile: out, logLevel: 'error', loader: { '.json': 'json' } });
    const r = spawnSync(process.execPath, [out], { stdio: 'inherit' });
    if ((r.status ?? 1) !== 0) status = 1;
  }
  process.exitCode = status;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
