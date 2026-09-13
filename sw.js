/* Háztartási mobil-kalkulátor — service worker.
   Stratégia: HÁLÓZAT ELŐSZÖR. Mindig a friss (esetleg frissített árakat
   tartalmazó) változat töltődik be; a gyorsítótár csak vésztartalék, ha
   épp nincs net. */

var CACHE = "mk-v1";

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var sameOrigin = new URL(req.url).origin === self.location.origin;

  e.respondWith(
    fetch(req)
      .then(function (res) {
        if (sameOrigin && res && res.ok && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          if (req.mode === "navigate") return caches.match("./");
          return Response.error();
        });
      })
  );
});
