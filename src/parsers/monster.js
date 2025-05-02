// src/parsers/monster.js
const { chromium } = require("playwright");

async function parseMonsterJobs(keywords = []) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (...)",
  });

  const allJobs = [];

  for (const kw of keywords) {
    const url = `https://www.monster.de/jobs/suche/?q=${encodeURIComponent(
      kw
    )}&limit=25`;
    await page.goto(url, { waitUntil: "networkidle" });
    // Monster-Jobcards
    await page.waitForSelector(".summary");

    const jobs = await page.$$eval(".summary", (cards) =>
      cards.slice(0, 10).map((card) => {
        const linkEl = card.querySelector("h2.title a");
        return {
          title: linkEl?.innerText.trim() || "",
          company: card.querySelector(".company span")?.innerText.trim() || "",
          location:
            card.querySelector(".location span")?.innerText.trim() || "",
          url: linkEl?.href || "",
        };
      })
    );

    allJobs.push(...jobs);
  }

  await browser.close();
  return allJobs;
}

module.exports = { parseMonsterJobs };
