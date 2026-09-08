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
await page.waitForTimeout(800);
await page.waitForSelector(".today-home");
await page.waitForSelector(".home-recommend");
await page.screenshot({ path: `${out}/v9-home.png`, fullPage: false });

await page.goto("http://127.0.0.1:4173/#/map", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.waitForSelector(".map-subnav");
await page.screenshot({ path: `${out}/v9-nav-merged.png`, fullPage: false });

const navLabels = await page.locator(".bottom-nav a").allInnerTexts();
const sub = await page.locator(".map-subnav a").allInnerTexts();
const homeTitle = await page.goto("http://127.0.0.1:4173/#/", { waitUntil: "networkidle" }).then(async () => {
  await page.waitForSelector(".home-title");
  return page.locator(".home-title").innerText();
});

// redirect check
await page.goto("http://127.0.0.1:4173/#/deadlines", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const afterDead = page.url();
await page.goto("http://127.0.0.1:4173/#/know?tab=exclude", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const afterKnow = page.url();

console.log("home title:", homeTitle);
console.log("bottom nav:", navLabels.map((t) => t.replace(/\n/g, " ")));
console.log("subnav:", sub);
console.log("redirect deadlines ->", afterDead);
console.log("redirect know ->", afterKnow);
console.log("shots:", `${out}/v9-home.png`, `${out}/v9-nav-merged.png`);

await browser.close();
