// src/server.js
require("dotenv").config();
const express = require("express");
const { askOpenAI } = require("./api");
const path = require("path");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const upload = multer({ dest: "uploads/" });
const fs = require("fs");
const axios = require("axios");

const { chromium } = require("playwright");
const geolib = require("geolib");
const bodyParser = require("body-parser");

const Handlebars = require("handlebars");

const app = express();
const PORT = 3000;

// Damit wir JSON empfangen können
app.use(express.json());

// Öffentliche Dateien bereitstellen
app.use(express.static(path.join(__dirname, "../public")));

async function fetchCompanyInfo(url) {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "de-DE", // Sprache auf Deutsch setzen
    extraHTTPHeaders: {
      "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    },
  });

  const page = await context.newPage();
  const visitedUrls = new Set();
  const maxPages = 5;

  try {
    console.log("📡 Scraping gestartet für:", url);
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    const landingUrl = page.url();

    if (!landingUrl.includes("/de/")) {
      const deutschUrl = landingUrl.replace("/en/", "/de/");
      console.log("🔁 Leite manuell auf die deutsche Version um:", deutschUrl);
      await page.goto(deutschUrl, { waitUntil: "networkidle", timeout: 15000 });
    }

    const currentOrigin = new URL(landingUrl).origin;

    const links = await page.$$eval(
      "a[href]",
      (anchors, origin) => {
        return anchors
          .map((a) => a.href)
          .filter((href) => href.startsWith(origin) && !href.includes("#"));
      },
      currentOrigin
    );

    const keywords = [
      "impressum",
      "about",
      "ueber",
      "unternehmen",
      "karriere",
      "team",
      "kontakt", // deutsch
      "company",
      "careers",
      "contact",
      "team",
      "imprint",
      "legal",
      "privacy", // englisch
    ];

    const prioritizedLinks = links.filter((link) =>
      keywords.some((keyword) => link.toLowerCase().includes(keyword))
    );

    const targets = [...new Set([landingUrl, ...prioritizedLinks])].slice(
      0,
      maxPages
    );
    console.log("🔗 Ziel-URLs:", targets);

    let fullText = "";
    let impressumText = "";
    let contactText = "";
    let otherText = "";

    for (const targetUrl of targets) {
      if (visitedUrls.has(targetUrl)) continue;
      try {
        await page.goto(targetUrl, {
          waitUntil: "networkidle",
          timeout: 15000,
        });
        await page.waitForTimeout(2000);

        await page.evaluate(() => {
          const cookie = document.querySelector(
            '[id*="cookie"], .cookie-banner, .cc-window'
          );
          if (cookie) cookie.remove();
        });

        const text = await page.evaluate(() => document.body.innerText);
        const cleanedText = text.trim().replace(/\s+/g, " ");

        if (targetUrl.toLowerCase().includes("impressum")) {
          impressumText += `\n\n--- IMPRESSUM ---\n${cleanedText}`;
        } else if (
          targetUrl.toLowerCase().includes("contact") ||
          targetUrl.toLowerCase().includes("kontakt")
        ) {
          contactText += `\n\n--- KONTAKT ---\n${cleanedText}`;
        } else {
          otherText += `\n\n--- SEITE: ${targetUrl} ---\n${cleanedText}`;
        }

        visitedUrls.add(targetUrl);
      } catch (err) {
        console.warn(`⚠️ Fehler beim Laden von ${targetUrl}:`, err.message);
      }
    }

    // Gib alles zusammen zurück (Impressum & Kontakt zuerst!)
    return (impressumText + contactText + otherText).slice(0, 50000);
  } catch (err) {
    console.error("❌ Fehler beim Scrapen:", err.message);
    return null;
  } finally {
    await browser.close();
  }
}

// Funktion zum Analysieren des Unternehmensinhalts mit OpenAI
async function analyzeCompanyContent(visibleText) {
  const prompt = `
Du bist ein Experte für Unternehmensanalyse.

Hier sind verschiedene Abschnitte der Unternehmenswebseite. 
Achtung: Der Bereich "IMPRESSUM" enthält die offizielle Adresse.

Extrahiere bitte nur:

- **Unternehmensname**
- **Unternehmensbeschreibung**
- **Hauptsitz (Adresse)**: Nur die Adresse aus dem "IMPRESSUM"-Abschnitt verwenden!
- **Tätigkeitsbereich oder Branche**
- **Unternehmensgröße oder weitere relevante Infos**

Hier ist der Text:

"""${visibleText}"""

Gib die Antwort bitte klar strukturiert und vollständig zurück.
`;

  try {
    const aiResponse = await askOpenAI([
      {
        role: "system",
        content:
          "Du bist ein hilfreicher Assistent für die Extraktion von Unternehmensdaten.",
      },
      { role: "user", content: prompt },
    ]);

    const extractedInfo = aiResponse.choices[0].message.content.trim();
    console.log("🏷️ Extrahierte Unternehmensinformationen:", extractedInfo);
    return extractedInfo;
  } catch (error) {
    console.error("Fehler bei der Analyse des Inhalts mit OpenAI:", error);
    return null;
  }
}

// POST-Route für das Hochladen und Verarbeiten von PDFs
app.post("/api/upload-cv", upload.single("cv"), async (req, res) => {
  console.log("📥 PDF empfangen!");
  const filePath = req.file.path;

  try {
    const fileData = fs.readFileSync(filePath);
    const pdfData = await pdfParse(fileData);
    const extractedText = pdfData.text;

    const aiPrompt = `
      Extrahiere aus diesem Lebenslauf folgende Informationen und gib die Antwort bitte **nur als JSON-Objekt** zurück:

      {
        "name": "",
        "birthdate": "",
        "address": "",
        "phone": "",
        "email": "",
        "linkedin": "",
        "experience": [
          {
            "tätigkeit": "",
            "einrichtung": "",
            "zeitraum": ""
          }
        ],
        "education": [
          {
            "abschluss": "",
            "schulname": "",
            "zeitraum": ""
          }
        ],
        "internships": [
          {
            "praktikum": "",
            "unternehmen": "",
            "zeitraum": ""
          }
        ],
        "languages": [
          {
            "sprache": "",
            "kenntnisse": ""
          }
        ]
      }

      Hier ist der Lebenslauftext:
      """${extractedText}"""
      `;

    const aiResponse = await askOpenAI([
      { role: "system", content: "Du bist ein hilfreicher CV-Parser." },
      { role: "user", content: aiPrompt },
    ]);

    let openaiContent = aiResponse.choices[0].message.content.trim();

    // Falls OpenAI mit Markdown-Block (```json) antwortet, diesen entfernen
    if (openaiContent.startsWith("```")) {
      openaiContent = openaiContent.replace(/```json|```/g, "").trim();
    }

    console.log("✅ Aufbereiteter JSON-Text:", openaiContent);

    // Versuchen, das in echtes JSON zu parsen
    let jsonData;
    try {
      jsonData = JSON.parse(openaiContent);
    } catch (parseError) {
      console.error(
        "❌ Fehler beim Parsen von OpenAI-Text zu JSON:",
        parseError
      );
      return res
        .status(500)
        .json({ error: "OpenAI Antwort war kein gültiges JSON." });
    }

    // Jetzt korrekt echtes JSON senden
    res.json({ extracted: jsonData });

    // Temporäre Datei löschen
    setTimeout(() => {
      fs.unlink(filePath, (err) => {
        if (err) console.error("Fehler beim Löschen der Datei:", err);
        else console.log("🗑️ Temporäre Datei gelöscht.");
      });
    }, 500);
  } catch (err) {
    console.error("Fehler beim Verarbeiten des PDFs:", err);
    res.status(500).json({ error: "PDF konnte nicht verarbeitet werden." });
  }
});

// POST-Route für die Verarbeitung der Unternehmens-URL und das Erstellen des Bewerbungsschreibens
app.post("/api/generate-cover-letter", async (req, res) => {
  const {
    companyUrl,
    name,
    birthdate,
    address,
    phone,
    email,
    linkedin,
    jobTitle,
    company,
    jobDescription,
    experienceData,
    educationData,
    internshipData,
    overrideWordCount,
  } = req.body;

  if (
    !companyUrl ||
    !name ||
    !birthdate ||
    !address ||
    !jobTitle ||
    !company ||
    !jobDescription
  ) {
    return res
      .status(400)
      .json({ error: "Alle Formularfelder müssen ausgefüllt werden." });
  }

  try {
    const today = new Date().toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    // 1. Abrufen des HTML-Inhalts der Unternehmensseite
    const companyHtmlContent = await fetchCompanyInfo(companyUrl);
    if (!companyHtmlContent) {
      return res
        .status(500)
        .json({ error: "Fehler beim Abrufen der Unternehmensseite." });
    }

    // 2. Analyse des Unternehmensinhalts mit OpenAI
    const companyInfo = await analyzeCompanyContent(companyHtmlContent);
    if (!companyInfo) {
      return res.status(500).json({
        error: "Fehler beim Extrahieren der Unternehmensinformationen.",
      });
    }

    const targetWords = overrideWordCount || 450; // Fallback

    // 3. Bewerbungsschreiben erstellen
    const prompt = `
        Act like a professional Bewerbungsschreiben-Coach und Texter für Karriereunterlagen. Du hilfst seit 20 Jahren Bewerber:innen in Deutschland, herausragende, individuelle und auf die jeweilige Stelle zugeschnittene Anschreiben zu verfassen – mit einem Fokus auf Authentizität, Motivation und klarer Argumentationsstruktur.
        
        Dein Ziel ist es, ein vollständiges, detailreiches, professionelles und auf die ausgeschriebene Stelle maßgeschneidertes Bewerbungsschreiben zu erstellen, das Persönlichkeit, Motivation und relevante Qualifikationen in einem überzeugenden Text miteinander verbindet.

        Nutze hierfür **genau ${targetWords} Wörter**.
        
        ### 🧾 Persönliche Angaben:
        - Name: ${name}
        - Geburtsdatum: ${birthdate}
        - Adresse: ${address}
        - Telefonnummer: ${phone}
        - E-Mail: ${email}
        ${linkedin ? `- LinkedIn-Profil: ${linkedin}` : ""}
        
        ### 💼 Stelleninformationen:
        - Position: ${jobTitle}
        - Unternehmen: ${company}
        - Stellenbeschreibung:
        ${jobDescription}
        - Unternehmenswebsite: ${companyUrl}
        
        ### 📚 Ausbildung:
        ${educationData
          .map(
            (edu) =>
              `- ${edu.abschluss} an der ${edu.schulname} (${edu.zeitraum})`
          )
          .join("\n")}
        
        ### 🧪 Praktika:
        ${internshipData
          .map(
            (intern) =>
              `- ${intern.praktikum} bei ${intern.unternehmen} (${intern.zeitraum})`
          )
          .join("\n")}
        
        ### 👨‍💼 Berufserfahrung:
        ${experienceData
          .map(
            (exp) =>
              `- ${exp.tätigkeit} bei ${exp.einrichtung} (${exp.zeitraum})`
          )
          .join("\n")}
        
        ### 🏢 Unternehmensinformationen:
        ${companyInfo}
        
        ---
        
        ### 📌 Regeln für das Anschreiben:
        1. Keine Markdown-Formatierungen (keine **Fettdruck**, *Kursiv*, # Überschriften).
        2. Keine Emojis oder Sonderzeichen.
        3. Klare, zusammenhängende Fließtextstruktur mit Absätzen.
        4. Stellen, die individuell ergänzt werden müssen, werden durch **fette Hervorhebung** markiert (mit zwei Sternchen).
        
        ---
        
        ### ✨ Anweisungen für das Bewerbungsschreiben:
        - Verwende alle übermittelten Informationen zur Erstellung eines vollständigen Anschreibens mit **mindestens ${targetWords} Wörtern**.
        - Identifiziere passende Stärken, Fachkenntnisse und Soft Skills aus den angegebenen Erfahrungen, Praktika und Ausbildungen.
        - Beziehe dich konkret auf Inhalte der Stellenanzeige.
        - Der Schreibstil soll:
          - persönlich und motiviert sein
          - einen klaren roten Faden verfolgen
          - professionell, höflich und überzeugend wirken
        - Struktur des Anschreibens:
          1. Briefkopf (eigene Adresse, Datum: ${today}, Empfängeradresse)
          2. Betreffzeile: „Bewerbung als ${jobTitle}“
          3. Anrede: „Sehr geehrte Damen und Herren,“ oder Name, falls bekannt (**Anrede ggf. manuell anpassen**)
          4. Einleitung: Persönlicher Einstieg mit Interesse an der Stelle und Bezug zum Unternehmen
          5. Hauptteil:
             - Warum diese Stelle?
             - Welche Qualifikationen und Erfahrungen bringe ich mit?
             - Was motiviert mich?
             - Was kann ich beitragen?
          6. Schluss:
             - Gesprächsbereitschaft
             - Hinweis auf Anlagen (z.B. Lebenslauf)
             - Freundliche Grußformel
          7. Unterschrift (nur Name)
        
        ---
        
        Erstelle nun ein vollständiges Bewerbungsschreiben auf Basis aller vorliegenden Daten.
        
        Take a deep breath and work on this problem step-by-step.
        `;

    const aiResponse = await askOpenAI([
      {
        role: "system",
        content:
          "Du bist ein hilfreicher Assistent, der Bewerbungsschreiben erstellt.",
      },
      { role: "user", content: prompt },
    ]);

    if (
      !aiResponse ||
      !aiResponse.choices ||
      !aiResponse.choices[0]?.message?.content
    ) {
      console.error("❌ Ungültige OpenAI-Antwort:", aiResponse);
      return res
        .status(500)
        .json({ error: "Fehler bei der Antwort von OpenAI." });
    }

    const generatedCoverLetter = aiResponse.choices[0].message.content;

    res.json({ coverLetter: generatedCoverLetter });
  } catch (error) {
    console.error("❌ Interner Fehler:", error.message);
    console.error(error.stack); // komplette Fehlerspur anzeigen
    res.status(500).json({ error: `Interner Fehler: ${error.message}` });
  }
});

// POST-Route zum Kürzen/Verlängern bestehender Anschreiben
app.post("/api/edit-cover-letter", async (req, res) => {
  const { coverLetterHTML, action } = req.body;
  if (!coverLetterHTML || !action) {
    return res
      .status(400)
      .json({ error: "coverLetterHTML und action erforderlich." });
  }

  // 1) HTML → Plain-Text
  const plainText = coverLetterHTML
    .replace(/<\/p>/g, "\n\n")
    .replace(/<[^>]+>/g, "")
    .trim();

  // 2) Prompt-Instruktion anhand der Aktion
  let instruction;
  if (action === "shorten") {
    instruction =
      "Bitte kürze das folgende Anschreiben auf etwa ${300} Wörter, behalte roten Faden und professionellen Ton bei.";
  } else if (action === "extend") {
    instruction =
      "Bitte verlängere das folgende Anschreiben um ca. ${200 * count} Wörter, ergänze relevante Details und behalte den Stil bei.";
  } else {
    return res.status(400).json({ error: "Ungültige action." });
  }

  // 3) Zusätzliche Klartext-Anweisung, damit nur das Anschreiben zurückkommt
  const prompt = `
Du bist ein professioneller Bewerbungsschreiben-Coach.
${instruction}

Antworte **nur** mit dem bearbeiteten Anschreiben. Füge **keine** Erklärungen, Zusammenfassungen oder Code-Blöcke hinzu.

"""${plainText}"""
`;

  try {
    const aiResp = await askOpenAI([
      { role: "system", content: "Du bist ein Assistent für Textbearbeitung." },
      { role: "user", content: prompt },
    ]);
    let edited = aiResp.choices[0].message.content.trim();

    // 4) Eventuelle Markdown-Codefences entfernen
    edited = edited
      .replace(/^```(?:\w*\n)?/, "")
      .replace(/```$/, "")
      .trim();

    res.json({ coverLetter: edited });
  } catch (err) {
    console.error("Fehler beim Editieren:", err);
    res.status(500).json({ error: "OpenAI Edit-Fehler." });
  }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Hilfsfunktion: Antwort parsen und prüfen
async function parseJobsResponse(text) {
  try {
    // Erster Versuch: direktes Parsing
    return JSON.parse(text);
  } catch (err1) {
    console.warn(
      "⚠️ Direktes JSON-Parsing fehlgeschlagen. Versuche, reines Array zu extrahieren..."
    );
    const match = text.match(/\[\s*{[\s\S]*}\s*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err2) {
        console.error("❌ Repariertes Parsing ebenfalls fehlgeschlagen.", err2);
        return null;
      }
    }
    console.error("❌ Kein JSON-Array erkannt.");
    return null;
  }
}

// Funktion zum Anfragen bei OpenAI
async function fetchJobsAttempt(promptVersion) {
  const aiResponse = await askOpenAI([
    {
      role: "system",
      content: "Du bist ein sehr erfahrener Karriereberater und Job-Finder.",
    },
    { role: "user", content: promptVersion },
  ]);

  const text = aiResponse.choices[0].message.content.trim();
  const jobs = await parseJobsResponse(text);

  // Strukturvalidierung
  if (
    Array.isArray(jobs) &&
    jobs.every((job) => job.title && job.company && job.location && job.url)
  ) {
    return jobs;
  }
  console.error("❌ Strukturprüfung fehlgeschlagen.");
  return null;
}

// POST-Route für Jobsuche
// Ganz oben in src/server.js (nach den require-Statements):
const parserRegistry = {
  stepstone: require("./parsers/stepstone").parseStepstoneJobs,
  // … weitere Quellen hier
};

app.post("/api/search-jobs", async (req, res) => {
  // 0) Default-Werte
  const {
    experienceData = [],
    filters = {},
    geo = { lat: null, lon: null },
  } = req.body;
  const { sources = [], radiusKm = null } = filters;

  try {
    // 1) OpenAI-Prompt für Job-Keywords
    const systemPrompt = `
Du antwortest **ausschließlich** mit einem reinen JSON-Array aus exakt 5 Job-Titeln.
Keine Erklärungen oder sonstiger Text.`;
    const profilePrompt = `
Du bist ein Job-Matching-Experte. Analysiere dieses Profil und gib **nur** ein JSON-Array mit 5 Titeln zurück.

Profil:
${experienceData
  .map(
    (e, i) => `${i + 1}. ${e.tätigkeit} bei ${e.einrichtung} (${e.zeitraum})`
  )
  .join("\n")}
`.trim();

    const aiRes = await askOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: profilePrompt },
    ]);

    // 2) Roh-String säubern und JSON-parse
    let raw = aiRes.choices[0].message.content.trim();
    if (/^```/.test(raw)) {
      raw = raw
        .replace(/^```(?:json)?\r?\n/, "")
        .replace(/```$/, "")
        .trim();
    }
    let keywords;
    try {
      keywords = JSON.parse(raw);
    } catch {
      const m = raw.match(/\[\s*[\s\S]*\s*\]/);
      if (m) keywords = JSON.parse(m[0]);
      else throw new Error("Fehler beim Parsen der Job-Keywords");
    }
    console.log("✅ Parsed Keywords:", keywords);

    // 3) Quellen-Fallback
    const sourceKeys =
      sources.length > 0 ? sources : Object.keys(parserRegistry);

    // 4) Scraping pro Quelle mit Debug
    const jobsBySource = await Promise.all(
      sourceKeys.map(async (src) => {
        console.log(`🔍 Running parser for source="${src}"…`);
        const parser = parserRegistry[src];
        if (typeof parser !== "function") {
          console.warn(`⚠️ Kein Parser für "${src}" gefunden.`);
          return [];
        }
        try {
          const list = await parser(keywords);
          console.log(`✅ ${src} returned ${list.length} jobs`);
          return list.map((j) => ({ ...j, source: src }));
        } catch (err) {
          console.warn(`⚠️ Parser-Fehler bei "${src}":`, err.message);
          return [];
        }
      })
    );
    let allJobs = jobsBySource.flat();

    // 5) Umkreis-Filter (optional)
    if (radiusKm != null && geo.lat != null && geo.lon != null) {
      allJobs = allJobs.filter((job) => {
        if (job.lat == null || job.lon == null) return true;
        const dist = geolib.getDistance(
          { latitude: job.lat, longitude: job.lon },
          { latitude: geo.lat, longitude: geo.lon }
        );
        return dist <= radiusKm * 1000;
      });
    }

    // 6) Debug-Log & Antwort
    console.log(`/api/search-jobs: returning ${allJobs.length} jobs`);
    allJobs.forEach((job, i) =>
      console.log(
        `  [${i + 1}] ${job.title} @ ${job.company} (${job.location}) → ${
          job.url
        }`
      )
    );
    return res.json({ jobs: allJobs, keywords });
  } catch (err) {
    console.error("/api/search-jobs error:", err);
    return res
      .status(500)
      .json({ error: "Interner Fehler bei der Job-Suche." });
  }
});

// POST-Route: CV per Template rendern
app.post("/api/generate-cv", express.json(), async (req, res) => {
  const {
    name,
    birthdate,
    address,
    phone,
    email,
    linkedin,
    experience = [],
    education = [],
    internships = [],
    languages = [],
    photo = "",
  } = req.body;

  if (!name || !birthdate || !address) {
    return res
      .status(400)
      .json({ error: "Bitte Name, Geburtsdatum und Adresse angeben." });
  }

  try {
    const source = fs.readFileSync(
      path.join(__dirname, "../public/cv-template.html"),
      "utf8"
    );
    const template = Handlebars.compile(source);

    const htmlCv = template({
      name,
      birthdate,
      address,
      phone,
      email,
      linkedin,
      experience,
      education,
      internships,
      languages,
      photo,
    });

    res.json({ htmlCv });
  } catch (err) {
    console.error("Fehler beim Generieren des Lebenslaufs:", err);
    res
      .status(500)
      .json({ error: "Serverfehler beim Erstellen des Lebenslaufs." });
  }
});

// ⚡️ Für Foto-Uploads
const upload_photo = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, "../public/uploads")); // richtig in public/uploads speichern
    },
    filename: function (req, file, cb) {
      const uniqueName =
        Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname);
      cb(null, uniqueName);
    },
  }),
});

// Fotos hochladen
app.post("/api/upload-photo", upload_photo.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Kein Foto hochgeladen." });
  }

  const publicUrl = `/uploads/${req.file.filename}`; // ACHTUNG: nur /uploads/, nicht ../public!
  console.log(`📸 Foto gespeichert: ${publicUrl}`);
  res.json({ url: publicUrl });
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
