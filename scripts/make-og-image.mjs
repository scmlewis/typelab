import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});

await page.setContent(`
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 1200px;
      height: 630px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 72px;
      background: #f4efe4;
      color: #1f2421;
      font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
    }
    .eyebrow, .foot {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 20px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #6b6f68;
    }
    h1 { margin: 0; font-size: 140px; line-height: 0.92; letter-spacing: -0.04em; }
    h1 span { color: #a8451f; }
    p { margin: 28px 0 0; max-width: 780px; font-size: 38px; line-height: 1.25; }
    .rule { width: 120px; height: 6px; background: #a8451f; margin-bottom: 28px; }
  </style>
  <div>
    <div class="rule"></div>
    <div class="eyebrow">Local-first typing laboratory</div>
    <h1>TypeLab<span>.</span></h1>
    <p>Measure speed, accuracy, and consistency without an account.</p>
  </div>
  <div class="foot">typelab-b1o.pages.dev</div>
`);

await page.screenshot({ path: 'public/og.png' });
await browser.close();
