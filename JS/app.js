// JS/app.js



// -------------------- App-State --------------------
let displayLimit   = 20;   // Wie viele Events wir standardmäßig anzeigen
let currentKeyword = "";
let allEvents      = [];   // Speichert alle per API geladenen Events

// -------------------- Service-Worker-Registrierung --------------------
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("serviceworker.js")
        .then(reg => console.log(`SW registered, scope: ${reg.scope}`))
        .catch(err => console.log("SW registration failed:", err));
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
const cityMap = {
    vienna:    "wien",
    linz:      "linz",
    salzburg:  "salzburg",
    graz:      "graz",
    innsbruck: "innsbruck"
};

// -------------------- DOMContentLoaded --------------------
document.addEventListener("DOMContentLoaded", () => {
    // Materialize-Selects initialisieren (falls Materialize geladen)
    if (window.M && M.FormSelect) {
        M.FormSelect.init(document.querySelectorAll('select'));
    }

    // Erstes Laden
    fetchEvents();

    // UI-Elemente
    const searchBtn       = document.getElementById("searchBtn");
    const searchInput     = document.getElementById("search");
    const loadMoreBtn     = document.getElementById("loadMoreBtn");
    const loadLessBtn     = document.getElementById("loadLessBtn");
    const applyFiltersBtn = document.getElementById("applyFiltersBtn");
    const resetFiltersBtn = document.getElementById("resetFiltersBtn");

    // Suche starten
    searchBtn?.addEventListener("click", () => {
        currentKeyword = searchInput.value.trim();
        displayLimit   = 20;
        allEvents      = [];
        clearEvents();
        fetchEvents(currentKeyword);
        resetFiltersBtn?.click();
    });

    // Mehr laden: einfach Limit erhöhen und neu rendern
    loadMoreBtn?.addEventListener("click", () => {
        displayLimit += 20;
        renderEvents(allEvents.slice(0, displayLimit));
    });

    // Weniger anzeigen: Limit reduzieren und neu rendern
    loadLessBtn?.addEventListener("click", () => {
        if (displayLimit > 20) {
            displayLimit -= 20;
            renderEvents(allEvents.slice(0, displayLimit));
        }
    });

    // Filter anwenden
    applyFiltersBtn?.addEventListener("click", () => {
        applyFilters();
        loadMoreBtn.style.display = "none";
        loadLessBtn.style.display = "none";
    });

    // Filter zurücksetzen
    resetFiltersBtn?.addEventListener("click", () => {
        ["categoryFilter","monthFilter","locationFilter"]
            .forEach(id => document.getElementById(id).value = "");
        if (window.M && M.FormSelect) {
            M.FormSelect.init(document.querySelectorAll('select'));
        }
        renderEvents(allEvents.slice(0, displayLimit));
        loadMoreBtn.style.display = "";
        loadLessBtn.style.display = "";
        const fb = document.getElementById("filterFeedback");
        if (fb) fb.textContent = "";
    });
});

// -------------------- API-Aufruf --------------------
async function fetchEvents(keyword = "", page = 0) {
    const API_KEY = "Ogln6rgdScGA7v55rV1GL5gDH3f3pLw9";
    // Wir laden jetzt 200 auf einen Schlag, um genug Daten zum Filtern & Paginating zu haben
    let url = `https://app.ticketmaster.com/discovery/v2/events.json`
        + `?apikey=${API_KEY}&countryCode=AT&size=200&page=${page}`;
    if (keyword) {
        url += `&keyword=${encodeURIComponent(keyword)}`;
    }

    try {
        const res    = await fetch(url);
        if (!res.ok) throw new Error(`HTTP-Fehler ${res.status}`);
        const data   = await res.json();
        const events = data._embedded?.events || [];

        // Alle geladenen Events cachen
        allEvents = allEvents.concat(events);

        // Die ersten displayLimit rendern
        renderEvents(allEvents.slice(0, displayLimit));
    } catch (err) {
        console.error("[fetchEvents] Fehler:", err);
        if (allEvents.length === 0) {
            document.getElementById("events").innerHTML
                = "<p>Fehler beim Laden der Events.</p>";
        }
    }
}

// -------------------- Rendering der Events inkl. Like-Logik --------------------
function renderEvents(events) {
    const container = document.getElementById("events");
    if (!container) return;
    container.innerHTML = "";

    if (events.length === 0) {
        container.innerHTML = "<p>Keine Events gefunden.</p>";
        return;
    }

    events.forEach(async event => {
        const rawType    = event.classifications?.[0]?.segment?.name || "Undefined";
        const translated = categoryTranslations[rawType] || rawType;
        const rawDate    = event.dates.start.localDate;
        const formatted  = new Date(rawDate).toLocaleDateString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const venue      = event._embedded?.venues?.[0] || {};
        const engCity    = (venue.city?.name || "").toLowerCase();
        const city       = cityMap[engCity] || engCity;
        const mapsUrl    = await buildMapsUrl(venue);

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
                <a href="${event.url}" target="_blank" style="color: purple">Mehr Infos</a>
            </div>
            <div class="card-action" style="display:flex;justify-content:space-between;align-items:center;">
                <a href="${mapsUrl}" target="_blank">In Google Maps anzeigen</a>
                <button class="btn-flat like-btn" data-event-id="${event.id}" style="min-width:40px;">
                    <i class="material-icons">
                        ${isEventInFavorites(event.id) ? "favorite" : "favorite_border"}
                    </i>
                </button>
            </div>
        `;
        container.appendChild(card);

        const likeBtn = card.querySelector(".like-btn");
        likeBtn.addEventListener("click", () => toggleFavorite(event, likeBtn));
    });
}

// -------------------- Favoriten-Logik --------------------
function isEventInFavorites(eventId) {
    const favs = JSON.parse(localStorage.getItem("favorites")) || [];
    return favs.some(f => f.id === eventId);
}

function toggleFavorite(event, btn) {
    let favs = JSON.parse(localStorage.getItem("favorites")) || [];
    const idx = favs.findIndex(f => f.id === event.id);
    const icon = btn.querySelector("i");

    if (idx === -1) {
        favs.push(event);
        icon.textContent = "favorite";
    } else {
        favs.splice(idx, 1);
        icon.textContent = "favorite_border";
    }
    localStorage.setItem("favorites", JSON.stringify(favs));
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

// -------------------- Filterfunktion über alle geladenen Events --------------------
function applyFilters() {
    const selCat     = document.getElementById("categoryFilter").value.toLowerCase();
    const selMon     = document.getElementById("monthFilter").value;
    const selCity    = document.getElementById("locationFilter").value.toLowerCase();
    const feedbackEl = document.getElementById("filterFeedback");

    // Filter auf das komplette allEvents-Array anwenden
    const filtered = allEvents.filter(event => {
        const rawType    = event.classifications?.[0]?.segment?.name || "Undefined";
        const type       = categoryTranslations[rawType] || rawType;
        const date       = event.dates.start.localDate;
        const venue      = event._embedded?.venues?.[0] || {};
        const engCity    = (venue.city?.name || "").toLowerCase();
        const city       = cityMap[engCity] || engCity;

        const okCat  = !selCat   || type.toLowerCase().includes(selCat);
        const okMon  = !selMon   || date.startsWith(selMon);
        const okCity = !selCity  || city.includes(selCity);

        return okCat && okMon && okCity;
    });

    // Alle gefilterten anzeigen
    renderEvents(filtered);

    // Pagination-Buttons verstecken
    document.getElementById("loadMoreBtn").style.display = "none";
    document.getElementById("loadLessBtn").style.display = "none";

    // Feedback
    if (feedbackEl) {
        feedbackEl.textContent = `Gefiltert: ${filtered.length} Event(s) gefunden`;
    }
}

// -------------------- Favoriten-Ansicht rendern (mit Maps-Link) --------------------
async function renderFavorites() {
    const container = document.getElementById("favorites");
    if (!container) return;
    container.innerHTML = "";

    const favs = JSON.parse(localStorage.getItem("favorites")) || [];
    if (favs.length === 0) {
        container.innerHTML = "<p>Du hast noch keine Favoriten.</p>";
        return;
    }

    for (const event of favs) {
        const rawType    = event.classifications?.[0]?.segment?.name || "Undefined";
        const translated = categoryTranslations[rawType] || rawType;
        const rawDate    = event.dates.start.localDate;
        const formatted  = new Date(rawDate)
            .toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
        const venue      = event._embedded?.venues?.[0] || {};
        const venueName  = venue.name || "Unbekannter Ort";
        const mapsUrl    = await buildMapsUrl(venue);

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-content">
                <span class="card-title">${event.name}</span>
                <p>${formatted} – ${venueName}</p>
                <p><em>Kategorie: ${translated}</em></p>
                <a href="${event.url}" target="_blank">Mehr Infos</a>
            </div>
            <div class="card-action" style="display:flex;justify-content:space-between;align-items:center;">
                <a href="${mapsUrl}" target="_blank">In Google Maps anzeigen</a>
                <button class="btn-flat like-btn" data-event-id="${event.id}" style="min-width:40px;">
                    <i class="material-icons">favorite</i>
                </button>
            </div>
        `;
        container.appendChild(card);

        // Herz-Button zum Entfernen aus Favoriten
        const likeBtn = card.querySelector(".like-btn");
        likeBtn.addEventListener("click", () => {
            toggleFavorite(event, likeBtn);
            renderFavorites();
        });
    }
}



// -------------------- Automatischer Aufruf auf der Favorites-Seite --------------------
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("favorites")) {
        renderFavorites();
    }
});

