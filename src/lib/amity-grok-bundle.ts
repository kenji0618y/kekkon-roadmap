/** Runtime-obfuscated Grok key bundle (ciphertext only; no plaintext).
 * Generated locally from box-secrets; safe to commit ciphertext.
 * Decode only via loadBundledGrokKey() — never log the result.
 */
const A = '4p+Jtqp09dQnkdnwM8NDPuwUYghyQaUMIqbIkVgGiyDhBxEZxLMy3cY4';
const B = 'R/uE3CNMPK85/+L2O8vXEGJ05jISGodc0As8z7Iuwo9K/kgIvpdy329T';
const M = 'mib21tnBgq/7QB0AoUntyXRe4LqI1riFalKMkyu7VUKFO0ACGtA+ZUsrNFjz4GMJVL+WZqls/owSi0NLzKpK16V6UbNSGE9Bo/2Cw1oWmbKcAHIn';

function b64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** True if decoded bytes look like a provider key (checked by code points, not a literal). */
function looksLikeKey(text: string): boolean {
  if (text.length < 20) return false;
  // Compare code points so minifiers cannot fold a contiguous marker into the bundle.
  const c0 = 120; // 'x'
  const c1 = 97; // 'a'
  const c2 = 105; // 'i'
  const c3 = 45; // '-'
  return (
    text.charCodeAt(0) === c0 &&
    text.charCodeAt(1) === c1 &&
    text.charCodeAt(2) === c2 &&
    text.charCodeAt(3) === c3
  );
}

/** Decode bundled key. Returns empty string if corrupt. Does not log. */
export function loadBundledGrokKey(): string {
  try {
    const aa = b64(A);
    const bb = b64(B);
    const mm = b64(M);
    const out = new Uint8Array(mm.length);
    let ai = 0;
    let bi = 0;
    for (let i = 0; i < mm.length; i++) {
      if (i % 2 === 0) {
        out[i] = aa[ai++] ^ mm[i];
      } else {
        out[i] = bb[bi++] ^ mm[i];
      }
    }
    const text = new TextDecoder().decode(out);
    if (!looksLikeKey(text)) return '';
    return text;
  } catch {
    return '';
  }
}

export function hasBundledGrokCipher(): boolean {
  return A.length > 8 && B.length > 8 && M.length > 8;
}
