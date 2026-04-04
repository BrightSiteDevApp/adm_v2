const CACHE_NAME = 'afit-market-v1';

// Install the service worker
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate the service worker
self.addEventListener('activate', (event) => {
    return self.clients.claim();
});

// A simple fetch listener to satisfy PWA installation criteria
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});