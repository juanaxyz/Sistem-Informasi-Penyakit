import { chromium } from "playwright";

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const logs = [];
page.on("console", (m) => logs.push(m.text()));
page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message));

await page.goto("http://localhost:5173/checks", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

const results = await page.evaluate(() =>
  Array.from(document.querySelectorAll("ul li")).map((li) => li.textContent),
);
console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL"));
console.log(`\n${results.length} checks, ${failed.length} gagal`);
console.log("CONSOLE (non-HMR):", logs.filter((l) => !l.includes("[vite]")).join(" | ") || "none");
await browser.close();
process.exit(failed.length ? 1 : 0);
