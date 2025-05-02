// src/parsers/indeed.js
const { chromium } = require("playwright");

async function parseIndeedJobs(keywords = []) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    /* ... */
  });
  const allJobs = [];

  for (const kw of keywords) {
    const url = `https://de.indeed.com/jobs?q=${encodeURIComponent(
      kw
    )}&limit=10`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector(".jobsearch-SerpJobCard");

    const jobs = await page.$$eval(".jobsearch-SerpJobCard", (cards) =>
      cards.map((card) => ({
        title: card.querySelector(".title a")?.innerText.trim() || "",
        company: card.querySelector(".company")?.innerText.trim() || "",
        location: card.querySelector(".location")?.innerText.trim() || "",
        url:
          "https://de.indeed.com" +
          (card.querySelector(".title a")?.getAttribute("href") || ""),
      }))
    );

    allJobs.push(...jobs);
  }

  await browser.close();
  return allJobs;
}

module.exports = { parseIndeedJobs };
