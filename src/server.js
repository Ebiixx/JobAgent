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
    const filePath = req.file.path;
  
    try {
      const fileData = fs.readFileSync(filePath);
      const pdfData = await pdfParse(fileData);
      const extractedText = pdfData.text;
  
      const aiPrompt = `
  Extrahiere aus diesem Lebenslauf strukturiert folgende Informationen:
  - Name
  - Geburtsdatum
  - Adresse
  - Berufserfahrungen (in Stichpunkten oder kurzen Absätzen)
  Hier ist der Text:
  
  """${extractedText}"""
  `;
  
      const aiResponse = await askOpenAI([
        { role: 'system', content: 'Du bist ein hilfreicher CV-Parser.' },
        { role: 'user', content: aiPrompt }
      ]);
  
      const answer = aiResponse.choices[0].message.content;
      res.json({ extracted: answer });
    } catch (err) {
      console.error('Fehler beim Verarbeiten des PDFs:', err);
      res.status(500).json({ error: 'PDF konnte nicht verarbeitet werden.' });
    } finally {
      // Datei löschen (tmp)
      fs.unlink(filePath, () => {});
    }
  });
  

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
