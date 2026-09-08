import { chromium } from "playwright";
import { mkdirSync } from "fs";

const out = "/workspace/marriage-guide-app/screenshots";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

const seed = {
  settings: { hasChild: true, buyingHome: true },
  statuses: {
    "A必1": "done",
    "A必2": "checked",
    "A必3": "unknown",
    "A無1": "done",
    B1: "todo",
    "C即1": "checked",
    G5: "checked",
  },
  notes: { "A必3": "市区町村の窓口に聞くこと" },
  chats: {},
  customIn: {},
  streak: 1,
  lastVisitDate: "2026-09-06",
};

await page.goto("http://127.0.0.1:4173/#/", { waitUntil: "networkidle" });
await page.evaluate((state) => {
  localStorage.setItem("marriage-guide-hiroshima-v2", JSON.stringify(state));
  localStorage.removeItem("marriage-guide-hiroshima-editor-v1");
}, seed);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.waitForSelector(".roadmap-main");
await page.waitForSelector(".home-title");
await page.waitForSelector(".home-recommend");

const title = await page.locator(".home-title").innerText();
const softLeadCount = await page.locator(".home-soft-lead").count();
const softLeadVisible = softLeadCount
  ? await page.locator(".home-soft-lead").first().isVisible()
  : false;
const navLabels = await page.locator(".bottom-nav a").allInnerTexts();
const sub = await page.locator(".map-subnav a").allInnerTexts();

await page.screenshot({ path: `${out}/v10-merged-top.png`, fullPage: false });

// scroll to おすすめ
await page.locator(".home-recommend").scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/v10-merged-bottom.png`, fullPage: false });

// redirects
await page.goto("http://127.0.0.1:4173/#/map", { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const afterMap = page.url();
await page.goto("http://127.0.0.1:4173/#/map/deadlines", { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const afterDead = page.url();
await page.goto("http://127.0.0.1:4173/#/map/know?tab=exclude", { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const afterKnow = page.url();

const hasAmbient = await page.locator(".ambient-bg").count();
const hasKenBurns = await page.locator(".ambient-kenburns-img").count();

console.log(JSON.stringify({
  title,
  softLeadVisible,
  navLabels: navLabels.map((t) => t.replace(/\n/g, " ").trim()),
  sub,
  afterMap,
  afterDead,
  afterKnow,
  hasAmbient,
  hasKenBurns,
}, null, 2));

await browser.close();
