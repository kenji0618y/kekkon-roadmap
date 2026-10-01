#!/usr/bin/env node
/** 同期の暗号化・移行の node テスト。TS を esbuild でまとめて動かす（本物の GitHub にはつながない）。 */
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './state.mjs';

const dir = mkdtempSync(join(tmpdir(), 'sync-crypt-'));
const out = join(dir, 'test.mjs');
try {
  await build({ entryPoints: [join(root, 'scripts/tests/sync-crypt.test.ts')], bundle: true, platform: 'node', format: 'esm', target: 'node20', outfile: out, logLevel: 'error', loader: { '.json': 'json' } });
  const r = spawnSync(process.execPath, [out], { stdio: 'inherit' });
  process.exitCode = r.status ?? 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
