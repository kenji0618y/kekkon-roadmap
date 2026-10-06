/**
 * 公開サイトの合言葉暗号化（site lock）— 共通の暗号処理（Node 用）。
 * ブラウザ側（scripts/site-lock/sw.js・unlock.html）は同じ形式を Web Crypto で読む。
 *
 * 形式（v1）:
 *   siteKey(32B)  = PBKDF2-SHA256(合言葉, SITE_KEY_SALT, 600000)      … 端末に保存されるのはこれ（合言葉ではない）
 *   kek           = PBKDF2-SHA256(合言葉, ビルドごとのランダム salt, 600000)
 *   wrap          = AES-256-GCM(kek, siteKey)                          … 解錠ページはこれを開いて siteKey を得る
 *   contentKey    = HKDF-SHA256(siteKey, info "site-lock/v1/content")  … AES-256-GCM
 *   nameKey       = HKDF-SHA256(siteKey, info "site-lock/v1/name")     … HMAC-SHA256（暗号文のファイル名と IV 用）
 *   各ファイル    = CHUNK ごとに AES-256-GCM（IV = 8B の基準値 + 4B の番号、AAD = "名前|番号|総数"）
 *   manifest      = AES-256-GCM(contentKey, {パス→暗号文の名前・大きさ・種類})
 * 同じ合言葉・同じ中身なら暗号文の名前と中身が同じになる（更新のたびに絵や動画を取り直さない）。
 */
import { webcrypto as crypto } from 'node:crypto';

export const SITE_KEY_SALT = 'kekkon-roadmap/site-lock/v1/site-key';
export const ITERATIONS = 600000;
export const CHUNK = 512 * 1024;
export const TAG = 16;
const enc = new TextEncoder();
const subtle = crypto.subtle;

export const b64 = (u8) => Buffer.from(u8).toString('base64');
export const unb64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));
export const hex = (u8) => Buffer.from(u8).toString('hex');

export async function pbkdf2(passphrase, salt, iterations = ITERATIONS) {
  const base = await subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveBits']);
  const saltBytes = typeof salt === 'string' ? enc.encode(salt) : salt;
  return new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations }, base, 256));
}

export async function subKeys(siteKey) {
  const base = await subtle.importKey('raw', siteKey, 'HKDF', false, ['deriveKey']);
  const hk = (info) => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode(info) });
  const contentKey = await subtle.deriveKey(hk('site-lock/v1/content'), base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const nameKey = await subtle.deriveKey(hk('site-lock/v1/name'), base, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']);
  return { contentKey, nameKey };
}

export async function hmac(key, text) {
  return new Uint8Array(await subtle.sign('HMAC', key, enc.encode(text)));
}

export const chunkCount = (size) => Math.max(1, Math.ceil(size / CHUNK));
export const chunkIv = (base8, i) => {
  const iv = new Uint8Array(12);
  iv.set(base8, 0);
  new DataView(iv.buffer).setUint32(8, i);
  return iv;
};
export const chunkAad = (name, i, n) => enc.encode(`${name}|${i}|${n}`);

/** 1ファイルを暗号化。{name, data(Uint8Array)} を返す。 */
export async function encryptFile({ contentKey, nameKey }, path, plain) {
  const digest = hex(new Uint8Array(await subtle.digest('SHA-256', plain)));
  const name = hex(await hmac(nameKey, `name\0${path}\0${digest}`)).slice(0, 32);
  const base8 = (await hmac(nameKey, `iv\0${path}\0${digest}`)).slice(0, 8);
  const n = chunkCount(plain.length);
  const out = new Uint8Array(plain.length + n * TAG);
  let off = 0;
  for (let i = 0; i < n; i++) {
    const part = plain.subarray(i * CHUNK, Math.min(plain.length, (i + 1) * CHUNK));
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: chunkIv(base8, i), additionalData: chunkAad(name, i, n) }, contentKey, part));
    out.set(ct, off);
    off += ct.length;
  }
  return { name, data: out, base8 };
}

export async function decryptFile(contentKey, entry, data) {
  const n = chunkCount(entry.s);
  const base8 = unb64(entry.i);
  const out = new Uint8Array(entry.s);
  let off = 0;
  for (let i = 0; i < n; i++) {
    const len = Math.min(CHUNK, entry.s - i * CHUNK) + TAG;
    const pt = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: chunkIv(base8, i), additionalData: chunkAad(entry.b, i, n) }, contentKey, data.subarray(off, off + len)));
    out.set(pt, i * CHUNK);
    off += len;
  }
  return out;
}

export async function gcmSeal(key, plain, aad) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, key, plain));
  return { iv: b64(iv), ct: b64(ct) };
}

export async function gcmOpen(key, box, aad) {
  return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv), additionalData: enc.encode(aad) }, key, unb64(box.ct)));
}

export async function aesKey(raw, usages) {
  return subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, usages);
}

/** site.json から合言葉で siteKey を取り出す（テスト用・解錠ページと同じ手順）。 */
export async function unlockSiteJson(site, passphrase) {
  const kek = await aesKey(await pbkdf2(passphrase, unb64(site.kdf.salt), site.kdf.iter), ['decrypt']);
  const siteKey = await gcmOpen(kek, site.wrap, 'site-lock/v1/wrap');
  const keys = await subKeys(siteKey);
  const manifest = JSON.parse(new TextDecoder().decode(await gcmOpen(keys.contentKey, site.manifest, 'site-lock/v1/manifest')));
  return { siteKey, keys, manifest };
}

/**
 * ホーム画面のアイコンだけは平文で置く（2026-10-06〜・Kenji の依頼）。
 * iPhone の「ホーム画面に追加」はアイコンを service worker を通さずに取りに行くことがあり、暗号文だと絵が出ないため。
 * 絵だけで文字・名前は入れない（PNG の文字のかたまりは置かない＝verify-dist が確かめる）。
 */
export const PLAIN_ICONS = ['icons/apple-touch-icon.png', 'icons/pwa-192.png', 'icons/pwa-512.png', 'icons/pwa-maskable-512.png'];
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_TEXT = new Set(['tEXt', 'iTXt', 'zTXt', 'eXIf']);
/** 平文で置いてよいアイコンか（PNG・30万バイト以下・文字のかたまりなし）。問題があれば理由、なければ null。 */
export function plainIconProblem(buf) {
  if (buf.length > 300000) return '大きすぎる';
  if (!PNG_SIG.every((b, i) => buf[i] === b)) return 'PNG ではない';
  let off = 8;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString('latin1');
    if (PNG_TEXT.has(type)) return `文字のかたまり（${type}）が入っている`;
    if (type === 'IEND') return off + 12 === buf.length ? null : 'IEND のあとに余分なデータ';
    off += 12 + len;
  }
  return 'PNG が途中で切れている';
}

export { crypto };
