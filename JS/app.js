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
const cityMap = {
    vienna:    "wien",
    linz:      "linz",
    salzburg:  "salzburg",
    graz:      "graz",
    innsbruck: "innsbruck"
};

// -------------------- DOMContentLoaded --------------------
document.addEventListener("DOMContentLoaded", () => {
    // Materialize-Selects initialisieren (falls Materialize aktiv)
    if (window.M && M.FormSelect) {
        M.FormSelect.init(document.querySelectorAll('select'));
    }

    // erste Events laden
    fetchEvents();

    // UI-Elemente greifen
    const searchBtn       = document.getElementById("searchBtn");
    const searchInput     = document.getElementById("search");
    const loadMoreBtn     = document.getElementById("loadMoreBtn");
    const loadLessBtn     = document.getElementById("loadLessBtn");
    const applyFiltersBtn = document.getElementById("applyFiltersBtn");
    const resetFiltersBtn = document.getElementById("resetFiltersBtn");

    // Such-Button
    searchBtn?.addEventListener("click", () => {
        currentKeyword = searchInput.value.trim();
        currentPage    = 0;
        clearEvents();
        fetchEvents(currentKeyword);
        // Filter-Reset auslösen, damit Dropdowns zurückgesetzt werden
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
        // Paginierungs-Buttons verstecken
        loadMoreBtn.style.display = "none";
        loadLessBtn.style.display = "none";
    });

    // Filter zurücksetzen
    resetFiltersBtn?.addEventListener("click", () => {
        // Dropdowns leeren
        ["categoryFilter","monthFilter","locationFilter"]
            .forEach(id => document.getElementById(id).value = "");

        // Materialize-Selects neu initialisieren (wenn genutzt)
        if (window.M && M.FormSelect) {
            M.FormSelect.init(document.querySelectorAll('select'));
        }

        // alle Event-Cards wieder anzeigen
        document.querySelectorAll("#events .card")
            .forEach(card => card.style.display = "block");

        // Paginierungs-Buttons wieder einblenden
        loadMoreBtn.style.display = "";
        loadLessBtn.style.display = "";
    });
});

// -------------------- API-Aufruf --------------------
async function fetchEvents(keyword = "", page = 0) {
    const API_KEY = "Ogln6rgdScGA7v55rV1GL5gDH3f3pLw9";
    let url = `https://app.ticketmaster.com/discovery/v2/events.json`
        + `?apikey=${API_KEY}&countryCode=AT&size=30&page=${page}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP-Fehler ${res.status}`);
        const data   = await res.json();
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

// -------------------- Rendering der Events inkl. Like-Logik --------------------
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
        const formatted   = new Date(rawDate).toLocaleDateString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const venue       = event._embedded?.venues?.[0] || {};
        const engCity     = (venue.city?.name || "").toLowerCase();
        const city        = cityMap[engCity] || engCity;
        const mapsUrl     = await buildMapsUrl(venue);

        // Karte erzeugen
        const card = document.createElement("div");
        card.className = "card";
        card.dataset.category = translated.toLowerCase();
        card.dataset.date     = rawDate;
        card.dataset.city     = city;

        // Inhalt inkl. Like-Button
        card.innerHTML = `
            <div class="card-content">
                <span class="card-title">${event.name}</span>
                <p>${formatted} – ${venue.name || "Veranstaltungsort siehe 'Mehr Infos'"}</p>
                <p><em>Kategorie: ${translated}</em></p>
                <a href="${event.url}" target="_blank">Mehr Infos</a>
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

        // Like-Button-Handler
        const likeBtn = card.querySelector(".like-btn");
        likeBtn.addEventListener("click", () => {
            toggleFavorite(event, likeBtn);
        });
    });
}

// -------------------- Favoriten-Logik --------------------
function isEventInFavorites(eventId) {
    const favs = JSON.parse(localStorage.getItem("favorites")) || [];
    return favs.some(f => f.id === eventId);
}

function toggleFavorite(event, buttonElement) {
    let favs = JSON.parse(localStorage.getItem("favorites")) || [];
    const idx = favs.findIndex(f => f.id === event.id);
    const icon = buttonElement.querySelector("i");

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

// -------------------- Filterfunktion --------------------
function applyFilters() {
    const selCat    = document.getElementById("categoryFilter").value.toLowerCase();
    const selMon    = document.getElementById("monthFilter").value;
    const selCity   = document.getElementById("locationFilter").value.toLowerCase();
    const feedbackEl= document.getElementById("filterFeedback");
    const allCards  = document.querySelectorAll("#events .card");
    let visibleCount = 0;

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

    // Feedback
    if (feedbackEl) {
        feedbackEl.textContent = `Gefiltert: ${visibleCount} Event(s) gefunden`;
    }
}


// -------------------- Favoriten-Ansicht rendern --------------------
function renderFavorites() {
    const container = document.getElementById("favorites");
    container.innerHTML = "";  // alte Inhalte löschen

    const favs = JSON.parse(localStorage.getItem("favorites")) || [];
    if (favs.length === 0) {
        container.innerHTML = "<p>Du hast noch keine Favoriten.</p>";
        return;
    }

    favs.forEach(event => {
        const rawType     = event.classifications?.[0]?.segment?.name || "Undefined";
        const translated  = categoryTranslations[rawType] || rawType;
        const rawDate     = event.dates.start.localDate;
        const formatted   = new Date(rawDate)
            .toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
        const venueName   = event._embedded?.venues?.[0]?.name || "Unbekannter Ort";

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
      <div class="card-content">
        <span class="card-title">${event.name}</span>
        <p>${formatted} – ${venueName}</p>
        <p><em>Kategorie: ${translated}</em></p>
        <a href="${event.url}" target="_blank">Mehr Infos</a>
      </div>
    `;
        container.appendChild(card);
    });
}