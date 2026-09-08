import profile from '../data/profile.json';
import type { Stamp } from '../types';
import { askTipsFor } from './askTips';
import { enrichStamp } from './stampContent';
import { moneyLabel } from './money';

const LOCK_LINES = [
  '広島市在住・勤務固定',
  '世帯額面800万超・共働き既定',
  '式なし・婚姻届は出す',
  '結婚新生活支援事業の対象外（prizeなし）',
];

function tokens(s: string): string[] {
  return String(s || '')
    .toLowerCase()
    .replace(/[（）()「」『』・\s　,，.。!！?？\-ー〜～／/]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function overlapScore(query: string, text: string): number {
  const q = tokens(query);
  const h = new Set(tokens(text));
  if (!q.length || !h.size) return 0;
  let hit = 0;
  for (const t of q) if (h.has(t) || [...h].some((x) => x.includes(t) || t.includes(x))) hit += 1;
  return hit / q.length;
}

function moneySafe(stamp: Stamp): string | null {
  const parts = [moneyLabel(stamp.money_in, 'in'), moneyLabel(stamp.money_out, 'out')].filter(
    Boolean,
  ) as string[];
  return parts.length ? parts.join(' ／ ') : null;
}

function lockHint(query: string): string | null {
  const q = query;
  if (/広島|地域|市|県/.test(q)) return LOCK_LINES[0];
  if (/収入|所得|800|世帯|扶養/.test(q)) return LOCK_LINES[1];
  if (/式|挙式|披露宴|ウェディング/.test(q)) return LOCK_LINES[2];
  if (/新生活|助成|補助金|prize|プライズ/.test(q)) return LOCK_LINES[3];
  return null;
}

/** Local Grok reply grounded only in stamp fields + profile locks. Never invents yen. */
export function answerAsGrok(stamp: Stamp, userText: string): string {
  const enriched = enrichStamp(stamp);
  const q = userText.trim();
  if (!q) return '質問を入力してください。';

  const faqScored = enriched.faq
    .map((f) => ({
      f,
      score: Math.max(overlapScore(q, f.q), overlapScore(q, f.a) * 0.85),
    }))
    .sort((a, b) => b.score - a.score);

  const best = faqScored[0];
  const tip = askTipsFor(enriched);
  const money = moneySafe(enriched);
  const lock = lockHint(q);

  if (best && best.score >= 0.34) {
    let ans = best.f.a;
    if (lock) ans += `\n（ロック：${lock}）`;
    if (/円|金額|いくらか|費用|給付/.test(q) && money) ans += `\nデータ上の金額表示：${money}`;
    if (/円|金額|いくらか|費用|給付/.test(q) && !money)
      ans += '\nこのスタンプのデータに円金額の記載はありません（推測しません）。';
    return ans;
  }

  // Weak match — summarize known fields, suggest 聞き方
  const known: string[] = [];
  known.push(`「${enriched.title}」について分かっていること：`);
  known.push(`・なぜ：${enriched.why}`);
  known.push(`・誰が／窓：${enriched.who} · ${enriched.window}`);
  if (enriched.miss) known.push(`・取りこぼし：${enriched.miss}`);
  if (money) known.push(`・金額（データ記載のみ）：${money}`);
  else if (/円|金額|いくらか|費用|給付/.test(q))
    known.push('・金額：データに円の記載なし（推測しません）');
  if (lock) known.push(`・プロフィールロック：${lock}`);
  else if (/広島|収入|式|新生活/.test(q))
    known.push(`・ロック既定：${LOCK_LINES.join('／')}`);

  known.push('');
  known.push('FAQに近い答えが見つかりませんでした。聞き方の例：');
  known.push(`「${tip[0]?.text || '窓口で対象・書類・期限を確認してください。'}」`);
  return known.join('\n');
}

export const PROFILE_LOCK_SUMMARY = (profile.ui_notes || []).concat([
  '結婚新生活支援事業は対象外',
]);
