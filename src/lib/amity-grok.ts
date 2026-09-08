/** Amityちゃん × Grok (xAI) research helper.
 * Key: localStorage override, else build-time VITE_AMITY_GROK_KEY (from gitignored .env*.local).
 * Never commit raw keys to tracked files. Pages bundles may embed the Vite key — rotate/limit on xAI.
 */

export const GROK_KEY_LS = 'amity-grok-key';
export const GROK_BASE_LS = 'amity-grok-base';
export const DEFAULT_GROK_BASE = 'https://api.x.ai/v1';
export const DEFAULT_GROK_MODEL = 'grok-3';

export const AMITY_GROK_SYSTEM = [
  'あなたはAmityちゃん。結婚ロードマップアプリのサメのナビアシスタントだよ。短く、やさしく、日本語で答えてね。',
  '対象ユーザーは広島市・共働きで世帯所得がおおむね800万円超の二人。所得制限のある市・国の支援は当てはまりにくいことが多いので、Lean（必要な手続きだけに絞る）で案内する。',
  '金額の円は公式案内やユーザー入力以外では絶対に捏造しない。不明なら「公式で確認」と書く。',
  '結婚新生活支援事業は広島市では案内上「未実施」。30万・60万の賞品・給付扱いにはしない。',
  'ウェブ知識は慎重に。可能なら公式の日本の公的ソース（市・国のページ名やURL）を短く示す。',
  '回答は簡潔に（目安3〜8文）。箇条書き可。断定しすぎず、窓口確認を促す。',
].join('\n');

function bundledGrokKey(): string {
  try {
    const v = (import.meta.env.VITE_AMITY_GROK_KEY as string | undefined)?.trim();
    return v || '';
  } catch {
    return '';
  }
}

export function hasBundledGrokKey(): boolean {
  return !!bundledGrokKey();
}

export function loadGrokKey(): string {
  try {
    const fromLs = localStorage.getItem(GROK_KEY_LS)?.trim() || '';
    if (fromLs) return fromLs;
  } catch {
    /* ignore */
  }
  return bundledGrokKey();
}

export function saveGrokKey(key: string) {
  try {
    const v = key.trim();
    if (!v) localStorage.removeItem(GROK_KEY_LS);
    else localStorage.setItem(GROK_KEY_LS, v);
  } catch {
    /* ignore */
  }
}

export function loadGrokBase(): string {
  try {
    return localStorage.getItem(GROK_BASE_LS)?.trim() || DEFAULT_GROK_BASE;
  } catch {
    return DEFAULT_GROK_BASE;
  }
}

export function saveGrokBase(base: string) {
  try {
    const v = base.trim().replace(/\/+$/, '');
    if (!v || v === DEFAULT_GROK_BASE) localStorage.removeItem(GROK_BASE_LS);
    else localStorage.setItem(GROK_BASE_LS, v);
  } catch {
    /* ignore */
  }
}

export type GrokResearchResult =
  | {ok: true; text: string}
  | {ok: false; error: string};

export async function askGrokResearch(
  question: string,
  localContext?: string,
  signal?: AbortSignal,
): Promise<GrokResearchResult> {
  const key = loadGrokKey();
  if (!key) {
    return {ok: false, error: 'no-key'};
  }
  const base = loadGrokBase().replace(/\/+$/, '') || DEFAULT_GROK_BASE;
  const userContent = localContext
    ? `ユーザーの質問：${question}\n\n端末内の候補メモ（参考・捏造禁止）：\n${localContext}`
    : `ユーザーの質問：${question}`;

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: DEFAULT_GROK_MODEL,
        temperature: 0.3,
        max_tokens: 700,
        messages: [
          {role: 'system', content: AMITY_GROK_SYSTEM},
          {role: 'user', content: userContent},
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const brief = body.slice(0, 180).replace(/\s+/g, ' ');
      return {ok: false, error: `HTTP ${res.status}${brief ? ` · ${brief}` : ''}`};
    }
    const data = (await res.json()) as {
      choices?: {message?: {content?: string}}[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return {ok: false, error: 'empty'};
    return {ok: true, text};
  } catch (e) {
    if (signal?.aborted) return {ok: false, error: 'aborted'};
    return {ok: false, error: e instanceof Error ? e.message : 'network'};
  }
}
