// JS/app.js

// -------------------- Helferfunktion für Google-Maps-Link --------------------
window.buildMapsUrl = async function(venue) {
    if (venue.location?.latitude && venue.location?.longitude) {
        // wenn Geokoordinaten vorhanden sind
        return `https://www.google.com/maps/search/?api=1&query=${venue.location.latitude},${venue.location.longitude}`;
    }
    // sonst Adresse als Suchbegriff
    const address = encodeURIComponent(
        [venue.name, venue.city?.name]
            .filter(Boolean)
            .join(', ')
    );
    return `https://www.google.com/maps/search/?api=1&query=${address}`;
};

// -------------------- App-State --------------------
let currentPage    = 0;
let currentKeyword = "";

// -------------------- Service-Worker-Registrierung --------------------
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("serviceworker.js")
        .then(registration => {
            console.log(`Service Worker registered with scope ${registration.scope}`);
        })
        .catch(err => {
            console.log("Service Worker registration failed: ", err);
        });
}

// -------------------- Übersetzungen --------------------
const categoryTranslations = {
    "Music": "Musik",
    "Sports": "Sport",
    "Arts & Theatre": "Kunst & Theater",
    "Film": "Film",
    "Miscellaneous": "Verschiedenes",
    "Undefined": "Nicht definiert"
};

// Mapping englischer Stadtnamen (API) → deutsche Werte (Dropdown)
const cityMap = {
    vienna:    "wien",
    linz:      "linz",
    salzburg:  "salzburg",
    graz:      "graz",
    innsbruck: "innsbruck"
};

// -------------------- DOMContentLoaded --------------------
document.addEventListener("DOMContentLoaded", () => {
    // Materialize-Selects initialisieren (wenn genutzt)
    if (window.M && M.FormSelect) {
        M.FormSelect.init(document.querySelectorAll('select'));
    }

    // Erste Events laden
    fetchEvents();

    // UI-Elemente
    const searchBtn       = document.getElementById("searchBtn");
    const searchInput     = document.getElementById("search");
    const loadMoreBtn     = document.getElementById("loadMoreBtn");
    const loadLessBtn     = document.getElementById("loadLessBtn");
    const applyFiltersBtn = document.getElementById("applyFiltersBtn");
    const resetFiltersBtn = document.getElementById("resetFiltersBtn");
    const feedbackEl      = document.getElementById("filterFeedback");

    // Such-Button
    searchBtn?.addEventListener("click", () => {
        currentKeyword = searchInput.value.trim();
        currentPage    = 0;
        clearEvents();
        fetchEvents(currentKeyword);
        // nach neuer Suche Filters zurücksetzen und Buttons anzeigen
        resetFiltersBtn?.click();
    });

    // Mehr laden
    loadMoreBtn?.addEventListener("click", () => {
        currentPage++;
        fetchEvents(currentKeyword, currentPage);
    });

    // Weniger anzeigen
    loadLessBtn?.addEventListener("click", () => {
        if (currentPage > 0) {
            removeLastEvents();
            currentPage--;
        }
    });

    // Filter anwenden
    applyFiltersBtn?.addEventListener("click", () => {
        applyFilters();
        // Buttons verstecken
        loadMoreBtn.style.display = "none";
        loadLessBtn.style.display = "none";
    });

    // Filter zurücksetzen
    resetFiltersBtn?.addEventListener("click", () => {
        // 1) Filter-Felder leeren
        document.getElementById("categoryFilter").value = "";
        document.getElementById("monthFilter") .value = "";
        document.getElementById("locationFilter").value = "";

        // 2) Materialize-Selects neu initialisieren (falls genutzt)
        if (window.M && M.FormSelect) {
            M.FormSelect.init(document.querySelectorAll('select'));
        }

        // 3) Alle Event-Cards anzeigen
        document.querySelectorAll("#events .card")
            .forEach(card => card.style.display = "block");

        // 4) Feedback-Text entfernen
        if (feedbackEl) feedbackEl.textContent = "";

        // 5) Buttons wieder einblenden
        loadMoreBtn.style.display = "";
        loadLessBtn.style.display = "";
    });
});

// -------------------- API-Aufruf --------------------
async function fetchEvents(keyword = "", page = 0) {
    const API_KEY = "Ogln6rgdScGA7v55rV1GL5gDH3f3pLw9";
    let url = `https://app.ticketmaster.com/discovery/v2/events.json`
        + `?apikey=${API_KEY}&countryCode=AT&size=30&page=${page}`;
    if (keyword) {
        url += `&keyword=${encodeURIComponent(keyword)}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP-Fehler ${response.status}`);
        const data   = await response.json();
        const events = data._embedded?.events || [];
        renderEvents(events);
    } catch (err) {
        console.error("[fetchEvents] Fehler:", err);
        if (page === 0) {
            document.getElementById("events").innerHTML
                = "<p>Fehler beim Laden der Events.</p>";
        }
    }
}

// -------------------- Rendering der Events --------------------
function renderEvents(events) {
    const container = document.getElementById("events");
    if (!container) return;
    if (events.length === 0 && currentPage === 0) {
        container.innerHTML = "<p>Keine Events in Österreich gefunden.</p>";
        return;
    }

    events.forEach(async event => {
        const rawType     = event.classifications?.[0]?.segment?.name || "Undefined";
        const translated  = categoryTranslations[rawType] || rawType;

        const rawDate     = event.dates.start.localDate;
        const formatted   = new Date(rawDate)
            .toLocaleDateString('de-DE', {
                day:   '2-digit',
                month: '2-digit',
                year:  'numeric'
            });

        const venue   = event._embedded?.venues?.[0] || {};
        const engCity = (venue.city?.name || "").toLowerCase();
        const city    = cityMap[engCity] || engCity;

        const mapsUrl = await buildMapsUrl(venue);

        const card = document.createElement("div");
        card.className = "card";
        card.dataset.category = translated.toLowerCase();
        card.dataset.date     = rawDate;
        card.dataset.city     = city;

        card.innerHTML = `
            <div class="card-content">
                <span class="card-title">${event.name}</span>
                <p>${formatted} – ${venue.name || "Veranstaltungsort siehe 'Mehr Infos'"}</p>
                <p><em>Kategorie: ${translated}</em></p>
                <a href="${event.url}" target="_blank">Mehr Infos</a>
            </div>
            <div class="card-action">
                <a href="${mapsUrl}" target="_blank">In Google Maps anzeigen</a>
            </div>
        `;
        container.appendChild(card);
    });
}

// -------------------- Aufräumfunktionen --------------------
function clearEvents() {
    document.getElementById("events").innerHTML = "";
}

function removeLastEvents() {
    const cards = document.querySelectorAll("#events .card");
    for (let i = cards.length - 1; i >= cards.length - 20 && i >= 0; i--) {
        cards[i].remove();
    }
}

// -------------------- Filterfunktion --------------------
function applyFilters() {
    const selCat  = document.getElementById("categoryFilter").value.toLowerCase();
    const selMon  = document.getElementById("monthFilter").value;
    const selCity = document.getElementById("locationFilter").value.toLowerCase();
    const feedbackEl = document.getElementById("filterFeedback");

    const allCards     = document.querySelectorAll("#events .card");
    let visibleCount   = 0;

    allCards.forEach(card => {
        const cat  = card.dataset.category;
        const date = card.dataset.date;
        const city = card.dataset.city;

        const okCat  = !selCat  || cat.includes(selCat);
        const okMon  = !selMon  || date.startsWith(selMon);
        const okCity = !selCity || city.includes(selCity);

        const show = okCat && okMon && okCity;
        card.style.display = show ? "block" : "none";
        if (show) visibleCount++;
    });

    // Feedback anzeigen
    if (feedbackEl) {
        feedbackEl.textContent = `Gefiltert: ${visibleCount} Event(s) verfügbar.`;
    }
}