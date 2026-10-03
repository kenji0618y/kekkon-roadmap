#!/usr/bin/env node
/**
 * 暗号化したあとの dist に平文が残っていないかを検査する（公開の直前に CI で必ず通す）。
 *   node scripts/site-lock/verify-dist.mjs [dist]
 * SITE_PASSPHRASE があれば、全部の暗号文が開けること・合言葉がどこにも入っていないことも確かめる（合言葉は表示しない）。
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unlockSiteJson, decryptFile, unb64 } from './core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dist = process.argv[2] || join(here, '../../dist');
const fail = [];
const ok = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

if (!existsSync(join(dist, 'site.json'))) {
  console.error('::error::dist が暗号化されていません（site.json がない）。平文のまま公開しません。');
  process.exit(1);
}

// 平文で出してはいけない言葉（アプリの文言・名前など）。足したい言葉は SITE_LOCK_EXTRA_WORDS（カンマ区切り）で。
const WORDS = ['結婚', 'ロードマップ', 'Amity', '婚姻', 'ゴットマン', 'Gottman', '広島', '式なし', '手帳', 'ふたり', '二人', '練習帳', '掲示板',
  '新生活', '出産', '入籍', 'Kenji', 'Kadomoto', '門元', 'lesson', 'futari', 'phases', 'washi', 'mascot', 'shark', 'grok', 'x.ai', 'gist', 'LINE',
  ...(process.env.SITE_LOCK_EXTRA_WORDS || '').split(',').map((s) => s.trim()).filter(Boolean)];
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MATCHERS = WORDS.map((w) => [w, /^[\x20-\x7e]+$/.test(w) ? new RegExp(`(^|[^A-Za-z])${esc(w)}($|[^A-Za-z])`, w === w.toUpperCase() ? '' : 'i') : new RegExp(esc(w))]);
// site.json の暗号文（base64）・名前（16進）は偶然英字の並びができるので、言葉の検査からは外す
const scrub = (rel, text) => rel !== 'site.json' ? text : JSON.stringify(JSON.parse(text), (k, v) => (['iv', 'ct', 'salt', 'build'].includes(k) || (typeof v === 'string' && /^[0-9a-f]{32}$/.test(v)) ? '' : v));

const unlockTemplate = readFileSync(join(here, 'unlock.html'), 'utf8');
const files = walk(dist).map((p) => relative(dist, p).split('\\').join('/'));
const blobs = [];
for (const rel of files) {
  const abs = join(dist, rel);
  if (/^enc\/[0-9a-f]{32}\.bin$/.test(rel)) { blobs.push(rel); continue; }
  if (rel === '.nojekyll') { if (statSync(abs).size) fail.push('.nojekyll は空のはず'); continue; }
  const isUnlock = rel === 'index.html' || /^[\w.-]+(\/[\w.-]+)*\/index\.html$/.test(rel);
  if (!(isUnlock || rel === 'sw.js' || rel === 'site.json')) { fail.push(`平文で残ってはいけないファイル: ${rel}`); continue; }
  const text = readFileSync(abs, 'utf8');
  const scanned = scrub(rel, text);
  const hits = MATCHERS.filter(([, re]) => re.test(scanned)).map(([w]) => w);
  if (hits.length) fail.push(`${rel} にアプリの言葉が平文で入っている: ${hits.join(' / ')}`);
  if (isUnlock) {
    const depth = rel.split('/').length - 1;
    const expect = unlockTemplate.replaceAll('__ROOT__', depth ? '../'.repeat(depth) : './');
    if (text !== expect) fail.push(`${rel} が解錠ページと違う（アプリの index.html が平文で残っている可能性）`);
    const title = (/<title>([^<]*)<\/title>/.exec(text) || [])[1];
    if (title !== '合言葉を入れてください') fail.push(`${rel} の title が「${title}」`);
    if (/property="og:|name="twitter:|name="description"|rel="manifest"|apple-mobile-web-app-title/.test(text)) fail.push(`${rel} に og/meta/manifest が残っている`);
    if (/(src|href)="https?:/.test(text)) fail.push(`${rel} が外のファイルを読み込んでいる`);
  }
}
if (!fail.length) ok.push(`平文のファイルは解錠ページ・sw.js・site.json・.nojekyll だけ（暗号文 ${blobs.length} 個）`);

const MAGIC = [[0x89, 0x50, 0x4e, 0x47], [0xff, 0xd8, 0xff], [0x47, 0x49, 0x46, 0x38], [0x52, 0x49, 0x46, 0x46], [0x77, 0x4f, 0x46, 0x32]];
const TEXTY = ['<!do', '<htm', '<svg', 'impo', 'expo', '{"', 'func', 'var ', 'cons', '/*'];
let lowEntropy = 0;
for (const rel of blobs) {
  const buf = readFileSync(join(dist, rel));
  const head = buf.subarray(0, 16);
  const magic = MAGIC.some((m) => m.every((b, i) => head[i] === b)) || head.subarray(4, 8).toString('latin1') === 'ftyp'
    || TEXTY.some((t) => head.subarray(0, t.length).toString('latin1') === t);
  if (magic) fail.push(`${rel} が暗号化されていない（ファイルの頭が平文の形式）`);
  const sample = buf.subarray(0, Math.min(buf.length, 65536));
  if (sample.length >= 4096) {
    const counts = new Array(256).fill(0);
    for (const b of sample) counts[b]++;
    let h = 0;
    for (const c of counts) if (c) { const p = c / sample.length; h -= p * Math.log2(p); }
    if (h < 7.5) { lowEntropy++; fail.push(`${rel} のばらつきが小さい（${h.toFixed(2)} bit）。暗号化されていない可能性`); }
  }
}
if (!lowEntropy) ok.push('暗号文はどれも平文の形式で始まらず、ばらつきも十分');

const site = JSON.parse(readFileSync(join(dist, 'site.json'), 'utf8'));
const keys = Object.keys(site).sort().join(',');
if (keys !== 'art,build,chunk,core,kdf,manifest,v,wrap') fail.push(`site.json に想定外の項目: ${keys}`);
if (!(site.kdf && site.kdf.alg === 'PBKDF2-SHA256' && site.kdf.iter >= 600000 && unb64(site.kdf.salt).length >= 16)) fail.push('site.json の鍵の作り方が弱い（PBKDF2-SHA256・60万回以上・salt 16バイト以上）');
else ok.push(`鍵: PBKDF2-SHA256 ${site.kdf.iter} 回・ビルドごとの salt`);

const pass = process.env.SITE_PASSPHRASE || '';
if (pass) {
  const needle = Buffer.from(pass, 'utf8');
  const leaked = files.filter((rel) => readFileSync(join(dist, rel)).includes(needle));
  if (leaked.length) fail.push(`合言葉がファイルに入っている: ${leaked.join(' / ')}`);
  else ok.push('合言葉はどのファイルにも入っていない');
  try {
    const { keys: k, manifest } = await unlockSiteJson(site, pass);
    const entries = Object.entries(manifest.files);
    let opened = 0;
    for (const [path, e] of entries) {
      const data = new Uint8Array(readFileSync(join(dist, 'enc', `${e.b}.bin`)));
      const plain = await decryptFile(k.contentKey, e, data);
      if (plain.length !== e.s) fail.push(`${path}: 大きさが合わない`);
      else opened++;
      if (path === 'index.html' && !Buffer.from(plain).includes('<div id="root">')) fail.push('復号した index.html がアプリ本体ではない');
    }
    const need = ['index.html', 'manifest.webmanifest'];
    for (const n of need) if (!manifest.files[n]) fail.push(`暗号文の一覧に ${n} がない`);
    if (!entries.some(([p]) => /^assets\/index-.*\.js$/.test(p))) fail.push('暗号文の一覧にアプリの JS がない');
    if (!entries.some(([p]) => p.endsWith('.mp4'))) fail.push('暗号文の一覧に動画がない');
    ok.push(`合言葉で全 ${opened}/${entries.length} ファイルが開ける`);
  } catch (e) {
    fail.push(`合言葉で開けない: ${e.message}`);
  }
} else {
  ok.push('（SITE_PASSPHRASE なし：開けるかどうかの確認は省略）');
}

for (const l of ok) console.log('OK  ', l);
if (fail.length) {
  for (const l of fail) console.error('FAIL', l);
  console.error(`::error::site-lock: ${fail.length} 件。平文が残っているので公開しません。`);
  process.exit(1);
}
console.log('site-lock verify: passed');
