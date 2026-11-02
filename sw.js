self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}

  const title = data.title || "Deutsch";
  const body = data.body || "";
  const options = {
    body,
    icon: "./icon.webp",
    badge: "./icon.webp",
    data: data.url || "./"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  // 02.11.2026: the push server sends url "/" — the domain root, outside the app (the site lives in a
  // sub-folder, e.g. …github.io/der-die-das/), so the tap opened an empty page. A link starting with one "/"
  // is now read inside the app's own folder (the service worker's scope).
  const raw = String(event.notification.data || "./");
  const target = new URL(/^\/(?!\/)/.test(raw) ? "." + raw : raw, self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type:"window", includeUncontrolled:true }).then(clients => {
      for (const client of clients) {
        if ("focus" in client) {
          if (client.navigate) client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
