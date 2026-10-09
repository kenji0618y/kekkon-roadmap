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

ロードマップのスタンプを「済」にすると、相手の LINE に「一人目：『婚姻届を出す』を済にしました」と届く（「名前：」は中継先が付ける。本文に名前を入れると二重になる）。
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

## 解錠／開いたときの通知は外した（2026-10-09）

合言葉で解錠したあと・手帳を開いたときに送っていた「手帳を開きました」の LINE 通知は、やめた（Kenji「ログインのときはやっぱり必要ない」）。
掲示板のメモ・スタンプの済・期限と記念日／月に一度のふたり会議のお知らせは、そのまま残している。中継先の変更は不要（アプリが送らなくなるだけ）。


## 期限と記念日・月に一度のふたり会議のお知らせ（2026-10-08）

カレンダーにのるもの（制度の締切・項目の予定日・ふたりの予定・記念日・月に一度のふたり会議）から、近づいたものを LINE に知らせる。PWA は閉じていると送れないので、**送るのは中継先の時間主導トリガー**。アプリは一覧を渡すだけ。

| 場面 | 本文 |
|---|---|
| 一覧を渡す（開いたとき・設定や予定が変わったとき。同じ内容は1日1回まで） | `{"kind":"reminders","secret":…,"on":true,"slot":"morning\|noon\|night","names":{"1":…,"2":…},"from":"今日","to":"35日後","items":[{"t":"題（30文字まで）","d":"YYYY-MM-DD","k":"rule\|task\|event\|anniv\|meeting","w":"both\|one\|two\|none","o":[3,0]}]}`（40件まで） |
| お知らせをやめた | `{"kind":"reminders","secret":…,"on":false,"items":[]}`（中継先の一覧を消す・1回だけ） |

- 中継先は一覧をスクリプト プロパティ `REMIND_LIST` に置くだけ。1時間おきのトリガー `sendDailyReminders` が、時間帯（朝8時／昼12時／夜20時）を過ぎたら、その日の分を **1通にまとめて** 登録したふたりに送る（`REMIND_SENT` で1日1回・送るものがない日は送らない）。
- ふたりに1通ずつなので、送った日は今月の数に2つ入る。今月の上限に届くなら送らない（掲示板・スタンプ・解錠と同じ上限を使う。送るのは「その日に知らせるものがある日」だけ）。
- 本文の組み立ては `src/lib/reminders.ts` の `reminderText` と中継先の `reminderText_` が同じ（設定の「LINEでの見え方」はアプリ側で作る）。
- 会議の日は `book.reminders.meeting` の1か所だけ。カレンダーの「くり返しの予定」・設定・.ics（`RRULE:FREQ=MONTHLY;BYDAY=…`）・LINE はここから作る。カレンダーの「直す」と設定は同じ部品（`MeetingEditor`）。
- .ics：お知らせがオンなら、アラームをお知らせと同じ日・時間帯に（3日前の朝8時＝`-PT64H`、当日の朝8時＝`PT8H`）。オフの種類はアラームなし。お知らせがオフなら今までどおり3日前。
- 中継先が古い版（`reminders` を知らない）だと `{ok:false,error:"unknown"}` が返る → 設定に「スクリプトが古い版のため、お知らせはまだ届きません」と出し、設定は手帳に残す（掲示板などの通知はそのまま動く）。
- 中継先のコードと手順は Kenji の Google アカウント側（このリポジトリには入れない）。
