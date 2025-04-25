// src/server.js
require('dotenv').config();
const express = require('express');
const { askOpenAI } = require('./api');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const axios = require('axios');

const { chromium } = require('playwright'); // NEU oben importieren

const app = express();
const PORT = 3000;

// Damit wir JSON empfangen können
app.use(express.json());

// Öffentliche Dateien bereitstellen
app.use(express.static(path.join(__dirname, '../public')));


async function fetchCompanyInfo(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const visitedUrls = new Set();
  const maxPages = 5;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    visitedUrls.add(url);

    // Alle internen Links extrahieren
    const links = await page.$$eval('a[href]', anchors => {
      return anchors
        .map(a => a.href)
        .filter(href =>
          href.startsWith(location.origin) && !href.includes('#')
        );
    });

    // Priorisierte Links (z. B. Impressum, Über uns, Karriere, etc.)
    const keywords = ['impressum', 'about', 'ueber', 'unternehmen', 'karriere', 'team', 'kontakt'];
    const prioritizedLinks = links.filter(link =>
      keywords.some(keyword => link.toLowerCase().includes(keyword))
    );

    // Auswahl + Startseite deduplizieren
    const targets = [...new Set([url, ...prioritizedLinks])].slice(0, maxPages);

    let fullText = '';

    for (const url of targets) {
      if (visitedUrls.has(url)) continue;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        const text = await page.evaluate(() => document.body.innerText);
        fullText += `\n\n--- TEXT VON ${url} ---\n` + text.trim().replace(/\s+/g, ' ');
        visitedUrls.add(url);
      } catch (err) {
        console.warn(`⚠️ Fehler beim Laden von ${url}:`, err.message);
      }
    }

    return fullText.slice(0, 12000); // Token-Begrenzung beachten
  } catch (err) {
    console.error('❌ Fehler beim Initialen Scraping:', err.message);
    return null;
  } finally {
    await browser.close();
  }
}


// Funktion zum Analysieren des Unternehmensinhalts mit OpenAI
async function analyzeCompanyContent(visibleText) {
    const prompt = `
        Du bist ein intelligenter Assistent, der Informationen aus Texten extrahiert. 
        Bitte analysiere den folgenden Text einer Unternehmenswebseite und extrahiere:
        - Unternehmensname
        - Unternehmensbeschreibung
        - Unternehmensstandort
        - Tätigkeitsbereich oder Branche
        - Größe oder andere relevante Infos

        Text:
        """${visibleText}"""
    `;

    try {
        const aiResponse = await askOpenAI([
            { role: 'system', content: 'Du bist ein intelligenter Assistent, der Webseiteninhalte analysiert.' },
            { role: 'user', content: prompt }
        ]);

        const extractedInfo = aiResponse.choices[0].message.content.trim();
        console.log('🏷️ Extrahierte Unternehmensinformationen:', extractedInfo);
        return extractedInfo;
    } catch (error) {
        console.error('Fehler bei der Analyse des Inhalts mit OpenAI:', error);
        return null;
    }
}


// POST-Route für das Hochladen und Verarbeiten von PDFs
app.post('/api/upload-cv', upload.single('cv'), async (req, res) => {
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
                "experience": [
                {
                    "tätigkeit": "",
                    "zeitraum": "",
                    "einrichtung": ""
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
                    "zeitraum": "",
                    "unternehmen": ""
                }
                ]
            }
            
            Hier ist der Lebenslauftext:
            """${extractedText}"""
        `;

        const aiResponse = await askOpenAI([
            { role: 'system', content: 'Du bist ein hilfreicher CV-Parser.' },
            { role: 'user', content: aiPrompt }
        ]);

        let openaiContent = aiResponse.choices[0].message.content.trim();

        // Falls OpenAI mit Markdown-Block (```json) antwortet, diesen entfernen
        if (openaiContent.startsWith("```")) {
            openaiContent = openaiContent.replace(/```json|```/g, '').trim();
        }

        console.log("✅ Aufbereiteter JSON-Text:", openaiContent);

        // Versuchen, das in echtes JSON zu parsen
        let jsonData;
        try {
            jsonData = JSON.parse(openaiContent);
        } catch (parseError) {
            console.error("❌ Fehler beim Parsen von OpenAI-Text zu JSON:", parseError);
            return res.status(500).json({ error: "OpenAI Antwort war kein gültiges JSON." });
        }

        // Jetzt korrekt echtes JSON senden
        res.json({ extracted: jsonData });

        // Temporäre Datei löschen
        setTimeout(() => {
            fs.unlink(filePath, (err) => {
                if (err) console.error('Fehler beim Löschen der Datei:', err);
                else console.log('🗑️ Temporäre Datei gelöscht.');
            });
        }, 500);

    } catch (err) {
        console.error('Fehler beim Verarbeiten des PDFs:', err);
        res.status(500).json({ error: 'PDF konnte nicht verarbeitet werden.' });
    }
});

// POST-Route für die Verarbeitung der Unternehmens-URL und das Erstellen des Bewerbungsschreibens
app.post('/api/generate-cover-letter', async (req, res) => {
    const { companyUrl, name, birthdate, address, jobTitle, company, jobDescription } = req.body;

    if (!companyUrl || !name || !birthdate || !address || !jobTitle || !company || !jobDescription) {
        return res.status(400).json({ error: 'Alle Formularfelder müssen ausgefüllt werden.' });
    }

    try {
        // 1. Abrufen des HTML-Inhalts der Unternehmensseite
        const companyHtmlContent = await fetchCompanyInfo(companyUrl);
        if (!companyHtmlContent) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Unternehmensseite.' });
        }

        // 2. Analyse des Unternehmensinhalts mit OpenAI
        const companyInfo = await analyzeCompanyContent(companyHtmlContent);
        if (!companyInfo) {
            return res.status(500).json({ error: 'Fehler beim Extrahieren der Unternehmensinformationen.' });
        }

        // 3. Bewerbungsschreiben erstellen
        const prompt = `
            Ich bin ${name}, geboren am ${birthdate}, wohnhaft in ${address}.
            Ich bewerbe mich als ${jobTitle} bei ${company}.
            Die Stellenbeschreibung lautet: ${jobDescription}.
            Unternehmensseite: ${companyUrl}.

            Unternehmensinformationen:
            ${companyInfo}

            Bitte formuliere ein Bewerbungsschreiben für mich.
        `;

        const aiResponse = await askOpenAI([
            { role: 'system', content: 'Du bist ein hilfreicher Assistent, der Bewerbungsschreiben erstellt.' },
            { role: 'user', content: prompt }
        ]);

        const generatedCoverLetter = aiResponse.choices[0].message.content;
        res.json({ coverLetter: generatedCoverLetter });

    } catch (error) {
        console.error('Fehler bei der Generierung des Bewerbungsschreibens:', error);
        res.status(500).json({ error: 'Fehler bei der Generierung des Bewerbungsschreibens.' });
    }
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
