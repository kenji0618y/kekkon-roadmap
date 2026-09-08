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
  streak: 3,
  lastVisitDate: "2026-09-06",
};

const editor = {
  version: 1,
  regs: [
    {
      id: "reg-demo-1",
      title: "夫側・慶弔規程メモ",
      side: "夫側",
      text: "結婚祝金：入籍起算・届出後30日以内に人事へ申請。\n特別休暇：連続3日（有給扱い）。",
      checklist: ["祝金起算：入籍", "休暇日数：3日", "申請期限：30日"],
      linkedStampIds: ["A必1", "D1", "C即5"],
      updatedAt: "2026-09-06T00:00:00.000Z",
    },
    {
      id: "reg-demo-2",
      title: "妻側・就業規則抜粋",
      side: "妻側",
      text: "住宅手当は配偶者ありで加算。式なしでも対象。",
      checklist: ["住宅手当：配偶者加算あり"],
      linkedStampIds: ["D4"],
      updatedAt: "2026-09-06T00:00:00.000Z",
    },
  ],
  contentOverrides: {
    A必1: { why: "（編集済み）両社の規程コピーが一次情報。" },
  },
  customStamps: [],
  customStampSquares: {},
  hiddenStampIds: [],
  homeOverrides: {
    headline: "続けた分だけ、損が減る。",
    kicker: "今日の一手 · 華やかv6",
  },
  wishlist: [
    { id: "wish-1", title: "規程PDFを両方そろえる", note: "紙でもOK", status: "doing" },
  ],
  pin: "",
};

await page.goto("http://127.0.0.1:4173/#/", { waitUntil: "networkidle" });
await page.evaluate(
  ({ progress, editorState }) => {
    localStorage.setItem("marriage-guide-hiroshima-v2", JSON.stringify(progress));
    localStorage.setItem("marriage-guide-hiroshima-editor-v1", JSON.stringify(editorState));
  },
  { progress: seed, editorState: editor },
);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1100);
await page.waitForSelector(".today-hero");
await page.waitForSelector(".gold-particles");
await page.screenshot({ path: `${out}/v6-home-3d.png`, fullPage: false });

await page.goto("http://127.0.0.1:4173/#/edit", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.waitForSelector(".edit-page");
// stamps tab for editor overview
await page.getByRole("tab", { name: "スタンプ" }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/v6-editor.png`, fullPage: false });

await page.getByRole("tab", { name: "規程" }).click();
await page.waitForTimeout(400);
await page.waitForSelector(".reg-card");
await page.screenshot({ path: `${out}/v6-regs.png`, fullPage: false });

console.log("screenshots ok");
await browser.close();
