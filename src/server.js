// src/server.js
require('dotenv').config();
const express = require('express');
const { askOpenAI } = require('./api');
const path = require('path');

const multer = require('multer');
const pdfParse = require('pdf-parse');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');


const app = express();
const PORT = 3000;


// Damit wir JSON empfangen können
app.use(express.json());

// Öffentliche Dateien bereitstellen
app.use(express.static(path.join(__dirname, '../public')));

// API-Route
app.post('/api/chat', async (req, res) => {
  const userInput = req.body.message;

  try {
    const aiResponse = await askOpenAI([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: userInput }
    ]);

    res.json({
      reply: aiResponse.choices[0].message.content,
      usage: aiResponse.usage
    });
  } catch (error) {
    console.error('Error contacting OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'OpenAI API Error' });
  }
});

// Upload + PDF-Inhalt analysieren
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
        ]
      }
      
      Hier ist der Lebenslauftext:
      """${extractedText}"""
      `;
      
  
      const aiResponse = await askOpenAI([
        { role: 'system', content: 'Du bist ein hilfreicher CV-Parser.' },
        { role: 'user', content: aiPrompt }
      ]);
  
      console.log("🤖 Antwort von OpenAI:", aiResponse.choices[0].message.content);
  
      // SCHRITT 1: Antwort sofort schicken
      // 1. OpenAI Antwort holen
        let openaiContent = aiResponse.choices[0].message.content.trim();

        // 2. Falls OpenAI mit Markdown-Block (```json) antwortet, diesen entfernen
        if (openaiContent.startsWith("```")) {
            openaiContent = openaiContent.replace(/```json|```/g, '').trim();
        }

        console.log("✅ Aufbereiteter JSON-Text:", openaiContent);

        // 3. Versuchen, das in echtes JSON zu parsen
        let jsonData;
        try {
            jsonData = JSON.parse(openaiContent);
        } catch (parseError) {
            console.error("❌ Fehler beim Parsen von OpenAI-Text zu JSON:", parseError);
            return res.status(500).json({ error: "OpenAI Antwort war kein gültiges JSON." });
        }

        // 4. Jetzt korrekt echtes JSON senden
        res.json({ extracted: jsonData });

  
      // SCHRITT 2: Danach (!) sauber im Hintergrund löschen
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
  
  
  

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
