self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "Deutsch",
      body: event.data ? event.data.text() : ""
    };
  }

  const title = data.title || "Deutsch";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon.png",
    badge: data.badge || "/icon.png",
    tag: data.tag || "german-learning-notification",
    data: {
      url: data.url || "/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const targetUrl =
    event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(clientList => {
      for(const client of clientList){
        if("focus" in client){
          return client.focus();
        }
      }

      if(clients.openWindow){
        return clients.openWindow(targetUrl);
      }
    })
  );
});
