export type Money = {
  amount_yen?: number | null;
  unit?: string;
  note?: string;
} | null;

export type StampFaq = { q: string; a: string };

export type Stamp = {
  id: string;
  track: string;
  title: string;
  who: string;
  window: string;
  money_in: Money;
  money_out: Money;
  miss: string | null;
  eligibility: 'always' | 'child' | 'buy' | 'company' | string;
  hidden_if: string[];
  source_file: string;
  why?: string;
  steps?: string[];
  faq?: StampFaq[];
  review_year?: number;
};

/** todo=未着手 / checked=確認済 / done=完了 / unknown=わからない / na=対象外 */
export type StampStatus = 'todo' | 'checked' | 'done' | 'unknown' | 'na';

export type ChatRole = 'user' | 'grok';

export type ChatMessage = {
  role: ChatRole;
  text: string;
  at: string;
};

export type AppSettings = {
  hasChild: boolean;
  buyingHome: boolean;
};

export type PersistedState = {
  settings: AppSettings;
  statuses: Record<string, StampStatus>;
  notes: Record<string, string>;
  /** Per-stamp Grok chat threads */
  chats: Record<string, ChatMessage[]>;
  customIn: Record<string, number>;
  streak: number;
  lastVisitDate: string | null;
};

export type ExcludeItem = {
  id: string;
  title: string;
  why: string;
  hidden_if?: string[];
  source?: string;
};

export type DataMeta = {
  data_year: number;
  schema_version: number;
  updated_at: string;
  notes?: string;
};

export type SugorokuSquare = {
  id: string;
  n: number | null;
  phaseId: string;
  title: string;
  subtitle: string | null;
  image: string;
  chips: string[];
  eventTitles?: string[];
  stampIds: string[];
  branch: 'child' | 'buy' | null;
  optional: boolean;
  quiet: boolean;
  sideStep: boolean;
};
