self.addEventListener('fetch', function(event) {
    console.log('Fetch!', event.request.url);
    event.respondWith(
        fetch(event.request)
    );
});

self.addEventListener("install", function(event) {
    console.log("install");
});
self.addEventListener("activate", function(event) {
    console.log("activate");
});