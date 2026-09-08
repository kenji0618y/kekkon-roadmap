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

await page.goto("http://127.0.0.1:4173/#/", { waitUntil: "networkidle" });
await page.evaluate((state) => {
  localStorage.setItem("marriage-guide-hiroshima-v2", JSON.stringify(state));
}, seed);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.waitForSelector(".today-hero");
await page.screenshot({ path: `${out}/v5-home-lux.png`, fullPage: false });

await page.goto("http://127.0.0.1:4173/#/map", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.locator(".stamp-pad").first().click();
await page.waitForSelector(".stamp-brief.why-block");
await page.waitForSelector(".stamp-brief.steps-block");
await page.waitForTimeout(300);
// Ensure why/steps visible in shot (scroll sheet to top of those sections)
await page.locator(".stamp-brief.why-block").scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await page.locator(".stamp-sheet").screenshot({ path: `${out}/v5-roadmap-why-steps.png` });

const whyText = await page.locator(".stamp-brief.why-block").innerText();
const stepsText = await page.locator(".stamp-brief.steps-block").innerText();
console.log("why snippet:", whyText.slice(0, 80).replace(/\n/g, " | "));
console.log("steps snippet:", stepsText.slice(0, 80).replace(/\n/g, " | "));

await browser.close();
console.log("screenshots ok");
