/**
 * Modern Service Worker for Telepets WebApp
 * Advanced caching strategy with offline support and performance optimization
 */

// Configuration
const SW_CONFIG = {
    CACHE_NAME: 'telepets-v2',
    CACHE_VERSION: '2.0.0',
    STATIC_CACHE: 'telepets-static-v2',
    DYNAMIC_CACHE: 'telepets-dynamic-v2',
    API_CACHE: 'telepets-api-v2',
    
    // Cache strategies
    STRATEGIES: {
        CACHE_FIRST: 'cache-first',
        NETWORK_FIRST: 'network-first',
        STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
    },
    
    // Cache durations (in seconds)
    CACHE_DURATIONS: {
        STATIC: 7 * 24 * 60 * 60, // 7 days
        DYNAMIC: 24 * 60 * 60,    // 1 day
        API: 5 * 60                // 5 minutes
    }
};

// Cache configurations
const CACHE_CONFIGS = {
    // Static assets - cache first
    STATIC: {
        urls: [
            '/',
            '/static/css/modern-styles.css',
            '/static/css/accessibility.css',
            '/static/js/modern-app.js',
            '/static/js/settings.js',
            '/static/js/swipe-handler.js',
            '/static/js/polyfills.js',
            '/static/js/services/ServicesLoader.js',
            '/static/js/services/APIService.js',
            '/static/js/services/TelegramService.js',
            '/static/js/services/NotificationService.js',
            '/static/js/services/TemperatureService.js',
            '/static/js/services/TimerService.js',
            '/static/js/services/ProgressService.js',
            '/static/js/services/EggService.js',
            '/static/js/click-handler.js',
            '/static/js/utils/Logger.js',
            '/static/js/utils/PerformanceMonitor.js',
            '/static/js/utils/ServiceWorkerManager.js',
    '/static/manifest.json',
            '/static/icons/icon.svg',
            '/static/icons/icon-192.png',
            '/static/icons/icon-180.png'
        ],
        strategy: SW_CONFIG.STRATEGIES.CACHE_FIRST,
        cacheName: SW_CONFIG.STATIC_CACHE
    },
    
    // API endpoints - network first with fallback
    API: {
        patterns: [
            '/api/egg/',
            '/api/user/',
            '/api/game/'
        ],
        strategy: SW_CONFIG.STRATEGIES.NETWORK_FIRST,
        cacheName: SW_CONFIG.API_CACHE,
        maxAge: SW_CONFIG.CACHE_DURATIONS.API
    },
    
    // Dynamic content - stale while revalidate
    DYNAMIC: {
        patterns: [
            '/api/',
            '/static/data/'
        ],
        strategy: SW_CONFIG.STRATEGIES.STALE_WHILE_REVALIDATE,
        cacheName: SW_CONFIG.DYNAMIC_CACHE,
        maxAge: SW_CONFIG.CACHE_DURATIONS.DYNAMIC
    }
};

// Utility functions
class ServiceWorkerUtils {
    /**
     * Check if request matches pattern
     */
    static matchesPattern(request, patterns) {
        return patterns.some(pattern => request.url.includes(pattern));
    }

    /**
     * Get cache strategy for request
     */
    static getCacheStrategy(request) {
        if (CACHE_CONFIGS.STATIC.urls.includes(request.url)) {
            return CACHE_CONFIGS.STATIC;
        }
        
        if (this.matchesPattern(request, CACHE_CONFIGS.API.patterns)) {
            return CACHE_CONFIGS.API;
        }
        
        if (this.matchesPattern(request, CACHE_CONFIGS.DYNAMIC.patterns)) {
            return CACHE_CONFIGS.DYNAMIC;
        }
        
        return null;
    }

    /**
     * Cache first strategy
     */
    static async cacheFirst(request, cacheName) {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        } catch (error) {
            console.log('[SW] Network failed, no cached response available');
            throw error;
        }
    }

    /**
     * Network first strategy
     */
    static async networkFirst(request, cacheName) {
        const cache = await caches.open(cacheName);
        
        try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        } catch (error) {
            console.log('[SW] Network failed, trying cache');
            const cachedResponse = await cache.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
            throw error;
        }
    }

    /**
     * Stale while revalidate strategy
     */
    static async staleWhileRevalidate(request, cacheName) {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        // Return cached response immediately if available
        const fetchPromise = fetch(request).then(networkResponse => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        }).catch(() => {
            console.log('[SW] Network failed for stale-while-revalidate');
        });
        
        return cachedResponse || fetchPromise;
    }

    /**
     * Clean old caches
     */
    static async cleanOldCaches() {
        const cacheNames = await caches.keys();
        const currentCaches = [
            SW_CONFIG.STATIC_CACHE,
            SW_CONFIG.DYNAMIC_CACHE,
            SW_CONFIG.API_CACHE
        ];
        
        return Promise.all(
            cacheNames.map(cacheName => {
                if (!currentCaches.includes(cacheName)) {
                    console.log('[SW] Deleting old cache:', cacheName);
                    return caches.delete(cacheName);
                }
            })
        );
    }

    /**
     * Log cache statistics
     */
    static async logCacheStats() {
        const cacheNames = await caches.keys();
        const stats = {};
        
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            stats[cacheName] = keys.length;
        }
        
        console.log('[SW] Cache statistics:', stats);
        return stats;
    }
}

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('[SW] Installing Service Worker...');
    
    event.waitUntil(
        caches.open(SW_CONFIG.STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets...');
                return cache.addAll(CACHE_CONFIGS.STATIC.urls);
            })
            .then(() => {
                console.log('[SW] Static assets cached successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] Failed to cache static assets:', error);
            })
    );
});

// Activate event - clean old caches and take control
self.addEventListener('activate', event => {
    console.log('[SW] Activating Service Worker...');
    
    event.waitUntil(
        Promise.all([
            ServiceWorkerUtils.cleanOldCaches(),
            self.clients.claim()
        ]).then(() => {
            console.log('[SW] Service Worker activated');
            return ServiceWorkerUtils.logCacheStats();
        })
    );
});

// Fetch event - handle different cache strategies
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip external requests (except Telegram API)
    if (url.origin !== location.origin && !url.hostname.includes('telegram.org')) {
        return;
    }
    
    const cacheConfig = ServiceWorkerUtils.getCacheStrategy(request);
    
    if (!cacheConfig) {
        // No caching strategy, pass through
        return;
    }
    
    event.respondWith(
        (async () => {
            try {
                switch (cacheConfig.strategy) {
                    case SW_CONFIG.STRATEGIES.CACHE_FIRST:
                        return await ServiceWorkerUtils.cacheFirst(request, cacheConfig.cacheName);
                    
                    case SW_CONFIG.STRATEGIES.NETWORK_FIRST:
                        return await ServiceWorkerUtils.networkFirst(request, cacheConfig.cacheName);
                    
                    case SW_CONFIG.STRATEGIES.STALE_WHILE_REVALIDATE:
                        return await ServiceWorkerUtils.staleWhileRevalidate(request, cacheConfig.cacheName);
                    
                    default:
                        return fetch(request);
                }
            } catch (error) {
                console.error('[SW] Fetch failed:', error);
                
                // Return offline page for navigation requests
                if (request.mode === 'navigate') {
                    return caches.match('/');
                }
                
                throw error;
            }
        })()
    );
});

// Message event - handle communication with main app
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_CACHE_STATS') {
        ServiceWorkerUtils.logCacheStats().then(stats => {
            event.ports[0].postMessage(stats);
        });
    }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Handle background sync tasks
            console.log('[SW] Background sync triggered')
        );
    }
});

// Push notifications (for future use)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/static/icons/icon-192.png',
            badge: '/static/icons/icon-180.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            }
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

console.log('[SW] Modern Service Worker loaded successfully'); 