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

- Suche nach Stellenangeboten über verschiedene Quellen anhand der bereitgestellten Informationen und Erfahrungen im Lebenslauf.
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
- **OpenAI API / Azure OpenAI**: KI-gestützte Textgenerierung.
- **Web Crawler**: Automatisches Sammeln von Stellenangeboten aus unterstützten Plattformen.

---

## 📂 Projektstruktur

```plaintext
JobAgent/
├── /public/ # Statische Dateien wie CSS, JavaScript und Bilder
├── /views/ # Handlebars-Templates für die HTML-Generierung
├── /routes/ # API-Endpunkte und Routen-Handler
├── /controllers/ # Logik für die Verarbeitung von Anfragen
├── /models/ # Datenmodelle für die Speicherung und Verarbeitung
└── /utils/ # Hilfsfunktionen und wiederverwendbare Module
```

---

## 🚀 Installation

### Voraussetzungen

- Node.js (Version 16 oder höher)
- npm (Node Package Manager)

### Schritte

1. Repository klonen:

```bash
git clone https://github.com/Ebiixx/JobAgent.git
cd JobAgent
```

2. Abhängigkeiten installieren:

```bash
npm install
```

3. Umgebungsvariablen konfigurieren:

Erstelle eine `.env`-Datei im Hauptverzeichnis und füge folgende Variablen hinzu:

```plaintext
GLOBAL_LLM_SERVICE="AzureOpenAI"
AZURE_OPENAI_CHAT_DEPLOYMENT_NAME="dein_chat_deployment_name"
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME="dein_embedding_deployment_name"
AZURE_OPENAI_ENDPOINT="https://dein-endpunkt.openai.azure.com/"
AZURE_OPENAI_API_KEY="dein_openai_api_key"
```

> Hinweis: Passe die Werte entsprechend deiner Azure OpenAI-Konfiguration an.

4. Server starten:

```bash
npm start
```

Der Server läuft standardmäßig unter [http://localhost:3000](http://localhost:3000).

---

## 📖 Nutzung

- **Persönliche Daten eingeben**: Navigiere zur Startseite und fülle die erforderlichen Felder aus oder lade einen bestehenden PDF-Lebenslauf hoch, um die Felder nach Möglichkeit automatisch ausfüllen zu lassen.  
  ![Tab 1 – Persönliche Daten](./Screenshots/Tab%201.png)

- **Job & Arbeitgeber angeben**: Gib den Titel der Stelle, den Unternehmensnamen und die Stellenbeschreibung ein.  
  ![Tab 2 – Job & Arbeitgeber](./Screenshots/Tab%202.png)

- **Bewerbungsschreiben generieren**: Nutze den KI-Agenten, um ein individuelles Bewerbungsschreiben zu erstellen.  
  ![Tab 3 – KI-Agent](./Screenshots/Tab%203.png)

- **Jobsuche starten**: Suche nach passenden Stellenangeboten und filtere die Ergebnisse nach deinen Präferenzen.  
  ![Tab 4 – Jobsuche](./Screenshots/Tab%204.png)

- **Lebenslauf exportieren**: Lade deinen Lebenslauf als PDF herunter oder bearbeite ihn direkt im Browser.

---

## 📜 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe die LICENSE Datei für mehr Informationen.
