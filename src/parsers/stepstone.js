// src/parsers/stepstone.js
const { chromium } = require("playwright");

/**
 * StepStone Job Parser – Dynamische React-Liste über DOM-Selektoren
 * - Wartet bis Network Idle
 * - Extrahiert Job-Daten aus `article[data-at="job-item"]`
 * - Gibt jeden Job mit dem zugehörigen Keyword zurück
 */
async function parseStepstoneJobs(keywords = []) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "de-DE",
    extraHTTPHeaders: { "Accept-Language": "de-DE,de;q=0.9" },
  });

  // Timeout erhöhen und unnötige Assets blockieren
  page.setDefaultNavigationTimeout(60000);
  await page.route(/\.(png|jpe?g|svg|woff2?|woff|ttf|otf)$/, (r) => r.abort());
  await page.route(/.*(collect|analytics|pixel|tracking).*/, (r) => r.abort());

  const allJobs = [];

  for (const kw of keywords) {
    console.log(`🔎 Suche StepStone für: ${kw}`);
    const url = `https://www.stepstone.de/jobs/suche?ke=${encodeURIComponent(
      kw
    )}`;

    // Seite laden bis Network Idle
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    // Auf Job-Items warten
    await page.waitForSelector('article[data-at="job-item"]', {
      timeout: 20000,
    });

    // Rohdaten auslesen
    const jobsOnPage = await page.$$eval(
      'article[data-at="job-item"]',
      (cards) =>
        cards.slice(0, 10).map((card) => {
          const titleEl = card.querySelector('a[data-at="job-item-title"]');
          const companyLogoImg = card.querySelector(
            'a[data-at="company-logo"] img'
          );
          const locationEl = card.querySelector(
            '[data-genesis-element="BASE"] .res-nehv70'
          );
          return {
            title: titleEl?.innerText.trim() || "",
            company: companyLogoImg?.alt.trim() || "",
            location: locationEl?.innerText.trim() || "",
            url: titleEl?.href || "",
          };
        })
    );

    // Keyword hinzufügen
    const jobs = jobsOnPage.map((job) => ({ ...job, keyword: kw }));
    console.log(`✅ ${jobs.length} Jobs gefunden für “${kw}”`);
    allJobs.push(...jobs);
  }

  await browser.close();
  return allJobs;
}

module.exports = { parseStepstoneJobs };
