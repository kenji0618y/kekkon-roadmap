#!/usr/bin/env node
/**
 * ブラウザ2台（別プロファイル）で、同期の暗号化と移行を確かめる（開発用・手動実行）。
 *   node scripts/test-sync-browser.mjs <新しい版の dist> <古い版の dist> [スクショの出力先]
 * - 本物の GitHub には一切つながない（api.github.com はまねの API に差しかえ）
 * - アプリは https://app.test/ として配信（WebCrypto は https が必要）。端末ごとに別の dist を出せる
 * - playwright が必要：PLAYWRIGHT_DIR か、近くの node_modules から読む
 */
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { MockGitHub } from './mock-gist-api.mjs';

const [NEW_DIST, OLD_DIST, SHOTS = '/workspace/kekkon-preview'] = process.argv.slice(2);
if (!NEW_DIST || !OLD_DIST) { console.error('usage: test-sync-browser.mjs <newDist> <oldDist> [shotsDir]'); process.exit(2); }
const req = createRequire(join(process.env.PLAYWRIGHT_DIR || '/workspace/pwtool', 'package.json'));
const { chromium } = req('playwright');
mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log('OK  ', name); } else { fail++; console.error('FAIL', name); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 20000, step = 250) { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(step); } return null; }

// テスト専用の偽キー（本物ではない・表示しない）
const T1 = 'ghp_TESTONLY_' + randomBytes(15).toString('hex');
const T2 = 'ghp_TESTONLY_' + randomBytes(15).toString('hex');
const LEGACY = randomBytes(16).toString('hex'); // 本物の ID ではない
const gh = new MockGitHub({ [T1]: 'kenji', [T2]: 'kenji' });

const tasks = JSON.parse(readFileSync(new URL('../src/data/tasks.json', import.meta.url)));
const taskIds = (Array.isArray(tasks) ? tasks : tasks.tasks).slice(0, 3).map((t) => t.id);
const profile = { name1: 'けんじ', name2: 'みさき', ward: '中区', wdate: '2026-11-22', movedate: '', reported: '', birthdate: '', duedate: '', propertydate: '', carNameDate: '', carAddressDate: '', ceremony: 'no', employment1: 'company', employment2: 'company', work: 'dual', move: 'unknown', child: 'unknown', home: 'unknown', car: 'unknown', foreign: 'unknown', giver: '', letter: '' };
const rec = (status, note, at) => ({ status, steps: [], assignee: 'together', note, due: '', amount: null, moneyKind: 'none', confirmedAt: '', updatedAt: at, checkMale: false, checkFemale: false });
const seedBook = {
  profile,
  records: { [taskIds[0]]: rec('learned', 'もとの進み MARK-REC0', '2026-09-20T00:00:00.000Z'), [taskIds[1]]: rec('preparing', 'MARK-REC1', '2026-09-21T00:00:00.000Z') },
  memories: [{ id: 'mem1', date: '2026-09-01', title: '記念 MARK-MEM', text: 'はじめて', kind: 'memory', complete: false }],
  practices: {}, agreements: {},
  events: [{ id: 'ev1', title: '婚姻届 MARK-EV', date: '2026-11-22', note: '', who: 'both', updatedAt: '2026-09-22T00:00:00.000Z' }],
  futari: { startedAt: '2026-09-28', modeOverride: 'auto', signal: '', settingsAt: '', days: { '2026-09-29': { cardId: 'D01', mode: 'answer', n1: { text: 'けんじ MARK-FUT1', guess: '', changed: '', result: '', at: '2026-09-29T01:00:00.000Z' }, n2: { text: 'みさき MARK-FUT2', guess: '', changed: '', result: '', at: '2026-09-29T02:00:00.000Z' } } }, meetings: {} },
  board: { notes: [{ id: 'bn1', who: 'n1', text: '牛乳 MARK-BOARD1', pinned: true, at: '2026-09-29T00:00:00.000Z', updatedAt: '2026-09-29T00:00:00.000Z', editedAt: '' }, { id: 'bn2', who: 'n2', text: '了解 MARK-BOARD2', pinned: false, at: '2026-09-29T03:00:00.000Z', updatedAt: '2026-09-29T03:00:00.000Z', editedAt: '' }], deleted: {} },
};
const savedAt = '2026-09-30T00:00:00.000Z';
gh.seed({ id: LEGACY, owner: 'kenji', files: { 'futari-miraicho.json': JSON.stringify({ format: 'futari-miraicho', version: 1, revision: 7, book: seedBook, savedAt, updatedAt: savedAt }) } });
const PLAIN_MARKS = /MARK-|けんじ|みさき|牛乳/;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const browser = await chromium.launch();

async function phone(name, { dist, storage, token = T1 }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', locale: 'ja-JP', timezoneId: 'Asia/Tokyo' });
  const st = { dist };
  await ctx.route('**/*', async (route) => {
    const r = route.request();
    const u = new URL(r.url());
    if (u.host === 'api.github.com') {
      const res = gh.handle(r.method(), r.url(), r.headers()['authorization'] || '', r.postData() || '');
      gh.log[gh.log.length - 1].phone = name;
      return route.fulfill({ status: res.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: res.body === null ? '' : JSON.stringify(res.body) });
    }
    if (u.host === 'app.test') {
      if (u.pathname === '/__init') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>init</title>' });
      let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
      const f = join(st.dist, p);
      if (!existsSync(f)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: MIME[extname(f)] || 'application/octet-stream', body: readFileSync(f) });
    }
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`[${name}] pageerror`, e.message));
  await page.goto('https://app.test/__init');
  await page.evaluate(({ storage, token }) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v).replaceAll('__TOKEN__', token));
  }, { storage, token });
  await page.goto('https://app.test/');
  await page.waitForSelector('#main-content', { timeout: 30000 });
  return {
    name, ctx, page, st,
    book: async () => JSON.parse((await page.evaluate(() => localStorage.getItem('futari-miraicho-v1'))) || 'null'),
    cfg: async () => page.evaluate(() => ({ v2: localStorage.getItem('futari-gist-sync-v2'), v1: localStorage.getItem('futari-gist-sync-v1') })),
    pull: async () => page.evaluate(() => window.dispatchEvent(new Event('focus'))),
    write: async (text) => {
      await page.getByRole('tab', { name: /デスク/ }).first().click().catch(() => {});
      const ta = page.getByLabel('掲示板に書くメモ');
      await ta.scrollIntoViewIfNeeded();
      await ta.fill(text);
      await page.locator('.desk-board-compose button[type=submit]').click();
    },
    upgrade: async (newDist) => { st.dist = newDist; await page.reload(); await page.waitForSelector('#main-content', { timeout: 30000 }); },
  };
}
const v1 = (enabled = true) => ({ token: '__TOKEN__', gistId: LEGACY, enabled });
const baseStorage = (who, enabled = true) => ({
  'futari-miraicho-v1': { format: 'futari-miraicho', version: 1, revision: 7, book: seedBook, savedAt },
  'futari-gist-sync-v1': v1(enabled),
  'futari-me-v1': who,
  'amity-onboarding-done': '1',
});
const encGists = () => [...gh.gists.values()].filter((g) => g.files['futari-sync.enc.json']);
const hasText = (book, s) => JSON.stringify(book || {}).includes(s);
const allSeedKept = (book) => ['MARK-REC0', 'MARK-REC1', 'MARK-MEM', 'MARK-EV', 'MARK-FUT1', 'MARK-FUT2', 'MARK-BOARD1', 'MARK-BOARD2'].every((m) => hasText(book, m));
async function openSync(p, file) {
  await p.page.getByRole('tab', { name: /設定/ }).first().click();
  // 2026-10-08〜 同期は独立したカード。キー・暗号化のようすは折りたたみの中なので開いておく
  await p.page.evaluate(() => document.querySelectorAll('#settings-gist-sync details').forEach((d) => { d.open = true; }));
  await p.page.locator('#settings-gist-sync').scrollIntoViewIfNeeded();
  await sleep(600);
  if (file) {
    // 要素だけを撮るとき、上に固定のヘッダーが重なるので一時的に隠す（撮ったら戻す）
    await p.page.addStyleTag({ content: '.site-header,.nav-wrap,.main-nav,.skip-link,.amity-fab{visibility:hidden!important}' }).then((h) => h.evaluate((el) => el.setAttribute('data-shot', '1')));
    await p.page.locator('#settings-gist-sync').screenshot({ path: join(SHOTS, file) });
    await p.page.evaluate(() => document.querySelectorAll('style[data-shot]').forEach((e) => e.remove()));
    await p.page.locator('#gist-pat').scrollIntoViewIfNeeded();
    await p.page.screenshot({ path: join(SHOTS, file.replace('.png', '-screen.png')) });
  }
}

try {
  // 0) 移行前の表示（自動同期オフの端末）
  const C = await phone('C-before', { dist: NEW_DIST, storage: baseStorage('n1', false) });
  await openSync(C, 'crypt-00-before-migration.png');
  ok('before: settings explains "not yet encrypted" (old settings carried over)', (await C.page.locator('#sync-crypt-status').innerText()).includes('まだ暗号化する前'));
  ok('before: gist id field is empty (no id shipped in the app)', (await C.page.locator('#gist-id').inputValue()) === '');
  await C.ctx.close();

  // 1) A=新しい版、B=古い版
  const A = await phone('A', { dist: NEW_DIST, storage: baseStorage('n1') });
  const B = await phone('B-old', { dist: OLD_DIST, storage: baseStorage('n2') });
  ok('A migrates automatically: one new encrypted gist', !!(await until(() => encGists().length === 1)));
  const enc = encGists()[0];
  ok('new gist is secret', enc.public === false);
  ok('new gist: ciphertext only (current + every revision)', enc.history.every((h) => !PLAIN_MARKS.test(JSON.stringify(h))) && Object.keys(enc.files).join() === 'futari-sync.enc.json');
  ok('A never writes to the old gist', !gh.log.some((l) => l.phone === 'A' && l.path === `/gists/${LEGACY}` && l.method !== 'GET'));
  ok('A keeps all seed data after migration', allSeedKept(await A.book()));

  // 2) 古い版の B が掲示板に書く → 古い同期先（平文）へ
  await B.write('Bの古い版メモ MARK-B-OLD');
  ok('old phone B writes plaintext to the OLD gist only', !!(await until(() => gh.gists.get(LEGACY).files['futari-miraicho.json'].content.includes('MARK-B-OLD'))));
  ok('old phone cannot touch the encrypted gist', !gh.log.some((l) => l.phone === 'B-old' && l.path === `/gists/${enc.id}`));

  // 3) 新しい版の A が書く → 暗号化して送る
  const before = enc.history.length;
  await A.write('Aの新しい版メモ MARK-A-NEW');
  ok('A pushes encrypted (no plaintext in the PATCH)', !!(await until(() => enc.history.length > before)) && !gh.log.filter((l) => l.phone === 'A' && l.method === 'PATCH').some((l) => PLAIN_MARKS.test(l.body)));

  // 4) A が古い同期先から B の書き込みを取り込む（移行中）
  await A.pull();
  ok('A picks up the old phone\'s memo during the transition', !!(await until(async () => hasText(await A.book(), 'MARK-B-OLD'))));
  ok('A still has its own memo + all seed data', !!(await until(async () => { const b = await A.book(); return hasText(b, 'MARK-A-NEW') && allSeedKept(b); })));

  // 5) B を新しい版にする
  await B.upgrade(NEW_DIST);
  B.name = 'B';
  ok('B (upgraded) joins the SAME encrypted gist (no duplicate)', !!(await until(async () => { const c = JSON.parse((await B.cfg()).v2 || '{}'); return c.gistId === enc.id; })) && encGists().length === 1);
  ok('B has A\'s new memo, its own old memo, and all seed data', !!(await until(async () => { const b = await B.book(); return hasText(b, 'MARK-A-NEW') && hasText(b, 'MARK-B-OLD') && allSeedKept(b); })));
  await B.write('Bの新しい版メモ MARK-B-NEW');
  await sleep(1500);
  await A.pull();
  ok('A receives B\'s new memo through the encrypted gist', !!(await until(async () => hasText(await A.book(), 'MARK-B-NEW'))));
  ok('encrypted gist history never held plaintext', enc.history.every((h) => !PLAIN_MARKS.test(JSON.stringify(h))));

  // 6) 設定の表示（2台・片づけボタン）
  await A.pull(); await sleep(1500);
  await openSync(A, 'crypt-01-encrypted-cleanup.png');
  const legacyText = await A.page.locator('#sync-legacy').innerText();
  ok('settings show encrypted state', (await A.page.locator('#sync-crypt-status').innerText()).includes('暗号化して同期しています'));
  ok('settings count 2 phones and offer cleanup', legacyText.includes('2台') && await A.page.getByRole('button', { name: '古い同期先を削除する' }).isEnabled());

  // 7) キーが違う端末（同じアカウントの別のキー）→ 読めない・送らない
  const D = await phone('D-otherkey', { dist: NEW_DIST, storage: baseStorage('n1'), token: T2 });
  await until(async () => (await D.page.locator('body').innerText()).length > 0, 3000);
  await sleep(3000);
  await openSync(D, 'crypt-02-key-mismatch.png');
  ok('different key: warning shown', (await D.page.locator('#settings-gist-sync').innerText()).includes('アクセス用のキー」が違う'));
  ok('different key: never writes to the encrypted gist', !gh.log.some((l) => l.phone === 'D-otherkey' && l.path === `/gists/${enc.id}` && l.method !== 'GET'));
  ok('different key: cleanup button hidden while unreadable', (await D.page.locator('#sync-legacy').count()) === 0);
  ok('different key: never writes to the old gist', !gh.log.some((l) => l.phone === 'D-otherkey' && l.path === `/gists/${LEGACY}` && l.method !== 'GET'));
  await D.ctx.close();

  // 8) 古い同期先を削除（まねの API 上で）
  await A.page.getByRole('button', { name: '古い同期先を削除する' }).click();
  await A.page.getByRole('alertdialog').getByRole('button', { name: '削除する' }).click();
  ok('old gist deleted (mock)', !!(await until(() => !gh.gists.has(LEGACY))));
  ok('A forgets old settings (old id gone from the phone)', !!(await until(async () => { const c = await A.cfg(); return !c.v1 && !JSON.parse(c.v2).legacyGistId; })));
  await sleep(800);
  await openSync(A, 'crypt-03-after-cleanup.png');
  ok('cleanup box disappears', (await A.page.locator('#sync-legacy').count()) === 0);
  await B.pull();
  ok('B notices the old gist is gone and forgets it', !!(await until(async () => { const c = await B.cfg(); return !c.v1 && !JSON.parse(c.v2).legacyGistId; })));

  // 9) 最後に：二台の中身が同じで、何も消えていない
  await A.pull(); await sleep(1500); await B.pull(); await sleep(1500);
  const [ba, bb] = [await A.book(), await B.book()];
  const norm = (b) => JSON.stringify({ r: b.book.records, m: b.book.memories, e: b.book.events, f: b.book.futari, n: [...b.book.board.notes].sort((x, y) => x.id.localeCompare(y.id)) });
  ok('final: both phones identical', norm(ba) === norm(bb));
  ok('final: zero loss (seed + 3 new memos)', allSeedKept(ba) && ['MARK-A-NEW', 'MARK-B-OLD', 'MARK-B-NEW'].every((m) => hasText(ba, m)));

  // 10) 古い版の端末がまだ残っていても、削除後は何も書けない
  const E = await phone('E-old-late', { dist: OLD_DIST, storage: baseStorage('n2') });
  await E.write('遅れた古い版 MARK-E');
  await sleep(2500);
  ok('late old phone after deletion: cannot write anywhere', !gh.gists.has(LEGACY) && !encGists().some((g) => JSON.stringify(g.files).includes('MARK-E')));
  await E.ctx.close();
  await A.ctx.close(); await B.ctx.close();

  // 11) 二台が同時に移行しても、同じ同期先にそろう
  const LEG2 = randomBytes(16).toString('hex');
  gh.gists.clear();
  gh.seed({ id: LEG2, owner: 'kenji', files: { 'futari-miraicho.json': JSON.stringify({ format: 'futari-miraicho', version: 1, revision: 7, book: seedBook, savedAt, updatedAt: savedAt }) } });
  const s2 = (who) => ({ ...baseStorage(who), 'futari-gist-sync-v1': { token: '__TOKEN__', gistId: LEG2, enabled: true } });
  const [P, Q] = await Promise.all([phone('P', { dist: NEW_DIST, storage: s2('n1') }), phone('Q', { dist: NEW_DIST, storage: s2('n2') })]);
  const same = await until(async () => { const a = JSON.parse((await P.cfg()).v2 || '{}').gistId, b = JSON.parse((await Q.cfg()).v2 || '{}').gistId; return a && a === b ? a : null; }, 25000);
  ok('simultaneous migration: both phones end on the same encrypted gist', !!same);
  await P.write('P MARK-P'); await sleep(1500); await Q.pull();
  ok('simultaneous migration: still syncing afterwards', !!(await until(async () => hasText(await Q.book(), 'MARK-P'))));
  console.log(`  (encrypted gists left after race: ${encGists().length})`);
  await P.ctx.close(); await Q.ctx.close();
} catch (e) {
  fail++; console.error('ERROR', e);
} finally {
  await browser.close();
}
console.log(`\nsync browser tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
