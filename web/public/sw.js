// Служебный скрипт: принимает пуши от сервера и показывает уведомления.
// Намеренно без кеширования страниц, чтобы сайт всегда открывался в актуальной версии.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Planner', {
      body: data.body || '',
      tag: data.tag,
      icon: new URL('icons/icon-192.png', self.registration.scope).href,
      badge: new URL('icons/icon-192.png', self.registration.scope).href,
      data: { url: data.url || './' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (w.url.startsWith(self.registration.scope) && 'focus' in w) return w.focus()
      }
      return self.clients.openWindow(target)
    }),
  )
})
