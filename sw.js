const CACHE_NAME = 'jarvis-wallet-v4-offline-ready';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/models/ExpenseModel.js',
    './js/views/UIRenderer.js',
    './js/controllers/AppController.js',
    // Cache External Libraries (CDN) เพื่อให้ทำงาน Offline ได้
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/sweetalert2@11'
];

// 1. Install & Cache Files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching App Shell & CDNs');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
    self.skipWaiting();
});

// 2. Activate & Clean Old Cache
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// 3. Fetch Strategy: Cache First -> Network Fallback
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // ถ้ามีใน Cache (ทั้งไฟล์ในเครื่อง และ CDN ที่ save ไว้) ให้ใช้เลย
                if (response) {
                    return response;
                }
                // ถ้าไม่มี ให้วิ่งออกเน็ต
                return fetch(event.request).catch(() => {
                    // กรณี Offline และหาไฟล์ไม่เจอจริงๆ (เช่น รูปภาพใหม่ๆ)
                    // สามารถ return fallback page ได้ที่นี่ (ถ้ามี)
                });
            })
    );
});