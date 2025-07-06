// JS/roulett.js

// M.FormSelect initialisieren
document.addEventListener("DOMContentLoaded", () => {
    if (window.M && M.FormSelect) {
        M.FormSelect.init(document.querySelectorAll("select"));
    }
});
// Übersetzung englischer Kategorien → Deutsch
const categoryTranslations = {
    "Music":          "Musik",
    "Sports":         "Sport",
    "Arts & Theatre": "Kunst & Theater",
    "Film":           "Film",
    "Miscellaneous":  "Verschiedenes",
    "Undefined":      "Nicht definiert"
};

// Globale Variablen für gefilterte Events und die aktuelle Auswahl
let filteredEvents    = [];
let selectedCategory  = "";

// Sobald das DOM komplett geladen ist …
document.addEventListener("DOMContentLoaded", () => {
    // Materialize-Select initialisieren, falls geladen
    if (window.M && M.FormSelect) {
        M.FormSelect.init(document.querySelectorAll("select"));
    }

    // Elemente greifen
    const spinBtn   = document.getElementById("spinBtn");
    const rerollBtn = document.getElementById("rerollBtn");
    const resultDiv = document.getElementById("result");

    // Klick auf „Lass mich entscheiden!“
    spinBtn.addEventListener("click", async () => {
        // Kategorie global setzen
        selectedCategory = document
            .getElementById("randomCategory")
            .value
            .toLowerCase();

        if (!selectedCategory) {
            M.toast({ html: "Bitte wähle eine Kategorie!", classes: "red" });
            return;
        }

        // UI zurücksetzen
        resultDiv.innerHTML = "<p>Lade ein zufälliges Event…</p>";
        rerollBtn.style.display = "none";

        // Alle Events aus mehreren Seiten laden
        const API_KEY = "Ogln6rgdScGA7v55rV1GL5gDH3f3pLw9";
        let allEvents = [];
        for (let page = 0; page < 3; page++) {
            try {
                const res  = await fetch(
                    `https://app.ticketmaster.com/discovery/v2/events.json` +
                    `?apikey=${API_KEY}&countryCode=AT&size=200&page=${page}`
                );
                const data = await res.json();
                const evs  = data._embedded?.events || [];
                allEvents   = allEvents.concat(evs);
            } catch (err) {
                resultDiv.innerHTML = "<p>Fehler beim Laden der Events.</p>";
                return;
            }
        }

        // nach gewählter Kategorie filtern
        filteredEvents = allEvents.filter(event => {
            const raw        = event.classifications?.[0]?.segment?.name || "Undefined";
            const translated = categoryTranslations[raw] || raw;
            return translated.toLowerCase().includes(selectedCategory);
        });

        if (filteredEvents.length === 0) {
            resultDiv.innerHTML = "<p>Keine Events in dieser Kategorie gefunden.</p>";
            return;
        }

        // erstem Treffer anzeigen und „Nochmal!“-Button einblenden
        showRandomEvent();
        rerollBtn.style.display = "inline-block";
    });

    // Klick auf „Zeig mir ein anderes!“
    rerollBtn.addEventListener("click", () => {
        if (filteredEvents.length > 0) {
            showRandomEvent();
        }
    });

    // Funktion zum Anzeigen eines einzelnen, zufälligen Events
    function showRandomEvent() {
        // Zufälliges Event auswählen
        const idx    = Math.floor(Math.random() * filteredEvents.length);
        const random = filteredEvents[idx];
        const venue  = random._embedded?.venues?.[0] || {};
        const rawDate= random.dates.start.localDate;
        const date   = new Date(rawDate).toLocaleDateString("de-DE", {
            day: "2-digit", month: "2-digit", year: "numeric"
        });
        const rawSeg = random.classifications?.[0]?.segment?.name || "Undefined";
        const type   = categoryTranslations[rawSeg] || rawSeg;
        const moreUrl= random.url;

        // Container leeren
        resultDiv.innerHTML = "";

        // Neue Card im gleichen Look wie in deiner Events-Liste
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
    <div class="card-content">
      <span class="card-title">${random.name}</span>
      <p>${date} – ${venue.name || "Veranstaltungs­ort unter 'Mehr Infos' ersichtlich"}</p>
      <p class="grey-text"><em>Kategorie:</em> ${type}</p>
      <a href="${moreUrl}" target="_blank" class="purple-text">Mehr Infos</a>
    </div>
    <div class="card-action right-align">
      <!-- Hier könntest du bei Bedarf den Like-Button wieder hinzufügen -->
    </div>
  `;

        resultDiv.appendChild(card);

        // „Zeig mir ein anderes!“-Button wieder einblenden
        rerollBtn.style.display = "inline-block";
    }
});
