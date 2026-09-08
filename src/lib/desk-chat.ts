import {tasks, sources} from '../data/catalog';
import type {Source, Task} from './model';

export type DeskChatMatch = {
  id: string;
  title: string;
  score: number;
  snippet: string;
};

export type DeskChatAnswer = {
  text: string;
  matches: DeskChatMatch[];
  suggestedKeywords: string[];
};

const HISTORY_KEY = 'desk-chan-chat-v1';
const MAX_HISTORY = 40;

/** Soft mission-control preamble / hard rules for デスクちゃん. */
export const DESK_CHAT_RULES = [
  '私はデスクちゃん。結婚ロードマップのナビだよ。短く、やさしく答えるね。',
  '金額の円はデータにある案内だけ。勝手に金額を作らない。',
  '結婚新生活支援は広島市では未実施。30万・60万の賞品扱いにはしない。',
  '広島市・共働きで世帯所得がおおむね800万円超なら、所得制限のある支援は当てはまりにくい。Lean（ムダを減らし確認を絞る）で進もう。',
].join('\n');

const STOP = new Set([
  'について', '教えて', '知りたい', 'とは', 'って', 'なに', '何', 'どう', 'どの', 'どれ',
  'です', 'ます', 'する', 'した', 'して', 'いる', 'ある', 'こと', 'もの', 'ため', 'から',
  'まで', 'など', 'また', 'そして', 'それ', 'これ', 'あれ', 'よう', 'みたい', 'ください',
  'の', 'に', 'を', 'は', 'が', 'と', 'で', 'も', 'へ', 'や', 'か', 'ね', 'よ', 'な',
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'for', 'is', 'are',
]);

function normalize(s: string): string {
  return s.normalize('NFKC').toLowerCase().trim();
}

function tokenize(q: string): string[] {
  const n = normalize(q);
  const parts = n
    .replace(/[！？!?,.。、・／/（）()「」『』【】\[\]{}<>「」]/g, ' ')
    .split(/\s+/)
    .flatMap((p) => {
      // also split long Japanese runs lightly by common particles already stripped
      if (p.length <= 1) return [];
      if (STOP.has(p)) return [];
      return [p];
    });
  // unique, keep order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

function haystack(t: Task): string {
  const srcTitles = t.sources
    .map((id) => sources[id]?.title || '')
    .filter(Boolean)
    .join(' ');
  return normalize(
    [
      t.id,
      t.title,
      t.summary,
      t.steps.join(' '),
      t.questions.join(' '),
      t.who,
      t.type,
      t.amountNote || '',
      t.notice || '',
      srcTitles,
    ].join(' '),
  );
}

function scoreTask(t: Task, tokens: string[], raw: string): number {
  if (!tokens.length && !raw) return 0;
  const hay = haystack(t);
  const title = normalize(t.title);
  const summary = normalize(t.summary);
  let score = 0;
  if (raw && title.includes(raw)) score += 48;
  if (raw && summary.includes(raw)) score += 18;
  if (raw && hay.includes(raw)) score += 8;
  for (const tok of tokens) {
    if (title.includes(tok)) score += 22;
    else if (summary.includes(tok)) score += 12;
    else if (hay.includes(tok)) score += 7;
    // light prefix bonus for Japanese compounds
    if (tok.length >= 2 && title.startsWith(tok)) score += 6;
  }
  return score;
}

function snippetFor(t: Task): string {
  const steps = (t.steps || []).slice(0, 2).join(' → ');
  const base = t.summary?.trim() || '';
  if (base && steps) return `${base}（例：${steps}）`;
  return base || steps || '詳細は項目を開いて確認してね。';
}

function hardRuleAnswer(q: string): DeskChatAnswer | null {
  const n = normalize(q);
  // 結婚新生活 / 30万 / 60万 prize misconception
  if (
    /結婚新生活|新婚.?支援|新生活支援/.test(n) ||
    (/30\s*万|60\s*万/.test(n) && /結婚|新婚|支援|給付|賞|もら/.test(n))
  ) {
    const src = sources.nogrant as Source | undefined;
    return {
      text:
        '広島市の結婚新生活支援事業は、案内上「未実施」だよ。30万・60万の賞品や給付として扱わないでね。金額は二人の記録か公式案内だけを見て。' +
        (src?.url ? ` 市の案内：${src.title}。` : '') +
        'ほかの勤務先祝金や引っ越し手続きは「探す」タブで確認できるよ。',
      matches: [],
      suggestedKeywords: ['引っ越し', '結婚祝金', '転入届', '名義変更'],
    };
  }
  // inventing yen / how much money
  if (
    /(いくら|何円|なんえん|金額|給付額|もらえる額)/.test(n) &&
    /(給付|助成|補助|支援|祝金|控除)/.test(n)
  ) {
    return {
      text:
        '金額の円は、この手帳のデータと二人が入力した記録以外は言えないよ（勝手に作らないルール）。該当しそうな項目の summary と公式参照を開いて確かめてね。',
      matches: [],
      suggestedKeywords: ['結婚祝金', '児童手当', '医療費', 'ふるさと納税'],
    };
  }
  // Hiroshima dual >8M → Lean
  if (
    /(800\s*万|８００\s*万|8\s*m|年収|所得).*(共働|二人|世帯|dual|広島)|(共働|二人|世帯|dual).*(800\s*万|８００\s*万|年収|所得)/.test(
      n,
    ) ||
    /(リーン|lean)/.test(n) ||
    /(所得制限|高所得|共働き).*(広島|支援|給付)/.test(n)
  ) {
    return {
      text:
        '広島市・共働きで世帯所得がおおむね800万円を超えると、所得制限のある市・国の支援は当てはまりにくいことが多いよ。期待しすぎず Lean（必要な手続きだけに絞る）で進もう。扶養・税・勤務先制度は各自条件を項目で確認してね。',
      matches: [],
      suggestedKeywords: ['扶養', '配偶者控除', 'NISA', '勤務先'],
    };
  }
  return null;
}

function suggestFromTokens(tokens: string[]): string[] {
  const fallback = ['婚姻届', '転入届', '名義変更', '扶養', 'NISA', '育休'];
  const fromQ = tokens.filter((t) => t.length >= 2).slice(0, 3);
  const merged = [...fromQ, ...fallback];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of merged) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= 4) break;
  }
  return out;
}

export function answerDeskQuery(query: string, limit = 3): DeskChatAnswer {
  const q = query.trim();
  if (!q) {
    return {
      text: '聞きたいことを書いてね。スタンプや手続き・期限・広島の制度のこと、なんでもどうぞ。',
      matches: [],
      suggestedKeywords: ['婚姻届', '引っ越し', '扶養', '期限'],
    };
  }

  const hard = hardRuleAnswer(q);
  if (hard) return hard;

  const raw = normalize(q);
  const tokens = tokenize(q);
  const scored = tasks
    .map((t) => ({t, score: scoreTask(t, tokens, raw)}))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.t.id.localeCompare(b.t.id));

  const top = scored.slice(0, limit);
  if (!top.length) {
    return {
      text:
        'うまく見つからなかったよ。言葉を短くして「探す」タブで試してみてね。例：婚姻届、転入、祝金、NISA、育休。',
      matches: [],
      suggestedKeywords: suggestFromTokens(tokens),
    };
  }

  const matches: DeskChatMatch[] = top.map(({t, score}) => ({
    id: t.id,
    title: t.title,
    score,
    snippet: snippetFor(t),
  }));

  const primary = matches[0];
  const extras =
    matches.length > 1
      ? `\nほか候補：${matches
          .slice(1)
          .map((m) => `「${m.title}」`)
          .join('、')}`
      : '';

  return {
    text: `「${primary.title}」が近そう。${primary.snippet}${extras}\n詳しく見るときは下の項目をタップしてね。`,
    matches,
    suggestedKeywords: [],
  };
}

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  matches?: DeskChatMatch[];
  suggestedKeywords?: string[];
  at: number;
};

export function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(data)) return [];
    return data.slice(-MAX_HISTORY);
  } catch {
    return [];
  }
}

export function saveChatHistory(msgs: ChatMessage[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-MAX_HISTORY)));
  } catch {
    /* ignore quota */
  }
}

export function clearChatHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

export {HISTORY_KEY};
