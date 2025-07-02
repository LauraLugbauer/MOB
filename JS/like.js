// like.js

// Favoriten speichern oder entfernen
function toggleFavorite(event, buttonElement) {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const index = favorites.findIndex(fav => fav.id === event.id);
    const icon = buttonElement.querySelector("i");

    if (index === -1) {
        favorites.push(event);
        icon.textContent = "favorite";
    } else {
        favorites.splice(index, 1);
        icon.textContent = "favorite_border";
    }

    localStorage.setItem("favorites", JSON.stringify(favorites));
}

// Prüfen, ob Event in Favoriten
function isEventInFavorites(eventId) {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    return favorites.some(fav => fav.id === eventId);
}

// Favoritenliste anzeigen
function renderFavorites() {
    const container = document.getElementById("favorites");
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];

    if (favorites.length === 0) {
        container.innerHTML = "<p>Keine Favoriten hinzugefügt.</p>";
        return;
    }

    favorites.forEach(event => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-content">
                <span class="card-title">${event.name}</span>
                <p>${event.dates.start.localDate} – ${event._embedded?.venues?.[0]?.name || "Veranstaltungsort siehe 'Mehr Infos'"}</p>
                <p><em>Kategorie: ${event.classifications?.[0]?.segment?.name || "Keine Angabe"}</em></p>
                <a href="${event.url}" target="_blank" style="color: rebeccapurple;">Mehr Infos</a>
            </div>
        `;
        container.appendChild(card);
    });
}

// Nur auf favorites.html ausführen
if (document.getElementById("favorites")) {
    renderFavorites();
}
