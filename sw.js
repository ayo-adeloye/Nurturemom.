self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'NurtureMom ♡', {
      body: data.body || 'You have a new reminder.',
      tag: data.tag || 'nurturemom',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: data.url || 'https://mynurturemom.com/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || 'https://mynurturemom.com/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windowClients => {
      for (const client of windowClients) {
        if ('navigate' in client) {
          try {
            const navigated = await client.navigate(url);
            if (navigated && 'focus' in navigated) return navigated.focus();
          } catch (_) {}
        }
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
