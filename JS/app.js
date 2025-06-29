if ("serviceWorker" in navigator){
    navigator.serviceWorker.register("serviceworker.js")
        .then(
            registration => {console.log(`Service Worker registered with 
scope ${registration.scope}`);}
        )
        .catch( err=> {console.log("Service Worker registration failed: ",
            err);});
}

// API einbinden
document.addEventListener("DOMContentLoaded", () => {
    // Standard-Suche nach Events in Wien
    fetchEvents("vienna");

    // Event-Handler für Suchfunktion (optional)
    const searchBtn = document.getElementById("searchBtn");
    const searchInput = document.getElementById("search");

    if (searchBtn && searchInput) {
        searchBtn.addEventListener("click", () => {
            const keyword = searchInput.value.trim();
            if (keyword) {
                fetchEvents(keyword);
            }
        });
    }
});

// Funktion zum Abrufen von Events über die Ticketmaster API
async function fetchEvents(keyword) {
    const API_KEY = "Ogln6rgdScGA7v55rV1GL5gDH3f3pLw9";
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${API_KEY}&keyword=${encodeURIComponent(keyword)}&size=10`;
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
        // … Fehlermeldung ins DOM …
    }
}

// Funktion zum Anzeigen der Events im DOM
function renderEvents(events) {
    const container = document.getElementById("events");
    if (!container) return;

    container.innerHTML = "";

    if (events.length === 0) {
        container.innerHTML = "<p>Keine Events gefunden.</p>";
        return;
    }

    events.forEach(event => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-content">
                <span class="card-title">${event.name}</span>
                <p>${event.dates.start.localDate} – ${event._embedded?.venues?.[0]?.name || "Unbekannter Ort"}</p>
                <a href="${event.url}" target="_blank">Mehr Infos</a>
            </div>
        `;
        container.appendChild(card);
    });
}



