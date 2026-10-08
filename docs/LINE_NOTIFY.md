# 掲示板の LINE 通知（2026-10-03）

ふたりの掲示板にメモを書くと、相手の LINE に「名前：メモ」とアプリの URL が届く（アプリを閉じていても届く）。
LINE Notify は終了済みなので、**無料の LINE 公式アカウント + Messaging API** を **Google Apps Script（中継先）** 経由で使う。

```
アプリ（GitHub Pages・静的）
  └─ POST text/plain;charset=utf-8（本文は JSON）→ Apps Script ウェブアプリ（/exec）
        ├─ 合言葉（スクリプト プロパティ BOARD_SECRET）を確かめる
        ├─ 同じ人は60秒に1通（まとめる）・今月180通で止める
        └─ LINE Messaging API push → 相手の LINE
```

- **Content-Type は必ず `text/plain;charset=utf-8`**。`application/json` や独自ヘッダーは CORS の事前確認（OPTIONS）が走り、Apps Script は答えないので失敗する。
- Apps Script のコードはこのリポジトリに入れていない（Kenji の Google アカウントにある）。
- **中継先の URL と合言葉はリポジトリにも `VITE_` にも書かない。** URL とオン/オフは手帳（`book.lineNotify`・同期）に入れる。

## 送るもの

| 場面 | 本文 |
|---|---|
| 掲示板に書いた | `{"kind":"board","secret":…,"from":1か2,"name":"プロフィールの名前（20文字まで）","text":"本文（500文字まで）"}` |
| つながるか試す | `{"kind":"status","secret":…}`（LINE には何も送らない） |

`from` は「この端末はどちら？」（1＝プロフィールの一人目・2＝二人目）。

## 合言葉

- `小文字16進( SHA-256( "kekkon-board-line-v1\n" + 端末どうしの自動同期のキー ) )`（64文字・WebCrypto）。
- 同じキーの2台では同じ値。`src/lib/sync-crypto.ts` の同期鍵（HKDF・別の info・salt）とは作り方が別で、合言葉から同期鍵は戻せない。**この分離を崩さない。**
- 手帳にも同期先にも保存しない。使うたびに端末の中で作る。
- 自動同期がオフの端末では作れない → 画面は「準備中」。
- ふたりの端末でキーが違うときだけ「合言葉を手で入れる」（localStorage `board-line-secret-v1`・この端末だけ・同期しない）。

## 二重に送らない

通知を送るのは **メモを書いた本人の端末が、書いた瞬間だけ**（`DeskBoard.tsx` の `add` → 保存できたら `notifyLine`、`shouldNotifyBoard('compose',…)`）。
同期で入ってきたメモ（`use-book.ts` の `mergeShared` / `book-merge.ts`）・直す・ピンでは送らない。

## 失敗してもメモは止めない

`postRelay` は例外を投げず `{ok:false}` を返す。`notifyLine` は保存のあとに `try/catch` の中で動く。結果は掲示板の下の一行だけ。

| 返り | 掲示板の一行（「LINE通知：オン — 」に続く） |
|---|---|
| `status:"sent"` | ◯◯さんのLINEにお知らせしました |
| `status:"queued"` | 1分後にまとめてお知らせします |
| `status:"capped"` | 今月の上限に達したので止めています。来月1日に再開します（数は画面に直書きしない。通数は「つながるか試す」が中継先から受け取って出す） |
| `partner-not-registered` | 相手のLINEがまだ登録されていません |
| `bad-secret` / `no-secret` | 合言葉が合っていません |
| それ以外・電波なし | お知らせを送れませんでした |

## ファイル

| ファイル | 役目 |
|---|---|
| `src/lib/line-notify.ts` | URL 検査（Apps Script の `/exec` だけ）・合言葉・POST・画面の文・`shouldNotifyBoard` |
| `src/lib/use-line-notify.ts` | 状態（off / preparing / on）・送信・つながるか試す・コピー |
| `src/components/LineNotifySettings.tsx` | 設定 → 詳細設定 →「LINE通知」`#settings-line-notify` |
| `src/components/DeskBoard.tsx` | 書いたあとの一行 |
| `scripts/tests/line-notify.test.ts` | `npm run test:line`（`npm run build` の前にも走る） |

## ロードマップの「済」も知らせる（2026-10-03）

ロードマップのスタンプを「済」にすると、相手の LINE に「けんじ：『婚姻届を出す』を済にしました」と届く（「名前：」は中継先が付ける。本文に名前を入れると二重になる）。
中継先は掲示板と同じで、Apps Script は `kind:"board"` しか受けないので **`kind:"board"` のまま本文に書く**（`from` はこの端末の 1/2、`name` は20文字・`text` は500文字まで。長い項目名は「…」で切る）。

| 決まり | 中身 |
|---|---|
| いつ送るか | 「LINE通知を使う」がオンで、**この端末で押して** 済でない → 済 になったとき（ふたりのチェックが両方そろった／項目の画面で「済」を選んだ） |
| 送らないとき | 取り消し・同期で入ってきたスタンプ・バックアップの読み込み・最初の読み込み・自動同期がオフ（準備中）・「この端末はどちら？」が未設定 |
| 待つ | 押してから **5秒** 待つ。そのあいだに取り消したら送らない。押し直したら待ち直す。送る直前に、まだ済かを確かめる（同期で相手が取り消した場合も送らない） |
| 回数 | **同じ項目は30分に1回まで**（済→取り消し→済を繰り返しても1通）。端末ごと（localStorage `stamp-line-sent-v1`）。Apps Script 側でも同じ人は60秒に1通にまとまる |
| 待たせない | スタンプの保存・絵の動きは通知を待たない（保存できたあとにタイマーを置くだけ。例外は投げない） |
| 画面 | うまく送れた／まとめて送るときは何も出さない。上限・相手が未登録・合言葉ちがい・送れなかったときだけ短いお知らせ（「LINE通知 — お知らせを送れませんでした」など。文は掲示板の一行と同じ） |
| 5秒以内にアプリを閉じた | 送らない（取り消しの猶予と同じ扱い） |

ファイル: `src/lib/stamp-notify.ts`（決まりの本体・時計とタイマーを差しかえてテストできる）、`src/Notebook.tsx` の `noteStampChange`（`togglePairCheck` と `saveRecord` からだけ呼ぶ）、`scripts/tests/stamp-notify.test.ts`（`npm run test:line`）。

## 手帳を開いたときも知らせる（2026-10-05）

合言葉で解錠したあと、手帳アプリが使える状態になったとき、相手の LINE に「けんじ：手帳を開きました」などと届く（掲示板と同じ `kind:"board"`。「名前：」は中継先が付ける）。

| 決まり | 中身 |
|---|---|
| いつ送るか | 「LINE通知を使う」がオンで、解錠後のアプリが ready、かつ「この端末はどちら？」が決まっているとき |
| 送らないとき | LINE オフ／準備中／どちら？未設定／合言葉入力失敗 |
| 回数 | **この端末で22時間に1回＝1日1回**（localStorage `login-line-sent-v1`）。リロード連打では増やさない |
| なぜ1日1回か | 掲示板・スタンプ・この通知は同じ月180通を使う。掲示板とスタンプは中継先が60秒でまとめるが、**この通知は間隔が長いのでまとめに入らず、1回ごとに必ず1通使う**。6時間に1回だと2台で最大1日8通＝月240通で上限を超え、いちばん大事な掲示板の通知まで止まる。1日1回なら2台で月60通までで、残り120通が掲示板とスタンプに残る。短くしないこと |
| 誰が開いたか | `readMe()`（n1/n2）とプロフィールの呼び名。中継先が相手の LINE へ push（既存どおり） |
| 待たせない | 開く動作は通知を待たない。失敗しても画面に出さない |

ファイル: `src/lib/login-notify.ts`、`src/Notebook.tsx`（ready 時）、`scripts/tests/login-notify.test.ts`（`npm run test:line`）。

