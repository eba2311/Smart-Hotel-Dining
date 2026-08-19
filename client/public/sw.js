// Enhanced Service Worker with advanced caching and offline support
const CACHE_VERSION = 'v2';
const CACHE_NAME = `smart-hotel-${CACHE_VERSION}`;

// Cache strategies
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const API_CACHE = 'api-v1';

// Core assets to cache immediately
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// API endpoints to cache with network-first strategy
const CACHEABLE_API_PATTERNS = [
  '/api/catalog/menu',
  '/api/catalog/categories',
  '/api/catalog/tables',
];

// Cache duration settings (in seconds)
const CACHE_DURATIONS = {
  static: 86400, // 24 hours
  dynamic: 3600, // 1 hour
  api: 300, // 5 minutes
};

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker:', CACHE_VERSION);

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching core assets');
      return cache.addAll(CORE_ASSETS);
    })
  );

  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker:', CACHE_VERSION);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// Network-first strategy for API calls
async function networkFirst(request) {
  const cache = await caches.open(API_CACHE);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback for API errors
    return new Response(JSON.stringify({ error: 'Offline', message: 'No network connection' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Cache-first strategy for static assets
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Check if cache is still valid
    const cacheDate = cachedResponse.headers.get('date');
    if (cacheDate) {
      const age = (Date.now() - new Date(cacheDate).getTime()) / 1000;
      if (age < CACHE_DURATIONS.static) {
        return cachedResponse;
      }
    }
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stale-while-revalidate strategy for dynamic content
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Otherwise wait for network
  return fetchPromise;
}

// Main fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== location.origin && !url.pathname.startsWith('/api/')) return;

  // Choose strategy based on request type
  if (url.pathname.startsWith('/api/')) {
    // Check if this API endpoint should be cached
    const shouldCacheApi = CACHEABLE_API_PATTERNS.some(pattern => url.pathname.includes(pattern));

    if (shouldCacheApi) {
      event.respondWith(networkFirst(request));
    } else {
      // Don't cache other API calls
      event.respondWith(fetch(request));
    }
  } else if (CORE_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset))) {
    // Cache-first for core assets
    event.respondWith(cacheFirst(request));
  } else if (request.destination === 'image' || request.destination === 'font') {
    // Cache-first for images and fonts
    event.respondWith(cacheFirst(request));
  } else {
    // Stale-while-revalidate for other resources
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

// Sync orders that were created offline
async function syncOrders() {
  try {
    const offlineOrders = await getOfflineOrders();

    for (const order of offlineOrders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order),
        });

        if (response.ok) {
          await removeOfflineOrder(order.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync order:', order.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {
    title: 'Smart Hotel',
    body: 'You have an update!',
    icon: '/icon-192.png',
  };

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View', icon: '/icon-192.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icon-192.png' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const url = event.notification.data || '/';

      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }

      return self.clients.openWindow(url);
    })
  );
});

// Helper functions for offline storage
async function getOfflineOrders() {
  // In a real implementation, this would use IndexedDB
  return [];
}

async function removeOfflineOrder(orderId) {
  // In a real implementation, this would use IndexedDB
  console.log('[SW] Removing offline order:', orderId);
}

// Periodic cache cleanup
setInterval(async () => {
  try {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const cacheDate = response.headers.get('date');
          if (cacheDate) {
            const age = (Date.now() - new Date(cacheDate).getTime()) / 1000;
            const maxAge = cacheName.includes('api') ? CACHE_DURATIONS.api :
                           cacheName.includes('dynamic') ? CACHE_DURATIONS.dynamic :
                           CACHE_DURATIONS.static;

            if (age > maxAge) {
              await cache.delete(request);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error);
  }
}, 3600000); // Run every hour
