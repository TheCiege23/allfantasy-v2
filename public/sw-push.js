/**
 * Service worker for web push (PROMPT 304).
 * Register at /sw-push.js; handle push event and show notification.
 */
self.addEventListener("push", function (event) {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Notification", body: event.data.text() || "" };
  }
  const title = payload.title || "AllFantasy";
  const body = payload.body || "";
  const href = payload.href || "/";
  const tag = payload.tag || "default";
  const options = {
    body,
    tag,
    icon: "/af-crest.png",
    badge: "/af-crest.png",
    data: { href, type: payload.type },
    requireInteraction: false,
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const href = event.notification.data?.href || "/";
  const url = href.startsWith("http") ? href : self.location.origin + (href.startsWith("/") ? href : "/" + href);
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
