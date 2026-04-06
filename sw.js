// A minimal, safe Service Worker that satisfies PWA requirements
// WITHOUT breaking Supabase database connections!

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Notice there is NO 'fetch' event listener here!
// This ensures your database API calls go straight to the internet and never get blocked.