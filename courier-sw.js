const COURIER_CACHE = "courier-pwa-v2";
const APP_SHELL = [
  "./courier",
  "./courier.html",
  "./courier-manifest.webmanifest",
  "./courier-icon-192.png",
  "./courier-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(COURIER_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== COURIER_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate" || url.pathname.endsWith("/courier") || url.pathname.endsWith("/courier.html")) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(COURIER_CACHE).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match("./courier.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(COURIER_CACHE).then(cache => cache.put(req, copy));
      return res;
    }))
  );
});


self.addEventListener("message", event => {
  if (event && event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) { data = {}; }

  const title = data.title || "New delivery assigned";
  const options = {
    body: data.body || "Open Courier Portal to view assigned deliveries.",
    icon: "./courier-icon-192.png",
    badge: "./courier-icon-192.png",
    data: { url: data.url || "./courier" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification && event.notification.data && event.notification.data.url ? event.notification.data.url : "./courier";
  event.waitUntil(clients.openWindow(url));
});
