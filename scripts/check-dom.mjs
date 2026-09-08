import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://127.0.0.1:4173/#/map', { waitUntil: 'networkidle' });
const nav = await page.locator('.bottom-nav a').allTextContents();
const pads = await page.locator('.stamp-pad').count();
const imgs = await page.locator('.sugoroku-illust').count();
const progress = await page.locator('.sugoroku-progress').first().textContent();
const kicker = await page.locator('.kicker').first().textContent();
const h1 = await page.locator('h1').first().textContent();
console.log({ nav, pads, imgs, progress, kicker, h1 });
await page.screenshot({ path: 'screenshots/v3-sugoroku-stamps.png', fullPage: false });
// seed + unknown detail
await page.evaluate(() => {
  localStorage.setItem('marriage-guide-hiroshima-v2', JSON.stringify({
    settings: { hasChild: true, buyingHome: false },
    statuses: { 'A必1': 'done', 'A必2': 'checked', 'A必3': 'unknown' },
    notes: { 'A必3': '市区町村の窓口に聞くこと' },
    customIn: {}, streak: 1, lastVisitDate: '2026-09-06'
  }));
});
await page.goto('http://127.0.0.1:4173/#/map', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/v3-sugoroku-stamps.png', fullPage: true });
await page.goto('http://127.0.0.1:4173/#/stamp/' + encodeURIComponent('A必3'), { waitUntil: 'networkidle' });
const unknownOn = await page.locator('.status-btn.st-unknown.on').count();
const askTips = await page.locator('.ask-tips').count();
const faqOpen = await page.locator('.faq-item.open').count();
console.log({ unknownOn, askTips, faqOpen });
await page.screenshot({ path: 'screenshots/v3-stamp-unknown.png', fullPage: true });
await browser.close();
