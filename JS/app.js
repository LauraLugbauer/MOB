// JS/app.js




let displayLimit   = 20;    // Anzahl der standardmäßig angezeigten Events
let currentKeyword = "";
let allEvents      = [];    // Puffer aller geladenen Events

// -------------------- Service-Worker-Registrierung --------------------
if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('serviceworker.js')
        .then(reg => console.log(`SW registered, scope: ${reg.scope}`))
        .catch(err => console.error('SW registration failed:', err));
}

// -------------------- Übersetzungen --------------------
const categoryTranslations = {
    Music: 'Musik',
    Sports: 'Sport',
    'Arts & Theatre': 'Kunst & Theater',
    Film: 'Film',
    Miscellaneous: 'Verschiedenes',
    Undefined: 'Nicht definiert'
};
const cityMap = {
    vienna:    'wien',
    linz:      'linz',
    salzburg:  'salzburg',
    graz:      'graz',
    innsbruck: 'innsbruck'
};

// -------------------- DOMContentLoaded --------------------
document.addEventListener('DOMContentLoaded', () => {
    // Materialize-Select initialisieren (falls Materialize geladen)
    if (window.M && M.FormSelect) {
        M.FormSelect.init(document.querySelectorAll('select'));
    }

    // erstes Laden der Events
    fetchEvents().catch(err => console.error(err));

    // UI-Elemente referenzieren
    const searchBtn       = document.getElementById('searchBtn');
    const searchInput     = document.getElementById('search');
    const loadMoreBtn     = document.getElementById('loadMoreBtn');
    const loadLessBtn     = document.getElementById('loadLessBtn');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');

    // -------------------- Suche starten --------------------
    searchBtn?.addEventListener('click', async () => {
        try {
            currentKeyword = searchInput.value.trim();
            displayLimit   = 20;
            allEvents      = [];
            clearEvents();
            await fetchEvents(currentKeyword);
            resetFiltersBtn?.click();
        } catch (err) {
            console.error('Fehler bei der Suche:', err);
        }
    });

    // -------------------- Mehr laden --------------------
    loadMoreBtn?.addEventListener('click', async () => {
        displayLimit += 20;
        await renderEvents(allEvents.slice(0, displayLimit));
    });

    // -------------------- Weniger anzeigen --------------------
    loadLessBtn?.addEventListener('click', async () => {
        if (displayLimit > 20) {
            displayLimit -= 20;
            await renderEvents(allEvents.slice(0, displayLimit));
        }
    });

    // -------------------- Filter anwenden --------------------
    applyFiltersBtn?.addEventListener('click', async () => {
        await applyFilters();
        loadMoreBtn.style.display = 'none';
        loadLessBtn.style.display = 'none';
    });

    // -------------------- Filter zurücksetzen --------------------
    resetFiltersBtn?.addEventListener('click', async () => {
        ['categoryFilter','monthFilter','locationFilter']
            .forEach(id => document.getElementById(id).value = '');
        if (window.M && M.FormSelect) {
            M.FormSelect.init(document.querySelectorAll('select'));
        }
        await renderEvents(allEvents.slice(0, displayLimit));
        loadMoreBtn.style.display = '';
        loadLessBtn.style.display = '';
        const fb = document.getElementById('filterFeedback');
        if (fb) fb.textContent = '';
    });
});

// -------------------- API-Aufruf --------------------
async function fetchEvents(keyword = '', page = 0) {
    const API_KEY = 'Ogln6rgdScGA7v55rV1GL5gDH3f3pLw9';
    let url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${API_KEY}&countryCode=AT&size=200&page=${page}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP-Fehler ${res.status}`);
        const data = await res.json();
        const events = data._embedded?.events || [];
        allEvents = allEvents.concat(events);
        await renderEvents(allEvents.slice(0, displayLimit));
    } catch (err) {
        console.error('Fehler beim Laden der Events:', err);
        const container = document.getElementById('events');
        if (container) {
            container.innerHTML = `<p style="color:red;">Events können derzeit nicht geladen werden. Prüfe deine Internetverbindung.</p>`;
        }
    }
}

// -------------------- Rendern der Events --------------------
async function renderEvents(events) {
    const container = document.getElementById('events');
    if (!container) return;
    container.innerHTML = '';

    // Kein Event
    if (events.length === 0) {
            container.innerHTML = '<p>Keine passenden Events gefunden.</p>';
        }



    for (const event of events) {
        const rawType    = event.classifications?.[0]?.segment?.name || 'Undefined';
        const translated = categoryTranslations[rawType] || rawType;
        const rawDate    = event.dates.start.localDate;
        const formatted  = new Date(rawDate)
            .toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const venue      = event._embedded?.venues?.[0] || {};
        const engCity    = (venue.city?.name || '').toLowerCase();
        const city       = cityMap[engCity] || engCity;
        const mapsUrl    = await buildMapsUrl(venue);

        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.category = translated.toLowerCase();
        card.dataset.date     = rawDate;
        card.dataset.city     = city;

        card.innerHTML = `
            <div class="card-content">
                <span class="card-title">${event.name}</span>
                <p>${formatted} – ${venue.name || "Veranstaltungsort unter 'Mehr Infos'."}</p>
                <p><em>Kategorie: ${translated}</em></p>
                <a href="${event.url}" target="_blank" style="color: purple">Mehr Infos</a>
            </div>
            <div class="card-action" style="display:flex;justify-content:space-between;align-items:center;">
                <a href="${mapsUrl}" target="_blank">In Google Maps anzeigen</a>
                <button class="btn-flat like-btn" data-event-id="${event.id}" style="min-width:40px;">
                    <i class="material-icons">
                        ${isEventInFavorites(event.id) ? 'favorite' : 'favorite_border'}
                    </i>
                </button>
            </div>
        `;

        container.appendChild(card);

        const likeBtn = card.querySelector('.like-btn');
        likeBtn.addEventListener('click', () => toggleFavorite(event, likeBtn));
    }
}


// -------------------- Favoriten-Logik --------------------
function isEventInFavorites(eventId) {
    const favs = JSON.parse(localStorage.getItem('favorites')) || [];
    return favs.some(f => f.id === eventId);
}
function toggleFavorite(event, btn) {
    let favs = JSON.parse(localStorage.getItem('favorites')) || [];
    const idx = favs.findIndex(f => f.id === event.id);
    const icon = btn.querySelector('i');
    if (idx === -1) {
        favs.push(event);
        icon.textContent = 'favorite';
    } else {
        favs.splice(idx, 1);
        icon.textContent = 'favorite_border';
    }
    localStorage.setItem('favorites', JSON.stringify(favs));
}

// -------------------- Hilfsfunktionen --------------------
function clearEvents() {
    document.getElementById('events').innerHTML = '';
}


// -------------------- Filter über alle geladenen Events --------------------
async function applyFilters() {
    const selCat  = document.getElementById('categoryFilter').value.toLowerCase();
    const selMon  = document.getElementById('monthFilter').value;
    const selCity = document.getElementById('locationFilter').value.toLowerCase();
    const feedbackEl = document.getElementById('filterFeedback');

    const filtered = allEvents.filter(e => {
        const rawType = e.classifications?.[0]?.segment?.name || 'Undefined';
        const type    = categoryTranslations[rawType] || rawType;
        const date    = e.dates.start.localDate;
        const ven     = e._embedded?.venues?.[0] || {};
        const cityEn  = (ven.city?.name||'').toLowerCase();
        const city    = cityMap[cityEn] || cityEn;

        return (
            (!selCat  || type.toLowerCase().includes(selCat)) &&
            (!selMon  || date.startsWith(selMon)) &&
            (!selCity || city.includes(selCity))
        );
    });

    await renderEvents(filtered);
    document.getElementById('loadMoreBtn').style.display = 'none';
    document.getElementById('loadLessBtn').style.display = 'none';
    if (feedbackEl) {
        feedbackEl.textContent = `Gefiltert: ${filtered.length} Events gefunden`;
    }
}

// -------------------- Favoriten-Ansicht rendern --------------------
async function renderFavorites() {
    const container = document.getElementById('favorites');
    if (!container) return;
    container.innerHTML = '';
    const favs = JSON.parse(localStorage.getItem('favorites'))||[];
    if (favs.length === 0) {
        container.innerHTML = '<p>Du hast noch keine Favoriten.</p>';
        return;
    }
    for (const e of favs) {
        const rawType    = e.classifications?.[0]?.segment?.name||'Undefined';
        const translated = categoryTranslations[rawType]||rawType;
        const dateRaw    = e.dates.start.localDate;
        const formatted  = new Date(dateRaw).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
        const ven        = e._embedded?.venues?.[0]||{};
        const venueName  = ven.name||'Ort unbekannt';
        const mapsUrl    = await buildMapsUrl(ven);

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
      <div class="card-content">
        <span class="card-title">${e.name}</span>
        <p>${formatted} – ${venueName}</p>
        <p><em>Kategorie: ${translated}</em></p>
        <a href="${e.url}" target="_blank">Mehr Infos</a>
      </div>
      <div class="card-action" style="display:flex;justify-content:space-between;align-items:center;">
        <a href="${mapsUrl}" target="_blank">In Google Maps anzeigen</a>
        <button class="btn-flat like-btn" data-event-id="${e.id}" style="min-width:40px;">
          <i class="material-icons">favorite</i>
        </button>
      </div>
    `;
        container.appendChild(card);
        const btn = card.querySelector('.like-btn');
        btn.addEventListener('click', () => {
            toggleFavorite(e, btn);
            renderFavorites(); // sofort neu rendern
        });
    }
}

// automatisch auf favorites.html aufrufen
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('favorites')) {
        await renderFavorites();
    }
});
