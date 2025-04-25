const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.cloudflight.io', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const url = page.url();
    console.log("✅ Weitergeleitet auf:", url);

    const text = await page.evaluate(() => document.body.innerText);
    console.log("📄 Textlänge:", text.length);
    console.log("🧾 Vorschau:", text.slice(0, 500));
  } catch (err) {
    console.error("❌ Fehler beim Zugriff auf cloudflight.io:", err.message);
  } finally {
    await browser.close();
  }
})();
