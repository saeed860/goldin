// سرویس‌ورکر ساده: همیشه اول از شبکه می‌گیرد (تا به‌روزرسانی‌ها فوراً دیده شوند)
// و اگر آفلاین بودی از حافظهٔ نهان می‌خواند. درخواست‌های سایت‌های دیگر (مثل Worker قیمت) را دست نمی‌زند.
var CACHE = 'goldin-v1';
var ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'config.js', 'manifest.webmanifest', 'favicon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  var key = new Request(url.origin + url.pathname);
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(key, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(key).then(function (hit) {
        return hit || (req.mode === 'navigate' ? caches.match(new Request(new URL('index.html', self.location).href)) : Response.error());
      });
    })
  );
});
