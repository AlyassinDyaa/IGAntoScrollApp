/* IG Focus Hub service worker: app-shell cache + Web Push with deep links. */
const SHELL_CACHE = "igfh-shell-v1";
const SHELL = ["/inbox", "/create", "/business", "/content", "/settings", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL).catch(() => undefined)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(fetch(req).catch(() => caches.match(req).then((r) => r || caches.match("/inbox"))));
});

self.addEventListener("push", (event) => {
  let data = { title: "IG Focus Hub", body: "", url: "/inbox", tag: undefined, badgeCount: undefined };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    data.body = event.data ? event.data.text() : "";
  }
  const show = self.registration.showNotification(data.title, {
    body: data.body,
    tag: data.tag,
    renotify: !!data.tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    data: { url: data.url },
  });
  const badge =
    typeof data.badgeCount === "number" && "setAppBadge" in navigator
      ? navigator.setAppBadge(data.badgeCount).catch(() => undefined)
      : Promise.resolve();
  event.waitUntil(Promise.all([show, badge]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/inbox";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
