const categoryTranslations = {
    "Music": "Musik",
    "Sports": "Sport",
    "Arts & Theatre": "Kunst & Theater",
    "Film": "Film",
    "Miscellaneous": "Verschiedenes",
    "Undefined": "Nicht definiert"
};

let filteredEvents = [];

document.addEventListener("DOMContentLoaded", () => {
    const spinBtn = document.getElementById("spinBtn");
    const rerollBtn = document.getElementById("rerollBtn");
    const resultDiv = document.getElementById("result");

    spinBtn.addEventListener("click", async () => {
        const selectedCategory = document.getElementById("randomCategory").value.toLowerCase();

        if (!selectedCategory) {
            M.toast({ html: 'Bitte wähle eine Kategorie!', classes: 'red' });
            return;
        }

        resultDiv.innerHTML = "<p>Lade ein zufälliges Event...</p>";
        rerollBtn.style.display = "none";

        const API_KEY = "Ogln6rgdScGA7v55rV1GL5gDH3f3pLw9";
        let allEvents = [];

        for (let page = 0; page < 3; page++) {
            try {
                const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?apikey=${API_KEY}&countryCode=AT&size=200&page=${page}`);
                const data = await res.json();
                const events = data._embedded?.events || [];
                allEvents = allEvents.concat(events);
            } catch (err) {
                resultDiv.innerHTML = "<p>Fehler beim Laden.</p>";
                return;
            }
        }

        filteredEvents = allEvents.filter(event => {
            const raw = event.classifications?.[0]?.segment?.name || "Undefined";
            const translated = categoryTranslations[raw] || raw;
            return translated.toLowerCase().includes(selectedCategory);
        });

        if (filteredEvents.length === 0) {
            resultDiv.innerHTML = "<p>Keine Events in dieser Kategorie gefunden.</p>";
            return;
        }

        showRandomEvent();
        rerollBtn.style.display = "inline-block";
    });

    rerollBtn.addEventListener("click", () => {
        if (filteredEvents.length > 0) {
            showRandomEvent();
        }
    });

    function showRandomEvent() {
        const random = filteredEvents[Math.floor(Math.random() * filteredEvents.length)];
        const venue = random._embedded?.venues?.[0];
        const date = random.dates.start.localDate;
        const city = venue?.city?.name || "Unbekannt";
        const url = random.url;

        resultDiv.innerHTML = `
          <div class="card purple lighten-4">
            <div class="card-content">
              <span class="card-title">${random.name}</span>
              <p>${date} – ${venue?.name || 'Veranstaltungsort'} (${city})</p>
              <p><em>Kategorie:</em> ${categoryTranslations[random.classifications?.[0]?.segment?.name || "Undefined"]}</p>
            </div>
            <div class="card-action">
              <a href="${url}" target="_blank">Mehr Infos</a>
            </div>
          </div>
        `;
    }
});
