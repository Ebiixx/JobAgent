// cv.js
// Externe Datei für den interaktiven Lebenslauf

// Globale CV-Variablen (aus Tab1-Felder befüllt)
// name, birthdate, address, phone, email, linkedin
// experienceData, educationData, internshipData (Arrays)

const panelDepth = 300;
const panelCount = 5;
const maxScroll = (panelCount - 1) * panelDepth;
let cvContainer;

// cv.js
export function buildCV(
  container,
  personalHtml,
  educationHtml,
  experienceHtml,
  internshipsHtml
) {
  if (!container) {
    console.error("Container-Element nicht gefunden!");
    return;
  }

  container.innerHTML = "";

  const sections = [
    { title: "Persönliche Daten", content: personalHtml },
    { title: "Ausbildung", content: educationHtml },
    { title: "Berufserfahrung", content: experienceHtml },
    { title: "Praktika", content: internshipsHtml },
    { title: "Sprachen", content: renderLanguages() },
  ];

  sections.forEach((sec) => {
    const sectionEl = document.createElement("section");
    sectionEl.className = "cv-section"; // einfache Klasse, ohne 3D
    sectionEl.innerHTML = `<h2>${sec.title}</h2>${sec.content}`;
    container.appendChild(sectionEl);
  });
}

function renderLanguages() {
  return `
    <ul>
      <li><strong>Deutsch:</strong> Muttersprache</li>
      <li><strong>Englisch:</strong> Gute Kenntnisse</li>
    </ul>
  `;
}

function renderPersonal() {
  return `
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Geburtsdatum:</strong> ${birthdate}</p>
    <p><strong>Adresse:</strong> ${address}</p>
    <p><strong>Telefon:</strong> ${phone}</p>
    <p><strong>Email:</strong> <a href="mailto:${email}" style="color:#fff;">${email}</a></p>
    ${
      linkedin
        ? `<p><strong>LinkedIn:</strong> <a href="${linkedin}" style="color:#fff;">Profil</a></p>`
        : ""
    }
  `;
}

function renderEducation() {
  return (
    "<ul>" +
    educationData
      .map(
        (edu) =>
          `<li><strong>${edu.abschluss}</strong> an ${edu.schulname} (${edu.zeitraum})</li>`
      )
      .join("") +
    "</ul>"
  );
}

function renderExperience() {
  return (
    "<ul>" +
    experienceData
      .map(
        (exp) =>
          `<li><strong>${exp.tätigkeit}</strong> bei ${exp.einrichtung} (${exp.zeitraum})</li>`
      )
      .join("") +
    "</ul>"
  );
}

function renderInternship() {
  return (
    "<ul>" +
    internshipData
      .map(
        (intern) =>
          `<li><strong>${intern.praktikum}</strong> bei ${intern.unternehmen} (${intern.zeitraum})</li>`
      )
      .join("") +
    "</ul>"
  );
}
