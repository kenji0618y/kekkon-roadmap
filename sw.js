/* 合言葉で暗号化した公開サイトを、この端末の中だけで開くための service worker。
 * 暗号文（enc/*.bin）を取ってきて、解錠ページで保存した鍵（IndexedDB・合言葉そのものではない）で復号して返す。
 * 鍵がない／合わないときは、どのページを開いても解錠ページだけを返す。
 * 生成元: scripts/site-lock/sw.js（encrypt-dist.mjs が 7cee8c8051fa68cb を埋める） */
'use strict';
const BUILD = '7cee8c8051fa68cb';
const CACHE = 'site-lock-' + BUILD;
const SCOPE = new URL(self.registration.scope);
const MAX_RANGE = 2 * 1024 * 1024;
const TAG = 16;
const te = new TextEncoder();
const url = (rel) => new URL(rel, SCOPE).href;
const u8 = (s) => { const b = atob(s); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };

function idbGet() {
  return new Promise((ok) => {
    const r = indexedDB.open('site-lock', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('k');
    r.onerror = () => ok(null);
    r.onsuccess = () => {
      try {
        const q = r.result.transaction('k', 'readonly').objectStore('k').get('site');
        q.onsuccess = () => ok(q.result || null);
        q.onerror = () => ok(null);
      } catch { ok(null); }
    };
  });
}

async function siteJson() {
  const c = await caches.open(CACHE);
  let res = await c.match(url('site.json'));
  if (!res) {
    res = await fetch(url('site.json'), { cache: 'no-cache' });
    if (!res.ok) throw new Error('site.json');
    await c.put(url('site.json'), res.clone());
  }
  return res.json();
}

let statePromise = null;
function getState() {
  if (!statePromise) {
    statePromise = (async () => {
      const stored = await idbGet();
      if (!stored) return null;
      const base = stored instanceof CryptoKey ? stored : await crypto.subtle.importKey('raw', stored, 'HKDF', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: te.encode('site-lock/v1/content') }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      const site = await siteJson();
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8(site.manifest.iv), additionalData: te.encode('site-lock/v1/manifest') }, key, u8(site.manifest.ct));
      const manifest = JSON.parse(new TextDecoder().decode(plain));
      return { key, site, files: manifest.files, chunk: site.chunk };
    })().catch(() => null);
    statePromise.then((s) => { if (!s) statePromise = null; });
  }
  return statePromise;
}

async function fill(cache, names, fetchMissing) {
  const todo = names.slice();
  const worker = async () => {
    while (todo.length) {
      const k = url('enc/' + todo.shift() + '.bin');
      if (await cache.match(k)) continue;
      const old = await caches.match(k); // 前の版のキャッシュにあれば取り直さない
      if (old) { await cache.put(k, old); continue; }
      if (!fetchMissing) continue;
      const res = await fetch(k);
      if (!res.ok) throw new Error('fetch ' + k);
      await cache.put(k, res);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const site = await fetch(url('site.json'), { cache: 'no-cache' });
    if (!site.ok) throw new Error('site.json');
    const s = await site.clone().json();
    await c.put(url('site.json'), site);
    const lock = await fetch(url('index.html'), { cache: 'no-cache' });
    if (!lock.ok) throw new Error('index.html');
    await c.put(url('index.html'), lock);
    await fill(c, s.core, true);
    await fill(c, s.art, false);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      // 古い版の暗号文と、以前の（暗号化前の）オフライン用キャッシュを消す。アプリのデータ（localStorage）には触れない。
      if (name !== CACHE && (name.startsWith('site-lock-') || name.startsWith('workbox-'))) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const t = event.data && event.data.type;
  if (t === 'SITE_LOCK_KEY_CHANGED' || t === 'SITE_LOCK_FORGET') statePromise = null;
  if (t === 'SKIP_WAITING') self.skipWaiting();
});

let warming = null;
function warm(st) {
  if (!warming) {
    warming = (async () => {
      const c = await caches.open(CACHE);
      await fill(c, st.site.core, true);
      await fill(c, st.site.art, true);
    })().catch(() => { warming = null; });
  }
  return warming;
}

async function blobFull(name, keep) {
  const k = url('enc/' + name + '.bin');
  const hit = await caches.match(k);
  if (hit) return new Uint8Array(await hit.arrayBuffer());
  const res = await fetch(k);
  if (!res.ok) throw new Error('fetch ' + k);
  if (keep) { const c = await caches.open(CACHE); await c.put(k, res.clone()); }
  return new Uint8Array(await res.arrayBuffer());
}

async function blobRange(name, a, b) {
  const k = url('enc/' + name + '.bin');
  const hit = await caches.match(k);
  if (hit) return new Uint8Array(await hit.arrayBuffer()).subarray(a, b + 1);
  const res = await fetch(k, { headers: { Range: `bytes=${a}-${b}` } });
  if (res.status === 206) return new Uint8Array(await res.arrayBuffer());
  if (!res.ok) throw new Error('fetch ' + k);
  return new Uint8Array(await res.arrayBuffer()).subarray(a, b + 1);
}

async function decryptChunks(st, entry, data, first, last) {
  const CH = st.chunk;
  const n = Math.max(1, Math.ceil(entry.s / CH));
  const base = u8(entry.i);
  const parts = [];
  let off = 0;
  let total = 0;
  for (let i = first; i <= last; i++) {
    const len = Math.min(CH, entry.s - i * CH) + TAG;
    const iv = new Uint8Array(12);
    iv.set(base, 0);
    new DataView(iv.buffer).setUint32(8, i);
    const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: te.encode(`${entry.b}|${i}|${n}`) }, st.key, data.subarray(off, off + len)));
    parts.push(pt);
    total += pt.length;
    off += len;
  }
  const out = new Uint8Array(total);
  let p = 0;
  for (const x of parts) { out.set(x, p); p += x.length; }
  return out;
}

async function full(st, entry) {
  const video = entry.t.startsWith('video/');
  const data = await blobFull(entry.b, !video);
  const n = Math.max(1, Math.ceil(entry.s / st.chunk));
  const body = await decryptChunks(st, entry, data, 0, n - 1);
  return new Response(body, { status: 200, headers: { 'Content-Type': entry.t, 'Content-Length': String(body.length), 'Accept-Ranges': 'bytes' } });
}

async function ranged(st, entry, header) {
  const size = entry.s;
  const CH = st.chunk;
  const m = /bytes=(\d*)-(\d*)/.exec(header || '');
  if (!m || (m[1] === '' && m[2] === '')) return full(st, entry);
  let start;
  let end;
  if (m[1] === '') { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  else { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), size - 1) : Math.min(size - 1, start + MAX_RANGE - 1); }
  if (start >= size || end < start) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  const c0 = Math.floor(start / CH);
  const c1 = Math.floor(end / CH);
  const a = c0 * (CH + TAG);
  const b = c1 * (CH + TAG) + Math.min(CH, size - c1 * CH) + TAG - 1;
  const data = await blobRange(entry.b, a, b);
  const plain = await decryptChunks(st, entry, data, c0, c1);
  const body = plain.slice(start - c0 * CH, end - c0 * CH + 1);
  return new Response(body, { status: 206, headers: { 'Content-Type': entry.t, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(body.length), 'Accept-Ranges': 'bytes' } });
}

async function lockPage() {
  let res = await caches.match(url('index.html'), { cacheName: CACHE });
  if (!res) res = await fetch(url('index.html'), { cache: 'no-cache' });
  const html = (await res.text()).replace(/name="site-root" content="[^"]*"/, `name="site-root" content="${SCOPE.href}"`);
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function navigate(event, rel, u) {
  const st = await getState();
  if (!st) return lockPage();
  event.waitUntil(warm(st));
  let path;
  if (rel === '' || rel.endsWith('/')) path = rel + 'index.html';
  else if (st.files[rel + '/index.html']) return Response.redirect(new URL(u.pathname + '/' + u.search, u).href, 301);
  else if (st.files[rel]) path = rel;
  if (!path || !st.files[path]) path = 'index.html'; // アプリ本体（見本ページなど、フォルダに index.html があるものは上でそのページを返す）
  try {
    const res = await full(st, st.files[path]);
    return new Response(res.body, { status: 200, headers: { 'Content-Type': st.files[path].t, 'Cache-Control': 'no-store' } });
  } catch {
    return lockPage();
  }
}

async function asset(request, rel) {
  const st = await getState();
  const entry = st && st.files[rel];
  if (!entry) return fetch(request);
  if (entry.t.startsWith('video/') && request.headers.get('range')) return ranged(st, entry, request.headers.get('range'));
  return full(st, entry);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== SCOPE.origin || !u.pathname.startsWith(SCOPE.pathname)) return;
  let rel = u.pathname.slice(SCOPE.pathname.length);
  try { rel = decodeURIComponent(rel); } catch { /* そのまま */ }
  if (rel === 'sw.js') return;
  if (rel === 'site.json') {
    event.respondWith(fetch(req).catch(() => caches.match(url('site.json'))));
    return;
  }
  if (rel.startsWith('enc/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    return;
  }
  if (req.mode === 'navigate') {
    event.respondWith(navigate(event, rel, u));
    return;
  }
  event.respondWith(asset(req, rel));
});
