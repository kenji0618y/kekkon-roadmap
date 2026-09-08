import type { Money, Stamp, StampFaq } from '../types';

export const EDITOR_STORAGE_KEY = 'marriage-guide-hiroshima-editor-v1';

export type RegSide = '夫側' | '妻側' | '共通';

export type RegDoc = {
  id: string;
  title: string;
  side: RegSide;
  text: string;
  checklist: string[];
  linkedStampIds: string[];
  updatedAt: string;
};

/** User-editable stamp fields. amount_yen only if user typed a number. */
export type StampOverride = {
  title?: string;
  why?: string;
  steps?: string[];
  faq?: StampFaq[];
  miss?: string | null;
  window?: string;
  who?: string;
  track?: string;
  money_in_note?: string;
  money_out_note?: string;
  /** User-entered only — never invent */
  money_in_yen?: number | null;
  money_out_yen?: number | null;
};

export type WishlistStatus = 'idea' | 'doing' | 'done';

export type WishlistItem = {
  id: string;
  title: string;
  note: string;
  status: WishlistStatus;
};

export type HomeOverrides = {
  headline?: string;
  anti_lie_banner?: string;
  kicker?: string;
};

export type EditorState = {
  version: 1;
  regs: RegDoc[];
  contentOverrides: Record<string, StampOverride>;
  customStamps: Stamp[];
  /** custom stamp id → sugoroku square id */
  customStampSquares: Record<string, string>;
  hiddenStampIds: string[];
  homeOverrides: HomeOverrides;
  wishlist: WishlistItem[];
  /** Optional 4-digit PIN; empty/unset = open */
  pin: string;
};

export function emptyEditorState(): EditorState {
  return {
    version: 1,
    regs: [],
    contentOverrides: {},
    customStamps: [],
    customStampSquares: {},
    hiddenStampIds: [],
    homeOverrides: {},
    wishlist: [],
    pin: '',
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNumberOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeOverride(raw: unknown): StampOverride {
  if (!isPlainObject(raw)) return {};
  const o: StampOverride = {};
  if (typeof raw.title === 'string') o.title = raw.title;
  if (typeof raw.why === 'string') o.why = raw.why;
  if (Array.isArray(raw.steps)) o.steps = raw.steps.map(String);
  if (Array.isArray(raw.faq)) {
    o.faq = raw.faq
      .filter(isPlainObject)
      .map((f) => ({ q: asString(f.q), a: asString(f.a) }))
      .filter((f) => f.q || f.a);
  }
  if (raw.miss === null) o.miss = null;
  else if (typeof raw.miss === 'string') o.miss = raw.miss;
  if (typeof raw.window === 'string') o.window = raw.window;
  if (typeof raw.who === 'string') o.who = raw.who;
  if (typeof raw.track === 'string') o.track = raw.track;
  if (typeof raw.money_in_note === 'string') o.money_in_note = raw.money_in_note;
  if (typeof raw.money_out_note === 'string') o.money_out_note = raw.money_out_note;
  if ('money_in_yen' in raw) o.money_in_yen = asNumberOrNull(raw.money_in_yen) ?? null;
  if ('money_out_yen' in raw) o.money_out_yen = asNumberOrNull(raw.money_out_yen) ?? null;
  return o;
}

function normalizeStamp(raw: unknown): Stamp | null {
  if (!isPlainObject(raw) || typeof raw.id !== 'string' || !raw.id.trim()) return null;
  const money = (m: unknown): Money => {
    if (!isPlainObject(m)) return null;
    const amount =
      m.amount_yen == null || m.amount_yen === ''
        ? null
        : Number.isFinite(Number(m.amount_yen))
          ? Number(m.amount_yen)
          : null;
    return {
      amount_yen: amount,
      unit: typeof m.unit === 'string' ? m.unit : undefined,
      note: typeof m.note === 'string' ? m.note : undefined,
    };
  };
  const faq = Array.isArray(raw.faq)
    ? raw.faq
        .filter(isPlainObject)
        .map((f) => ({ q: asString(f.q), a: asString(f.a) }))
        .filter((f) => f.q || f.a)
    : [];
  return {
    id: raw.id.trim(),
    track: asString(raw.track, '自'),
    title: asString(raw.title, 'カスタム'),
    who: asString(raw.who, '双方'),
    window: asString(raw.window, ''),
    money_in: money(raw.money_in),
    money_out: money(raw.money_out),
    miss: raw.miss == null ? null : asString(raw.miss),
    eligibility: asString(raw.eligibility, 'always') as Stamp['eligibility'],
    hidden_if: Array.isArray(raw.hidden_if) ? raw.hidden_if.map(String) : [],
    source_file: asString(raw.source_file, 'custom'),
    why: typeof raw.why === 'string' ? raw.why : undefined,
    steps: Array.isArray(raw.steps) ? raw.steps.map(String) : undefined,
    faq: faq.length ? faq : undefined,
    review_year: typeof raw.review_year === 'number' ? raw.review_year : undefined,
  };
}

function normalizeReg(raw: unknown): RegDoc | null {
  if (!isPlainObject(raw)) return null;
  const id = asString(raw.id) || `reg-${Date.now()}`;
  const sideRaw = asString(raw.side, '共通');
  const side: RegSide =
    sideRaw === '夫側' || sideRaw === '妻側' || sideRaw === '共通' ? sideRaw : '共通';
  return {
    id,
    title: asString(raw.title, '無題の規程'),
    side,
    text: asString(raw.text),
    checklist: Array.isArray(raw.checklist) ? raw.checklist.map(String).filter(Boolean) : [],
    linkedStampIds: Array.isArray(raw.linkedStampIds)
      ? raw.linkedStampIds.map(String).filter(Boolean)
      : [],
    updatedAt: asString(raw.updatedAt, new Date().toISOString()),
  };
}

function normalizeWishlist(raw: unknown): WishlistItem | null {
  if (!isPlainObject(raw)) return null;
  const st = asString(raw.status, 'idea');
  const status: WishlistStatus =
    st === 'doing' || st === 'done' || st === 'idea' ? st : 'idea';
  return {
    id: asString(raw.id) || `wish-${Date.now()}`,
    title: asString(raw.title, 'やりたいこと'),
    note: asString(raw.note),
    status,
  };
}

export function migrateEditorState(raw: unknown): EditorState {
  const base = emptyEditorState();
  if (!isPlainObject(raw)) return base;
  const overrides: Record<string, StampOverride> = {};
  if (isPlainObject(raw.contentOverrides)) {
    for (const [k, v] of Object.entries(raw.contentOverrides)) {
      overrides[k] = normalizeOverride(v);
    }
  }
  const customStamps = Array.isArray(raw.customStamps)
    ? (raw.customStamps.map(normalizeStamp).filter(Boolean) as Stamp[])
    : [];
  const squares: Record<string, string> = {};
  if (isPlainObject(raw.customStampSquares)) {
    for (const [k, v] of Object.entries(raw.customStampSquares)) {
      if (typeof v === 'string' && v) squares[k] = v;
    }
  }
  const home: HomeOverrides = {};
  if (isPlainObject(raw.homeOverrides)) {
    if (typeof raw.homeOverrides.headline === 'string')
      home.headline = raw.homeOverrides.headline;
    if (typeof raw.homeOverrides.anti_lie_banner === 'string')
      home.anti_lie_banner = raw.homeOverrides.anti_lie_banner;
    if (typeof raw.homeOverrides.kicker === 'string') home.kicker = raw.homeOverrides.kicker;
  }
  return {
    version: 1,
    regs: Array.isArray(raw.regs)
      ? (raw.regs.map(normalizeReg).filter(Boolean) as RegDoc[])
      : [],
    contentOverrides: overrides,
    customStamps,
    customStampSquares: squares,
    hiddenStampIds: Array.isArray(raw.hiddenStampIds)
      ? raw.hiddenStampIds.map(String).filter(Boolean)
      : [],
    homeOverrides: home,
    wishlist: Array.isArray(raw.wishlist)
      ? (raw.wishlist.map(normalizeWishlist).filter(Boolean) as WishlistItem[])
      : [],
    pin: typeof raw.pin === 'string' ? raw.pin.replace(/\D/g, '').slice(0, 4) : '',
  };
}

export function loadEditorState(): EditorState {
  try {
    const raw = localStorage.getItem(EDITOR_STORAGE_KEY);
    if (!raw) return emptyEditorState();
    return migrateEditorState(JSON.parse(raw));
  } catch {
    return emptyEditorState();
  }
}

export function saveEditorState(state: EditorState): void {
  localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(state));
}

function mergeMoney(
  base: Money,
  yen: number | null | undefined,
  note: string | undefined,
): Money {
  const hasYen = yen !== undefined;
  const hasNote = note !== undefined;
  if (!hasYen && !hasNote) return base;
  const next: NonNullable<Money> = {
    ...(base && typeof base === 'object' ? base : {}),
  };
  if (hasYen) next.amount_yen = yen;
  if (hasNote) next.note = note;
  return next;
}

export function applyStampOverride(seed: Stamp, o: StampOverride | undefined): Stamp {
  if (!o) return seed;
  return {
    ...seed,
    title: o.title ?? seed.title,
    why: o.why ?? seed.why,
    steps: o.steps ?? seed.steps,
    faq: o.faq ?? seed.faq,
    miss: o.miss !== undefined ? o.miss : seed.miss,
    window: o.window ?? seed.window,
    who: o.who ?? seed.who,
    track: o.track ?? seed.track,
    money_in: mergeMoney(seed.money_in, o.money_in_yen, o.money_in_note),
    money_out: mergeMoney(seed.money_out, o.money_out_yen, o.money_out_note),
  };
}

/** Seed + overrides + customs − soft-hidden. Seed JSON stays intact. */
export function mergeStamps(seed: Stamp[], editor: EditorState): Stamp[] {
  const hidden = new Set(editor.hiddenStampIds);
  const out: Stamp[] = [];
  for (const s of seed) {
    if (hidden.has(s.id)) continue;
    out.push(applyStampOverride(s, editor.contentOverrides[s.id]));
  }
  for (const c of editor.customStamps) {
    if (hidden.has(c.id)) continue;
    out.push(applyStampOverride(c, editor.contentOverrides[c.id]));
  }
  return out;
}

export function nextCustomStampId(existing: Stamp[], customs: Stamp[]): string {
  const used = new Set([...existing, ...customs].map((s) => s.id));
  let n = 1;
  while (used.has(`X自${n}`)) n += 1;
  return `X自${n}`;
}

export function makeBlankCustomStamp(id: string): Stamp {
  return {
    id,
    track: '自',
    title: '新しいスタンプ',
    who: '双方',
    window: '',
    money_in: null,
    money_out: null,
    miss: null,
    eligibility: 'always',
    hidden_if: [],
    source_file: 'custom',
    why: '',
    steps: [''],
    faq: [{ q: '', a: '' }],
  };
}

export function isCompanyRuleStamp(s: Stamp): boolean {
  return (
    s.eligibility === 'company' ||
    s.track === '会' ||
    /規程|慶弔|祝金|休暇|人事|手当|社宅|健保|会社/.test(s.title)
  );
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
