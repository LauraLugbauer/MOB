const CACHE_NAME = "evently-cache-v10";
const CACHED_URLS = [
    "CSS/styles.css",
    "IMGs/Icons/icon-144v2.png",
    "JS/app.js",
    "index.html",
    "manifest.webmanifest",
];

self.addEventListener("install", function(event) {
    console.log("Service Worker installing.");
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(c) {
            return c.addAll(CACHED_URLS);
        }).catch((err)=>{
            console.error(err);
        })
    );
})

// Network first, falling back to cache strategy
self.addEventListener("fetch", function(event) {
    event.respondWith(
        fetch(event.request).catch(function() {
            return caches.match(event.request).then(function(response) {
                return response;
            });
        })
    );
});

self.addEventListener("activate",(event)=>{
    event.waitUntil(
        caches.keys().then((cacheNames)=>{
            return Promise.all(
                cacheNames.map((cacheName)=>{
                    if(CACHE_NAME !== cacheName && cacheName.startsWith("evently-cache-")) {
                        console.log("Deleting old cache:", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Nur Ticketmaster-Requests abfangen
    if (url.origin === 'https://app.ticketmaster.com') {
        event.respondWith((async () => {
            try {
                const networkRes = await fetch(event.request);
                const cache = await caches.open('dynamic-events');
                cache.put(event.request, networkRes.clone());
                return networkRes;
            } catch {
                return caches.match(event.request);
            }
        })());
        return;
    }
});

