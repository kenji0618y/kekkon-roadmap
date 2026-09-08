import { chromium } from 'playwright';

const state = {
  settings: { hasChild: true, buyingHome: false },
  statuses: { 'A必1': 'done', 'A必2': 'checked', 'A必3': 'unknown', 'A無1': 'done', 'C即1': 'checked' },
  notes: { 'A必3': '市区町村の窓口に聞くこと' },
  customIn: {},
  streak: 2,
  lastVisitDate: '2026-09-06',
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
await context.addInitScript((s) => {
  localStorage.setItem('marriage-guide-hiroshima-v2', JSON.stringify(s));
}, state);

const page = await context.newPage();
await page.goto('http://127.0.0.1:4173/#/map', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const mapDump = await page.evaluate(() => ({
  donePads: document.querySelectorAll('.stamp-pad.st-done').length,
  checkedPads: document.querySelectorAll('.stamp-pad.st-checked').length,
  unknownPads: document.querySelectorAll('.stamp-pad.st-unknown').length,
  progress: document.querySelector('.sugoroku-progress')?.textContent,
  nav: [...document.querySelectorAll('.bottom-nav a')].map((a) => a.textContent),
}));
console.log('map', mapDump);
await page.screenshot({ path: 'screenshots/v3-sugoroku-stamps.png', fullPage: true });

await page.goto('http://127.0.0.1:4173/#/stamp/' + encodeURIComponent('A必3'), { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const dump = await page.evaluate(() => ({
  onBtns: [...document.querySelectorAll('.status-btn.on')].map((b) => b.textContent),
  ask: !!document.querySelector('.ask-tips'),
  faqOpen: document.querySelectorAll('.faq-item.open').length,
  memo: document.querySelector('.memo-field textarea')?.value,
}));
console.log('detail', dump);
await page.screenshot({ path: 'screenshots/v3-stamp-unknown.png', fullPage: true });
await browser.close();
