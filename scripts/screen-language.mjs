#!/usr/bin/env node
/**
 * 「作り手あてのメモを画面に出さない」を機械で見張る。
 *
 * 日本語を含む文字列だけを取り出して検査するので、関数名や CSS クラス名
 * （StageRidge / LatticeWire / .desk-washi など）は引っかからない。
 *   - src/data/*.json と src/**\/*.tsx … 見つかったら失敗
 *   - src/**\/*.ts …………………………… 警告のみ（AIへの指示文がここに入るため）
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { root } from './state.mjs';

const HAS_JA = /[぀-ヿ一-龯]/;

/** 出したら困る語 → 画面での言い方 */
export const BANNED = [
  ['賞品', 'もらえる額 / 受け取れる額'],
  ['既定', 'この前提 / 初期値'],
  ['一次', '公式情報'],
  ['捏造', '推測で書かない'],
  ['invent', '推測で書かない'],
  ['シード', '収録データ'],
  ['カスケード', '名義変更の連鎖'],
  ['ジョブロック', '（使わない）'],
  ['既知円', 'かかる費用の目安'],
  ['現金は書かない', '（読み手への文に書き直す）'],
  ['一次未検出', '公式の案内が見つからない'],
  ['標報', '標準報酬'],
  ['最頻', 'いちばん多い'],
  ['取りこぼし：', '見落としやすいところ：'],
  ['窓：', 'いつ：'],
  ['＋α', '（具体的に書く）'],
  ['HUD', '（日本語にする）'],
  ['COMMAND DESK', 'OUR DESK など'],
  ['FAB', '右下のボタン'],
  ['Lean', '式なし（社内語は画面に出さない）'],
  ['Ridge', '章ごとの進み'],
  ['Lattice', '章ごとの重さ'],
  ['Chord', 'つながり'],
  ['OSS', 'オンライン申請'],
  ['OTC', '市販薬'],
  ['サンセット', '終了'],
  ['ヘッジ', '備え'],
];
/** 元号の略号（R8.4.1 / R9.1 など）。R1〜R18 は refs.json の出典IDなので、点が続くものだけ */
const ERA = /R\d{1,2}\.\d{1,2}/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** JSXのテキストと文字列リテラルのうち、日本語を含むものだけを返す */
function japaneseStrings(code) {
  const found = [];
  // コメントを落とす（// と /* */）
  const src = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  for (const re of [/'([^'\\\n]|\\.)*'/g, /"([^"\\\n]|\\.)*"/g, /`([^`\\]|\\.)*`/g, />([^<>{}]+)</g]) {
    for (const m of src.matchAll(re)) {
      const text = m[0];
      if (HAS_JA.test(text)) found.push(text);
    }
  }
  return found;
}

function jsonStrings(value, out = []) {
  if (typeof value === 'string') { if (HAS_JA.test(value)) out.push(value); }
  else if (Array.isArray(value)) value.forEach((v) => jsonStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => jsonStrings(v, out));
  return out;
}

export function scanScreenLanguage() {
  const errors = [];
  const warnings = [];
  const hit = (text) => {
    const words = BANNED.filter(([w]) => text.includes(w)).map(([w, fix]) => `${w}（→ ${fix}）`);
    if (ERA.test(text)) words.push(`${text.match(ERA)[0]}（→ 西暦で書く）`);
    return words;
  };

  for (const file of walk(join(root, 'src/data')).filter((f) => f.endsWith('.json'))) {
    for (const text of jsonStrings(JSON.parse(readFileSync(file, 'utf8')))) {
      const words = hit(text);
      if (words.length) errors.push(`${relative(root, file)}: ${words.join(' / ')} — 「${text.slice(0, 48)}」`);
    }
  }
  for (const file of walk(join(root, 'src')).filter((f) => /\.(tsx|ts)$/.test(f))) {
    const isTsx = file.endsWith('.tsx');
    for (const text of japaneseStrings(readFileSync(file, 'utf8'))) {
      const words = hit(text);
      if (!words.length) continue;
      const line = `${relative(root, file)}: ${words.join(' / ')} — 「${text.slice(0, 48)}」`;
      (isTsx ? errors : warnings).push(line);
    }
  }
  return { errors, warnings };
}

if (process.argv[1] && process.argv[1].endsWith('screen-language.mjs')) {
  const { errors, warnings } = scanScreenLanguage();
  for (const w of warnings) console.log(`WARN ${w}`);
  for (const e of errors) console.log(`FAIL ${e}`);
  console.log(errors.length ? `\n画面に出したくない言葉が ${errors.length} 件あります` : '\n画面用語: 問題なし');
  process.exit(errors.length ? 1 : 0);
}
