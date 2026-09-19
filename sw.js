self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}

  const title = data.title || "Deutsch";
  const body = data.body || "";
  const options = {
    body,
    icon: "./icon.png",
    badge: "./icon.png",
    data: data.url || "./"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data || "./";
  event.waitUntil(
    self.clients.matchAll({ type:"window", includeUncontrolled:true }).then(clients => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
