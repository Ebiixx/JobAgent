// cv.js
// Externe Datei für den interaktiven Lebenslauf

// Globale CV-Variablen (aus Tab1-Felder befüllt)
// name, birthdate, address, phone, email, linkedin
// experienceData, educationData, internshipData (Arrays)

const panelDepth = 300;
const panelCount = 5;
const maxScroll = (panelCount - 1) * panelDepth;
const cvContainer = document.getElementById("cv-container");

// Erzeuge Panels dynamisch
export function buildCV() {
  cvContainer.innerHTML = "";
  const sections = [
    { title: "Persönliche Daten", content: renderPersonal() },
    { title: "Ausbildung", content: renderEducation() },
    { title: "Berufserfahrung", content: renderExperience() },
    { title: "Praktika", content: renderInternship() },
    { title: "Sprachen", content: renderLanguages() },
  ];
  sections.forEach((sec, i) => {
    const s = document.createElement("section");
    s.className = "cv-panel";
    s.style.setProperty("--z", `-${i * panelDepth}px`);
    s.innerHTML = `<h2>${sec.title}</h2>${sec.content}`;
    cvContainer.appendChild(s);
  });
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

function renderLanguages() {
  return `
    <ul>
      <li><strong>Deutsch:</strong> Muttersprache</li>
      <li><strong>Englisch:</strong> Gute Kenntnisse</li>
    </ul>
  `;
}

// Scroll- und Navigation-Handler
export function initCV() {
  console.log("📦 initCV() gestartet");
  window.addEventListener("scroll", onScrollCV);
  window.addEventListener("load", () => {
    document.body.classList.add("cv-mode");
    buildCV();
    window.scrollTo({ top: maxScroll, behavior: "auto" });
  });
}

function onScrollCV() {
  const y = Math.min(Math.max(window.scrollY, 0), maxScroll);
  const z = maxScroll - y;
  cvContainer.style.transform = `translateZ(${z}px)`;
  document.querySelectorAll(".cv-panel").forEach((panel) => {
    const pz = parseFloat(panel.style.getPropertyValue("--z"));
    const d = Math.abs(z + pz);
    panel.style.opacity = d > 150 ? 0 : 1 - d / 150;
  });
}

export function flyTo(idx) {
  const target = maxScroll - idx * panelDepth;
  window.scrollTo({ top: target, behavior: "smooth" });
}
