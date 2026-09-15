/* Service Worker — تذكير الدواء
   يخزن التطبيق محلياً ليعمل بدون إنترنت */

const CACHE_NAME = "med-reminder-v10";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./drugdb.js",
  "./drug-interactions.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// التثبيت: خزن الملفات الأساسية
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// التفعيل: حذف الكاشات القديمة
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// الجلب: من الكاش أولاً ثم الشبكة
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

// إشعارات
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      if (list.length > 0) {
        return list[0].focus();
      }
      return clients.openWindow("./index.html");
    })
  );
});