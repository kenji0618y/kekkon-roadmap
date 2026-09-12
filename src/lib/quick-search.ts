import type { Task } from './model';
import type { AbsoluteDeadline, RelativeDeadline, Practice, Talk } from '../data/catalog';

export type QuickSearchKind = 'task' | 'tab' | 'deadline' | 'setting' | 'pair';

export type QuickSearchHit = {
  id: string;
  kind: QuickSearchKind;
  title: string;
  hint?: string;
  score: number;
  /** tab id for navigation */
  tab?: string;
  /** scroll target element id */
  scrollId?: string;
  /** task id when kind=task */
  taskId?: string;
};

const KIND_ORDER: QuickSearchKind[] = ['tab', 'setting', 'deadline', 'pair', 'task'];

export const KIND_LABELS: Record<QuickSearchKind, string> = {
  task: '項目',
  tab: '画面',
  deadline: '期限',
  setting: '設定',
  pair: 'ふたり',
};

function norm(s: string) {
  return String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .trim();
}

function scoreMatch(hay: string, q: string): number {
  if (!q) return 0;
  const h = norm(hay);
  const nq = norm(q);
  if (!nq || !h) return 0;
  if (h === nq) return 100;
  if (h.startsWith(nq)) return 80;
  if (h.includes(nq)) return 50;
  // token-ish: all chars of query appear in order loosely via includes of chunks
  const parts = nq.split(/\s+/).filter(Boolean);
  if (parts.length > 1 && parts.every((p) => h.includes(p))) return 40;
  return 0;
}

function bestScore(fields: string[], q: string): number {
  let best = 0;
  for (const f of fields) {
    const s = scoreMatch(f, q);
    if (s > best) best = s;
  }
  return best;
}

export const TAB_HITS: Omit<QuickSearchHit, 'score'>[] = [
  { id: 'tab-desk', kind: 'tab', title: 'デスク', hint: 'いまの進みぐあい', tab: 'desk' },
  { id: 'tab-journey', kind: 'tab', title: 'ロードマップ', hint: 'スタンプ・マップ', tab: 'journey' },
  { id: 'tab-deadlines', kind: 'tab', title: '期限と時期', hint: '制度締切とふたりの予定', tab: 'deadlines' },
  { id: 'tab-pair', kind: 'tab', title: 'ふたりの練習帳', hint: '行動・会話・合意', tab: 'pair' },
  { id: 'tab-find', kind: 'tab', title: '制度を探す', hint: '項目の一覧検索', tab: 'find' },
  { id: 'tab-settings', kind: 'tab', title: 'ふたりの設定', hint: 'プロフィール・同期・キー', tab: 'settings' },
];

const TAB_ALIASES: Record<string, string[]> = {
  'tab-desk': ['デスク', '机', 'ホーム', 'home', 'desk'],
  'tab-journey': ['マップ', 'ロードマップ', 'スタンプ', '旅', 'journey', '地図'],
  'tab-deadlines': ['期限', '時期', '締切', 'カレンダー', 'deadlines', '予定'],
  'tab-pair': ['ふたり', '練習帳', '会話', '合意', 'pair'],
  'tab-find': ['探す', '検索', '制度', 'find', 'さがす'],
  'tab-settings': ['設定', 'プロフィール', 'settings', 'せってい'],
};

export const SETTING_HITS: Omit<QuickSearchHit, 'score'>[] = [
  { id: 'set-profile', kind: 'setting', title: 'プロフィール', hint: '呼び名・婚姻日・区', tab: 'settings', scrollId: 'settings-profile' },
  { id: 'set-gist', kind: 'setting', title: 'Gist同期', hint: '端末どうしの受け渡し', tab: 'settings', scrollId: 'settings-gist-sync' },
  { id: 'set-grok', kind: 'setting', title: 'Grokキー', hint: 'Amityの深掘り設定', tab: 'settings', scrollId: 'settings-grok' },
  { id: 'set-backup', kind: 'setting', title: 'バックアップ', hint: '書き出し・読み込み', tab: 'settings', scrollId: 'settings-backup' },
  { id: 'set-research', kind: 'setting', title: '制度を調べる', hint: 'Amityに質問', tab: 'settings', scrollId: 'settings-research' },
];

const SETTING_ALIASES: Record<string, string[]> = {
  'set-profile': ['プロフィール', '名前', '婚姻日', '区', 'ふたりに合わせ'],
  'set-gist': ['gist', '同期', 'pat', 'github'],
  'set-grok': ['grok', 'キー', 'xai', 'api', 'アリティ'],
  'set-backup': ['バックアップ', '書き出し', '読み込み', 'json', '印刷'],
  'set-research': ['調べる', '研究', 'リサーチ'],
};

export const EMPTY_SUGGESTIONS: QuickSearchHit[] = [
  { id: 'sug-desk', kind: 'tab', title: 'デスク', hint: 'いまの画面', tab: 'desk', score: 1 },
  { id: 'sug-map', kind: 'tab', title: 'マップ', hint: 'ロードマップ', tab: 'journey', score: 1 },
  { id: 'sug-dead', kind: 'tab', title: '期限', hint: '期限と時期', tab: 'deadlines', score: 1 },
  { id: 'sug-find', kind: 'tab', title: '探す', hint: '制度を探す', tab: 'find', score: 1 },
  { id: 'sug-set', kind: 'tab', title: '設定', hint: 'ふたりの設定', tab: 'settings', score: 1 },
  {
    id: 'sug-inst',
    kind: 'deadline',
    title: '今週の期限',
    hint: '制度・カレンダー締切へ',
    tab: 'deadlines',
    scrollId: 'institutional-deadlines',
    score: 1,
  },
];

function taskBlob(t: Task): string[] {
  const faq = (t.faq || []).flatMap((f) => [f.q || '', f.a || '']);
  const steps = t.steps || [];
  return [
    t.title || '',
    t.pad || '',
    t.summary || '',
    t.why || '',
    t.miss || '',
    t.window || '',
    t.amountNote || '',
    ...faq,
    ...steps,
  ];
}

/** Deep text used by 探すタブ filter as well. */
export function taskSearchText(t: Task): string {
  return taskBlob(t).join(' ');
}

export function taskMatchesQuery(t: Task, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  return norm(taskSearchText(t)).includes(q);
}

export type QuickSearchInput = {
  query: string;
  tasks: Task[];
  absoluteDeadlines: AbsoluteDeadline[];
  relativeDeadlines?: RelativeDeadline[];
  practices: Practice[];
  talks: Talk[];
  /** hide ceremony tasks when ceremony==='no' */
  includeTask?: (t: Task) => boolean;
  limit?: number;
};

export function buildQuickSearchHits(input: QuickSearchInput): QuickSearchHit[] {
  const q = input.query.trim();
  const limit = input.limit ?? 20;
  if (!q) return EMPTY_SUGGESTIONS;

  const hits: QuickSearchHit[] = [];

  for (const tab of TAB_HITS) {
    const aliases = TAB_ALIASES[tab.id] || [];
    const s = bestScore([tab.title, tab.hint || '', ...aliases], q);
    if (s > 0) hits.push({ ...tab, score: s + 5 });
  }

  for (const set of SETTING_HITS) {
    const aliases = SETTING_ALIASES[set.id] || [];
    const s = bestScore([set.title, set.hint || '', ...aliases], q);
    if (s > 0) hits.push({ ...set, score: s + 3 });
  }

  for (const d of input.absoluteDeadlines) {
    const s = bestScore([d.title, d.note || '', d.date], q);
    if (s > 0) {
      hits.push({
        id: `abs-${d.date}-${d.title.slice(0, 12)}`,
        kind: 'deadline',
        title: d.title,
        hint: `${d.date}${d.note ? ` · ${d.note}` : ''}`,
        tab: 'deadlines',
        scrollId: 'institutional-deadlines',
        score: s,
      });
    }
  }

  for (const d of input.relativeDeadlines || []) {
    const s = bestScore([d.title, d.offset, d.miss || ''], q);
    if (s > 0) {
      hits.push({
        id: `rel-${d.offset}-${d.title.slice(0, 12)}`,
        kind: 'deadline',
        title: d.title,
        hint: `目安：${d.offset}`,
        tab: 'deadlines',
        scrollId: 'institutional-deadlines',
        score: s - 5,
      });
    }
  }

  const themes = new Set<string>();
  for (const p of input.practices) {
    const s = bestScore([p.theme, p.idea, p.action], q);
    if (s > 0 && !themes.has(p.theme)) {
      themes.add(p.theme);
      hits.push({
        id: `prac-${p.id}`,
        kind: 'pair',
        title: p.theme,
        hint: p.idea,
        tab: 'pair',
        score: s,
      });
    }
  }
  for (const t of input.talks) {
    const s = bestScore([t.scene, t.say, t.listen], q);
    if (s > 0) {
      hits.push({
        id: `talk-${t.id}`,
        kind: 'pair',
        title: t.scene,
        hint: t.say,
        tab: 'pair',
        score: s,
      });
    }
  }

  for (const t of input.tasks) {
    if (input.includeTask && !input.includeTask(t)) continue;
    const fields = taskBlob(t);
    const titleScore = scoreMatch(t.title, q);
    const deep = bestScore(fields, q);
    const s = Math.max(titleScore, deep > 0 && titleScore === 0 ? deep - 10 : deep);
    if (s > 0) {
      hits.push({
        id: `task-${t.id}`,
        kind: 'task',
        title: t.title,
        hint: t.pad || t.summary,
        tab: 'find',
        taskId: t.id,
        score: s,
      });
    }
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
  });

  return hits.slice(0, limit);
}

export function groupQuickSearchHits(hits: QuickSearchHit[]): { kind: QuickSearchKind; label: string; items: QuickSearchHit[] }[] {
  const by = new Map<QuickSearchKind, QuickSearchHit[]>();
  for (const h of hits) {
    const list = by.get(h.kind) || [];
    list.push(h);
    by.set(h.kind, list);
  }
  return KIND_ORDER.filter((k) => by.has(k)).map((k) => ({
    kind: k,
    label: KIND_LABELS[k],
    items: by.get(k)!,
  }));
}
