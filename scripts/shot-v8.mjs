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
await page.waitForTimeout(1000);
await page.waitForSelector(".ond-hero");
await page.screenshot({ path: `${out}/v8-home-ond.png`, fullPage: false });

// Scroll past hero into concept / metrics
await page.evaluate(() => {
  const cue = document.querySelector(".ond-concept");
  if (cue) cue.scrollIntoView({ behavior: "instant", block: "start" });
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/v8-home-ond-scroll.png`, fullPage: false });

const h1 = await page.locator(".ond-headline").innerText();
const label = await page.locator(".ond-section-label").first().innerText();
console.log("headline:", h1.slice(0, 40));
console.log("section:", label);
console.log("shots:", `${out}/v8-home-ond.png`, `${out}/v8-home-ond-scroll.png`);

await browser.close();
