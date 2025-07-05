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
];

// 1) Installation: static assets vorab cachen
self.addEventListener("install", evt => {
    evt.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CACHED_URLS))
            .then(() => self.skipWaiting())
    );
});

// 2) Aktivierung: alte Caches aufräumen
self.addEventListener("activate", evt => {
    evt.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME) // Nur alte Caches löschen
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// 3) Fetch:
//    • Wenn navigation (Seitenaufruf), network-first + fallback auf index.html
//    • Für alle anderen Resource-Anfragen: cache-first
self.addEventListener("fetch", evt => {
    const req = evt.request;
    const url = new URL(req.url);

    // a) Navigation (HTML-Seiten) → Network-First, Fallback auf index.html
    if (req.mode === "navigate") {
        evt.respondWith(
            fetch(req).catch(() => caches.match("index.html"))
        );
        return;
    }

    // b) Ticketmaster-API → Stale-While-Revalidate in dynamic-events Cache
    if (url.origin === "https://app.ticketmaster.com") {
        evt.respondWith((async () => {
            const cache = await caches.open(DYNAMIC_CACHE);

            // 1. Versuche den Cache
            const cached = await cache.match(req);
            if (cached) {
                // im Hintergrund frische Version holen
                fetch(req).then(networkRes => {
                    cache.put(req, networkRes.clone());
                });
                return cached;
            }

            // 2. Sonst Netzwerk und cachen
            try {
                const networkRes = await fetch(req);
                cache.put(req, networkRes.clone());
                return networkRes;
            } catch {
                // 3. Fallback: leere JSON-Antwort
                return new Response(JSON.stringify({ _embedded:{ events:[] } }), {
                    headers: { "Content-Type": "application/json" }
                });
            }
        })());
        return;
    }

    // c) Alle anderen Ressourcen → Cache-First, dann Netzwerk
    evt.respondWith(
        caches.match(req).then(cached =>
            cached || fetch(req)
        )
    );
});