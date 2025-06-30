let currentPage = 0;
let currentKeyword = "";

// Registrierung des Service Workers
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("serviceworker.js")
        .then(registration => {
            console.log(`Service Worker registered with scope ${registration.scope}`);
        })
        .catch(err => {
            console.log("Service Worker registration failed: ", err);
        });
}

// DOM geladen
document.addEventListener("DOMContentLoaded", () => {
    // Standard: erste Seite Events laden
    fetchEvents();

    const searchBtn = document.getElementById("searchBtn");
    const searchInput = document.getElementById("search");
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    const loadLessBtn = document.getElementById("loadLessBtn");

    if (searchBtn && searchInput) {
        searchBtn.addEventListener("click", () => {
            const keyword = searchInput.value.trim();
            currentKeyword = keyword;
            currentPage = 0;
            clearEvents();
            fetchEvents(keyword);
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
            currentPage++;
            fetchEvents(currentKeyword, currentPage);
        });
    }

    if (loadLessBtn) {
        loadLessBtn.addEventListener("click", () => {
            if (currentPage > 0) {
                removeLastEvents();
                currentPage--;
            }
        });
    }
});

// Events von der API laden
async function fetchEvents(keyword = "", page = 0) {
    const API_KEY = "Ogln6rgdScGA7v55rV1GL5gDH3f3pLw9";
    let url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${API_KEY}&countryCode=AT&size=20&page=${page}`;

    if (keyword && keyword.length > 0) {
        url += `&keyword=${encodeURIComponent(keyword)}`;
    }

    console.log("[fetchEvents] URL:", url);

    try {
        const response = await fetch(url);
        console.log("[fetchEvents] HTTP-Status:", response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP-Fehler ${response.status}`);
        }

        const data = await response.json();
        console.log("[fetchEvents] Rohdaten:", data);

        const events = data._embedded?.events || [];
        console.log(`[fetchEvents] Gefundene Events (${events.length}):`, events);

        renderEvents(events);
    } catch (err) {
        console.error("[fetchEvents] Fehler:", err);
        const container = document.getElementById("events");
        if (container && page === 0) {
            container.innerHTML = "<p>Fehler beim Laden der Events.</p>";
        }
    }
}

// Events im DOM anzeigen
function renderEvents(events) {
    const container = document.getElementById("events");
    if (!container) return;

    if (events.length === 0 && currentPage === 0) {
        container.innerHTML = "<p>Keine Events in Österreich gefunden.</p>";
        return;
    }

    events.forEach(event => {
        const eventType = event.classifications?.[0]?.segment?.name || "Keine Angabe";

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-content">
                <span class="card-title">${event.name}</span>
                <p>${event.dates.start.localDate} – ${event._embedded?.venues?.[0]?.name || "Veranstaltungsort in den Zusatzinformationen einsehbar"}</p>
                <p><em>Kategorie: ${eventType}</em></p>
                <a href="${event.url}" target="_blank">Mehr Infos</a>
            </div>
        `;
        container.appendChild(card);
    });
}

// Alle Events entfernen (z. B. bei neuer Suche)
function clearEvents() {
    const container = document.getElementById("events");
    if (container) {
        container.innerHTML = "";
    }
}

// Letzte 20 Events entfernen
function removeLastEvents() {
    const container = document.getElementById("events");
    if (!container) return;

    const cards = container.querySelectorAll(".card");
    const totalCards = cards.length;

    for (let i = totalCards - 1; i >= totalCards - 20 && i >= 0; i--) {
        container.removeChild(cards[i]);
    }
}
