/** Grok deep-research availability: local-only chip when no key or credits-limit. */

export const GROK_LOCAL_ONLY_LS = 'amity-grok-local-only';
export const GROK_MODE_EVENT = 'amity-grok-mode';

export function markGrokLocalOnly(reason: 'credits-limit' | 'no-key' | 'manual' = 'credits-limit') {
  try {
    localStorage.setItem(GROK_LOCAL_ONLY_LS, reason);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(GROK_MODE_EVENT, {detail: {localOnly: true, reason}}));
  } catch {
    /* ignore */
  }
}

export function clearGrokLocalOnly() {
  try {
    localStorage.removeItem(GROK_LOCAL_ONLY_LS);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(GROK_MODE_EVENT, {detail: {localOnly: false}}));
  } catch {
    /* ignore */
  }
}

export function readGrokLocalOnlyFlag(): string | null {
  try {
    return localStorage.getItem(GROK_LOCAL_ONLY_LS);
  } catch {
    return null;
  }
}
