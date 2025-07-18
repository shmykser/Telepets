/**
 * Service Worker Manager
 * Утилита для управления Service Worker в основном приложении
 */

class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.isSupported = 'serviceWorker' in navigator;
        this.logger = {
            info: (msg) => console.log(`[SWManager] ${msg}`),
            error: (msg) => console.error(`[SWManager] ${msg}`),
            warn: (msg) => console.warn(`[SWManager] ${msg}`)
        };
    }

    /**
     * Инициализация Service Worker
     */
    async initialize() {
        if (!this.isSupported) {
            this.logger.warn('Service Worker не поддерживается');
            return false;
        }

        try {
            this.registration = await navigator.serviceWorker.register('/static/service-worker.js');
            this.logger.info('Service Worker зарегистрирован:', this.registration);
            
            // Обработка обновлений
            this.setupUpdateHandling();
            
            return true;
        } catch (error) {
            this.logger.error('Ошибка регистрации Service Worker:', error);
            return false;
        }
    }

    /**
     * Настройка обработки обновлений
     */
    setupUpdateHandling() {
        if (!this.registration) return;

        // Слушаем обновления
        this.registration.addEventListener('updatefound', () => {
            this.logger.info('Обнаружено обновление Service Worker');
            
            const newWorker = this.registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    this.showUpdateNotification();
                }
            });
        });

        // Слушаем активацию
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            this.logger.info('Service Worker активирован');
            this.onActivation();
        });
    }

    /**
     * Показать уведомление об обновлении
     */
    showUpdateNotification() {
        if (window.notificationService) {
            window.notificationService.showNotification(
                'Доступно обновление',
                'Нажмите для обновления приложения',
                'info',
                0 // Не скрывать автоматически
            );
        }
    }

    /**
     * Обновить Service Worker
     */
    async update() {
        if (!this.registration) return;

        try {
            await this.registration.update();
            this.logger.info('Запрошено обновление Service Worker');
        } catch (error) {
            this.logger.error('Ошибка обновления Service Worker:', error);
        }
    }

    /**
     * Пропустить ожидание и активировать новый Service Worker
     */
    async skipWaiting() {
        if (!this.registration || !this.registration.waiting) return;

        try {
            this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            this.logger.info('Запрошена активация нового Service Worker');
        } catch (error) {
            this.logger.error('Ошибка активации Service Worker:', error);
        }
    }

    /**
     * Получить статистику кэша
     */
    async getCacheStats() {
        if (!this.registration) return null;

        try {
            const channel = new MessageChannel();
            const statsPromise = new Promise(resolve => {
                channel.port1.onmessage = event => resolve(event.data);
            });

            this.registration.active.postMessage(
                { type: 'GET_CACHE_STATS' },
                [channel.port2]
            );

            return await statsPromise;
        } catch (error) {
            this.logger.error('Ошибка получения статистики кэша:', error);
            return null;
        }
    }

    /**
     * Очистить кэш
     */
    async clearCache() {
        if (!this.registration) return;

        try {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            this.logger.info('Кэш очищен');
        } catch (error) {
            this.logger.error('Ошибка очистки кэша:', error);
        }
    }

    /**
     * Проверить состояние сети
     */
    checkNetworkStatus() {
        return {
            online: navigator.onLine,
            effectiveType: navigator.connection?.effectiveType || 'unknown',
            downlink: navigator.connection?.downlink || 0,
            rtt: navigator.connection?.rtt || 0
        };
    }

    /**
     * Получить информацию о Service Worker
     */
    getInfo() {
        if (!this.registration) return null;

        return {
            scope: this.registration.scope,
            active: !!this.registration.active,
            waiting: !!this.registration.waiting,
            installing: !!this.registration.installing,
            updateViaCache: this.registration.updateViaCache
        };
    }

    /**
     * Обработка активации Service Worker
     */
    onActivation() {
        // Перезагрузить страницу для применения обновлений
        if (window.confirm('Доступно обновление приложения. Перезагрузить сейчас?')) {
            window.location.reload();
        }
    }

    /**
     * Проверить поддержку функций
     */
    checkSupport() {
        return {
            serviceWorker: 'serviceWorker' in navigator,
            cache: 'caches' in window,
            pushManager: 'PushManager' in window,
            backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype
        };
    }

    /**
     * Получить размер кэша
     */
    async getCacheSize() {
        if (!this.registration) return 0;

        try {
            const cacheNames = await caches.keys();
            let totalSize = 0;

            for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                const keys = await cache.keys();
                
                for (const request of keys) {
                    const response = await cache.match(request);
                    if (response) {
                        const blob = await response.blob();
                        totalSize += blob.size;
                    }
                }
            }

            return totalSize;
        } catch (error) {
            this.logger.error('Ошибка получения размера кэша:', error);
            return 0;
        }
    }

    /**
     * Форматировать размер в читаемом виде
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Получить полную статистику
     */
    async getFullStats() {
        const cacheStats = await this.getCacheStats();
        const cacheSize = await this.getCacheSize();
        const networkStatus = this.checkNetworkStatus();
        const support = this.checkSupport();
        const info = this.getInfo();

        return {
            cache: {
                stats: cacheStats,
                size: cacheSize,
                sizeFormatted: this.formatBytes(cacheSize)
            },
            network: networkStatus,
            support,
            info,
            timestamp: Date.now()
        };
    }

    /**
     * Сброс состояния
     */
    reset() {
        this.registration = null;
        this.logger.info('Service Worker Manager сброшен');
    }
}

// Создаем глобальный экземпляр
window.serviceWorkerManager = new ServiceWorkerManager();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServiceWorkerManager;
} 