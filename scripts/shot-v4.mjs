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
  streak: 2,
  lastVisitDate: "2026-09-06",
};

await page.goto("http://127.0.0.1:4173/#/map", { waitUntil: "networkidle" });
await page.evaluate((state) => {
  localStorage.setItem("marriage-guide-hiroshima-v2", JSON.stringify(state));
}, seed);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);

await page.screenshot({ path: `${out}/v4-roadmap.png`, fullPage: false });

await page.locator(".stamp-pad.st-checked").first().scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await page.locator(".stamp-pad.st-checked").first().screenshot({ path: `${out}/v4-checked-blue.png` });

await page.locator(".sugoroku-square").first().screenshot({ path: `${out}/v4-checked-blue-square.png` });

await page.locator(".stamp-pad").first().click();
await page.waitForSelector(".grok-chat");
await page.fill(".grok-chat-input-row input", "いつまでにやる？金額は？");
await page.click(".grok-send");
await page.waitForTimeout(400);
await page.locator(".grok-chat").evaluate((el) => { el.querySelector(".grok-chat-panel").scrollTop = 0; });
await page.waitForTimeout(200);
await page.locator(".stamp-sheet").screenshot({ path: `${out}/v4-grok-chat.png` });

await browser.close();
console.log("screenshots ok");
