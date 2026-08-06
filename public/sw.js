/*
 * Service worker JRF Field.
 * Objectif : la tournée du jour s'ouvre sans réseau et le premier rendu utile
 * reste sous 2 s en 3G. Les DONNÉES ne passent pas par ici — elles vivent dans
 * IndexedDB (cache de tournée + outbox). Ce cache-ci ne sert que la coquille.
 *
 * Rien de ce qui est authentifié n'est mis en cache : les appels Supabase
 * partent vers une autre origine et les routes /api/ sont explicitement exclues.
 */
const CACHE = "jrf-field-v1";
const COQUILLE = ["/", "/field", "/manifest.webmanifest", "/icons/icon-192.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(COQUILLE))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

function estStatique(url) {
  return url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigation : réseau d'abord (données fraîches), coquille en cache sinon.
  if (requete.mode === "navigate") {
    event.respondWith(
      fetch(requete)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(requete, copie));
          return reponse;
        })
        .catch(() => caches.match(requete).then((cache) => cache || caches.match("/field")))
    );
    return;
  }

  // Fichiers versionnés : cache d'abord, ils ne changent jamais sous le même nom.
  if (estStatique(url)) {
    event.respondWith(
      caches.match(requete).then(
        (cache) =>
          cache ||
          fetch(requete).then((reponse) => {
            const copie = reponse.clone();
            caches.open(CACHE).then((c) => c.put(requete, copie));
            return reponse;
          })
      )
    );
  }
});
