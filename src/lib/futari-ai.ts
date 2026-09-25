/**
 * 「ふたり」タブの AI フィードバック。
 * - AI には出典IDだけを返させ、表示する書名・URLは固定の出典表（gottman-sources.json）から差し込む。
 * - 返ってきたIDが固定リスト（ai_allowed の17件）にないものは捨てる。有効な出典が1つも残らない助言は表示しない。
 * - 数字・URL・なりすまし（博士／研究所／Amity として話す）を含む助言は表示しない。
 */
import {askGrokWithSystem, isGrokCreditsLimitResult, scrubGrokUserText} from './amity-grok';
import {AI_ALLOWED_SOURCE_IDS, gSourceById, guide} from './futari';

export type FeedbackItem = {text: string; sourceIds: string[]};
export type FeedbackRewrite = {before: string; after: string; why: string; sourceIds: string[]};
export type Feedback =
  | {kind: 'ok'; good: FeedbackItem[]; rewrite: FeedbackRewrite | null; concept: string; dropped: number}
  | {kind: 'safety'}
  | {kind: 'error'; message: string};

const ALLOWED = new Set(AI_ALLOWED_SOURCE_IDS);

function conceptLines() {
  // 固定のルール表（R1〜R12）から、使ってよい概念と出典IDを組み立てる。
  return guide.feedbackRules
    .filter((r) => r.sourceIds.length)
    .map((r) => `- ${r.id} ${r.concept}：${r.pattern} → ${r.direction}｜使ってよい出典ID: ${r.sourceIds.filter((id) => ALLOWED.has(id)).join(', ')}`)
    .join('\n');
}

export function buildSystemPrompt() {
  return [
    'あなたは結婚準備アプリの「ふたり」タブで使われるAIアシスタントです。名前はありません。',
    'カップルが書いた短い日本語の文章に、ジョン・ゴットマン博士の公開された研究で知られる概念をもとに、やさしく短いアドバイスを返します。',
    '画面では「ゴットマン博士の研究にもとづくアドバイス」という見出しの下に、AIが書いたものとして表示されます。',
    '',
    '# 立場（必ず守る）',
    '- あなたはゴットマン博士本人でも、The Gottman Institute の公式サービスでもありません。博士になりきった話し方や一人称（「私の研究では」など）は禁止です。',
    '- 「博士によると」「公式には」「研究では〜とわかっています」などの表現を使わないでください。',
    '- 自分のことを Amity・博士・先生と名乗らないでください。アプリのキャラクター「Amity」として話さないでください。',
    '- 診断・採点・評価（点数、「危険」「離婚」などの判定）はしません。本人の言葉をよりよくする提案だけをします。',
    '- 相手（パートナー）を悪者にしたり、どちらが正しいかを判定したりしません。',
    '',
    '# 使ってよい概念と出典ID（これ以外は使わない）',
    conceptLines(),
    '',
    '# 厳守',
    `- 出典は source_ids に次のIDだけを入れる：${AI_ALLOWED_SOURCE_IDS.join(', ')}。URL・書名・章・ページを本文に書かない。`,
    '- 数字（%・回数・分数・年数など）は書かない。ただし逃避の休憩についてのみ「20分以上」「24時間以内」を使ってよい。',
    '- 研究結果を新たに述べない。概念名と具体的な言いかえだけを書く。',
    '- 書き直し案は、本人の言いたいこと（お願いの中身）を変えずに、言い方だけを変える。',
    '- 暴力・脅し・強い恐怖・自傷をうかがわせる内容があれば、アドバイスを出さず {"safety": true} だけを返す。',
    '- 日本語、やさしい口調、全体で150字以内。絵文字なし。',
    '',
    '# 出力（JSONのみ。前後に文章を書かない）',
    '{"safety": false, "good": [{"text": "よかったところ（40字以内）", "source_ids": ["G-SOFT"]}], "rewrite": {"before": "本人の文の該当部分", "after": "こう直すともっと良くなる（60字以内）", "why": "理由（40字以内）", "source_ids": ["G-ANTIDOTE"]}, "concept": "概念名"}',
    '- good は1〜2個。直す点がなければ rewrite は null（無理に直さない）。',
  ].join('\n');
}

/** 許可された数字表現（逃避の休憩のみ）を除いたあとに数字が残るか。 */
function hasNumber(text: string) {
  const t = text.replace(/20分以上|２０分以上|24時間以内|２４時間以内|20分|２０分|24時間|２４時間/g, '');
  return /[0-9０-９%％]|[一二三四五六七八九十百千万]+(?:割|パーセント|倍)/.test(t);
}
const BLOCK = /https?:|www\.|\.com|『|』|博士|先生|研究所|Institute|Gottman|ゴットマン|Amity|アミティ|私の研究|公式|研究では|研究で|データ|統計|診断|離婚/i;

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = scrubGrokUserText(v).replace(/\s+/g, ' ').trim();
  if (!t || t.length > max) return null;
  if (hasNumber(t) || BLOCK.test(t)) return null;
  return t;
}
function cleanIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const id of v) {
    if (typeof id === 'string' && ALLOWED.has(id) && gSourceById[id] && !out.includes(id)) out.push(id);
  }
  return out;
}

function extractJson(text: string): unknown {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try {
    return JSON.parse(text.slice(s, e + 1));
  } catch {
    return null;
  }
}

/** モデルの出力を検査して、表示してよい部分だけを残す。 */
export function validateFeedback(raw: string, original: string): Feedback {
  const data = extractJson(raw) as Record<string, unknown> | null;
  if (!data || typeof data !== 'object') return {kind: 'error', message: 'うまく受け取れませんでした。もう一度お試しください。'};
  if (data.safety === true) return {kind: 'safety'};
  let dropped = 0;
  const good: FeedbackItem[] = [];
  for (const g of Array.isArray(data.good) ? data.good.slice(0, 3) : []) {
    const item = g as Record<string, unknown>;
    const text = cleanText(item?.text, 80);
    const ids = cleanIds(item?.source_ids);
    if (text && ids.length && good.length < 2) good.push({text, sourceIds: ids});
    else dropped++;
  }
  let rewrite: FeedbackRewrite | null = null;
  if (data.rewrite && typeof data.rewrite === 'object') {
    const r = data.rewrite as Record<string, unknown>;
    const after = cleanText(r.after, 120);
    const why = cleanText(r.why, 80);
    const ids = cleanIds(r.source_ids);
    // before は本人の文の一部だけを許す（モデルが作った文を「本人の文」として出さない）
    const beforeRaw = typeof r.before === 'string' ? r.before.trim() : '';
    const before = beforeRaw && original.includes(beforeRaw) ? beforeRaw : '';
    if (after && why && ids.length) rewrite = {before, after, why, sourceIds: ids};
    else dropped++;
  }
  const concept = cleanText(data.concept, 30) || '';
  if (!good.length && !rewrite) return {kind: 'error', message: '出典を確かめられる助言がありませんでした。もう一度お試しください。'};
  return {kind: 'ok', good, rewrite, concept, dropped};
}

export async function askFutariFeedback(input: {mode: 'daily' | 'rephrase'; question?: string; answer: string; signal?: AbortSignal}): Promise<Feedback> {
  const answer = input.answer.trim().slice(0, 600);
  if (!answer) return {kind: 'error', message: '先にひとこと書いてください。'};
  const user = [
    `モード: ${input.mode}`,
    input.question ? `今日の一問: ${input.question}` : `お題: ${guide.practicePrompt}`,
    `本人の答え: 「${answer}」`,
  ].join('\n');
  const r = await askGrokWithSystem(buildSystemPrompt(), user, {signal: input.signal, maxTokens: 600, temperature: 0.2});
  if (!r.ok) {
    if (r.error === 'no-key') return {kind: 'error', message: 'AIのキーが設定されていないため、いまはみてもらえません（設定タブで入れられます）。'};
    if (isGrokCreditsLimitResult(r.error)) return {kind: 'error', message: 'AIの利用枠が上限のため、いまはみてもらえません。'};
    if (r.error === 'aborted') return {kind: 'error', message: '中止しました。'};
    return {kind: 'error', message: `AIにつながりませんでした（${r.error}）。時間をおいてお試しください。`};
  }
  return validateFeedback(r.text, answer);
}
