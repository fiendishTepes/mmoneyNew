const CACHE_NAME = 'jarvis-expense-v2'; // อัปเดตเวอร์ชัน
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/models/ExpenseModel.js',
    './js/views/UIRenderer.js',
    './js/controllers/AppController.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});