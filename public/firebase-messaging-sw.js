/* Periyar Taxi web push service worker: native ES module, no compat SDK. */
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); }
  catch { payload = { notification: { title: 'Periyar Taxi', body: event.data.text() } }; }
  const details = payload.notification ?? payload.data ?? {};
  const title = String(details.title || 'Periyar Taxi');
  const body = String(details.body || 'You have a new notification.');
  const urlCandidate = String(details.link || details.click_action || payload.fcmOptions?.link || '/');
  // Restrict notification navigation to this app origin.
  const destination = new URL(urlCandidate, self.location.origin);
  const path = destination.origin === self.location.origin ? destination.pathname + destination.search : '/';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/periyar-taxi-icon.svg',
    badge: '/periyar-taxi-icon.svg',
    tag: String(details.tag || 'periyar-taxi-update'),
    data: { path },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification.data?.path || '/';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const page = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (page) { await page.focus(); await page.navigate(path); return; }
    await self.clients.openWindow(path);
  })());
});
export {};
