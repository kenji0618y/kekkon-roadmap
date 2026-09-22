import {
  absoluteDeadlines,
  excludeItems,
  homeContent,
  phasesContent,
  practices,
  relativeDeadlines,
  sources,
  talks,
  tasks,
  type Practice,
  type Talk,
} from '../data/catalog';
import {inScope, type Profile, type Source, type Task} from './model';

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

const HISTORY_KEY = 'amity-chat-v1';
const LEGACY_HISTORY_KEY = 'desk-chan-chat-v1';
const MAX_HISTORY = 200;

/** Soft mission-control preamble / hard rules for Amityちゃん. */
export const DESK_CHAT_RULES = [
  '私はAmityちゃん。結婚ロードマップのサメナビだよ。短く、やさしく答えるね。',
  '金額の円はデータにある案内だけ。勝手に金額を作らない。',
  '結婚新生活支援は広島市では未実施。30万・60万の賞品扱いにはしない。',
  '広島市・共働きで世帯所得がおおむね800万円超なら、所得制限のある支援は当てはまりにくい。ムダを減らし確認を絞って進もう。',
  '質問には必ず短く具体的に答える。候補は複数出して、タップで項目を開けるようにする。',
].join('\n');

const STOP = new Set([
  'について', '教えて', '知りたい', 'とは', 'って', 'なに', '何', 'どう', 'どの', 'どれ',
  'です', 'ます', 'する', 'した', 'して', 'いる', 'ある', 'こと', 'もの', 'ため', 'から',
  'まで', 'など', 'また', 'そして', 'それ', 'これ', 'あれ', 'よう', 'みたい', 'ください',
  'の', 'に', 'を', 'は', 'が', 'と', 'で', 'も', 'へ', 'や', 'か', 'ね', 'よ', 'な',
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'for', 'is', 'are',
]);

type CorpusHit = {
  openId: string;
  title: string;
  snippet: string;
  hay: string;
  kind: 'task' | 'faq' | 'deadline' | 'exclude' | 'home' | 'phase' | 'practice' | 'talk';
};

function normalize(s: string): string {
  return s.normalize('NFKC').toLowerCase().trim();
}

function tokenize(q: string): string[] {
  const n = normalize(q);
  const spaced = n
    .replace(/[！？!?,.。、・／/（）()「」『』【】\[\]{}<>]/g, ' ')
    .replace(/(について|教えて|知りたい|ください|みたい|とは|って)/g, ' ')
    .replace(/[のにをはがとでもへやかねよな]/g, ' ');
  const parts = spaced.split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (p: string) => {
    if (p.length < 2 || STOP.has(p) || seen.has(p)) return;
    seen.add(p);
    out.push(p);
  };
  for (const p of parts) {
    push(p);
    if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(p) && p.length >= 2) {
      for (let len = Math.min(4, p.length); len >= 2; len--) {
        for (let i = 0; i + len <= p.length; i++) push(p.slice(i, i + len));
      }
    }
  }
  return out;
}

function taskHay(t: Task): string {
  const srcTitles = t.sources
    .map((id) => sources[id]?.title || '')
    .filter(Boolean)
    .join(' ');
  const faq = (t.faq || []).map((f) => `${f.q} ${f.a}`).join(' ');
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
      t.why || '',
      t.miss || '',
      t.window || '',
      faq,
      srcTitles,
    ].join(' '),
  );
}

function snippetFor(t: Task): string {
  const steps = (t.steps || []).slice(0, 2).join(' → ');
  const base = t.summary?.trim() || '';
  if (base && steps) return `${base}（例：${steps}）`;
  return base || steps || '詳細は項目を開いて確認してね。';
}

function buildCorpus(profile?: Profile | null): CorpusHit[] {
  const pool = profile ? tasks.filter((t) => inScope(t, profile)) : tasks;
  const out: CorpusHit[] = [];

  for (const t of pool) {
    out.push({
      openId: t.id,
      title: t.title,
      snippet: snippetFor(t),
      hay: taskHay(t),
      kind: 'task',
    });
    for (const f of t.faq || []) {
      out.push({
        openId: t.id,
        title: `${t.title}｜Q`,
        snippet: `Q: ${f.q} / A: ${f.a}`,
        hay: normalize(`${t.title} ${f.q} ${f.a} ${t.why || ''} ${t.miss || ''} ${t.window || ''}`),
        kind: 'faq',
      });
    }
  }

  for (const d of absoluteDeadlines) {
    out.push({
      openId: 'deadlines',
      title: `期限｜${d.title}`,
      snippet: `${d.date}${d.note ? `：${d.note}` : ''}`,
      hay: normalize(`${d.date} ${d.title} ${d.note || ''} ${d.branch || ''} 期限 締切`),
      kind: 'deadline',
    });
  }
  for (const d of relativeDeadlines) {
    out.push({
      openId: 'deadlines',
      title: `期限｜${d.title}`,
      snippet: `${d.offset}${d.miss ? `／逃すと：${d.miss}` : ''}`,
      hay: normalize(`${d.offset} ${d.title} ${d.miss || ''} ${d.branch || ''} 期限 締切`),
      kind: 'deadline',
    });
  }

  for (const e of excludeItems) {
    out.push({
      openId: 'exclude',
      title: `対象外｜${e.title}`,
      snippet: e.why,
      hay: normalize(`${e.title} ${e.why} 対象外 除外`),
      kind: 'exclude',
    });
  }

  for (const h of homeContent.hero_numbers || []) {
    out.push({
      openId: 'home',
      title: `ホーム｜${h.label}`,
      snippet: `${h.value}${h.note ? `（${h.note}）` : ''}`,
      hay: normalize(`${h.label} ${h.value} ${h.note || ''}`),
      kind: 'home',
    });
  }
  for (const lie of homeContent.lies_not_to_buy || []) {
    out.push({
      openId: 'home',
      title: `ウソ注意｜${lie.title}`,
      snippet: lie.truth,
      hay: normalize(`${lie.title} ${lie.truth} ウソ 買わない`),
      kind: 'home',
    });
  }
  for (const line of homeContent.talk_lines || []) {
    out.push({
      openId: 'home',
      title: 'ひとこと',
      snippet: line.line,
      hay: normalize(`${line.line} ${line.from || ''}`),
      kind: 'home',
    });
  }
  for (const a of homeContent.tomorrow_3_actions || []) {
    out.push({
      openId: a.stamp_id || a.stamp_ids?.[0] || 'home',
      title: `明日｜${a.title}`,
      snippet: a.detail || a.title,
      hay: normalize(`${a.title} ${a.detail || ''} 明日 やること`),
      kind: 'home',
    });
  }

  for (const ph of phasesContent.phases || []) {
    for (const ev of ph.events || []) {
      out.push({
        openId: 'phases',
        title: `${ph.title}｜${ev.title}`,
        snippet: `${ev.when}${ev.money ? `／${ev.money}` : ''}`,
        hay: normalize(`${ph.title} ${ph.range} ${ev.title} ${ev.when} ${ev.money || ''} ${ev.offset || ''}`),
        kind: 'phase',
      });
    }
  }

  for (const p of practices as Practice[]) {
    out.push({
      openId: 'practice',
      title: `練習｜${p.theme}`,
      snippet: [p.idea, p.action].filter(Boolean).join('／'),
      hay: normalize(`${p.theme} ${p.idea} ${p.action} ${p.when || ''} ${p.caution || ''}`),
      kind: 'practice',
    });
  }

  for (const tk of talks as Talk[]) {
    out.push({
      openId: 'talk',
      title: `会話｜${tk.scene}`,
      snippet: [tk.say, tk.listen].filter(Boolean).join('／'),
      hay: normalize(`${tk.scene} ${tk.say} ${tk.listen} ${tk.next || ''} ${tk.caution || ''}`),
      kind: 'talk',
    });
  }

  return out;
}

function scoreHay(title: string, hay: string, tokens: string[], raw: string, kind: CorpusHit['kind']): number {
  if (!tokens.length && !raw) return 0;
  const nt = normalize(title);
  let score = 0;
  if (raw && nt.includes(raw)) score += 48;
  if (raw && hay.includes(raw)) score += 12;
  if (raw && nt.length >= 2 && raw.includes(nt.slice(0, Math.min(nt.length, 6)))) score += 16;
  for (const tok of tokens) {
    const w = tok.length >= 4 ? 28 : tok.length >= 3 ? 18 : 10;
    if (nt.includes(tok)) score += w;
    else if (hay.includes(tok)) score += Math.round(w * 0.4);
    if (tok.length >= 2 && nt.startsWith(tok)) score += 6;
  }
  // Prefer openable tasks slightly, but keep FAQ strong for Q&A
  if (kind === 'faq') score += 4;
  if (kind === 'deadline') score += 3;
  if (kind === 'exclude') score += 2;
  return score;
}

function hardRuleAnswer(q: string): DeskChatAnswer | null {
  const n = normalize(q);
  if (
    /結婚新生活|新婚.?支援|新生活支援/.test(n) ||
    (/30\s*万|60\s*万/.test(n) && /結婚|新婚|支援|給付|賞|もら/.test(n))
  ) {
    const src = sources.nogrant as Source | undefined;
    return {
      text:
        '広島市の結婚新生活支援事業は、案内上「実施していない」よ。30万・60万がもらえる、とは考えないでね。金額は二人の記録か公式の案内だけを見てね。' +
        (src?.url ? ` 市の案内：${src.title}。` : '') +
        'ほかの勤務先祝金や引っ越し手続きは「探す」タブで確認できるよ。',
      matches: [],
      suggestedKeywords: ['引っ越し', '結婚祝金', '転入届', '名義変更'],
    };
  }
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
  if (
    /(800\s*万|８００\s*万|8\s*m|年収|所得).*(共働|二人|世帯|dual|広島)|(共働|二人|世帯|dual).*(800\s*万|８００\s*万|年収|所得)/.test(
      n,
    ) ||
    /(リーン|lean)/.test(n) ||
    /(所得制限|高所得|共働き).*(広島|支援|給付)/.test(n)
  ) {
    return {
      text:
        '広島市・共働きで世帯の所得がおおむね800万円を超えると、所得制限のある市や国の支援は当てはまりにくいことが多いよ。もらえる前提で考えず、必要な手続きにしぼって進めよう。扶養・税・勤務先の制度は、それぞれの項目で条件を確かめてね。',
      matches: [],
      suggestedKeywords: ['扶養', '配偶者控除', 'NISA', '勤務先'],
    };
  }
  return null;
}

function suggestFromTokens(tokens: string[]): string[] {
  const fallback = ['婚姻届', '転入届', '名義変更', '扶養', 'NISA', '育休', '期限', '対象外'];
  const fromQ = tokens.filter((t) => t.length >= 2).slice(0, 3);
  const merged = [...fromQ, ...fallback];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of merged) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= 6) break;
  }
  return out;
}

export function answerDeskQuery(query: string, limit = 12, profile?: Profile | null): DeskChatAnswer {
  const q = query.trim();
  if (!q) {
    return {
      text: '聞きたいことを書いてね。スタンプや手続き・期限・対象外・広島の制度のこと、なんでもどうぞ。',
      matches: [],
      suggestedKeywords: ['婚姻届', '引っ越し', '扶養', '期限', '対象外'],
    };
  }

  const hard = hardRuleAnswer(q);
  if (hard) return hard;

  const raw = normalize(q);
  const tokens = tokenize(q);
  const corpus = buildCorpus(profile);
  const scored = corpus
    .map((c) => ({c, score: scoreHay(c.title, c.hay, tokens, raw, c.kind)}))
    .filter((x) => x.score >= 16)
    .sort((a, b) => b.score - a.score || a.c.openId.localeCompare(b.c.openId));

  // Deduplicate by openId+kind preference (keep best per title)
  const seenTitle = new Set<string>();
  const top: {c: CorpusHit; score: number}[] = [];
  for (const row of scored) {
    const key = `${row.c.openId}::${row.c.title}`;
    if (seenTitle.has(key)) continue;
    seenTitle.add(key);
    top.push(row);
    if (top.length >= limit) break;
  }

  if (!top.length) {
    return {
      text:
        'うまく見つからなかったよ。言葉を短くして「探す」タブで試してみてね。例：婚姻届、転入、祝金、NISA、育休、期限。',
      matches: [],
      suggestedKeywords: suggestFromTokens(tokens),
    };
  }

  const matches: DeskChatMatch[] = top.map(({c, score}) => ({
    id: c.openId,
    title: c.title,
    score,
    snippet: c.snippet,
  }));

  const primary = matches[0];
  const extras =
    matches.length > 1
      ? `\nほか候補（${matches.length - 1}）：${matches
          .slice(1, 8)
          .map((m) => `「${m.title}」`)
          .join('、')}${matches.length > 8 ? '…' : ''}`
      : '';

  return {
    text: `「${primary.title}」が近そう。${primary.snippet}${extras}\n詳しく見るときは下の項目をタップしてね。`,
    matches,
    suggestedKeywords: suggestFromTokens(tokens),
  };
}

/** Dense local context for optional Grok polish — seed facts only, no invented yen. */
export function buildGrokLocalContext(answer: DeskChatAnswer, query: string): string {
  const lines = [
    DESK_CHAT_RULES,
    '',
    `ユーザー質問: ${query}`,
    `ローカル回答: ${answer.text}`,
    '',
    '参照候補（シードのみ）:',
  ];
  for (const m of answer.matches.slice(0, 12)) {
    lines.push(`- [${m.id}] ${m.title} (score ${m.score}): ${m.snippet}`);
  }
  lines.push('');
  lines.push('指示: 上記シードとローカル回答だけを使い、短く日本語で整える。金額の円を新しく作らない。結婚新生活の30万/60万を賞品扱いしない。');
  return lines.join('\n');
}

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
  matches?: DeskChatMatch[];
  suggestedKeywords?: string[];
};

export function loadChatHistory(): ChatMessage[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY) || localStorage.getItem(LEGACY_HISTORY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(data)) return [];
    return data.slice(-MAX_HISTORY);
  } catch {
    return [];
  }
}

export function saveChatHistory(msgs: ChatMessage[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-MAX_HISTORY)));
  } catch {
    /* ignore quota */
  }
}

export function clearChatHistory() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(LEGACY_HISTORY_KEY);
  } catch {
    /* ignore */
  }
}
