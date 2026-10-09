import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

// Run from any directory with: node scripts/generate-dao-social-image.mjs
// The card stays static so sharing adds no image renderer to the Worker.
const root = new URL("../", import.meta.url);
const [regular, bold, favicon] = await Promise.all([
  readFile(new URL("public/fonts/Aeonik-Regular.woff2", root)),
  readFile(new URL("public/fonts/Aeonik-Bold.woff2", root)),
  readFile(new URL("public/favicons/favicon.svg", root), "utf8"),
]);
const mark = favicon.match(/<path[^>]+\/>/)[0];
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: Aeonik; src: url(data:font/woff2;base64,${regular.toString("base64")}); font-weight: 400; }
    @font-face { font-family: Aeonik; src: url(data:font/woff2;base64,${bold.toString("base64")}); font-weight: 700; }
    * { box-sizing: border-box; }
    body { margin: 0; width: 1200px; height: 630px; background: #0657f9; color: #fff; font-family: Aeonik, sans-serif; text-align: center; -webkit-font-smoothing: antialiased; }
    svg { position: absolute; top: 127px; left: 488px; width: 224px; height: 224px; }
    h1 { position: absolute; top: 359px; width: 100%; margin: 0; font-size: 48px; line-height: 1.2; font-weight: 700; }
    p { position: absolute; top: 436px; width: 100%; margin: 0; font-size: 30px; line-height: 1.2; }
  </style></head><body>
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-label="Yearn">${mark}</svg>
    <h1>Yearn DAO</h1><p>Propose. Discuss. Vote.</p>
  </body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: fileURLToPath(new URL("public/og-DAO.png", root)) });
} finally {
  await browser.close();
}
