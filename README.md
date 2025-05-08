# 📄 JobAgent - Dein Bewerbungshelfer

JobAgent ist eine Webanwendung, die den Bewerbungsprozess vereinfacht. Mit Funktionen wie der Erstellung von Bewerbungsschreiben, Lebensläufen und der Jobsuche bietet JobAgent eine zentrale Plattform, um Bewerbungen effizient zu verwalten.

---

## ✨ Features

### 1. **Persönliche Daten**

- Eingabe von Name, Geburtsdatum, Adresse, Telefonnummer, E-Mail und LinkedIn-Profil.
- Unterstützung für Sprachen, Berufserfahrung, Schulbildung und Praktika.

### 2. **Job & Arbeitgeber**

- Eingabe von Jobdetails wie Stellenbezeichnung, Unternehmen und Stellenbeschreibung.

### 3. **KI-Agent**

- Automatische Generierung von Bewerbungsschreiben basierend auf den eingegebenen Daten.
- Funktionen:
  - **Neu generieren**
  - **Kürzen/Verlängern**
  - **Bearbeiten**
  - **Exportieren als PDF**

### 4. **Jobsuche**

- Suche nach Stellenangeboten über verschiedene Quellen (z. B. StepStone).
- Filterung nach Postleitzahl und Umkreis.

### 5. **HTML-Lebenslauf**

- Automatische Erstellung eines Lebenslaufs basierend auf den eingegebenen Daten.
- Möglichkeit, ein Profilfoto hochzuladen.

---

## 🛠️ Technologien

### **Frontend**

- **HTML/CSS**: Bootstrap für das Layout.
- **JavaScript**: Dynamische Funktionen mit Unterstützung von Bibliotheken wie Quill, SortableJS und html2pdf.js.

### **Backend**

- **Node.js/Express**: API-Endpunkte für die Generierung von Bewerbungsschreiben und Lebensläufen.
- **Multer**: Verarbeitung von Datei-Uploads (z. B. Profilfotos).
- **Handlebars**: Template-Engine für die Lebenslauf-Generierung.
- **OpenAI API**: KI-gestützte Textgenerierung.

---

## 📂 Projektstruktur

```plaintext
JobAgent/
├── /public/         # Statische Dateien wie CSS, JavaScript und Bilder
├── /views/          # Handlebars-Templates für die HTML-Generierung
├── /routes/         # API-Endpunkte und Routen-Handler
├── /controllers/    # Logik für die Verarbeitung von Anfragen
├── /models/         # Datenmodelle für die Speicherung und Verarbeitung
└── /utils/          # Hilfsfunktionen und wiederverwendbare Module
```

---

## 🚀 Installation

### Voraussetzungen

- Node.js (Version 16 oder höher)
- npm (Node Package Manager)

### Schritte

1. Repository klonen:

```bash
git clone https://github.com/username/JobAgent.git
cd JobAgent
```

2. Abhängigkeiten installieren:

```bash
npm install
```

3. Umgebungsvariablen konfigurieren:

Erstelle eine `.env`-Datei im Hauptverzeichnis und füge folgende Variablen hinzu:

```plaintext
OPENAI_API_KEY=dein_openai_api_key
PORT=3000
```

4. Server starten:

```bash
npm start
```

Der Server läuft standardmäßig unter [http://localhost:3000](http://localhost:3000).

---

## 📖 Nutzung

- **Persönliche Daten eingeben**: Navigiere zur Startseite und fülle die erforderlichen Felder aus oder Lade einen bereits bestehenden PDF Lebenslauf hoch um die Felder nach Möglichkeit automatisch befüllen zu lassen.
- **Bewerbungsschreiben generieren**: Nutze den KI-Agenten, um ein individuelles Bewerbungsschreiben zu erstellen.
- **Lebenslauf exportieren**: Lade deinen Lebenslauf als PDF herunter oder bearbeite ihn direkt im Browser.
- **Jobsuche starten**: Suche nach passenden Stellenangeboten und filtere die Ergebnisse nach deinen Präferenzen.

---

## 🧪 Tests

- Unit-Tests ausführen:

```bash
npm test
```

- Testabdeckung anzeigen: _(Hier kannst du später noch ergänzen, falls du ein Coverage-Tool wie Jest Coverage verwendest.)_

---

## 📜 Lizenz

Dieses Projekt steht unter der MIT-Lizenz.
