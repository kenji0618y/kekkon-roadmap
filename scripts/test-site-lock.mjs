#!/usr/bin/env node
/**
 * 公開サイトの合言葉暗号化（scripts/site-lock/）のテスト。本物の合言葉は使わない（テスト用の合言葉で小さな dist を作る）。
 *   - 合言葉が無いと暗号化が失敗する（平文で公開しない）
 *   - 暗号化 → 検査が通る・平文が残ると検査が落ちる
 *   - 正しい合言葉で開ける／違う合言葉では開けない
 *   - service worker（sw.js）を Node で動かし、ページ・フォルダのページ・画像・動画の一部（Range）が元どおりに返る／鍵が無いと解錠ページだけ
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { unlockSiteJson, CHUNK } from './site-lock/core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ENC = join(here, 'site-lock/encrypt-dist.mjs');
const VER = join(here, 'site-lock/verify-dist.mjs');
const PASS = 'test-only passphrase 0123';
let failed = 0;
const t = (name, cond) => { if (cond) console.log('ok  ', name); else { failed++; console.error('FAIL', name); } };
const run = (script, dir, env) => spawnSync(process.execPath, [script, dir], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' });

function makeDist() {
  const d = mkdtempSync(join(tmpdir(), 'sitelock-'));
  const w = (rel, data) => { mkdirSync(dirname(join(d, rel)), { recursive: true }); writeFileSync(join(d, rel), data); };
  w('index.html', '<!doctype html><html><head><title>結婚ロードマップ Amity</title><meta property="og:title" content="Amity"></head><body><div id="root"></div><script type="module" src="./assets/index-abc.js"></script></body></html>');
  w('assets/index-abc.js', 'console.log("ふたりの手帳 ゴットマン 婚姻届");'.repeat(50));
  w('assets/index-abc.css', 'body{color:red}');
  w('manifest.webmanifest', '{"name":"Amityちゃんにきく"}');
  w('sub/index.html', '<!doctype html><title>別のページ 結婚</title><img src="../phases/a.png">');
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(webcrypto.getRandomValues(new Uint8Array(30000)))]);
  w('phases/a.png', png);
  const video = Buffer.alloc(CHUNK * 2 + 12345);
  for (let i = 0; i < video.length; i++) video[i] = (i * 7 + (i >> 9)) & 255;
  video.write('ftypisom', 4, 'latin1');
  w('futari/lesson1.mp4', video);
  w('sw.js', 'workbox precache');
  w('workbox-123abc.js', 'workbox');
  w('.nojekyll', '');
  return { d, png, video };
}

// 1) 合言葉なしは失敗
{
  const { d } = makeDist();
  const r = run(ENC, d, {});
  t('合言葉なしでは暗号化が失敗する', r.status !== 0 && /SITE_PASSPHRASE/.test(r.stderr));
  t('合言葉なしの失敗では何も消していない', existsSync(join(d, 'assets/index-abc.js')) && !existsSync(join(d, 'site.json')));
  const v = run(VER, d, {});
  t('暗号化していない dist は検査が落ちる', v.status !== 0);
  rmSync(d, { recursive: true });
}

// 2) 暗号化 → 検査 → 開ける
const { d, png, video } = makeDist();
{
  const r = run(ENC, d, { SITE_PASSPHRASE: PASS });
  t('暗号化できる', r.status === 0);
  t('合言葉を表示しない', !(r.stdout + r.stderr).includes(PASS));
  const v = run(VER, d, { SITE_PASSPHRASE: PASS });
  t('検査が通る', v.status === 0);
  if (v.status !== 0) console.error(v.stdout, v.stderr);
  t('二重の暗号化は断る', run(ENC, d, { SITE_PASSPHRASE: PASS }).status !== 0);
  const plain = readdirSync(d).sort().join(',');
  t('平文はトップに解錠ページ・sw.js・site.json だけ', plain === '.nojekyll,enc,index.html,site.json,sub,sw.js');
  t('フォルダのページの場所にも解錠ページ', readFileSync(join(d, 'sub/index.html'), 'utf8').includes('<title>合言葉を入れてください</title>'));
  const site = JSON.parse(readFileSync(join(d, 'site.json'), 'utf8'));
  let bad = false;
  try { await unlockSiteJson(site, PASS + 'x'); } catch { bad = true; }
  t('違う合言葉では開けない', bad);
  const { manifest } = await unlockSiteJson(site, PASS);
  t('一覧にページ・フォルダのページ・画像・動画', ['index.html', 'sub/index.html', 'phases/a.png', 'futari/lesson1.mp4', 'assets/index-abc.js'].every((p) => manifest.files[p]));
  t('workbox の sw.js は一覧に入れない', !manifest.files['workbox-123abc.js'] && !manifest.files['sw.js']);
}

// 3) 平文が混ざると検査が落ちる
for (const [name, fn] of [
  ['平文の画像', (x) => writeFileSync(join(x, 'leak.png'), png)],
  ['平文の JS', (x) => writeFileSync(join(x, 'enc', '0123456789abcdef0123456789abcdef.bin'), 'import x from "./a.js";'.repeat(400))],
  ['アプリの index.html', (x) => writeFileSync(join(x, 'index.html'), '<title>結婚ロードマップ</title>')],
  ['解錠ページに og タグ', (x) => writeFileSync(join(x, 'index.html'), readFileSync(join(x, 'index.html'), 'utf8').replace('</head>', '<meta property="og:title" content="x"></head>'))],
]) {
  const x = mkdtempSync(join(tmpdir(), 'sitelock-bad-'));
  spawnSync('cp', ['-r', `${d}/.`, x]);
  fn(x);
  t(`検査が「${name}」で落ちる`, run(VER, x, { SITE_PASSPHRASE: PASS }).status !== 0);
  rmSync(x, { recursive: true });
}

// 4) sw.js を Node で動かす
async function makeSw(withKey) {
  const SCOPE = 'https://example.test/kekkon-roadmap/';
  const store = new Map();
  const cacheApi = {
    async open(name) {
      if (!store.has(name)) store.set(name, new Map());
      const m = store.get(name);
      return { match: async (k) => (m.has(String(k.url || k)) ? m.get(String(k.url || k)).clone() : undefined), put: async (k, res) => { m.set(String(k.url || k), new Response(await res.arrayBuffer(), { status: res.status, headers: res.headers })); } };
    },
    async match(k, opt) {
      for (const [n, m] of store) { if (opt && opt.cacheName && opt.cacheName !== n) continue; const r = m.get(String(k.url || k)); if (r) return r.clone(); }
      return undefined;
    },
    async keys() { return [...store.keys()]; },
    async delete(n) { return store.delete(n); },
  };
  let fetches = 0;
  const fakeFetch = async (input, init = {}) => {
    fetches++;
    const u = new URL(String(input.url || input));
    const rel = u.pathname.slice('/kekkon-roadmap/'.length) || 'index.html';
    const p = join(d, rel);
    if (!existsSync(p)) return new Response('nf', { status: 404 });
    const buf = readFileSync(p);
    const range = (init.headers && (init.headers.Range || init.headers.range)) || (input.headers && input.headers.get && input.headers.get('range'));
    const m = range && /bytes=(\d+)-(\d+)/.exec(range);
    if (m) return new Response(buf.subarray(+m[1], +m[2] + 1), { status: 206 });
    return new Response(buf, { status: 200 });
  };
  const listeners = {};
  const ctx = {
    self: null, caches: cacheApi, fetch: fakeFetch, crypto: webcrypto, CryptoKey: globalThis.CryptoKey, Response, Request, Headers, URL, TextEncoder, TextDecoder, atob, DataView, Uint8Array, Promise, Math, Number, String, JSON, Error,
    indexedDB: { open() { throw new Error('unused'); } }, console,
  };
  ctx.self = { registration: { scope: SCOPE }, addEventListener: (type, fn) => { listeners[type] = fn; }, skipWaiting: async () => {}, clients: { claim: async () => {} } };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(d, 'sw.js'), 'utf8'), ctx);
  let key = null;
  if (withKey) {
    const site = JSON.parse(readFileSync(join(d, 'site.json'), 'utf8'));
    key = await webcrypto.subtle.importKey('raw', (await unlockSiteJson(site, PASS)).siteKey, 'HKDF', false, ['deriveKey']);
  }
  ctx.idbGet = async () => key;
  const waits = [];
  const ev = (extra) => ({ waitUntil: (p) => waits.push(p), ...extra });
  const install = ev({});
  listeners.install(install);
  await Promise.all(waits);
  await new Promise((r) => listeners.activate(ev({ waitUntil: (p) => p.then(r) })));
  const get = async (path, { mode = 'no-cors', range } = {}) => {
    const req = new Request(SCOPE + path, { headers: range ? { range } : {} });
    Object.defineProperty(req, 'mode', { value: mode });
    let out = null;
    listeners.fetch(ev({ request: req, respondWith: (p) => { out = p; } }));
    return out ? await out : null;
  };
  return { get, fetchCount: () => fetches, store, waits };
}

{
  const locked = await makeSw(false);
  const r = await locked.get('', { mode: 'navigate' });
  const html = await r.text();
  t('鍵がない端末: どのページも解錠ページ', html.includes('<title>合言葉を入れてください</title>') && html.includes('content="https://example.test/kekkon-roadmap/"'));
  const r2 = await locked.get('sub/', { mode: 'navigate' });
  t('鍵がない端末: フォルダのページも解錠ページ', (await r2.text()).includes('合言葉を入れてください'));
  const r3 = await locked.get('phases/a.png');
  t('鍵がない端末: 絵は返らない', r3.status === 404);

  const sw = await makeSw(true);
  const app = await sw.get('', { mode: 'navigate' });
  t('鍵のある端末: アプリの index.html を返す', (await app.text()).includes('<div id="root">'));
  const deep = await sw.get('some/route', { mode: 'navigate' });
  t('鍵のある端末: 知らない場所はアプリへ', (await deep.text()).includes('<div id="root">'));
  const pv = await sw.get('sub/', { mode: 'navigate' });
  t('鍵のある端末: フォルダのページはアプリに差し替わらない', (await pv.text()).includes('別のページ 結婚'));
  const pv2 = await sw.get('sub', { mode: 'navigate' });
  t('フォルダのページ（/なし）は / つきへ', pv2.status === 301);
  const img = await sw.get('phases/a.png');
  t('絵が元どおり', Buffer.from(await img.arrayBuffer()).equals(png) && img.headers.get('content-type') === 'image/png');
  const js = await sw.get('assets/index-abc.js');
  t('JS が元どおり（種類も）', (await js.text()).includes('ゴットマン') && js.headers.get('content-type').startsWith('text/javascript'));
  for (const [a, b] of [[0, 1], [CHUNK - 10, CHUNK + 10], [CHUNK * 2, video.length - 1], [5, 5]]) {
    const v = await sw.get('futari/lesson1.mp4', { range: `bytes=${a}-${b}` });
    const got = Buffer.from(await v.arrayBuffer());
    t(`動画の一部 ${a}-${b} が元どおり（206）`, v.status === 206 && got.equals(video.subarray(a, b + 1)) && v.headers.get('content-range') === `bytes ${a}-${b}/${video.length}`);
  }
  const open = await sw.get('futari/lesson1.mp4', { range: 'bytes=0-' });
  t('動画 bytes=0- は先頭から返す', open.status === 206 && Buffer.from(await open.arrayBuffer()).equals(video.subarray(0, Math.min(video.length, 2 * 1024 * 1024))));
  const whole = await sw.get('futari/lesson1.mp4');
  t('動画全体も元どおり', Buffer.from(await whole.arrayBuffer()).equals(video));
  await Promise.all(sw.waits);
  const before = sw.fetchCount();
  const again = await sw.get('phases/a.png');
  t('一度取った絵はキャッシュから（オフラインでも開く）', Buffer.from(await again.arrayBuffer()).equals(png) && sw.fetchCount() === before);
}

rmSync(d, { recursive: true });
if (failed) { console.error(`test-site-lock: ${failed} 件失敗`); process.exit(1); }
console.log('test-site-lock: all passed');
