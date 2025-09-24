// Service Worker for offline functionality and caching
const CACHE_NAME = 'sandwich-pos-v2.0.0'
const STATIC_CACHE = 'static-v2.0.0'
const DYNAMIC_CACHE = 'dynamic-v2.0.0'

// Files to cache for offline use
const STATIC_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/js/config.js',
    '/js/database.js',
    '/js/pos.js',
    '/js/analytics.js',
    '/css/styles.css',
    // External dependencies
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    // Icons and images
    '/images/icons/icon-192x192.png',
    '/images/icons/icon-512x512.png'
]

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('🔧 Service Worker: Installing...')

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📦 Service Worker: Caching static files')
                return cache.addAll(STATIC_FILES)
            })
            .then(() => {
                console.log('✅ Service Worker: Installation complete')
                return self.skipWaiting() // Activate immediately
            })
            .catch(error => {
                console.error('❌ Service Worker: Installation failed', error)
            })
    )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker: Activating...')

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Delete old caches
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('🗑️ Service Worker: Deleting old cache', cacheName)
                            return caches.delete(cacheName)
                        }
                    })
                )
            })
            .then(() => {
                console.log('✅ Service Worker: Activation complete')
                return self.clients.claim() // Take control immediately
            })
    )
})

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
    const { request } = event
    const url = new URL(request.url)

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return
    }

    // Handle different types of requests
    if (STATIC_FILES.includes(request.url) || STATIC_FILES.includes(url.pathname)) {
        // Static files - cache first
        event.respondWith(cacheFirst(request))
    } else if (url.origin.includes('supabase.co')) {
        // Supabase API - network first with cache fallback
        event.respondWith(networkFirst(request))
    } else if (url.pathname.startsWith('/api/')) {
        // API calls - network first
        event.respondWith(networkFirst(request))
    } else {
        // Other requests - cache first with network fallback
        event.respondWith(cacheFirst(request))
    }
})

// Cache-first strategy
async function cacheFirst(request) {
    try {
        // Try cache first
        const cacheResponse = await caches.match(request)
        if (cacheResponse) {
            return cacheResponse
        }

        // Fallback to network
        const networkResponse = await fetch(request)

        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE)
            cache.put(request, networkResponse.clone())
        }

        return networkResponse
    } catch (error) {
        console.error('❌ Cache-first failed:', error)

        // If all fails, return offline page or default response
        if (request.destination === 'document') {
            return caches.match('/index.html')
        }

        throw error
    }
}

// Network-first strategy
async function networkFirst(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request)

        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE)
            cache.put(request, networkResponse.clone())
        }

        return networkResponse
    } catch (error) {
        console.warn('⚠️ Network failed, trying cache:', error)

        // Fallback to cache
        const cacheResponse = await caches.match(request)
        if (cacheResponse) {
            return cacheResponse
        }

        throw error
    }
}

// Background sync for offline operations
self.addEventListener('sync', event => {
    console.log('🔄 Service Worker: Background sync triggered', event.tag)

    if (event.tag === 'sync-offline-data') {
        event.waitUntil(syncOfflineData())
    }
})

// Sync offline data when connection is restored
async function syncOfflineData() {
    try {
        console.log('🔄 Syncing offline data...')

        // Get all clients (open tabs)
        const clients = await self.clients.matchAll()

        // Notify clients to sync their offline data
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_OFFLINE_DATA',
                message: 'Connection restored, syncing offline data...'
            })
        })

        console.log('✅ Offline data sync initiated')
    } catch (error) {
        console.error('❌ Failed to sync offline data:', error)
    }
}

// Push notifications
self.addEventListener('push', event => {
    console.log('🔔 Service Worker: Push notification received')

    const options = {
        body: event.data ? event.data.text() : 'New notification from Sandwich POS',
        icon: '/images/icons/icon-192x192.png',
        badge: '/images/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/'
        },
        actions: [
            {
                action: 'open',
                title: 'Open App',
                icon: '/images/icons/icon-72x72.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/images/icons/icon-72x72.png'
            }
        ]
    }

    event.waitUntil(
        self.registration.showNotification('🥪 Sandwich POS', options)
    )
})

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('🔔 Notification clicked:', event.action)

    event.notification.close()

    if (event.action === 'open' || !event.action) {
        // Open the app
        event.waitUntil(
            self.clients.matchAll()
                .then(clients => {
                    // Check if app is already open
                    const existingClient = clients.find(client =>
                        client.url.includes(self.location.origin)
                    )

                    if (existingClient) {
                        // Focus existing window
                        return existingClient.focus()
                    } else {
                        // Open new window
                        return self.clients.openWindow('/')
                    }
                })
        )
    }
})

// Handle messages from main thread
self.addEventListener('message', event => {
    console.log('📨 Service Worker: Message received', event.data)

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting()
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME
        })
    }
})

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
    console.log('⏰ Service Worker: Periodic sync triggered', event.tag)

    if (event.tag === 'daily-sync') {
        event.waitUntil(performDailySync())
    }
})

// Perform daily maintenance tasks
async function performDailySync() {
    try {
        console.log('⏰ Performing daily sync...')

        // Clean up old cache entries
        const cache = await caches.open(DYNAMIC_CACHE)
        const requests = await cache.keys()

        // Remove cache entries older than 7 days
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)

        for (const request of requests) {
            const response = await cache.match(request)
            const dateHeader = response.headers.get('date')

            if (dateHeader) {
                const cacheDate = new Date(dateHeader).getTime()
                if (cacheDate < oneWeekAgo) {
                    await cache.delete(request)
                    console.log('🗑️ Removed old cache entry:', request.url)
                }
            }
        }

        console.log('✅ Daily sync completed')
    } catch (error) {
        console.error('❌ Daily sync failed:', error)
    }
}

// Error handling
self.addEventListener('error', event => {
    console.error('❌ Service Worker: Uncaught error', event.error)
})

self.addEventListener('unhandledrejection', event => {
    console.error('❌ Service Worker: Unhandled promise rejection', event.reason)
})

console.log('🥪 Service Worker: Script loaded successfully')
