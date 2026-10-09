// AstroSat FOV Analyzer - offline support.
// Saves the app on the device. The page opens instantly (even with no signal) and quietly
// refreshes itself from GitHub when a connection is available. After you publish an update,
// open the app twice to see it: the first open loads the saved copy and fetches the new one.
const CACHE = 'astrosat-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    // Only handle this app's own files. Satellite data downloads are handled by the app itself.
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const cached = (await cache.match(req, { ignoreSearch: true })) ||
                       (req.mode === 'navigate' ? await cache.match('./') : undefined);
        const refresh = fetch(req.url, { cache: 'no-cache' })
            .then((resp) => { if (resp && resp.ok) cache.put(req, resp.clone()); return resp; })
            .catch(() => null);
        if (cached) { event.waitUntil(refresh); return cached; }
        return (await refresh) || new Response('Offline and not saved yet. Open the app once with a connection.', { status: 503 });
    })());
});
