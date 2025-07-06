const CACHE_NAME = "evently-cache-v10";
const CACHED_URLS = [
    "CSS/styles.css",
    "IMGs/Icons/icon-144v2.png",
    "JS/app.js",
    "index.html",
    "/manifest.webmanifest",
    "CSS/roulette.css",
    "JS/roulett.js",
    "CSS/materialize.min.css",
    "JS/materialize.min.js",
    "JS/like.js",
    "events.html",
    "favorites.html",
    "roulett.html",
    "JS/maps.js",
    "https://fonts.googleapis.com/icon?family=Material+Icons",
    "https://fonts.gstatic.com/s/materialicons/v143/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2",
];

//Installation: Cache die benötigten Dateien
self.addEventListener("install", function(event) {
    console.log("Service Worker installing...");
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CACHED_URLS))
            .catch(err => console.error("Fehler beim Caching:", err))
    );
});

// Aktivierung: Alte Caches löschen
self.addEventListener("activate", function(event) {
    console.log("Service Worker activating...");
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName.startsWith("evently-cache")) {
                        console.log("Lösche alten Cache:", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

//Fetch-Handler: Network First, Fallback auf Cache
self.addEventListener("fetch", function(event) {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request).then(response => {
                if (response) {
                    return response;
                }
                // Fallback für HTML-Seiten
                if (event.request.mode === "navigate") {
                    return caches.match("index.html");
                }
            });
        })
    );
});