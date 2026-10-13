// Cache hors-ligne : « réseau d'abord » (revalidé à chaque chargement), cache seulement si pas de réseau.
// L'URL est refetchée telle quelle : une requête de navigation ne peut pas recevoir d'options de cache.
const CACHE = "palier-v21";
const FILES = ["./", "index.html", "style.css", "rules.js", "app.js", "vendor/Sortable.min.js", "elements.json", "icon.svg", "manifest.webmanifest"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.pathname.startsWith("/api/") || u.origin !== location.origin) return;
  e.respondWith(
    fetch(u.href, { cache: "no-cache", credentials: "same-origin" })
      .then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; })
      .catch(() => caches.match(e.request).then((m) => m || caches.match("./")))
  );
});
