self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event with no data');
    return;
  }

  try {
    const payload = event.data.json();
    console.log('Push received:', payload);

    const title = payload.title || 'ControlAR';
    const options = {
      body: payload.body || '',
      icon: payload.icon || '/controlar_fondo_blanco_sin_texto.png',
      badge: payload.badge || '/controlar_fondo_blanco_sin_texto.png',
      data: payload.data || {},
      tag: payload.tag || 'waba-notification',
      renotify: payload.renotify !== undefined ? payload.renotify : true,
      requireInteraction: payload.requireInteraction || false,
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Error displaying notification:', err);
    event.waitUntil(
      self.registration.showNotification('ControlAR', {
        body: event.data.text(),
        icon: '/controlar_fondo_blanco_sin_texto.png'
      })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const clickUrl = event.notification.data?.url || '/crm';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/crm') && 'focus' in client) {
          if (clickUrl && client.url !== clickUrl && 'navigate' in client) {
            client.navigate(clickUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});
