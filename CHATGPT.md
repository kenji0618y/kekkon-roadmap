# CHATGPT.md — ChatGPT / Codex: read before any edit

Follow **`AGENTS.md`**, then open **`docs/AI_START_HERE.md`** before changing this repo.

<!-- ここは `npm run sync:docs` が書き込みます。手で直さないでください。 -->
<!-- STATE:LINE -->
186項目 · 33まとまり · FAQ 936組 · 出典 135件 · 6タブ · 検査 58項目
<!-- /STATE -->

Same hard rules as `AGENTS.md` / `CLAUDE.md`:

- SoT = `src/data`、終わる前に `npm run handoff`、内容を減らさない（増やしたら下限も上げる）
- **作り手あてのメモを画面に出さない**（AGENTS.md の §Screen language）
- 式なしは隠すだけで消さない、Amity は右下ボタンのみ（デスクの吹き出しは削除済み）
- `pad` / `review` / practices・talks・agreements・reffs を残す
- `bookSchema` の新欄は既定値つきのまま（必須にすると既存の手帳が壊れる）
- 秘密情報なし / 円の捨造なし / 結婚新生活を賞品扱いしない

## 終わる前に（全AI共通・コマンドは1つ）

```bash
npm run handoff        # = sync:docs（数字を書き直す） + verify:seed（検査）
```

- 検査が緑にならないうちは終わりではありません。
- **`sync:docs` が書き換えたドキュメントも一緒にコミットしてください。**
- 画面から何かを消した／増やした／方針を変えたら、`docs/DECISIONS.md` に**1行足す**。
- `main` に push すれば、GitHub Actions が検査→ビルド→公開まで自動で行います（手動デプロイ不要）。

くわしくは **`docs/HOW_TO_FINISH.md`**。「なぜそう決めたか」は **`docs/DECISIONS.md`**。

Kenji will not re-brief you — these files are the brief.
