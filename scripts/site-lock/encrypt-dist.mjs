#!/usr/bin/env node
/**
 * ビルド後の dist を合言葉で暗号化する（公開する前に必ず通す）。
 *   SITE_PASSPHRASE=… node scripts/site-lock/encrypt-dist.mjs [dist]
 * 合言葉が無いときは失敗する（平文のまま公開しない）。合言葉は表示もファイル出力もしない。
 * 平文で残すのは: 解錠ページ（index.html と各フォルダの index.html）・sw.js・site.json・.nojekyll・enc/*.bin（暗号文）・
 *   ホーム画面のアイコン（core.mjs の PLAIN_ICONS。絵だけ・文字なし）だけ。
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITERATIONS, SITE_KEY_SALT, CHUNK, PLAIN_ICONS, plainIconProblem, pbkdf2, subKeys, encryptFile, gcmSeal, aesKey, b64, hex, crypto } from './core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dist = process.argv[2] || join(here, '../../dist');
const passphrase = process.env.SITE_PASSPHRASE || '';

function die(msg) {
  console.error(`::error::${msg}`);
  console.error(`encrypt-dist: ${msg}`);
  process.exit(1);
}

if (!passphrase.trim()) die('SITE_PASSPHRASE がありません。合言葉なしでは公開しません（GitHub の Secrets に SITE_PASSPHRASE を入れてください）。');
if (passphrase.length < 8) die('SITE_PASSPHRASE が短すぎます（8文字以上）。');
if (!existsSync(join(dist, 'index.html'))) die(`${dist}/index.html がありません。先に npm run build を実行してください。`);
if (existsSync(join(dist, 'site.json'))) die('dist はすでに暗号化されています（npm run build からやり直してください）。');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.map': 'application/json; charset=utf-8',
};
const VIDEO = new Set(['.mp4', '.webm']);
const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const all = walk(dist).map((p) => relative(dist, p).split('\\').join('/'));
// vite-plugin-pwa の workbox の sw.js は使わない（中身のファイル名一覧が平文で入るため）。下で解錠つきの sw.js に置き換える。
const drop = (rel) => rel === 'sw.js' || /^workbox-[\w-]+\.js(\.map)?$/.test(rel) || rel === 'registerSW.js' || rel === 'sw.js.map';
const keepPlain = (rel) => rel === '.nojekyll' || PLAIN_ICONS.includes(rel);
for (const rel of PLAIN_ICONS) {
  if (!all.includes(rel)) continue;
  const why = plainIconProblem(readFileSync(join(dist, rel)));
  if (why) die(`${rel} を平文で置けません: ${why}（文字の入らない PNG にしてください）`);
}

const siteKey = await pbkdf2(passphrase, SITE_KEY_SALT, ITERATIONS);
const salt = crypto.getRandomValues(new Uint8Array(16));
const kek = await aesKey(await pbkdf2(passphrase, salt, ITERATIONS), ['encrypt']);
const keys = await subKeys(siteKey);

mkdirSync(join(dist, 'enc'), { recursive: true });
const files = {};
const core = [];
const art = [];
const dirIndexes = [];
let bytes = 0;
for (const rel of all.sort()) {
  const abs = join(dist, rel);
  if (keepPlain(rel)) continue;
  if (drop(rel)) { rmSync(abs); continue; }
  const ext = extname(rel).toLowerCase();
  const plain = new Uint8Array(readFileSync(abs));
  const { name, data, base8 } = await encryptFile(keys, rel, plain);
  writeFileSync(join(dist, 'enc', `${name}.bin`), data);
  rmSync(abs);
  files[rel] = { b: name, s: plain.length, t: TYPES[ext] || 'application/octet-stream', i: b64(base8) };
  bytes += plain.length;
  if (VIDEO.has(ext)) { /* 動画は先読みしない（見るときに必要な部分だけ取る） */ }
  else if (IMAGE.has(ext)) art.push(name);
  else core.push(name);
  if (rel.endsWith('/index.html')) dirIndexes.push(rel);
}

// 空になったフォルダを消す
for (const rel of all) {
  let d = dirname(join(dist, rel));
  while (d !== dist && d.startsWith(dist)) {
    try { if (readdirSync(d).length === 0) rmSync(d, { recursive: true }); else break; } catch { break; }
    d = dirname(d);
  }
}

const manifestPlain = new TextEncoder().encode(JSON.stringify({ v: 1, files }));
const build = hex(crypto.getRandomValues(new Uint8Array(8)));
const site = {
  v: 1,
  build,
  chunk: CHUNK,
  kdf: { alg: 'PBKDF2-SHA256', iter: ITERATIONS, salt: b64(salt) },
  wrap: await gcmSeal(kek, siteKey, 'site-lock/v1/wrap'),
  manifest: await gcmSeal(keys.contentKey, manifestPlain, 'site-lock/v1/manifest'),
  core: [...new Set(core)],
  art: [...new Set(art)],
};
writeFileSync(join(dist, 'site.json'), JSON.stringify(site));

const sw = readFileSync(join(here, 'sw.js'), 'utf8').replaceAll('__BUILD__', build);
writeFileSync(join(dist, 'sw.js'), sw);

const unlock = readFileSync(join(here, 'unlock.html'), 'utf8');
const writeUnlock = (rel) => {
  const depth = rel.split('/').length - 1;
  const rootRel = depth === 0 ? './' : '../'.repeat(depth);
  mkdirSync(dirname(join(dist, rel)), { recursive: true });
  writeFileSync(join(dist, rel), unlock.replaceAll('__ROOT__', rootRel));
};
writeUnlock('index.html');
for (const rel of dirIndexes) writeUnlock(rel);

console.log(`encrypt-dist: ${Object.keys(files).length} ファイルを暗号化（${(bytes / 1048576).toFixed(1)} MB）・解錠ページ ${1 + dirIndexes.length} 枚・build ${build}`);
